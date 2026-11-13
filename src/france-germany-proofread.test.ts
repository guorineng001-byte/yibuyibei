import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {eligibleSteps,makeSession,rateStep} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import fr from '../public/content/foreign-proofread-ch19.json';
import de from '../public/content/foreign-proofread-ch20.json';
const packs=[fr,de] as unknown as ContentPack[];
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());
describe('法国、德国制度校对',()=>{
 it('安装两章，保留跨页总结表的法国归属，学习队列排除原图参考',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const state=await loadBundledContent(initialState());
  for(const [index,p] of packs.entries()){
   expect(validContentPack(p)).toBe(true);
   expect(state.installedContentPacks).toContain(p.id);
   const [lo,hi]=[[140,146],[146,151]][index];
   expect(p.knowledge.every(k=>k.chapterId===`history-chapter-${index+18}`&&k.refs.every(r=>r.page>=lo&&r.page<=hi))).toBe(true);
   expect(eligibleSteps(state).filter(s=>p.steps.some(t=>t.id===s.id))).toHaveLength(p.steps.length);
   for(const k of p.knowledge.filter(k=>k.referenceOnly)){
    expect(k.selected).toBe(false);
    expect(p.steps.some(s=>s.knowledgeId===k.id)).toBe(false);
   }
  }
  const table=fr.knowledge.find(k=>k.id.endsWith('-france-summary'))!;
  expect(table.chapterId).toBe('history-chapter-18');
  expect(table.refs.map(r=>r.page)).toEqual([145,146]);
  expect(table.refs[1].rect[1]+table.refs[1].rect[3]).toBeLessThan(.5);
  expect(de.knowledge.find(k=>k.id.endsWith('-outline'))!.refs[0].rect[1]).toBeGreaterThan(.5);
 });
 it('保留已有真实进度、事件、会话、题目引用和用户学习方式，重复合入不复写',()=>{
  let before=rateStep(initialState(),'practice-0','independent',false,'existing-event',new Date('2026-09-19T01:00:00Z'));
  before.steps.find(s=>s.id==='practice-0')!.text='用户的原有笔记';
  before.steps.find(s=>s.id==='practice-0')!.studyMode='read';
  before.session=makeSession(before,'review',['practice-0','practice-1']);
  before.questions.push({id:'my-question',title:'原有问题',answer:'我的答案',knowledgeIds:['practice']});
  const after=packs.reduce(mergeContentPack,before);
  for(const key of ['progress','events','session','questions'] as const)expect(after[key]).toEqual(before[key]);
  expect(after.steps.find(s=>s.id==='practice-0')).toEqual(before.steps.find(s=>s.id==='practice-0'));
  const added=after.steps.find(s=>s.id===packs[0].steps[0].id)!;
  added.text='学习者修订的法国笔记';added.studyMode='read';added.version=2;
  expect(packs.reduce(mergeContentPack,after)).toEqual(after);
 });
 it('保留易错学制分支、法案差异和双元制分工',()=>{
  const text=(key:string)=>packs.flatMap(p=>p.steps).filter(s=>s.knowledgeId.endsWith(key)).map(s=>s.text).join('\n');
  expect(text('-langevin-system')).toContain('6～18岁免费义务教育');
  expect(text('-reform1959')).toContain('6～16岁');
  expect(text('-reform1959')).toContain('短期职业型、长期职业型、短期普通型、长期普通型');
  expect(text('-haby')).toContain('工具课程（数学、法语）上午上课');
  expect(text('-weimar')).toContain('职业学校培训职业知识，企业培训实操技能');
  expect(text('-hamburg')).toContain('7年，可升入学术型大学');
  expect(text('-berlin')).toContain('学术造诣');
  for(const p of packs){expect(p.stats.steps).toBe(p.steps.length);expect(p.stats.knowledge).toBe(p.knowledge.length);}
 });
});
