import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {eligibleSteps,makeSession,rateStep} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import japan from '../public/content/foreign-proofread-ch23.json';
import educators from '../public/content/foreign-proofread-ch24.json';
const packs=[japan,educators] as unknown as ContentPack[];
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());
describe('日本与三星级教育家两章校对',()=>{
 it('正常启动安装两章，原图参考不进入复习，重复加载不重复导入',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const state=await loadBundledContent(initialState());
  for(const [i,p] of packs.entries()){
   expect(validContentPack(p)).toBe(true);expect(state.installedContentPacks).toContain(p.id);
   expect(p.knowledge.every(k=>k.chapterId===`history-chapter-${22+i}`)).toBe(true);
   expect(eligibleSteps(state).filter(s=>s.id.startsWith(`foreign-reviewed-ch${23+i}-`))).toHaveLength([91,180][i]);
   const references=p.knowledge.filter(k=>k.referenceOnly);expect(references).toHaveLength(4);
   for(const k of references){expect(k.selected).toBe(false);expect(p.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  }
  const again=await loadBundledContent(state);expect(again.knowledge).toEqual(state.knowledge);expect(again.steps).toEqual(state.steps);
 });
 it('跨页来源和章节边界准确，保留原书脚注与易混概念',()=>{
  const node=(i:number,key:string)=>packs[i].knowledge.find(k=>k.id.endsWith('-'+key))!;
  expect(node(0,'laws1947').refs.map(r=>r.page)).toEqual([167,168]);
  expect(node(0,'meiji-comparison').refs.map(r=>r.page)).toEqual([166,167]);
  expect(node(0,'outline').refs[0].rect![1]).toBeGreaterThan(.66);
  expect(node(1,'locke').refs.map(r=>r.page)).toEqual([171,172]);
  expect(node(1,'zankov').refs.map(r=>r.page)).toEqual([177,178]);
  expect(packs[0].knowledge.every(k=>k.refs.every(r=>r.page>=165&&r.page<=170))).toBe(true);
  expect(packs[1].knowledge.every(k=>k.refs.every(r=>r.page>=171&&r.page<=178))).toBe(true);
  const text=(i:number,key:string)=>packs[i].steps.filter(t=>t.knowledgeId.endsWith('-'+key)).map(t=>t.text).join('\n');
  expect(text(0,'rescript')).toContain('实际于19世纪末期颁布');
  expect(text(0,'laws1947')).toContain('全体国民接受9年义务教育');
  expect(text(0,'laws1947')).toContain('以法律主义取代敕令主义');
  expect(text(1,'diesterweg')).toContain('遵循文化应该让位于遵循自然');
  expect(text(1,'zankov')).toContain('一般发展不同于全面发展');
  expect(text(1,'sukhomlinsky')).toContain('相互独立、相互渗透');
 });
 it('合入两章保留学习历史和未完成队列，保护用户后续改写',()=>{
  let before=rateStep(initialState(),'practice-0','independent',false,'old-event',new Date('2026-09-26T02:00:00Z'));
  before.session=makeSession(before,'review',['practice-0','practice-1']);
  before.questions.push({id:'old-q',title:'问题',answer:'答案',knowledgeIds:['practice']});
  let after=before;for(const p of packs)after=mergeContentPack(after,p);
  for(const key of ['progress','events','session','questions'] as const)expect(after[key]).toEqual(before[key]);
  for(const p of packs){const s=after.steps.find(t=>t.id===p.steps[0].id)!;s.text='我的改写';s.version=2;s.studyMode='read';}
  let again=after;for(const p of packs)again=mergeContentPack(again,p);expect(again).toEqual(after);
 });
});
