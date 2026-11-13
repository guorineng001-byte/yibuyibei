import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import data from '../public/content/foreign-proofread-ch26.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());
describe('近现代教育思潮全章校对',()=>{
 it('启动安装最后一章全部内容，参考图不入队，重复加载不重复导入',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const state=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(state)).toBe(true);
  expect(state.installedContentPacks).toContain(pack.id);
  expect(pack.knowledge).toHaveLength(40);expect(pack.steps).toHaveLength(273);
  expect(pack.knowledge.every(k=>k.chapterId==='history-chapter-25')).toBe(true);
  expect(eligibleSteps(state).filter(t=>t.id.startsWith('foreign-reviewed-ch26-'))).toHaveLength(273);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(12);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  const again=await loadBundledContent(state);expect(again.knowledge).toEqual(state.knowledge);expect(again.steps).toEqual(state.steps);
 });
 it('覆盖正文204至214，接回两组跨页内容，保留实验差异及图表文字',()=>{
  const node=(key:string)=>pack.knowledge.find(k=>k.id.endsWith('-'+key))!;
  expect(node('naturalism').refs.map(r=>r.page)).toEqual([204,205]);
  expect(node('psychologization').refs.map(r=>r.page)).toEqual([205,206]);
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:11},(_,i)=>204+i));
  const text=(key:string)=>pack.steps.filter(t=>t.knowledgeId===node(key).id).map(t=>t.text).join('\n');
  expect(text('psychologization')).toContain('教师培训的质量');
  expect(text('organic-school')).toContain('反对放纵儿童');
  expect(text('gary')).toContain('上下午对调');
  expect(text('winnetka')).toContain('无确定程序，不考试');
  expect(text('dalton')).toContain('自由与合作');
  expect(text('kerschensteiner')).toContain('目的、手段与机构的关系');
  expect(text('neo-traditional')).toContain('20世纪70年代“返回基础”');
  expect(pack.knowledge.filter(k=>k.section?.startsWith('第三节')&&!k.referenceOnly)).toHaveLength(9);
 });
 it('安装保留旧学习记录、问题和未完成队列，重复加载保护用户改写',()=>{
  const before=rateStep(initialState(),'practice-0','independent',false,'old-event',new Date('2026-10-09T02:00:00Z'));
  before.session=makeSession(before,'review',['practice-0','practice-1']);
  before.questions.push({id:'old-q',title:'问题',answer:'答案',knowledgeIds:['practice']});
  const after=mergeContentPack(before,pack);
  for(const key of ['progress','events','session','questions','assemblies'] as const)expect(after[key]).toEqual(before[key]);
  const step=after.steps.find(t=>t.id===pack.steps[0].id)!;step.text='我的改写';step.version=2;step.studyMode='read';
  expect(mergeContentPack(after,pack)).toEqual(after);
 });
});
