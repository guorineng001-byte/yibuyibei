import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import data from '../public/content/edu-proofread-ch6.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:5},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch6-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教心第六章学习策略及其教学校对',()=>{
 it('自动安装101项且前五章861项保留，重复加载幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-5')).toHaveLength(15);
  for(const [ch,count] of [[1,208],[2,264],[3,150],[4,146],[5,93],[6,101]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖62至66页，精细加工接回64页案例，四项参考不入队',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual([62,63,64,65,66]);
  expect(node('elaboration').refs.map(r=>r.page)).toEqual([63,64]);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(4);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  for(const k of pack.knowledge)for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}
 });
 it('101项按框架顺序各出现一次，全部学习卡及复习队列无遗漏',()=>{
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);
  }
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch6-')).map(t=>t.id));
  expect(session?.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session?.queue).size).toBe(101);
 });
 it('保护教育史和前五章用户改写、阅读方式、进度、题目和未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[5],'independent',false,'fifth-chapter-event',new Date('2026-10-17T02:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[previous[4].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='第六章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('前摄倒摄方向与积极消极配对，不混淆两种记忆存储',()=>{
  for(const suffix of ['抑制','促进']){
   expect(text('rehearsal','前摄'+suffix)).toContain('前→后');expect(text('rehearsal','倒摄'+suffix)).toContain('后→前');
  }
  expect(text('rehearsal','抑制含义')).toContain('消极');expect(text('rehearsal','促进含义')).toContain('积极');
  expect(text('metacognition','元认知知识')).toContain('长时记忆');expect(text('metacognition','元认知控制')).toContain('工作记忆');
  expect(text('metacognitive-strategies','领会监控')).toContain('目标是否达成');expect(text('metacognitive-strategies','调节策略')).toContain('修正措施');
 });
 it('两组策略区别、六种记忆术及两类求助按原图保留',()=>{
  expect(rows('elaboration').filter(s=>s.outlinePath?.includes('（1）简单知识的精细加工（记忆术）'))).toHaveLength(6);
  expect(text('elaboration','意义识记')).toContain('525636');
  expect(text('elaboration-organization','精细加工侧重')).toContain('理解新知识的意义');expect(text('elaboration-organization','组织侧重')).toContain('逻辑和层次结构');
  expect(text('cognitive-metacognitive','认知加工对象')).toContain('外部知识');expect(text('cognitive-metacognitive','元认知加工对象')).toContain('内部认知过程');
  expect(text('cognitive-metacognitive','发展时间')).toContain('早于');
  expect(text('resource-management','执行性求助')).toContain('“替”自己');expect(text('resource-management','工具性求助')).toContain('思路和工具');
  expect(rows('resource-management').find(s=>s.title==='调整心境')?.outlinePath).toContain('2. 努力管理策略');
 });
 it('工具性求助检索定位到资源管理原卡及对应叶节点',()=>{
  const s=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(s),'工具性求助');
  expect(results.find(r=>r.knowledgeId===node('resource-management').id)?.stepIds).toContain(rows('resource-management').find(s=>s.title==='工具性求助')!.id);
 });
});
