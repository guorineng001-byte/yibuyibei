import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import data from '../public/content/edu-proofread-ch7.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:6},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch7-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教心第七章问题解决与创造性校对',()=>{
 it('自动安装127项且前六章962项保留，重复加载幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-6')).toHaveLength(23);
  for(const [ch,count] of [[1,208],[2,264],[3,150],[4,146],[5,93],[6,101],[7,127]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖67至74页，三组跨页来源保留，九项参考不入队',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual([67,68,69,70,71,72,73,74]);
  expect(node('traditional-intelligence').refs.map(r=>r.page)).toEqual([67,68]);
  expect(node('multiple-intelligences').refs.map(r=>r.page)).toEqual([68,69]);
  expect(node('creative-process').refs.map(r=>r.page)).toEqual([72,73]);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(9);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  for(const k of pack.knowledge)for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}
 });
 it('127项按框架顺序各出现一次，全部学习卡及复习队列无遗漏',()=>{
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);
  }
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch7-')).map(t=>t.id));
  expect(session?.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session?.queue).size).toBe(127);
 });
 it('保护教育史和前六章用户改写、阅读方式、进度、题目和未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[6],'independent',false,'sixth-chapter-event',new Date('2026-10-17T02:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[previous[5].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='第七章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('思维定势双向作用、创造性的必要不充分条件及流畅灵活独创区分',()=>{
  expect(text('problem-factors','定势积极')).toContain('情境不变');expect(text('problem-factors','定势消极')).toContain('情境改变');
  expect(text('problem-factors','功能固着含义')).toContain('消极作用');
  expect(text('creativity-factors','智力条件')).toContain('必要不充分');expect(text('creativity-factors','知识条件')).toContain('必要不充分');
  expect(text('creativity-overview','流畅性')).toContain('数量多，但不一定角度多');expect(text('creativity-overview','灵活性')).toContain('种类多，角度多');expect(text('creativity-overview','独创性')).toContain('非同寻常');
 });
 it('算法式启发式、过程分流回路、华莱士与芬克阶段不混淆',()=>{
  expect(text('general-process','算法式含义')).toContain('一步一步的程序');expect(text('general-process','启发式含义')).toContain('只试探');
  expect(text('general-process','图式激活')).toContain('直接进入尝试解答');expect(text('general-process','无图式激活')).toContain('先寻求解答');expect(text('general-process','评价失败')).toContain('返回理解和表征问题或寻求解答');
  expect(text('creative-process','沉思')).toContain('酝酿');expect(text('creative-process','探索无效')).toContain('重新进行探索');expect(text('creative-process','约束')).toContain('没有无限制');
  expect(text('creative-process-note','观点生成')).toContain('前三步');expect(text('creative-process-note','观点评价')).toContain('第四步');
 });
 it('头脑风暴与自由联想的目的、分合法方向及三元智力内容完整',()=>{
  expect(text('creativity-cultivation','脑激励法')).toContain('不打断、不做评论');expect(text('creativity-cultivation','脑激励法')).toContain('解决问题');expect(text('creativity-cultivation','自由联想')).toContain('探索心理');
  expect(text('creativity-cultivation','旧到新')).toContain('旧→新');expect(text('creativity-cultivation','新到旧')).toContain('新→旧');
  expect(text('successful-intelligence','成功智力含义')).toContain('选择环境、适应环境、改变环境');
  expect(text('successful-intelligence','分析性智力')).toContain('正确答案');expect(text('successful-intelligence','实践性智力')).toContain('实际生活');expect(text('successful-intelligence','创造性智力')).toContain('问题和想法');
 });
 it('功能固着检索定位原卡及含义叶节点',()=>{
  const s=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(s),'功能固着');
  expect(results.find(r=>r.knowledgeId===node('problem-factors').id)?.stepIds).toContain(rows('problem-factors').find(s=>s.title==='功能固着含义')!.id);
 });
});
