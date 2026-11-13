import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {eligibleSteps,makeSession,rateStep} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import data from '../public/content/foreign-proofread-ch21.json';
const pack=data as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());
describe('俄国（苏联）制度校对',()=>{
 it('加载完整章节，按原页定位并排除参考图表',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const state=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);
  expect(state.installedContentPacks).toContain(pack.id);
  expect(pack.knowledge.every(k=>k.chapterId==='history-chapter-20'&&k.refs.every(r=>r.page>=152&&r.page<=157))).toBe(true);
  expect(eligibleSteps(state).filter(s=>s.id.startsWith('foreign-reviewed-ch21-'))).toHaveLength(pack.steps.length);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);
  expect(refs).toHaveLength(4);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(s=>s.knowledgeId===k.id)).toBe(false);}
 });
 it('安装及再次加载保留已有进度、会话、题目和修订',()=>{
  let before=rateStep(initialState(),'practice-0','independent',false,'existing-event',new Date('2026-09-22T01:00:00Z'));
  before.session=makeSession(before,'review',['practice-0','practice-1']);
  before.questions.push({id:'my-question',title:'原有问题',answer:'我的答案',knowledgeIds:['practice']});
  const after=mergeContentPack(before,pack);
  for(const key of ['progress','events','session','questions'] as const)expect(after[key]).toEqual(before[key]);
  const added=after.steps.find(s=>s.id===pack.steps[0].id)!;
  added.text='学习者自己修订的笔记';added.studyMode='read';added.version=2;
  expect(mergeContentPack(after,pack)).toEqual(after);
 });
 it('区分两级学制、改革年代、四五二分支与三级管理',()=>{
  const text=(key:string)=>pack.steps.filter(s=>s.knowledgeId.endsWith(key)).map(s=>s.text).join('\n');
  expect(text('-unified-labor')).toContain('5年制（8～13岁）');
  expect(text('-unified-labor')).toContain('4年制（13～17岁）');
  expect(text('-decision1931')).toContain('1931年');
  expect(text('-reform1958-general')).toContain('7年延长到8年');
  expect(text('-reform1966')).toContain('从七年级起开设选修课');
  expect(text('-reform1977')).toContain('在强调劳动教育的同时也注重科学知识');
  expect(text('-reform1984')).toContain('小学4年，不完全中学5年，中等学校2年');
  expect(text('-reform1984')).toContain('普通中学、中等职业技术学校和中等专业学校');
  expect(text('-federation-admin')).toContain('联邦中央、联邦主体、地方三级管理体制');
  expect(pack.stats.steps).toBe(pack.steps.length);expect(pack.stats.knowledge).toBe(pack.knowledge.length);
 });
});
