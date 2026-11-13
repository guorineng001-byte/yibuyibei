import {describe,expect,it} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,emptyProgress,knowledgeSteps,dayKey} from './core';
import {mergeContentPack,type ContentPack} from './content';
import {buildStudyPickerTree,type StudyPickerNode} from './studyPicker';

const flatten=(nodes:StudyPickerNode[]):StudyPickerNode[]=>nodes.flatMap(node=>[node,...flatten(node.children)]);

describe('按书目收纳自主学习目录',()=>{
 it('所有内容包的可学知识点只出现一次，分层计数与学习队列一致，并保留原状态',()=>{
  const packs=import.meta.glob<ContentPack>('../public/content/*.json',{eager:true,import:'default'});
  let state=registerEduBook(initialState());
  for(const pack of Object.values(packs))state=mergeContentPack(state,pack);
  const before=structuredClone(state),steps=eligibleSteps(state),tree=buildStudyPickerTree(state,steps),nodes=flatten(tree);
  const expectedIds=new Set(steps.map(step=>step.knowledgeId)),leaves=nodes.filter(node=>node.kind==='knowledge');
  expect(new Set(nodes.map(node=>node.key)).size).toBe(nodes.length);
  expect(leaves).toHaveLength(expectedIds.size);
  expect(new Set(leaves.flatMap(node=>node.knowledgeIds))).toEqual(expectedIds);
  expect(tree.reduce((count,node)=>count+node.stepCount,0)).toBe(steps.length);
  for(const node of nodes){
   expect(new Set(node.knowledgeIds).size,node.label).toBe(node.knowledgeIds.length);
   expect(node.stepCount,node.label).toBe(steps.filter(step=>node.knowledgeIds.includes(step.knowledgeId)).length);
  }
  expect(state).toEqual(before);
 });

 it('到期筛选保持原章节编号，空书目仍可显示，未学内容不混入到期队列',()=>{
  const state=registerEduBook(initialState()),step=state.steps[0];
  state.progress[step.id]={...emptyProgress(),firstStudied:'2026-01-01',due:dayKey()};
  const due=knowledgeSteps(state,state.knowledge.map(item=>item.id),'due'),tree=buildStudyPickerTree(state,due);
  expect(due.map(item=>item.id)).toEqual([step.id]);
  expect(tree).toHaveLength(2);
  expect(tree[0].children[0].label).toBe('外国教育史');
  expect(tree[0].children[0].children[0].label).toBe('第2章 · 古希腊教育');
  expect(tree[0].knowledgeIds).toEqual([step.knowledgeId]);
  expect(tree[1]).toMatchObject({stepCount:0,knowledgeIds:[],children:[]});
 });

 it('新导入的普通书目自动分层，同名章节与小节在不同书目中互不干扰',()=>{
  const state=initialState(),original=state.knowledge[0],step=state.steps[0];
  state.books.push({...state.books[0],id:'new-book',title:'后来导入的书'});
  state.chapters.push({id:'new-chapter',bookId:'new-book',title:'第一章 · 绪论',start:1,end:2,order:1});
  state.knowledge.push({...original,id:'new-point',bookId:'new-book',chapterId:'new-chapter',section:'第一节 · 基本概念 · （一）定义',title:'一个概念'});
  state.steps.push({...step,id:'new-step',knowledgeId:'new-point'});
  const tree=buildStudyPickerTree(state,eligibleSteps(state)),book=tree[1];
  expect(book.children[0].kind).toBe('chapter');
  expect(book.children[0].label).toBe('第一章 · 绪论');
  expect(book.children[0].children[0].label).toBe('第一节 · 基本概念');
  expect(book.children[0].children[0].children[0].label).toBe('（一）定义');
  expect(book.knowledgeIds).toEqual(['new-point']);
  expect(tree[0].knowledgeIds).not.toContain('new-point');
 });

 it('利用原书参考卡补齐节名，同节的考点合在一起，参考图不进入可选队列',()=>{
  const state=initialState(),original=state.knowledge[0],step=state.steps[0];
  state.knowledge=[{...original,id:'heading',section:'第一节 · 教育思想',referenceOnly:true},{...original,id:'point-a',section:'第一节 · 考点一',order:1},{...original,id:'point-b',section:'第一节 · 考点二',order:2}];
  state.steps=[{...step,id:'a',knowledgeId:'point-a'},{...step,id:'b',knowledgeId:'point-b'}];
  const nodes=flatten(buildStudyPickerTree(state,eligibleSteps(state)));
  const section=nodes.find(node=>node.label==='第一节 · 教育思想')!;
  expect(section.children.map(node=>node.label)).toEqual(['考点一','考点二']);
  expect(section.knowledgeIds).toEqual(['point-a','point-b']);
  expect(nodes.some(node=>node.knowledgeIds.includes('heading'))).toBe(false);
 });
});
