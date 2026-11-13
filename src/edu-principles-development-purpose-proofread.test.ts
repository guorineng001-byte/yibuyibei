import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import developmentData from '../public/content/edu-proofread-ch11.json';
import purposeData from '../public/content/edu-proofread-ch12.json';
const development=developmentData as unknown as ContentPack,purpose=purposeData as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:10},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(p:ContentPack,key:string)=>p.knowledge.find(k=>k.id===`edu-reviewed-ch${p===development?11:12}-${key}`)!;
const rows=(p:ContentPack,key:string)=>p.steps.filter(s=>s.knowledgeId===node(p,key).id);
const text=(p:ContentPack,key:string,title:string)=>rows(p,key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教原第三、四章连续校对',()=>{
 it('启动自动追加57与104项，前十包1476项保留，刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  for(const p of [development,purpose]){expect(validContentPack(p)).toBe(true);expect(s.installedContentPacks).toContain(p.id);}
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-10')).toHaveLength(20);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-11')).toHaveLength(22);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch11-'))).toHaveLength(57);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch12-'))).toHaveLength(104);
  const oldIds=new Set(previous.flatMap(p=>p.steps.map(t=>t.id)));
  expect(eligibleSteps(s).filter(t=>oldIds.has(t.id))).toHaveLength(1476);
  expect(await loadBundledContent(s)).toEqual(s);expect(validateBackup(s)).toBe(true);
 });
 it('来源完整覆盖95下半至104，关键期两页保留，16项参考不进入学习',()=>{
  for(const [p,pages,count] of [[development,[95,96,97,98,99],6],[purpose,[100,101,102,103,104],10]] as const){
   expect([...new Set(p.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(pages);
   expect(p.knowledge.filter(k=>k.referenceOnly)).toHaveLength(count);
   for(const k of p.knowledge){if(k.referenceOnly){expect(k.selected).toBe(false);expect(p.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}}
  }
  expect(node(development,'critical-period-tips').refs.map(r=>r.page)).toEqual([96,97]);
  for(const k of development.knowledge)for(const r of k.refs.filter(r=>r.page===95))expect(r.rect![1]).toBeGreaterThanOrEqual(.495);
 });
 it('两章所有叶节点和复习队列保持原序，各161个要点恰好出现一次',()=>{
  for(const p of [development,purpose]){
   for(const k of p.knowledge){const ss=p.steps.filter(t=>t.knowledgeId===k.id),tree=buildStepOutline(ss);expect(leaves(tree),k.id).toEqual(ss.map(t=>t.id));const keys:string[]=[];const walk=(ns:StepOutlineGroup[])=>{for(const n of ns){keys.push(n.key);walk(n.children);}};walk(tree);expect(new Set(keys).size).toBe(keys.length);}
   const s=mergeContentPack(registerEduBook(initialState()),p),ids=new Set(p.steps.map(t=>t.id));
   expect(makeSession(s,'review',eligibleSteps(s).filter(t=>ids.has(t.id)).map(t=>t.id))?.queue).toEqual(p.steps.map(t=>t.id));
  }
  expect(development.steps.length+purpose.steps.length).toBe(161);
 });
 it('教育史和教心八章、教原前两章的改写进度事件题目未完成队列全部保留',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[10],'independent',false,'kept-principles-second',new Date('2026-10-21T01:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-question',title:'自己的问题',answer:'原来的答案',knowledgeIds:[previous[9].steps[0].knowledgeId]});
  for(const id of ids){const t=before.steps.find(t=>t.id===id)!;t.text='已有改写';t.version=2;t.studyMode='read';}
  const frozen=structuredClone(before),next=mergeContentPack(mergeContentPack(before,development),purpose);
  expect(before).toEqual(frozen);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const t of before.steps)expect(next.steps.find(x=>x.id===t.id)).toEqual(t);
  for(const k of before.knowledge)expect(next.knowledge.find(x=>x.id===k.id)).toEqual(k);
  const own=next.steps.find(t=>t.id===development.steps[0].id)!;own.text='第三章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(mergeContentPack(next,development),purpose)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('顺序与阶段、同龄差异与同一个体不平衡区分，主观能动性决定与学校主导不混淆',()=>{
  expect(text(development,'sequence','顺序性含义')).toContain('不可逆性');
  expect(text(development,'stages','阶段性教育制约')).toContain('针对性');
  expect(text(development,'differences','差异性含义')).toContain('不同个体');
  expect(text(development,'imbalance','不平衡性含义')).toContain('同一个体');
  expect(text(development,'agency','最终决定作用')).toContain('最终的决定作用');
  expect(node(development,'school-conditions').section).toContain('主导作用');
 });
 it('内外动因的表现及相互作用限定保留，格赛尔结论不扩写为实验数据',()=>{
  expect(text(development,'internal-external','内发论表现')).toContain('性善论');
  expect(text(development,'internal-external','外铄论表现')).toContain('素丝说');
  expect(text(development,'interaction','交互作用观点')).toContain('在个体活动中相互作用');
  expect(text(development,'gesell-maturation','成熟与学习')).toBe('格赛尔认为成熟是学习的先决条件。');
  expect(rows(development,'gesell-maturation')).toHaveLength(1);
 });
 it('教育目的四层次对应国家学校学科课堂，培养目标内部依据与教育目的理论依据区分',()=>{
  expect(text(purpose,'education-purpose','目的层次')).toContain('国家');
  expect(text(purpose,'education-purpose','课程层次')).toContain('不同学科学年段');
  expect(text(purpose,'education-purpose','教学层次')).toContain('教师课堂');
  expect(text(purpose,'training-goals','内部依据')).toBe('教育目的。');
  expect(text(purpose,'purpose-basis','教育内部依据')).toContain('马克思主义');
 });
 it('杜威没有外在目的与没有目的区分，三组比较的总结均保留',()=>{
  expect(text(purpose,'external-internal','教育无外在目的')).toContain('不是教育没有目的');
  expect(text(purpose,'individual-social','个社总结')).toContain('辩证统一');
  expect(text(purpose,'external-internal','内外目的总结')).toContain('辩证统一');
  expect(text(purpose,'preparation-adaptation','生活理论总结')).toContain('当下的生活');
  expect(text(purpose,'preparation-adaptation','生活理论总结')).toContain('长远的方向');
 });
 it('五育含义含智慧素养和劳动价值观，全面与个性发展并存，原书略项不虚构',()=>{
  expect(text(purpose,'five-educations','智育含义')).toContain('智慧与素养');
  expect(text(purpose,'five-educations','劳育含义')).toContain('科学的劳动价值观');
  expect(text(purpose,'five-educations','美育作用')).toContain('育劳');
  expect(text(purpose,'five-educations','劳育作用')).toContain('育美');
  expect(text(purpose,'whole-development-implementation','全面与个性')).toContain('不是忽视');
  expect(purpose.steps.some(t=>t.title.includes('1949'))).toBe(false);
 });
 it('新章检索可找到外铄论与立德树人，关键词落到对应卡片',()=>{
  const s=mergeContentPack(mergeContentPack(registerEduBook(initialState()),development),purpose),index=buildSearchIndex(s);
  expect(searchKnowledge(index,'外铄论').some(r=>r.knowledgeId===node(development,'internal-external').id)).toBe(true);
  expect(searchKnowledge(index,'立德树人').some(r=>r.knowledgeId===node(purpose,'five-educations').id)).toBe(true);
 });
});
