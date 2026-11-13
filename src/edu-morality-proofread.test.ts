import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import data from '../public/content/edu-proofread-ch8.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:7},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch8-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教心第八章社会规范态度与品德校对',()=>{
 it('自动安装106项且前七章1089项保留，重复加载幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-7')).toHaveLength(14);
  for(const [ch,count] of [[1,208],[2,264],[3,150],[4,146],[5,93],[6,101],[7,127],[8,106]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖75至79页，品德影响因素跨页续接，四项参考不入队',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual([75,76,77,78,79]);
  expect(node('moral-factors').refs.map(r=>r.page)).toEqual([77,78]);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(4);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  for(const k of pack.knowledge)for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}
 });
 it('106项按框架顺序各出现一次，全部学习卡及复习队列无遗漏',()=>{
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);
  }
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch8-')).map(t=>t.id));
  expect(session?.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session?.queue).size).toBe(106);
 });
 it('保护教育史和前七章用户改写、阅读方式、进度、题目和未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[7],'independent',false,'seventh-chapter-event',new Date('2026-10-17T02:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[previous[6].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='第八章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('遵从认同内化特点和态度行为意向与品德行为不混淆',()=>{
  expect(text('social-norms','遵从含义')).toContain('也称依从');expect(text('social-norms','遵从特点')).toContain('盲目性、被动性、工具性和情境性');
  expect(text('social-norms','认同特点')).toContain('稳定性');expect(text('social-norms','内化特点')).toContain('坚定性');expect(text('social-norms','内化含义')).toContain('价值信念');
  expect(text('attitude-nature-formation','行为意向')).toBe('行为意向成分。');expect(text('moral-nature','道德行为')).toBe('道德行为。');
 });
 it('单双面证据对应受教育程度及原态度，情理说服时间限定和对象保留',()=>{
  expect(text('attitude-change','单面证据')).toContain('较低或原来持赞同');expect(text('attitude-change','双面证据')).toContain('较高或原来持反对');
  expect(text('attitude-change','以情动人')).toContain('不能保持长久');expect(text('attitude-change','以理服人')).toContain('长期');
  expect(text('attitude-change','情理措施')).toContain('高年级在情感基础上');
  expect(text('moral-development','无律阶段')).toContain('对偶故事法');expect(text('moral-development','科尔伯格')).toContain('道德两难故事法');
  expect(text('misconduct-correction','转变')).toContain('可能会出现反复');expect(text('misconduct-correction','情感')).toContain('自尊心');
 });
 it('教育心理学八章1195个学习要点覆盖全部73个正文页，参考不入队',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState()),all=[...previous,pack];
  expect(all.reduce((sum,p)=>sum+p.steps.length,0)).toBe(1195);
  expect(all.reduce((sum,p)=>sum+p.knowledge.filter(k=>!k.referenceOnly).length,0)).toBe(111);
  expect(all.reduce((sum,p)=>sum+p.knowledge.filter(k=>k.referenceOnly).length,0)).toBe(96);
  expect([...new Set(all.flatMap(p=>p.knowledge.flatMap(k=>k.refs.map(r=>r.page))))].sort((a,b)=>a-b)).toEqual(Array.from({length:73},(_,i)=>i+7));
  const psychologyIds=new Set(all.flatMap(p=>p.steps.map(t=>t.id)));
  expect(eligibleSteps(s).filter(t=>psychologyIds.has(t.id))).toHaveLength(1195);
 });
 it('认同检索定位社会规范卡片，条件路径均保留',()=>{
  const s=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(s),'认同');
  expect(results.find(r=>r.knowledgeId===node('social-norms').id)?.stepIds).toContain(rows('social-norms').find(s=>s.title==='认同含义')!.id);
 });
});
