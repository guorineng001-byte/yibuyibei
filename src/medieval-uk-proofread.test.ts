import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {emptyProgress,eligibleSteps} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import ch16 from '../public/content/foreign-proofread-ch16.json';
import ch17 from '../public/content/foreign-proofread-ch17.json';
import ch18 from '../public/content/foreign-proofread-ch18.json';
const packs=[ch16,ch17,ch18] as unknown as ContentPack[];
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());
describe('中世纪、宗教改革与英国制度连续校对',()=>{
 it('全量加载器安装三章，各节点落在本章原页范围内，图表不进入学习队列',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const state=await loadBundledContent(initialState());
  for(const [index,p] of packs.entries()){
   expect(validContentPack(p)).toBe(true);
   expect(state.installedContentPacks).toContain(p.id);
   const [lo,hi]=[[125,127],[128,131],[132,139]][index];
   expect(p.knowledge.every(k=>k.chapterId===`history-chapter-${index+15}`&&k.confirmed&&k.refs.every(r=>r.page>=lo&&r.page<=hi))).toBe(true);
   expect(eligibleSteps(state).filter(s=>p.steps.some(t=>t.id===s.id))).toHaveLength(p.steps.length);
   for(const k of p.knowledge.filter(k=>k.referenceOnly))expect(state.steps.some(s=>s.knowledgeId===k.id)).toBe(false);
  }
  expect(state.books[0].pageRotations?.['139']).toBe(90);
 });
 it('连续升级与重复合入保留学习方式、用户文字、进度、事件和会话',()=>{
  const state=initialState(),original=state.steps[0];
  original.text='用户自己的笔记';original.version=2;original.studyMode='read';
  state.progress[original.id]={...emptyProgress(),reads:3};
  let next=packs.reduce(mergeContentPack,state);
  const added=next.steps.find(s=>s.id===packs[0].steps[0].id)!;
  added.text='用户修改的中世纪笔记';added.studyMode='read';added.version=2;
  const before=structuredClone(next);
  next=packs.reduce(mergeContentPack,next);
  expect(next).toEqual(before);
  expect(next.steps.find(s=>s.id===original.id)).toEqual(original);
  expect(next.progress).toEqual(state.progress);
  expect(next.events).toEqual(state.events);
  expect(next.session).toEqual(state.session);
 });
 it('关键图示顺序、年龄与两派差异准确，统计与实际一致',()=>{
  const text=(prefix:string)=>packs.flatMap(p=>p.steps).filter(s=>s.knowledgeId.endsWith(prefix)).map(s=>s.text).join('\n');
  expect(text('-james')).toContain('普通高等教育阶段 → 职前培训阶段 → 职后培训阶段');
  expect(text('-luther-theory')).toContain('强迫义务教育');
  expect(text('-calvin-theory')).toContain('免费教育');
  expect(text('-knight')).toContain('骑马、游泳、投枪、击剑、打猎、弈棋和吟诗');
  expect(text('-reform1988-content')).toContain('7岁、11岁、14岁、16岁各一次');
  for(const p of packs){
   expect(p.stats.knowledge).toBe(p.knowledge.length);expect(p.stats.steps).toBe(p.steps.length);
   expect(new Set(p.steps.map(s=>s.id)).size).toBe(p.steps.length);
  }
 });
});
