import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import finalData from '../public/content/edu-proofread-ch17.json';
const pack=finalData as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:16},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch17-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教原第九章与教心教原全册收尾',()=>{
 it('正式启动自动追加最后179项，前十六包2552项保留，重复刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(s.installedContentPacks).toContain(pack.id);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-16')).toHaveLength(37);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch17-'))).toHaveLength(179);
  const oldIds=new Set(previous.flatMap(p=>p.steps.map(t=>t.id)));
  expect(eligibleSteps(s).filter(t=>oldIds.has(t.id))).toHaveLength(2552);
  expect(await loadBundledContent(s)).toEqual(s);expect(validateBackup(s)).toBe(true);
 });
 it('全17章完整覆盖148个正文页，每章都有确认学习内容，前后共享95页无漏页',()=>{
  const all=[...previous,pack];
  expect(all.flatMap(p=>p.steps)).toHaveLength(2731);
  expect(all.flatMap(p=>p.knowledge)).toHaveLength(536);
  expect(all.flatMap(p=>p.knowledge).filter(k=>!k.referenceOnly)).toHaveLength(347);
  const pages=[...new Set(all.flatMap(p=>p.knowledge.flatMap(k=>k.refs.map(r=>r.page))))].sort((a,b)=>a-b);
  expect(pages).toEqual([...Array.from({length:73},(_,i)=>i+7),...Array.from({length:75},(_,i)=>i+81)]);
  for(let i=0;i<17;i++)expect(all[i].knowledge.some(k=>k.confirmed&&!k.referenceOnly&&k.chapterId===`edu-chapter-${i}`)).toBe(true);
 });
 it('全部179个叶唯一且顺序等于实际复习队列，10项参考排除，来源边界有效',()=>{
  expect(pack.knowledge.filter(k=>k.referenceOnly)).toHaveLength(10);
  expect(new Set(pack.knowledge.map(k=>k.order)).size).toBe(37);
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(t=>t.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(t=>t.id));
   const keys:string[]=[];const walk=(ns:StepOutlineGroup[])=>{for(const n of ns){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size).toBe(keys.length);
   if(k.referenceOnly){expect(k.selected).toBe(false);expect(ss).toHaveLength(0);}
   for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(r.page).toBeGreaterThanOrEqual(149);expect(r.page).toBeLessThanOrEqual(155);expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}
  }
  const s=mergeContentPack(registerEduBook(initialState()),pack),ids=new Set(pack.steps.map(t=>t.id));
  expect(makeSession(s,'review',eligibleSteps(s).filter(t=>ids.has(t.id)).map(t=>t.id))?.queue).toEqual(pack.steps.map(t=>t.id));
 });
 it('追加保护历史及前十六包改写、学习方式、进度、事件、题目与未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[16],'independent',false,'kept-final-chapter-event',new Date('2026-10-28T01:00:00Z'));
  before.session=makeSession(before,'review',ids);before.session!.cursor=8;
  before.questions.push({id:'kept-final-question',title:'自己的题目',answer:'自己的答案',knowledgeIds:[previous[15].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(t=>t.id===id)!;s.text='用户已有改写';s.version=2;s.studyMode='read';}
  const frozen=structuredClone(before),next=mergeContentPack(before,pack);
  expect(before).toEqual(frozen);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='最后一章自己的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('年龄表20个单元格按四学段五维准确对应，不跟随OCR混行',()=>{
  expect(['preschool','primary','junior','senior'].map(k=>rows('age-'+k).length)).toEqual([5,5,5,5]);
  expect(text('age-preschool','情绪情感')).toContain('社会性情感体验');
  expect(text('age-primary','情绪情感')).toContain('外显');
  expect(text('age-primary','自我意识')).toContain('自我控制');
  expect(text('age-junior','心理')).toContain('不平衡');
  expect(text('age-senior','情绪情感')).toContain('两面性');
  expect(text('age-senior','自我意识')).toContain('同一性');
 });
 it('教师五类劳动特点、专业素养三分支及队伍与个体发展途径完整',()=>{
  expect(rows('teacher-labor')).toHaveLength(13);expect(rows('professional-qualities')).toHaveLength(10);
  expect(rows('development-orientations')).toHaveLength(6);expect(rows('development-paths')).toHaveLength(12);
  expect(text('teacher-labor','长效性')).toContain('参加工作以后');
  expect(text('professional-standards','标准理念')).toContain('学生为本');
  expect(text('development-paths','青蓝工程')).toContain('青蓝工程');
  expect(node('qualities-standards-source').refs.map(r=>r.page)).toEqual([150,151]);
 });
 it('师生权利义务按表格分栏，学生观十项、群体双面影响与略项保持原书范围',()=>{
  expect(rows('student-rights')).toHaveLength(8);expect(rows('student-duties')).toHaveLength(7);
  expect(rows('student-view')).toHaveLength(12);
  expect(text('teacher-extra-rights','教师补充权利')).toContain('申诉权');
  expect(text('student-groups','非正式群体特点')).toContain('消极');
  expect(text('student-organizations','少年正式组织')).toContain('准自治性');
  expect(text('relationship-standards','教育关系')).toContain('教师主导，学生主体');
  expect(node('relationship-omitted').referenceOnly).toBe(true);expect(rows('relationship-omitted')).toHaveLength(0);
 });
 it('最后一章新卡可检索，教师专业自主与师生移情体验能定位',()=>{
  const index=buildSearchIndex(mergeContentPack(registerEduBook(initialState()),pack));
  expect(searchKnowledge(index,'专业自主').some(r=>r.knowledgeId===node('teacher-rights').id)).toBe(true);
  expect(searchKnowledge(index,'移情体验').some(r=>r.knowledgeId===node('relationship-methods').id)).toBe(true);
 });
});
