import {afterEach,describe,expect,it,vi} from 'vitest';
import example from '../public/guide/learning-package-example.json';
import {initialState} from './seed';
import {emptyProgress,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent} from './content';
import {exportLearningPackage,importLearningPackage,parseLearningPackage,previewLearningPackage} from './learningPackage';
const defaults={adoptChanges:false,keepReviewed:false};
const sample=()=>parseLearningPackage(structuredClone(example));
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
function studied(){
 const pack=sample();pack.knowledge=pack.knowledge.map(k=>({...k,confirmed:true,selected:true}));
 let state=importLearningPackage(initialState(),pack,{...defaults,keepReviewed:true});
 state.session=makeSession(state,'new',[pack.steps[0].id]);state=rateStep(state,pack.steps[0].id,'independent',false,'package-event');
 state.progress['practice-0']={...emptyProgress(),reads:4};
 state.steps.find(t=>t.id===pack.steps[1].id)!.studyMode='read';
 state.progress[pack.steps[1].id]={...emptyProgress(),reads:2};
 return {state,pack};
}
afterEach(()=>vi.unstubAllGlobals());

describe('Agent 学习包',()=>{
 it('预览不写入状态，导入新书时保留设置与旧进度',()=>{
  const pack=sample(),state=initialState(),before=structuredClone(state);
  state.settings.targetSchool='测试院校';state.progress['practice-0']={...emptyProgress(),reads:3};
  const plan=previewLearningPackage(state,pack);
  expect(plan).toMatchObject({newBook:true,newChapters:1,newKnowledge:2,newSteps:3,changes:[]});
  expect(state.books).toEqual(before.books);
  const next=importLearningPackage(state,pack,defaults);
  expect(next.books).toHaveLength(2);expect(next.books.at(-1)).toMatchObject({id:pack.book.id,missing:true,source:pack.book.source});
  expect(next.settings).toEqual(state.settings);expect(next.progress).toEqual(state.progress);expect(next.events).toEqual(state.events);
  expect(next.knowledge.filter(k=>k.bookId===pack.book.id).every(k=>!k.confirmed&&!k.selected)).toBe(true);
  expect(next.steps.filter(t=>t.knowledgeId===pack.knowledge[0].id)).toHaveLength(2);
  expect(validateBackup(next)).toBe(true);
 });
 it('重复导入相同包保持条目数量、进度及状态不变',()=>{
  const pack=sample(),state=importLearningPackage(initialState(),pack,defaults),next=importLearningPackage(state,parseLearningPackage(JSON.stringify(pack)),defaults);
  expect(previewLearningPackage(state,pack)).toMatchObject({newBook:false,newChapters:0,newKnowledge:0,newSteps:0,unchangedSteps:3,changes:[]});
  expect(next).toEqual(state);
 });
 it('包自称已校对也默认按草稿导入，只有用户明确选择才保留标记',()=>{
  const pack=sample();pack.knowledge[0].confirmed=true;pack.knowledge[0].selected=true;
  const draft=importLearningPackage(initialState(),pack,defaults),reviewed=importLearningPackage(initialState(),pack,{...defaults,keepReviewed:true});
  expect(draft.knowledge.find(k=>k.id===pack.knowledge[0].id)).toMatchObject({confirmed:false,selected:false});
  expect(reviewed.knowledge.find(k=>k.id===pack.knowledge[0].id)).toMatchObject({confirmed:true,selected:true});
  expect(reviewed.knowledge.find(k=>k.id===pack.knowledge[1].id)?.confirmed).toBe(false);
 });
 it('默认保留现有修订、回忆记录与当前会话',()=>{
  const {state,pack}=studied();pack.steps[0].text='整理包的新表述';pack.steps[1].title='新的标题';
  const plan=previewLearningPackage(state,pack);
  expect(plan.changes.filter(c=>c.resetsProgress)).toHaveLength(1);
  const next=importLearningPackage(state,pack,defaults);
  expect(next).toEqual(state);
 });
 it('仅层级、定位或分页说明变化也能在修订详情中核对',()=>{
  const {state,pack}=studied();
  pack.book.offset=1;pack.chapters[0].order=2;pack.knowledge[0].refs[0].rect=[0.1,0.2,0.3,0.4];pack.knowledge[0].reviewNote='核对第二栏';pack.steps[0].outlinePath=['第一节','核心动作'];pack.steps[0].keywords=['概括'];
  const plan=previewLearningPackage(state,pack);
  expect(plan.changes).toHaveLength(4);expect(plan.changes.every(c=>c.before!==c.after)).toBe(true);
  expect(plan.changes.find(c=>c.kind==='book')?.after).toContain('正文页偏移：1');
  expect(plan.changes.find(c=>c.kind==='knowledge')?.after).toContain('10%，20%，30%，40%');
  expect(plan.changes.find(c=>c.kind==='knowledge')?.after).toContain('核对第二栏');
  expect(plan.changes.find(c=>c.kind==='step')?.after).toContain('第一节 → 核心动作');
  expect(plan.changes.some(c=>c.resetsProgress)).toBe(false);
 });
 it('采用修订只重置正文改变的要点，保留其他进度、事件和阅读偏好',()=>{
  const {state,pack}=studied();pack.steps[0].text='修订后的完整正文';pack.steps[1].title='修订后的标题';
  const next=importLearningPackage(state,pack,{...defaults,adoptChanges:true}),first=pack.steps[0].id,second=pack.steps[1].id;
  expect(next.progress[first]).toEqual(emptyProgress());
  expect(next.steps.find(t=>t.id===first)?.version).toBe(state.steps.find(t=>t.id===first)!.version+1);
  expect(next.progress[second]).toEqual(state.progress[second]);expect(next.progress['practice-0']).toEqual(state.progress['practice-0']);
  expect(next.steps.find(t=>t.id===second)).toMatchObject({title:'修订后的标题',studyMode:'read',version:1});
  expect(next.events).toEqual(state.events);expect(next.session).toBeNull();
  expect(next.knowledge.find(k=>k.id===pack.knowledge[0].id)).toMatchObject({confirmed:false,selected:false});
  expect(next.knowledge.find(k=>k.id===pack.knowledge[1].id)?.confirmed).toBe(true);
 });
 it('给已校对知识点追加要点时重新标为待校对，已有要点进度保留',()=>{
  const {state,pack}=studied();pack.steps.push({...pack.steps[0],id:pack.book.id+'-new-step',title:'补充要点',text:'需要核对的补充内容',order:3});
  const next=importLearningPackage(state,pack,defaults);
  expect(next.knowledge.find(k=>k.id===pack.knowledge[0].id)).toMatchObject({confirmed:false,selected:false});
  expect(next.progress).toEqual(state.progress);expect(next.session).toBeNull();
  expect(next.steps.filter(t=>t.id===pack.steps.at(-1)!.id)).toHaveLength(1);
 });
 it('稳定 ID 跨书目或跨知识点碰撞会阻止导入',()=>{
  const pack=sample(),state=initialState();pack.chapters[0].id=state.chapters[0].id;pack.knowledge=pack.knowledge.map(k=>({...k,chapterId:pack.chapters[0].id}));
  expect(()=>previewLearningPackage(state,pack)).toThrow('已用于其他书目');
  const {state:learned,pack:revision}=studied();revision.steps[0].knowledgeId=revision.knowledge[1].id;
  expect(()=>previewLearningPackage(learned,revision)).toThrow('已用于其他知识点');
  const wrongEdition=sample();wrongEdition.book.id=state.books[0].id;
  expect(()=>previewLearningPackage(state,wrongEdition)).toThrow('总页数必须相同');
 });
 it('导出只含内容，移除本机路径、文件连接和个人学习状态',()=>{
  const {state,pack}=studied(),book=state.books.find(b=>b.id===pack.book.id)!;
  book.filename='C:\\local\\学习材料.pdf';book.sourceUrl='/library/private.pdf';book.missing=false;
  const exported=exportLearningPackage(state,book.id),json=JSON.parse(JSON.stringify(exported));
  expect(Object.keys(json).sort()).toEqual(['book','chapters','format','knowledge','schemaVersion','steps']);
  expect(json.book.filename).toBe('学习材料.pdf');expect(json.book).not.toHaveProperty('sourceUrl');expect(json.book).not.toHaveProperty('missing');
  expect(json.book.source).toEqual(pack.book.source);expect(json.steps.map((t:{id:string})=>t.id)).toEqual(pack.steps.map(t=>t.id));
  expect(json.knowledge.every((k:{selected:boolean})=>k.selected===false)).toBe(true);expect(json.steps.every((t:object)=>!('studyMode' in t))).toBe(true);
  expect(parseLearningPackage(JSON.stringify(exported)).knowledge.map(k=>k.id)).toEqual(pack.knowledge.map(k=>k.id));
 });
 it('全量内置内容可按书目和章节导出并解析，连同自定义书目恢复备份',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  let state=await loadBundledContent(initialState());
  for(const book of state.books){const exported=exportLearningPackage(state,book.id);expect(parseLearningPackage(JSON.stringify(exported)).steps).toHaveLength(state.steps.filter(t=>state.knowledge.some(k=>k.id===t.knowledgeId&&k.bookId===book.id)).length);expect(previewLearningPackage(state,parseLearningPackage(JSON.stringify(exported))).changes).toHaveLength(0);}
  const chapter=state.chapters[0],partial=exportLearningPackage(state,chapter.bookId,chapter.id);expect(partial.chapters).toHaveLength(1);expect(partial.knowledge.every(k=>k.chapterId===chapter.id)).toBe(true);
  state=importLearningPackage(state,sample(),defaults);const backup=JSON.parse(JSON.stringify({...state,session:null}));expect(validateBackup(backup)).toBe(true);
  const restored=await loadBundledContent(backup);expect(restored.books.find(b=>b.id===sample().book.id)?.source).toEqual(sample().book.source);expect(restored.steps.filter(t=>t.knowledgeId.startsWith(sample().book.id))).toHaveLength(3);
 });
 it('不同实体可使用相同字面 ID，修订按实体类型应用',()=>{
  const pack=sample();pack.steps[0].id=pack.chapters[0].id;
  const state=importLearningPackage(initialState(),pack,defaults);pack.steps[0].text='正文修订';
  const next=importLearningPackage(state,pack,{...defaults,adoptChanges:true});
  expect(next.chapters).toEqual(state.chapters);expect(next.steps.find(t=>t.id===pack.chapters[0].id)?.text).toBe('正文修订');
 });
 it('修订来源说明时保留已连接文件和本机文件名',()=>{
  const {state,pack}=studied(),book=state.books.find(b=>b.id===pack.book.id)!;book.missing=false;book.filename='本机副本.pdf';pack.book.source={citation:'补充后的来源',rights:'仅本地学习'};
  const next=importLearningPackage(state,pack,{...defaults,adoptChanges:true});expect(next.books.find(b=>b.id===book.id)).toMatchObject({filename:'本机副本.pdf',missing:false,source:pack.book.source});
 });
});

describe('学习包格式错误',()=>{
 it('接收完整 JSON 代码框，拒绝截断文本和学习备份',()=>{
  expect(parseLearningPackage('```json\n'+JSON.stringify(example)+'\n```').book.id).toBe(example.book.id);
  expect(()=>parseLearningPackage('{"book":')).toThrow('JSON 格式有误');expect(()=>parseLearningPackage(initialState())).toThrow('学习备份');
 });
 it.each([
  ['版本', (p:ReturnType<typeof sample>)=>{p.schemaVersion=2 as 1;},'schemaVersion'],
  ['页码', (p:ReturnType<typeof sample>)=>{p.knowledge[0].refs[0].page=3;},'来源页'],
  ['章节关联', (p:ReturnType<typeof sample>)=>{p.knowledge[0].chapterId='missing';},'关联本包'],
  ['重复要点 ID', (p:ReturnType<typeof sample>)=>{p.steps[1].id=p.steps[0].id;},'重复'],
  ['空正文', (p:ReturnType<typeof sample>)=>{p.steps[0].text='';},'不能为空'],
  ['来源缺失', (p:ReturnType<typeof sample>)=>{delete p.book.source;},'book.source'],
  ['框选', (p:ReturnType<typeof sample>)=>{p.knowledge[0].refs[0].rect=[0,0,2,1];},'框选'],
  ['层级', (p:ReturnType<typeof sample>)=>{p.steps[0].outlinePath=Array(9).fill('层');},'最多 8 层'],
 ])('%s 错误提供可修正的提示',(_,mutate,message)=>{const pack=sample();mutate(pack);expect(()=>parseLearningPackage(pack)).toThrow(message);});
});
