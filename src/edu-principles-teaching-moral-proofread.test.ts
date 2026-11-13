import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import teachingData from '../public/content/edu-proofread-ch15.json';
import moralData from '../public/content/edu-proofread-ch16.json';
const teaching=teachingData as unknown as ContentPack,moral=moralData as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:14},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(p:ContentPack,key:string)=>p.knowledge.find(k=>k.id===`edu-reviewed-ch${p===teaching?15:16}-${key}`)!;
const rows=(p:ContentPack,key:string)=>p.steps.filter(s=>s.knowledgeId===node(p,key).id);
const text=(p:ContentPack,key:string,title:string)=>rows(p,key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());
describe('教原第七、八章完整校对',()=>{
 it('启动追加312与148项，前十四包2092项保留，刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  for(const p of [teaching,moral]){expect(validContentPack(p)).toBe(true);expect(s.installedContentPacks).toContain(p.id);}
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-14')).toHaveLength(70);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-15')).toHaveLength(27);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch15-'))).toHaveLength(312);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch16-'))).toHaveLength(148);
  const oldIds=new Set(previous.flatMap(p=>p.steps.map(t=>t.id)));
  expect(eligibleSteps(s).filter(t=>oldIds.has(t.id))).toHaveLength(2092);
  expect(await loadBundledContent(s)).toEqual(s);expect(validateBackup(s)).toBe(true);
 });
 it('完整覆盖127至148页，26项参考不入队，横表与两处续页来源正确',()=>{
  for(const [p,start,end,count] of [[teaching,127,141,18],[moral,142,148,8]] as const){
   expect([...new Set(p.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:end-start+1},(_,i)=>start+i));
   expect(p.knowledge.filter(k=>k.referenceOnly)).toHaveLength(count);
   for(const k of p.knowledge){if(k.referenceOnly){expect(k.selected).toBe(false);expect(p.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}}
  }
  expect(node(teaching,'foreign-models-table').refs.map(r=>r.page)).toEqual([130,131]);
  expect(node(moral,'models-quiz').refs.map(r=>r.page)).toEqual([145,146]);
  expect(node(moral,'principles-methods-table').refs.map(r=>r.page)).toEqual([146,147]);
 });
 it('460个叶各出现一次，71张学习卡排序唯一，横表真实复习队列不交错',()=>{
  for(const p of [teaching,moral]){
   const orders=p.knowledge.filter(k=>!k.referenceOnly).map(k=>k.order);expect(new Set(orders).size).toBe(orders.length);
   for(const k of p.knowledge){const ss=p.steps.filter(t=>t.knowledgeId===k.id),tree=buildStepOutline(ss);expect(leaves(tree),k.id).toEqual(ss.map(t=>t.id));const keys:string[]=[];const walk=(ns:StepOutlineGroup[])=>{for(const n of ns){keys.push(n.key);walk(n.children);}};walk(tree);expect(new Set(keys).size).toBe(keys.length);}
   const s=mergeContentPack(registerEduBook(initialState()),p),ids=new Set(p.steps.map(t=>t.id));
   expect(makeSession(s,'review',eligibleSteps(s).filter(t=>ids.has(t.id)).map(t=>t.id))?.queue).toEqual(p.steps.map(t=>t.id));
  }
  expect(teaching.steps.length+moral.steps.length).toBe(460);
 });
 it('安装保护教育史与前十四包的改写、进度、事件、题目和未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[14],'independent',false,'kept-curriculum-event',new Date('2026-10-24T01:00:00Z'));
  before.session=makeSession(before,'review',ids);before.session!.cursor=6;
  before.questions.push({id:'kept-question',title:'自己的问题',answer:'原来的答案',knowledgeIds:[previous[13].steps[0].knowledgeId]});
  for(const id of ids){const t=before.steps.find(t=>t.id===id)!;t.text='已有改写';t.version=2;t.studyMode='read';}
  const frozen=structuredClone(before),next=mergeContentPack(mergeContentPack(before,teaching),moral);
  expect(before).toEqual(frozen);
  const materialBooks=(s:typeof before)=>s.books.map(({pageRotations,...book})=>book);
  expect(materialBooks(next)).toEqual(materialBooks(before));
  for(const key of ['chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const t of before.steps)expect(next.steps.find(x=>x.id===t.id)).toEqual(t);
  for(const k of before.knowledge)expect(next.knowledge.find(x=>x.id===k.id)).toEqual(k);
  const own=next.steps.find(t=>t.id===teaching.steps[0].id)!;own.text='第七章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(mergeContentPack(next,teaching),moral)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('130与131默认横向，93原方向及用户自选方向保留',()=>{
  expect(teaching.pageRotations).toEqual({'130':90,'131':90});
  const before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const book=before.books.find(b=>b.id===teaching.bookId)!;
  expect(book.pageRotations?.['93']).toBe(90);
  const next=mergeContentPack(before,teaching).books.find(b=>b.id===teaching.bookId)!;
  expect(next.pageRotations).toMatchObject({'93':90,'130':90,'131':90});
  book.pageRotations={...book.pageRotations,'130':270};
  expect(mergeContentPack(before,teaching).books.find(b=>b.id===teaching.bookId)?.pageRotations?.['130']).toBe(270);
 });
 it('教学与智育不等同，四理论、十模式与STEM演变的关键限定保留',()=>{
  expect(text(teaching,'teaching-overview','教学内容范围')).toContain('德育');
  expect(text(teaching,'teaching-overview','智育途径范围')).toContain('课外活动');
  expect(text(teaching,'behaviorism','程序教学方法')).toContain('自定步调');
  expect(text(teaching,'humanism','人本师生关系')).toContain('移情');
  expect(teaching.knowledge.filter(k=>!k.referenceOnly&&k.id.startsWith('edu-reviewed-ch15-model-'))).toHaveLength(10);
  expect(text(teaching,'inquiry-relations','逆向设计区别')).toContain('可以没有');
  expect(text(teaching,'stem-evolution','STREAM六科')).toContain('阅读');
  expect(text(teaching,'inquiry-scope','STEM适用范围')).toContain('未打勾');
 });
 it('六组教学关系不补造两个偏向，作业七问题七措施与组织形式区别完整',()=>{
  const relations=teaching.knowledge.filter(k=>k.id.startsWith('edu-reviewed-ch15-relation-'));expect(relations).toHaveLength(6);
  for(const k of relations)expect(teaching.steps.find(s=>s.knowledgeId===k.id&&s.text.includes('原书未逐项展开'))).toBeTruthy();
  expect(rows(teaching,'homework')).toHaveLength(14);
  expect(text(teaching,'organization-types','个别化教学')).toContain('一对多或一对一');
  expect(text(teaching,'organization-types','小组合作学习')).toContain('组内成员合作');
  expect(text(teaching,'organization-types','走班制')).toContain('教室和教师固定');
 });
 it('表现性评价的限制与扩展不同，档案袋缺统一标准，增值关注变化',()=>{
  expect(text(teaching,'performance-assessment','限制型含义')).toContain('一定限制');
  expect(text(teaching,'performance-assessment','扩展型含义')).toContain('高度自由');
  expect(text(teaching,'portfolio','缺统一标准')).toContain('公正客观');
  expect(text(teaching,'value-added','增值含义')).toContain('追踪');
  expect(text(teaching,'value-added','增值评价观点')).toContain('唯一标准');
 });
 it('德育六模式与四规律完整，直接课与间接渗透不同，学校六育人不漏项',()=>{
  expect(text(moral,'cognitive-moral-development','后习俗水平')).toContain('普遍道德原则');
  expect(text(moral,'value-clarification','其他价值澄清方法')).toContain('未逐一展开');
  expect(text(moral,'social-action','社会行动简介')).toContain('知情意行');
  expect(text(moral,'moral-contradiction','主要矛盾')).toContain('已有品德水平');
  expect(text(moral,'direct-approach','直接途径含义')).toContain('专门开设');
  expect(text(moral,'indirect-approach','间接途径含义')).toContain('渗透');
  expect(text(moral,'moral-root-paths','学校育人路径')).toContain('全员育人');
  expect(rows(moral,'school-moral-problems')).toHaveLength(12);
 });
 it('可检索增值性评价与价值澄清，关键词定位新卡',()=>{
  const s=mergeContentPack(mergeContentPack(registerEduBook(initialState()),teaching),moral),index=buildSearchIndex(s);
  expect(searchKnowledge(index,'增值性评价').some(r=>r.knowledgeId===node(teaching,'value-added').id)).toBe(true);
  expect(searchKnowledge(index,'价值澄清').some(r=>r.knowledgeId===node(moral,'value-clarification').id)).toBe(true);
 });
});
