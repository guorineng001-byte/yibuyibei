import {describe,expect,it} from 'vitest';
import {initialState} from './seed';
import {emptyProgress} from './core';
import {backupAdvice,hasLearningRecords} from './dailyUse';

describe('日常使用与备份提醒',()=>{
 it('首次打开且尚无学习记录时不催促备份',()=>{
  const state=initialState();
  expect(hasLearningRecords(state)).toBe(false);
  expect(backupAdvice(undefined,hasLearningRecords(state),'2026-11-14')).toBe('new');
 });
 it('只阅读也会触发首次备份提醒',()=>{
  const state=initialState();state.progress['practice-0']={...emptyProgress(),reads:1};
  expect(state.events).toHaveLength(0);
  expect(hasLearningRecords(state)).toBe(true);
  expect(backupAdvice(undefined,true,'2026-11-14')).toBe('never');
 });
 it('未评分的主观题草稿和自己添加的题目同样需要保留',()=>{
  const state=initialState();state.essayPractice={one:{draft:'教育目的影响教育内容。',status:'draft'}};
  expect(hasLearningRecords(state)).toBe(true);
  delete state.essayPractice;state.questions=[{id:'mine',title:'自己的题目',answer:'要点',knowledgeIds:[]}];
  expect(hasLearningRecords(state)).toBe(true);
 });
 it('导出后七个本地日期内不重复提醒，第七天开始提示',()=>{
  const exported=new Date(2026,10,14,23,50).toISOString();
  expect(backupAdvice(exported,true,'2026-11-14')).toBe('recent');
  expect(backupAdvice(exported,true,'2026-11-20')).toBe('recent');
  expect(backupAdvice(exported,true,'2026-11-21')).toBe('due');
 });
 it('跨月和跨年也按本地日期计算',()=>{
  const exported=new Date(2026,11,29,9).toISOString();
  expect(backupAdvice(exported,true,'2027-01-04')).toBe('recent');
  expect(backupAdvice(exported,true,'2027-01-05')).toBe('due');
 });
});
