import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {eligibleSteps,makeSession,rateStep} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import data from '../public/content/foreign-proofread-ch25.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());
describe('五星级教育家全章校对',()=>{
 it('正常启动完整安装48张学习卡和30项参考，460个要点进入复习且重复安装幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const state=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(state.installedContentPacks).toContain(pack.id);
  expect(pack.knowledge).toHaveLength(78);
  expect(pack.knowledge.every(k=>k.chapterId==='history-chapter-24')).toBe(true);
  expect(eligibleSteps(state).filter(s=>s.id.startsWith('foreign-reviewed-ch25-'))).toHaveLength(460);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(30);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  const again=await loadBundledContent(state);expect(again.knowledge).toEqual(state.knowledge);expect(again.steps).toEqual(state.steps);
 });
 it('跨页内容完整接续，来源覆盖179至203且不混入下一章',()=>{
  const node=(key:string)=>pack.knowledge.find(k=>k.id.endsWith('-'+key))!;
  for(const [key,pages] of [['herbart-moral',[188,189]],['herbart-curriculum',[189,190]],['froebel-thought',[191,192]],['dewey-life',[197,198]]] as const)expect(node(key).refs.map(r=>r.page)).toEqual(pages);
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:25},(_,i)=>179+i));
  const text=(key:string)=>pack.steps.filter(t=>t.knowledgeId.endsWith('-'+key)).map(t=>t.text).join('\n');
  expect(text('comenius-system')).toContain('1～6岁，母育学校');
  expect(text('herbart-teaching')).toContain('预备、提示、联想、系统和方法');
  expect(text('herbart-teaching')).toContain('专心，心理状态为静止，兴趣阶段为注意');
  expect(text('froebel-thought')).toContain('家庭教育的“补充”而非“代替”');
  expect(text('montessori-practice')).toContain('以触觉训练为主');
  expect(text('dewey-growth')).toContain('尊重儿童但不同意放纵儿童');
 });
 it('加入内容保留历史、问题和未完成队列，保护用户改写',()=>{
  const before=rateStep(initialState(),'practice-0','independent',false,'old-event',new Date('2026-09-26T02:00:00Z'));
  before.session=makeSession(before,'review',['practice-0','practice-1']);
  before.questions.push({id:'old-q',title:'问题',answer:'答案',knowledgeIds:['practice']});
  const after=mergeContentPack(before,pack);
  for(const key of ['progress','events','session','questions'] as const)expect(after[key]).toEqual(before[key]);
  const step=after.steps.find(t=>t.id===pack.steps[0].id)!;step.text='我的改写';step.version=2;step.studyMode='read';
  expect(mergeContentPack(after,pack)).toEqual(after);
 });
});
