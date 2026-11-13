import {describe,expect,it} from 'vitest';
import type {Step} from './types';
import {buildStepOutline,displayStepTitle,groupJumpTarget} from './studyOutline';
import type {ContentPack} from './content';

const make=(id:string,title:string,outline?:string,subsection?:string,displayTitle?:string):Step=>({id,knowledgeId:'zhu-reading',title,text:title,keywords:[],order:Number(id),version:1,outline,subsection,displayTitle});

describe('学习页原书框架导航',()=>{
 it('左侧只呈现内容、影响、局限三层，细分要点留在主页面',()=>{const steps=[make('1','1.(1)① 循序渐进·顺序','1. 内容','（1）循序渐进','顺序'),make('2','1.(1)② 循序渐进·量力','1. 内容','（1）循序渐进','量力'),make('3','2.(1) 影响·研究成果','2. 影响','','研究成果'),make('4','3.(1) 局限·内容','3. 局限','','内容局限')];const groups=buildStepOutline(steps);expect(groups.map(g=>g.label)).toEqual(['1. 内容','2. 影响','3. 局限']);expect(groups[0].steps.map(displayStepTitle)).toEqual(['顺序','量力']);});
 it('进入框架时优先跳到尚未处理的具体要点',()=>{const group=buildStepOutline([make('1','顺序','1. 内容'),make('2','量力','1. 内容')])[0];expect(groupJumpTarget(group,new Set(['1']))).toBe('2');});
 it('旧卡片也会去掉堆叠的前置序号',()=>{expect(displayStepTitle(make('1','1.(2)③ 熟读精思·解疑'))).toBe('熟读精思·解疑');});
 it('同名分组不连续出现时保留原书顺序，并使用独立标识',()=>{
  const steps=[make('1','背景','新大学运动'),make('2','哈勒大学','内容'),make('3','哥廷根大学','内容'),make('4','评价','新大学运动')];
  const before=structuredClone(steps),groups=buildStepOutline(steps);
  expect(groups.map(g=>g.label)).toEqual(['新大学运动','内容','新大学运动']);
  expect(new Set(groups.map(g=>g.key)).size).toBe(3);
  expect(groups.flatMap(g=>g.steps)).toEqual(steps);
  expect(groupJumpTarget(groups[2],new Set())).toBe('4');
  expect(steps).toEqual(before);
  expect(buildStepOutline(steps)).toEqual(groups);
 });
 it('标题与步骤 ID 相同也不会把独立条目错误合并',()=>{
  const groups=buildStepOutline([make('1','内容','2'),make('2','独立条目')]);
  expect(groups).toHaveLength(2);
  expect(new Set(groups.map(g=>g.key)).size).toBe(2);
 });
 it('不同知识点的同名分组不会复用界面标识',()=>{
  const first=make('1','背景','内容'),second={...make('2','目的','内容'),knowledgeId:'other'};
  expect(buildStepOutline([first])[0].key).not.toBe(buildStepOutline([second])[0].key);
  expect(buildStepOutline([first,second])).toHaveLength(2);
 });
 it('所有内置内容的目录标识唯一，且没有遗漏或调换要点',()=>{
  const packs=import.meta.glob<ContentPack>('../public/content/*.json',{eager:true,import:'default'});
  expect(Object.keys(packs).length).toBeGreaterThan(10);
  for(const pack of Object.values(packs).filter(p=>!Array.isArray(p)))for(const k of pack.knowledge){
   const steps=pack.steps.filter(t=>t.knowledgeId===k.id).sort((a,b)=>a.order-b.order),groups=buildStepOutline(steps);
   expect(new Set(groups.map(g=>g.key)).size,k.id).toBe(groups.length);
   expect(groups.flatMap(g=>g.steps.map(t=>t.id)),k.id).toEqual(steps.map(t=>t.id));
  }
 });
});
