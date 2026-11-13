import {describe,expect,it} from 'vitest';
import {emptyProgress,makeSession,queues,validateBackup} from './core';
import {updateEssayPractice} from './essayPracticeState';
import {initialState} from './seed';

describe('主观题练习记录',()=>{
 it('保存草稿和查看答案只改变练习记录',()=>{
  const state=initialState();
  state.progress[state.steps[0].id]=emptyProgress();
  state.session=makeSession(state,'new',[state.steps[0].id]);
  state.questions.push({id:'mine',title:'我的题目',answer:'参考答案',knowledgeIds:[]});
  const before=queues(state);
  const draft=updateEssayPractice(state,'essay-01','平等精神：教育对象、作用');
  const practiced=updateEssayPractice(draft,'essay-01','平等精神：教育对象、作用',true);
  expect(practiced.essayPractice?.['essay-01']).toMatchObject({draft:'平等精神：教育对象、作用',status:'practiced'});
  expect(practiced.essayPractice?.['essay-01'].lastPracticed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(queues(practiced)).toEqual(before);
  for(const key of ['books','chapters','knowledge','steps','progress','events','session','questions'] as const)expect(practiced[key]).toBe(state[key]);
  expect(updateEssayPractice(practiced,'essay-01','平等精神：教育对象、作用')).toBe(practiced);
 });
 it('新旧学习备份均可恢复练习记录',()=>{
  const old=initialState();delete old.essayPractice;
  expect(validateBackup(JSON.parse(JSON.stringify(old)))).toBe(true);
  const next=updateEssayPractice(old,'essay-26','全人格教育',true);
  const restored:unknown=JSON.parse(JSON.stringify(next));
  expect(validateBackup(restored)).toBe(true);
  if(validateBackup(restored))expect(restored.essayPractice?.['essay-26']).toEqual(next.essayPractice?.['essay-26']);
 });
});
