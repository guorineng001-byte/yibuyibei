import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {eligibleSteps,makeSession,rateStep} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import data from '../public/content/foreign-proofread-ch22.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());
describe('美国教育制度校对',()=>{
 it('加载整章并保留跨页来源、总结表边界和原图参考的阅读属性',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const state=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);
  expect(state.installedContentPacks).toContain(pack.id);
  expect(pack.knowledge.every(k=>k.chapterId==='history-chapter-21'&&k.refs.every(r=>r.page>=158&&r.page<=165))).toBe(true);
  expect(eligibleSteps(state).filter(s=>s.id.startsWith('foreign-reviewed-ch22-'))).toHaveLength(134);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);
  expect(refs).toHaveLength(5);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(s=>s.knowledgeId===k.id)).toBe(false);}
  const node=(key:string)=>pack.knowledge.find(k=>k.id.endsWith(key))!;
  expect(node('-eight-year').refs.map(r=>r.page)).toEqual([160,161]);
  expect(node('-nation-at-risk').refs.map(r=>r.page)).toEqual([163,164]);
  expect(node('-goals2000').refs.map(r=>r.page)).toEqual([164,165]);
  const table=node('-summary').refs[0];expect(table.page).toBe(165);expect(table.rect).toBeDefined();expect(table.rect![1]+table.rect![3]).toBeLessThan(.66);
 });
 it('合入内容后保留旧记录、题目、会话，并保留用户对新章的后续修改',()=>{
  let before=rateStep(initialState(),'practice-0','independent',false,'existing-event',new Date('2026-09-22T02:00:00Z'));
  before.steps.find(s=>s.id==='practice-0')!.text='原有笔记';
  before.session=makeSession(before,'review',['practice-0','practice-1']);
  before.questions.push({id:'question',title:'原有问题',answer:'原有答案',knowledgeIds:['practice']});
  const after=mergeContentPack(before,pack);
  for(const key of ['progress','events','session','questions'] as const)expect(after[key]).toEqual(before[key]);
  expect(after.steps.find(s=>s.id==='practice-0')).toEqual(before.steps.find(s=>s.id==='practice-0'));
  const added=after.steps.find(s=>s.id===pack.steps[0].id)!;
  added.text='我的美国教育史笔记';added.studyMode='read';added.version=2;
  expect(mergeContentPack(after,pack)).toEqual(after);
 });
 it('保留漏识别句、研究样本单位、七项目标主次与易混课程组合',()=>{
  const text=(key:string)=>pack.steps.filter(s=>s.knowledgeId.endsWith(key)).map(s=>s.text).join('\n');
  expect(text('-junior-college-development')).toContain('取得“初级证书”后，才能进入第二阶段学习');
  expect(text('-eight-year')).toContain('1475对大学生');
  expect(text('-eight-year')).toContain('1933—1941年');
  expect(text('-principles1918')).toContain('公民资格、职业、高尚的家庭成员标为主要目标');
  expect(text('-principles1918')).toContain('初级中学3年（12～15岁）');
  expect(text('-national-defense')).toContain('新三艺”（数学、外语、自然科学）');
  expect(text('-nation-at-risk')).toContain('数学、英语、自然科学、社会科学、计算机课程');
  expect(text('-morrill')).toContain('三万英亩');
  expect(text('-america2000')).toContain('至少提高到90%');
  expect(text('-goals2000')).toContain('1994年');
  expect(text('-goals2000')).toContain('课程内容标准和学生操作绩效标准');
  expect(pack.stats.steps).toBe(pack.steps.length);expect(pack.stats.knowledge).toBe(pack.knowledge.length);
 });
});
