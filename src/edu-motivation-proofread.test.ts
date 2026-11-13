import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook,EDU_BOOK_ID} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import firstData from '../public/content/edu-proofread-ch1.json';
import secondData from '../public/content/edu-proofread-ch2.json';
import data from '../public/content/edu-proofread-ch3.json';
const pack=data as unknown as ContentPack,firstPack=firstData as unknown as ContentPack,secondPack=secondData as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch3-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const content=(key:string)=>rows(key).map(s=>s.text).join('\n');
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教心第三章学习动机校对',()=>{
 it('自动安装150个要点，前两章208和264个要点保持完整，刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);expect(s.books).toHaveLength(2);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-2')).toHaveLength(25);
  for(const [ch,count] of [[1,208],[2,264],[3,150]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖38至46页、接回罗杰斯跨页应用，13项原图不入学习队列',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:9},(_,i)=>38+i));
  expect(node('rogers').refs.map(r=>r.page)).toEqual([40,41]);
  expect(rows('rogers').filter(s=>s.outlinePath?.[0]==='2. 应用')).toHaveLength(10);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(13);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  expect(pack.knowledge.every(k=>k.confirmed&&k.bookId===EDU_BOOK_ID&&k.chapterId==='edu-chapter-2')).toBe(true);
  expect(pack.steps.every(s=>s.studyMode==='memorize')).toBe(true);
 });
 it('150个叶节点各出现一次，层级标识唯一且与完整复习队列顺序一致',()=>{
  let count=0;
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);count+=ss.length;
  }
  expect(count).toBe(150);
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch3-')).map(t=>t.id));
  if(!session)throw new Error('第三章完整复习队列未能创建');
  expect(session.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session.queue).size).toBe(150);
 });
 it('安装保护教育史及前两章改写、学习方式、进度、题目和未完成队列',()=>{
  let before=mergeContentPack(mergeContentPack(registerEduBook(initialState()),firstPack),secondPack);
  before=rateStep(before,secondPack.steps[0].id,'independent',false,'second-chapter-event',new Date('2026-10-13T02:00:00Z'));
  before.session=makeSession(before,'review',['practice-0',firstPack.steps[0].id,secondPack.steps[0].id]);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[secondPack.knowledge[1].id]});
  for(const id of ['practice-0',firstPack.steps[0].id,secondPack.steps[0].id]){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='第三章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('还原归因表三个维度的六行配对及努力归因的否定限定',()=>{
  const dimensions=rows('attribution').filter(s=>s.outlinePath?.[1]==='（2）核心：三个维度、六个因素');
  expect(dimensions.map(s=>s.displayTitle)).toEqual(['能力高低','努力程度','任务难度','运气好坏','身心状态','外界环境']);
  expect(dimensions.map(s=>s.text.split('。')[0])).toEqual(['稳定、内部、不可控','不稳定、内部、可控','稳定、外部、不可控','不稳定、外部、不可控','不稳定、内部、不可控','不稳定、外部、不可控']);
  expect(content('attribution')).toContain('不能极端地把一切都归因于努力');
  expect(content('attribution')).toContain('避免产生习得性无助');
 });
 it('保留公式正负与零、目标定向四类型及外部动机四种调节的归属',()=>{
  const formulas=content('atkinson');
  for(const text of ['Ts = Ms × Ps × Is','Taf = Maf × Paf × Iaf','T = Ts − Taf','T > 0','T < 0','T = 0','Ps + Is = 1','50%'])expect(formulas).toContain(text);
  const goals=rows('goal-orientation').filter(s=>s.outlinePath?.[1]==='（2）理论的发展');
  expect(goals.map(s=>s.displayTitle)).toEqual(['①掌握趋近目标','②掌握回避目标','③表现趋近目标','④表现回避目标']);
  const regulation=rows('self-determination').filter(s=>s.outlinePath?.[2]==='外部动机');
  expect(regulation.map(s=>s.displayTitle)).toEqual(['外部调节','内摄调节','认同调节','整合调节']);
  expect(rows('self-determination').find(s=>s.title==='内部调节')?.outlinePath?.[2]).toBe('内部动机');
  expect(content('motivation-cultivation')).toContain('仍然要不断地激发其外部学习动机');
 });
 it('搜索可定位整合调节，显示外部动机父级及同一来源卡片',()=>{
  const state=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(state),'整合调节');
  expect(results.find(r=>r.knowledgeId===node('self-determination').id)?.stepIds).toContain(rows('self-determination').find(s=>s.title==='整合调节')!.id);
 });
});
