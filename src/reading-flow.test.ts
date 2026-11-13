import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {advanceSession,dayKey,eligibleSteps,emptyProgress,finishReadOnly,jumpToStep,makeSession,mastered,queues,rateStep,scoreSession,setStepsStudyMode,skipSessionStep,validateBackup} from './core';
import {buildStudyPickerTree,studyPickerSteps} from './studyPicker';
import {loadBundledContent} from './content';
import {prepareMobileState} from './mobile';
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());

function fixture(){
 const s=initialState(),bookId=s.books[0].id,k=s.knowledge[0],t=s.steps[0];
 s.chapters=[{id:'ch1',bookId,title:'第一章',start:1,end:2,order:1},{id:'ch2',bookId,title:'第二章',start:3,end:4,order:2}];
 s.knowledge=['a','b','c','d'].map((id,i)=>({...k,id,bookId,chapterId:i===3?'ch2':'ch1',section:i<2?'第一节':'第二节',order:i,selected:true,confirmed:true}));
 s.steps=['a1','a2','b1','c1','d1'].map((id,i)=>({...t,id,knowledgeId:id[0],order:i,studyMode:'memorize' as const}));
 return s;
}

describe('范围与批量学习方式',()=>{
 it('跨章选择和到期筛选均按原书顺序，方式筛选不改变知识层级',()=>{
  let s=fixture();
  s.progress.a1={...emptyProgress(),firstStudied:'2026-01-01',due:'2026-01-03'};
  s.progress.d1={...emptyProgress(),firstStudied:'2026-01-01',due:'2026-01-01'};
  s=setStepsStudyMode(s,['a2','b1'],'read');
  expect(studyPickerSteps(s,['d','a','b'],'all','all').map(t=>t.id)).toEqual(['a1','a2','b1','d1']);
  expect(studyPickerSteps(s,['d','a','b'],'due','all').map(t=>t.id)).toEqual(['a1','d1']);
  expect(studyPickerSteps(s,['d','a','b'],'all','read').map(t=>t.id)).toEqual(['a2','b1']);
  expect(studyPickerSteps(s,['d','a','b'],'all','memorize').map(t=>t.id)).toEqual(['a1','d1']);
  const chapter=buildStudyPickerTree(s,eligibleSteps(s))[0].children[0];
  expect(chapter.knowledgeIds).toEqual(['a','b','c']);
  expect(chapter.children[0].knowledgeIds).toEqual(['a','b']);
 });

 it('整节切换覆盖节内全部要点，整章恢复覆盖各节，不改其他章和正文',()=>{
  const original=fixture(),chapter=buildStudyPickerTree(original,eligibleSteps(original))[0].children[0];
  let s=setStepsStudyMode(original,studyPickerSteps(original,chapter.children[0].knowledgeIds,'all','all').map(t=>t.id),'read');
  expect(s.steps.filter(t=>t.studyMode==='read').map(t=>t.id)).toEqual(['a1','a2','b1']);
  s=setStepsStudyMode(s,studyPickerSteps(s,chapter.knowledgeIds,'all','all').map(t=>t.id),'memorize');
  expect(s).toEqual(original);
 });

 it('到期筛选为空仍可按完整目录修改整章，修改不改变勾选和校对状态',()=>{
  const original=fixture(),tree=buildStudyPickerTree(original,eligibleSteps(original)),chapter=tree[0].children[0];
  expect(studyPickerSteps(original,chapter.knowledgeIds,'due','all')).toEqual([]);
  const s=setStepsStudyMode(original,studyPickerSteps(original,chapter.knowledgeIds,'all','all').map(t=>t.id),'read');
  expect(s.steps.filter(t=>t.studyMode==='read')).toHaveLength(4);
  expect(s.knowledge).toEqual(original.knowledge);
  expect(s.progress).toEqual({});
  expect(queues(s).fresh).toHaveLength(5);
 });

 it('已掌握要点来回切换保留日期、等级、到期安排及回忆事件',()=>{
  let s=rateStep(fixture(),'a1','independent',false,'e1',new Date(2026,0,1,12));
  s=rateStep(s,'a1','independent',false,'e2',new Date(2026,0,2,12));
  const progress=structuredClone(s.progress),events=structuredClone(s.events);
  s=setStepsStudyMode(s,['a1','a2'],'read');
  expect(queues(s).due.map(t=>t.id)).not.toContain('a1');
  s=setStepsStudyMode(s,['a1','a2'],'memorize');
  expect(s.progress).toEqual(progress);expect(s.events).toEqual(events);
  expect(mastered(s.progress.a1)).toBe(true);
  expect(queues(s).due.map(t=>t.id)).toContain('a1');
 });

 it('只读过的要点恢复背诵后当日到期；未读项保持未学',()=>{
  let s=setStepsStudyMode(fixture(),['a1','a2'],'read');
  s.session=makeSession(s,'review',['a1','a2']);s=finishReadOnly(s);
  s=setStepsStudyMode(s,['a1','a2'],'memorize');
  expect(s.progress.a1).toEqual({...emptyProgress(),reads:1,firstStudied:dayKey(),due:dayKey()});
  expect(s.progress.a2).toBeUndefined();
  expect(queues(s).due.map(t=>t.id)).toEqual(['a1']);
  expect(queues(s).fresh.map(t=>t.id)).toContain('a2');
  expect(s.events).toEqual([]);
 });

 it('未来到期日期不因批量切换提前，重复设置不改变状态',()=>{
  const original=fixture();original.progress.a1={...emptyProgress(),firstStudied:dayKey(),due:'2099-01-01',level:1,attempts:1,independentDates:[dayKey()]};
  let s=setStepsStudyMode(original,['a1'],'read');s=setStepsStudyMode(s,['a1'],'memorize');
  expect(s.progress).toEqual(original.progress);
  expect(queues(s).due).toEqual([]);
  expect(setStepsStudyMode(s,['a1'],'memorize')).toBe(s);
 });
});

describe('连续阅读与当前会话',()=>{
 it('跨知识点和跨章连续读到最后再小结，不产生评分或掌握记录',()=>{
  let s=fixture();s=setStepsStudyMode(s,s.steps.map(t=>t.id),'read');
  const ids=studyPickerSteps(s,['d','c','a','b'],'all','read').map(t=>t.id);s.session=makeSession(s,'review',ids);
  for(const id of ids){expect(s.session!.phase).toBe('read');expect(s.session!.queue[s.session!.cursor]).toBe(id);s=finishReadOnly(s);}
  expect(s.session!.phase).toBe('summary');expect(s.session!.readOnlyDone).toEqual(ids);
  expect(s.session!.completed).toEqual([]);expect(s.events).toEqual([]);
  expect(Object.values(s.progress).every(p=>p.reads===1&&!mastered(p)&&p.attempts===0&&p.due===null)).toBe(true);
  expect(studyPickerSteps(s,['a','b','c','d'],'fresh','read')).toEqual([]);
  expect(studyPickerSteps(s,['a','b','c','d'],'all','read')).toHaveLength(5);
 });

 it('混合队列按各点方式衔接，读完后回到背诵，弱项重试后接着读',()=>{
  let s=setStepsStudyMode(fixture(),['a1','b1'],'read');s.session=makeSession(s,'review',['a1','a2','b1','d1']);
  s=finishReadOnly(s);expect(s.session!.phase).toBe('recall');
  s.session!.phase='compare';s=advanceSession(scoreSession(s,'again'));
  expect(s.session!.queue[s.session!.cursor]).toBe('b1');expect(s.session!.phase).toBe('read');
  s=finishReadOnly(s);s.session!.phase='compare';s=advanceSession(scoreSession(s,'independent'));
  expect(s.session!.queue[s.session!.cursor]).toBe('a2');
  s.session!.phase='compare';s=advanceSession(scoreSession(s,'independent'));
  expect(s.session!.phase).toBe('summary');expect(s.session!.readOnlyDone).toEqual(['a1','b1']);
  expect(s.events.map(e=>e.stepId)).toEqual(['a2','d1','a2']);
  expect(s.progress.a1.attempts).toBe(0);expect(s.progress.b1.independentDates).toEqual([]);
 });

 it('当前评分前改为阅读会退出评分，原有进度和队列保持',()=>{
  let s=fixture();s.session=makeSession(s,'review',['a1','a2','b1']);s.session!.phase='compare';s.session!.usedHelp=true;
  const queue=[...s.session!.queue];s=setStepsStudyMode(s,['a1','a2'],'read');
  expect(s.session!.phase).toBe('read');expect(s.session!.usedHelp).toBe(false);expect(s.session!.queue).toEqual(queue);
  expect(scoreSession(s,'independent')).toBe(s);s=finishReadOnly(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('a2');expect(s.session!.phase).toBe('read');expect(s.events).toEqual([]);
 });

 it('两次失败后批量改为阅读，仍会读到该点，保留失败事件',()=>{
  let s=fixture();s.session=makeSession(s,'review',['a1','b1']);
  s.session!.phase='compare';s=advanceSession(scoreSession(s,'again'));s=jumpToStep(s,'a1');
  s.session!.phase='compare';s=advanceSession(scoreSession(s,'again'));
  expect(s.session!.queue[s.session!.cursor]).toBe('b1');s=setStepsStudyMode(s,['a1'],'read');s=skipSessionStep(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('a1');expect(s.session!.phase).toBe('read');
  s=finishReadOnly(s);expect(s.session!.phase).toBe('summary');expect(s.session!.readOnlyDone).toEqual(['a1']);expect(s.events).toHaveLength(2);
 });

 it('当前会话中把已读项恢复背诵，先完成眼前要点再回来回忆',()=>{
  let s=setStepsStudyMode(fixture(),['a1'],'read');s.session=makeSession(s,'review',['a1','b1']);s=finishReadOnly(s);
  s=setStepsStudyMode(s,['a1'],'memorize');expect(s.session!.readOnlyDone).toEqual([]);
  expect(s.session!.queue[s.session!.cursor]).toBe('b1');s=skipSessionStep(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('a1');expect(s.session!.phase).toBe('recall');
  expect(s.progress.a1.reads).toBe(1);expect(s.progress.a1.due).toBe(dayKey());expect(s.events).toEqual([]);
 });

 it('跳到范围末尾阅读后补齐未读内容，重复回看不重复本轮完成数',()=>{
  let s=setStepsStudyMode(fixture(),['a1','b1','d1'],'read');s.session=makeSession(s,'review',['a1','b1','d1']);
  s=jumpToStep(s,'d1');s=finishReadOnly(s);expect(s.session!.queue[s.session!.cursor]).toBe('a1');
  s=finishReadOnly(s);s=jumpToStep(s,'a1');s=finishReadOnly(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('b1');expect(s.session!.readOnlyDone).toEqual(['d1','a1']);
 });
});

describe('阅读会话与完整备份',()=>{
 it('刷新及完整备份装载后保留范围、游标、已读记录和计时，可继续剩余阅读',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  let s=await loadBundledContent(prepareMobileState(initialState()));
  const ids=eligibleSteps(s).slice(0,4).map(t=>t.id);s=setStepsStudyMode(s,ids,'read');s.session=makeSession(s,'review',ids);
  s=finishReadOnly(s);s.session!.seconds=74;
  const serialized=JSON.parse(JSON.stringify(s));expect(validateBackup(serialized)).toBe(true);
  let restored=await loadBundledContent(prepareMobileState(serialized));
  expect(restored.session).toEqual(s.session);expect(restored.progress).toEqual(s.progress);
  expect(restored.steps.filter(t=>ids.includes(t.id)).every(t=>t.studyMode==='read')).toBe(true);
  restored=finishReadOnly(restored);expect(restored.session!.queue[restored.session!.cursor]).toBe(ids[2]);expect(restored.session!.seconds).toBe(74);expect(restored.events).toEqual([]);
 });

 it('背诵的评分反馈与重试队列也可随备份恢复',()=>{
  let s=fixture();s.session=makeSession(s,'review',['a1','b1']);s.session!.phase='compare';s=scoreSession(s,'again');
  const restored=JSON.parse(JSON.stringify(s));expect(validateBackup(restored)).toBe(true);
  expect(advanceSession(restored).session!.queue).toEqual(s.session!.queue);expect(restored.events).toEqual(s.events);
 });

 it('没有会话的既有备份仍可恢复；无效的会话位置或要点关系会阻止恢复',()=>{
  const s=fixture();expect(validateBackup(s)).toBe(true);s.session=makeSession(s,'new',['a1','b1']);
  expect(validateBackup(s)).toBe(true);
  const invalid=structuredClone(s);invalid.session!.cursor=8;expect(validateBackup(invalid)).toBe(false);
  invalid.session=structuredClone(s.session);invalid.session!.queue.push('missing');expect(validateBackup(invalid)).toBe(false);
  invalid.session=structuredClone(s.session);invalid.session!.readOnlyDone=['missing'];expect(validateBackup(invalid)).toBe(false);
  s.session!.phase='summary';s.session!.cursor=s.session!.queue.length;expect(validateBackup(s)).toBe(true);
 });
});
