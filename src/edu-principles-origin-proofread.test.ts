import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import data from '../public/content/edu-proofread-ch9.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:8},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch9-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教原第一章教育及其产生与发展校对',()=>{
 it('自动安装131项且教心八章1195项保留，重复加载幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-8')).toHaveLength(27);
  for(const [ch,count] of [[1,208],[2,264],[3,150],[4,146],[5,93],[6,101],[7,127],[8,106],[9,131]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖81至88页，功能三种分类跨页续接，八项参考不入队',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual([81,82,83,84,85,86,87,88]);
  expect(node('education-functions').refs.map(r=>r.page)).toEqual([85,86]);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(8);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  for(const k of pack.knowledge)for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}
 });
 it('131项按框架顺序各出现一次，全部学习卡及复习队列无遗漏',()=>{
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);
  }
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch9-')).map(t=>t.id));
  expect(session?.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session?.queue).size).toBe(131);
 });
 it('保护教育史和教心八章用户改写、阅读方式、进度、题目和未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[8],'independent',false,'eighth-chapter-event',new Date('2026-10-17T02:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[previous[7].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='教原第一章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('正式教育两类与非正式教育保持不同层级，非正规教育四特点三意义完整',()=>{
  expect(text('formal-education','非正规教育含义')).toContain('正规教育系统外');
  expect(text('formal-education','未充分制度化')).toContain('有组织');
  expect(text('informal-education','非正式教育含义')).toContain('不具有结构性或组织性');
  expect(text('school-education','学校教育含义')).toContain('属于正规教育');
 });
 it('四教育要素地位不混淆，本体与衍生、显性与隐性的关系保留',()=>{
  expect(text('education-structure','教育者地位')).toBe('主导地位。');
  expect(text('education-structure','受教育者地位')).toBe('主体地位。');
  expect(text('education-structure','教育中介系统')).toContain('教育内容和教育活动方式');
  expect(text('education-functions','社会功能条件')).toContain('通过教育本体功能');
  expect(text('education-functions','隐性功能')).toContain('非预期性、间接性');
  expect(text('education-functions','显隐功能关系')).toContain('相互转化');
 });
 it('起源表的作者与观点逐行对应，劳动说五观点和心理说四评价不漏项',()=>{
  expect(text('education-origin','生物说人物')).toBe('勒图尔诺、桑代克、沛西·能。');
  expect(text('education-origin','心理说人物')).toBe('孟禄。');
  expect(text('education-origin','心理说观点')).toContain('无意识');
  expect(text('education-origin','劳动说人物')).toContain('麦丁斯基、杨贤江');
  expect(text('education-origin','语言意识条件')).toContain('语言和意识');
 });
 it('非学校化的教育网络及在家上学与通常家庭教育的边界保留，可被检索',()=>{
  expect(text('deschooling','教育网络')).toContain('不是互联网的网络');
  expect(text('homeschooling','家庭学校含义')).toContain('完全取代学校');
  expect(text('homeschooling','区别通常家庭教育')).toContain('学校教育的补充');
  const s=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(s),'非正规');
  expect(results.some(r=>r.knowledgeId===node('formal-education').id)).toBe(true);
 });
});
