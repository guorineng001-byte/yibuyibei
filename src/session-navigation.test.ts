import {describe,expect,it} from 'vitest';
import {initialState} from './seed';
import {advanceSession,emptyProgress,finishReadOnly,jumpToStep,knowledgeSteps,makeSession,removeSessionBatchLimit,scoreSession,setStepStudyMode,skipSessionStep} from './core';

describe('回看阅读内容后继续学习',()=>{
 it('旧版小结合并剩余内容时从新追加的第一项继续，即使旧游标仍在最后一项',()=>{
  let s=initialState();s.session=makeSession(s,'review',['soul-0','soul-1']);
  s.session!.phase='summary';s.session!.cursor=1;s.session!.completed=['soul-0','soul-1'];
  s.session!.remainingIds=['role-0','role-0','role-1'];
  s.session!.usedHelp=true;s.session!.feedback='上一项反馈';s.session!.lastRating='hint';
  s=removeSessionBatchLimit(s);
  expect(s.session!.queue).toEqual(['soul-0','soul-1','role-0','role-1']);
  expect(s.session!.queue[s.session!.cursor]).toBe('role-0');
  expect(s.session!.phase).toBe('recall');
  expect(s.session!.usedHelp).toBe(false);
  expect(s.session!.feedback).toBeUndefined();
  expect(s.session!.lastRating).toBeUndefined();
  expect(s.events).toEqual([]);
 });
 it('旧版小结没有有效剩余项时保持小结，不重新打开已完成内容',()=>{
  const s=initialState();s.session=makeSession(s,'review',['soul-0']);
  s.session!.phase='summary';s.session!.remainingIds=['missing','soul-0'];
  const next=removeSessionBatchLimit(s);
  expect(next.session!.phase).toBe('summary');
  expect(next.session!.queue).toEqual(['soul-0']);
  expect(next.session!.remainingIds).toEqual([]);
 });
 it('次日重选全部内容时保留已读项，读完继续同组背诵',()=>{
  let s=setStepStudyMode(initialState(),'soul-0','read');
  s.progress['soul-0']={...emptyProgress(),reads:1,firstStudied:'2026-09-12'};
  const ids=knowledgeSteps(s,['soul'],'all').map(t=>t.id);
  s.session=makeSession(s,'review',ids);
  expect(s.session!.queue).toEqual(['soul-0','soul-1']);
  expect(s.session!.phase).toBe('read');
  s=finishReadOnly(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('soul-1');
  expect(s.session!.phase).toBe('recall');
  expect(s.progress['soul-0'].reads).toBe(2);
  expect(s.events).toEqual([]);
 });
 it('到期复习仍排除阅读项，临时补看后返回原来的要点',()=>{
  let s=setStepStudyMode(initialState(),'soul-0','read');
  for(const id of ['soul-0','soul-1','role-0'])s.progress[id]={...emptyProgress(),reads:1,firstStudied:'2026-09-12',due:'2026-09-12'};
  s.session=makeSession(s,'review');
  expect(s.session!.queue).toEqual(['soul-1','role-0']);
  const before=structuredClone(s.progress['soul-1']);
  s=jumpToStep(s,'soul-0');
  expect(s.session!.queue).toEqual(['soul-0','soul-1','role-0']);
  s=finishReadOnly(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('soul-1');
  expect(s.session!.phase).toBe('recall');
  expect(s.progress['soul-1']).toEqual(before);
  expect(s.events).toEqual([]);
 });
 it('兼容旧队列：阅读项已追加在末尾，读完仍回到前面的未处理要点',()=>{
  let s=setStepStudyMode(initialState(),'soul-0','read');
  s.session=makeSession(s,'review',['soul-1','role-0','soul-0']);
  s=jumpToStep(s,'soul-0');
  s=finishReadOnly(s);
  expect(s.session!.phase).toBe('recall');
  expect(s.session!.queue[s.session!.cursor]).toBe('soul-1');
  s=skipSessionStep(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('role-0');
  s=skipSessionStep(s);
  expect(s.session!.phase).toBe('summary');
  expect(s.progress['soul-0'].reads).toBe(1);
 });
 it('跳到末尾并评分后，先补齐前面要点，不重复已完成的尾项',()=>{
  let s=initialState();
  s.session=makeSession(s,'review',['soul-0','soul-1']);
  s=jumpToStep(s,'soul-1');s.session!.phase='compare';
  s=advanceSession(scoreSession(s,'independent'));
  expect(s.session!.queue[s.session!.cursor]).toBe('soul-0');
  s.session!.phase='compare';
  s=advanceSession(scoreSession(s,'independent'));
  expect(s.session!.phase).toBe('summary');
  expect(s.events.map(e=>e.stepId)).toEqual(['soul-1','soul-0']);
  expect(advanceSession(s)).toBe(s);
 });
 it('全部只需阅读也能重新选择，最后一项完成才进入小结',()=>{
  let s=setStepStudyMode(setStepStudyMode(initialState(),'soul-0','read'),'soul-1','read');
  s.session=makeSession(s,'review',['soul-0','soul-1']);
  s=finishReadOnly(s);expect(s.session!.phase).toBe('read');
  s=finishReadOnly(s);expect(s.session!.phase).toBe('summary');
  expect(s.session!.readOnlyDone).toEqual(['soul-0','soul-1']);
  expect(s.events).toEqual([]);
 });
 it('重复阅读后继续未处理项，不重复计算本轮已读数量',()=>{
  let s=setStepStudyMode(initialState(),'soul-0','read');
  s.session=makeSession(s,'review',['soul-0','soul-1']);
  s=finishReadOnly(s);s=jumpToStep(s,'soul-0');s=finishReadOnly(s);
  expect(s.session!.readOnlyDone).toEqual(['soul-0']);
  expect(s.session!.queue[s.session!.cursor]).toBe('soul-1');
 });
 it('跳到重试项优先使用后续位置，两次失败后正常结束',()=>{
  let s=initialState();s.session=makeSession(s,'review',['soul-0','soul-1']);
  s.session!.phase='compare';s=advanceSession(scoreSession(s,'again'));
  s=jumpToStep(s,'soul-0');expect(s.session!.cursor).toBe(2);
  s.session!.phase='compare';s=advanceSession(scoreSession(s,'again'));
  expect(s.session!.queue[s.session!.cursor]).toBe('soul-1');
  s=skipSessionStep(s);expect(s.session!.phase).toBe('summary');
  expect(s.session!.retries['soul-0']).toBe(2);
 });
 it('回看已完成要点后重新评为没记住，仍会安排重试',()=>{
  let s=initialState();s.session=makeSession(s,'review',['soul-0','soul-1']);
  s.session!.phase='compare';s=advanceSession(scoreSession(s,'independent'));
  s=jumpToStep(s,'soul-0');s.session!.phase='compare';s=scoreSession(s,'again');
  expect(s.session!.completed).not.toContain('soul-0');
  s=advanceSession(s);s=skipSessionStep(s);
  expect(s.session!.queue[s.session!.cursor]).toBe('soul-0');
  expect(s.session!.phase).toBe('recall');
 });
});
