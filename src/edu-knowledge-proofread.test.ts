import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook,EDU_BOOK_ID} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import firstData from '../public/content/edu-proofread-ch1.json';
import secondData from '../public/content/edu-proofread-ch2.json';
import thirdData from '../public/content/edu-proofread-ch3.json';
import data from '../public/content/edu-proofread-ch4.json';
const pack=data as unknown as ContentPack,previous=[firstData,secondData,thirdData] as unknown as ContentPack[];
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch4-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教心第四章知识的建构校对',()=>{
 it('自动安装146个要点，前三章全部622个要点保留，重复刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);expect(s.books).toHaveLength(2);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-3')).toHaveLength(28);
  for(const [ch,count] of [[1,208],[2,264],[3,150],[4,146]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖47至56页，五组正文与图表跨页续接，15项原图不入队',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:10},(_,i)=>47+i));
  for(const [key,pages] of [['knowledge-types',[47,48]],['knowledge-representation',[50,51]],['representation-framework',[50,51]],['transfer-types',[54,55]],['transfer-classification-table',[54,55]]] as const)expect(node(key).refs.map(r=>r.page)).toEqual(pages);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(15);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  expect(pack.knowledge.every(k=>k.confirmed&&k.bookId===EDU_BOOK_ID&&k.chapterId==='edu-chapter-3')).toBe(true);
  expect(pack.steps.every(s=>s.studyMode==='memorize')).toBe(true);
 });
 it('146个叶节点各出现一次，原书顺序与完整复习队列一致',()=>{
  let count=0;
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);count+=ss.length;
  }
  expect(count).toBe(146);
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch4-')).map(t=>t.id));
  if(!session)throw new Error('第四章完整复习队列未能创建');
  expect(session.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session.queue).size).toBe(146);
 });
 it('追加新章保护教育史和前三章改写、阅读方式、进度、题目与未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[3],'independent',false,'third-chapter-event',new Date('2026-10-14T02:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[previous[2].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='第四章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('陈述与程序知识的表格逐维度配对，四种显隐转化方向正确',()=>{
  expect(text('knowledge-types','陈述性获得')).toContain('容易获得，但也容易遗忘');
  expect(text('knowledge-types','程序性获得')).toContain('较难获得，一旦获得，就不容易遗忘');
  expect(text('knowledge-types','陈述性机制')).toContain('同化和顺应');
  expect(text('knowledge-types','程序性机制')).toContain('模式识别和动作序列');
  expect(text('construction-mechanisms','产生式结构')).toContain('“如果”对应模式识别');
  expect(text('construction-mechanisms','产生式结构')).toContain('“那么”对应动作序列');
  expect(text('knowledge-types','客观知识')).toContain('不是一成不变');
  const conversions=rows('explicit-tacit-conversion');
  expect(conversions.map(s=>s.title)).toEqual(['社会化','外化','综合化','内化']);
  for(const [i,direction] of ['隐性知识→隐性知识','隐性知识→显性知识','显性知识→显性知识','显性知识→隐性知识'].entries())expect(conversions[i].text).toContain(direction);
 });
 it('概念获得、迁移方向与抽象水平配对，两个相似性保留不同含义',()=>{
  expect(text('understanding-process','概念形成')).toContain('概念发现学习');
  expect(text('understanding-process','概念同化')).toContain('概念接受学习');
  for(const [title,definition] of [['顺向迁移','前面学习对后面学习'],['逆向迁移','后面学习对前面学习'],['近迁移','相似的情境'],['远迁移','极不相似的情境'],['低通路迁移','反复练习的技能自动化'],['高通路迁移','有意识地将抽象知识'],['同化性迁移','自上而下'],['顺应性迁移','自下而上']])expect(text('transfer-types',title)).toContain(definition);
  expect(text('transfer-factors','主观相似性')).toContain('个体加工学习材料过程');
  expect(text('transfer-factors','客观相似性')).toContain('学习材料、问题和情境');
  expect(text('integration-deepening','知识同化含义')).toContain('高一级的观念而忘记低一级');
 });
 it('检索顺应性迁移能定位原卡片及竖向迁移深层叶节点',()=>{
  const state=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(state),'顺应性迁移');
  expect(results.find(r=>r.knowledgeId===node('transfer-types').id)?.stepIds).toContain(rows('transfer-types').find(s=>s.title==='顺应性迁移')!.id);
 });
});
