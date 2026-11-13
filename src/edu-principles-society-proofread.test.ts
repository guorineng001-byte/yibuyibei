import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import data from '../public/content/edu-proofread-ch10.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:9},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch10-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教原第二章教育与社会发展校对',()=>{
 it('自动安装150项且教心八章与教原首章1326项保留，重复加载幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-9')).toHaveLength(24);
  for(const [ch,count] of [[1,208],[2,264],[3,150],[4,146],[5,93],[6,101],[7,127],[8,106],[9,131],[10,150]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖89至95页，万能论跨页且横表旋转，共页来源止于第二章，五参考不入队',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual([89,90,91,92,93,94,95]);
  expect(node('education-omnipotence').refs.map(r=>r.page)).toEqual([90,91]);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(5);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  for(const k of pack.knowledge)for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}
 });
 it('150项按框架顺序各出现一次，全部学习卡及复习队列无遗漏',()=>{
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);
  }
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch10-')).map(t=>t.id));
  expect(session?.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session?.queue).size).toBe(150);
 });
 it('保护教育史和教心八章与教原首章用户改写、阅读方式、进度、题目和未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[9],'independent',false,'principles-first-event',new Date('2026-10-17T02:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[previous[8].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  const materialBooks=(s:typeof before)=>s.books.map(({pageRotations,...book})=>book);
  expect(materialBooks(next)).toEqual(materialBooks(before));
  expect(next.books.find(b=>b.id===pack.bookId)?.pageRotations?.['93']).toBe(90);
  for(const key of ['chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='教原第二章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('劳动力市场两类前提与筛选信号标识区分，万能论局限和教育相对独立性同时保留',()=>{
  expect(text('labor-market','市场划分')).toContain('相对的封闭性');
  expect(text('labor-market','次要市场不成立')).toContain('未必');
  expect(text('screening','信号')).toContain('可以改变');expect(text('screening','标识')).toContain('不能改变');
  expect(text('education-omnipotence','夸大教育作用')).toContain('夸大');
  expect(text('relative-independence','非绝对独立的制约')).toContain('生产力');
 });
 it('社会制约与社会功能各六类不互换，文化功能四项原序保留',()=>{
  expect(rows('social-constraints')).toHaveLength(21);expect(rows('social-functions')).toHaveLength(22);
  expect(text('social-constraints','政治教育性质')).toContain('决定教育性质');
  expect(text('social-functions','文化融合')).toBe('传播、交流与丰富。');
  expect(text('social-functions','优化人口结构')).toBe('优化人口结构。');
 });
 it('原页93旋转及坐标合法，95页第二章范围不延伸至第三章，用户旋转偏好优先',()=>{
  expect(pack.pageRotations).toEqual({'93':90});
  for(const k of pack.knowledge)for(const r of k.refs.filter(r=>r.page===95))expect(r.rect![1]+r.rect![3]).toBeLessThanOrEqual(.48);
  expect(pack.knowledge.every(k=>k.chapterId==='edu-chapter-9')).toBe(true);
  const s=registerEduBook(initialState());s.books.find(b=>b.id===pack.bookId)!.pageRotations={'93':270};
  expect(mergeContentPack(s,pack).books.find(b=>b.id===pack.bookId)?.pageRotations?.['93']).toBe(270);
 });
 it('人工智能八项与信息化五项不混列，教育先行的经济承载和适度限定可检索',()=>{
  expect(rows('artificial-intelligence').filter(s=>s.outlinePath?.[0]==='教育变革')).toHaveLength(8);
  expect(rows('informatization').filter(s=>s.outlinePath?.[0]==='教育变革')).toHaveLength(5);
  expect(text('education-priority','教育先行含义')).toContain('经济能力可承载');
  expect(text('education-priority','教育先行含义')).toContain('优先发展必须适度');
  const s=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(s),'文凭');
  expect(results.some(r=>r.knowledgeId===node('screening').id)).toBe(true);
 });
});
