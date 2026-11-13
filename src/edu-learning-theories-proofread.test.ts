import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook,EDU_BOOK_ID} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import firstData from '../public/content/edu-proofread-ch1.json';
import data from '../public/content/edu-proofread-ch2.json';
const pack=data as unknown as ContentPack,firstPack=firstData as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch2-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const content=(key:string)=>rows(key).map(s=>s.text).join('\n');
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教心第二章学习及其理论解释校对',()=>{
 it('自动安装第二章264个要点，首章208个要点仍可学习，重复刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);expect(s.books).toHaveLength(2);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-1')).toHaveLength(51);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch2-'))).toHaveLength(264);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch1-'))).toHaveLength(208);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('来源覆盖18至37页，接回五组跨页正文与表格，参考图不入学习队列',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:20},(_,i)=>18+i));
  for(const [key,pages] of [['learning-classification',[19,20]],['behavior-new',[25,26]],['behavior-table',[24,25]],['ausubel',[30,31]],['cognitive-load',[32,33]]] as const)expect(node(key).refs.map(r=>r.page)).toEqual(pages);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(27);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  expect(pack.knowledge.every(k=>k.confirmed&&k.bookId===EDU_BOOK_ID&&k.chapterId==='edu-chapter-1')).toBe(true);
 });
 it('264个叶节点各出现一次，原书顺序、层级标识与完整章节队列一致',()=>{
  let count=0;
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);count+=ss.length;
  }
  expect(count).toBe(264);
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch2-')).map(t=>t.id));
  if(!session)throw new Error('第二章完整复习队列未能创建');
  expect(session.queue).toHaveLength(264);expect(new Set(session.queue).size).toBe(264);
 });
 it('新包保护教育史及首章改写、进度、事件、题目、学习方式和未完成队列',()=>{
  let before=mergeContentPack(registerEduBook(initialState()),firstPack);
  before=rateStep(before,firstPack.steps[0].id,'independent',false,'first-chapter-event',new Date('2026-10-13T02:00:00Z'));
  before.session=makeSession(before,'review',['practice-0',firstPack.steps[0].id]);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[firstPack.knowledge[1].id]});
  for(const id of ['practice-0',firstPack.steps[0].id]){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='第二章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('保留易混概念与关键限定，补回OCR漏识别的阶段配对和原文专名',()=>{
  expect(content('learning-meaning')).toContain('表现也不一定因学习而产生');
  const negative=rows('skinner').find(s=>s.title==='负强化')!;expect(negative.text).toContain('消除厌恶刺激');expect(negative.text).toContain('增加');
  expect(rows('skinner').find(s=>s.title==='负惩罚')?.text).toContain('消除愉快刺激');
  expect(content('bandura')).toContain('并非学生新学到的行为');
  expect(content('tolman')).toContain('不强化也会出现学习');
  expect(content('ausubel')).toContain('不是惰性知识');expect(content('ausubel')).toContain('均相关联');
  expect(content('gagne')).toContain('7±2');expect(content('gagne')).toContain('0.25～2秒');
  expect(rows('gagne').find(s=>s.title==='回忆阶段')?.text).toContain('引导学生自己提供线索');
  expect(content('cognitive-constructivism')).toContain('不同目的、从不同角度');
 });
 it('四种间歇强化按时段和次数配对，八种阶段与教学事件逐行对应',()=>{
  const increase=rows('behavior-increase');
  expect(increase.find(s=>s.title==='定时强化')?.text).toContain('固定时段');
  expect(increase.find(s=>s.title==='定比强化')?.text).toContain('固定反应次数');
  expect(increase.find(s=>s.title==='变时强化')?.text).toContain('不定时');
  expect(increase.find(s=>s.title==='变比强化')?.text).toContain('不定反应次数');
  expect(increase.find(s=>s.title==='变比强化')?.text).toContain('难以消退');
  const stages=rows('gagne').filter(s=>s.outlinePath?.[0]==='（二）学习阶段与教学设计');
  expect(stages.map(s=>s.displayTitle)).toEqual(['动机','领会','习得','保持','回忆','概括','操作（作业）','反馈']);
  expect(stages.every(s=>s.text.includes('学习事件：')&&s.text.includes('教学事件：'))).toBe(true);
 });
 it('知识检索能查到第二章深层要点并定位同一来源卡片',()=>{
  const state=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(state),'变比强化');
  expect(results.find(r=>r.knowledgeId===node('behavior-increase').id)?.stepIds).toContain(rows('behavior-increase').find(s=>s.title==='变比强化')!.id);
 });
});
