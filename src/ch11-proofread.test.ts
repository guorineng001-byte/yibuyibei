import {describe,expect,it} from 'vitest';
import rawPack from '../public/content/china-proofread-ch11.json';
import {initialState} from './seed';
import {mergeContentPack,validContentPack,type ContentPack} from './content';

const pack=rawPack as unknown as ContentPack;
const prefix='china-reviewed-ch11-';

describe('第十一章校对内容',()=>{
 it('完整覆盖第十一章并严格停在相邻章节边界',()=>{
  expect(validContentPack(pack)).toBe(true);
  expect(pack.stats).toMatchObject({pages:5,knowledge:21,steps:82,replacedDrafts:9});
  expect(pack.knowledge.every(k=>k.id.startsWith(prefix)&&k.chapterId==='history-chapter-10')).toBe(true);
  expect(pack.knowledge.flatMap(k=>k.refs).every(r=>(r.page>94||r.rect![1]>=.5)&&(r.page<98||r.rect![1]+r.rect![3]<=.3))).toBe(true);
  expect(pack.steps.every(t=>t.studyMode==='memorize')).toBe(true);
 });

 it('保留用户动过的旧识别稿，同时替换其余原始草稿',()=>{
  const state=initialState();
  for(const original of pack.replaces!){state.knowledge.push(structuredClone(original.knowledge));state.steps.push(...structuredClone(original.steps));}
  const kept=state.steps.find(t=>t.knowledgeId===pack.replaces![0].knowledge.id)!;
  kept.text='用户自己的第十一章笔记';kept.version=2;kept.studyMode='read';
  const next=mergeContentPack(state,pack);
  expect(next.steps.find(t=>t.id===kept.id)).toEqual(kept);
  expect(pack.replaces!.slice(1).every(r=>!next.knowledge.some(k=>k.id===r.knowledge.id))).toBe(true);
  expect(next.knowledge.filter(k=>k.id.startsWith(prefix))).toHaveLength(21);
  expect(next.steps.filter(t=>t.id.startsWith(prefix))).toHaveLength(82);
 });

 it('专名、方针和校训保留原书表述',()=>{
  const text=[...pack.knowledge.flatMap(k=>[k.title,k.section]),...pack.steps.map(t=>t.text)].join('\n');
  for(const phrase of ['恽代英','何叔衡','农民问题丛刊','中国国民党陆军军官学校','工农革命军教导队','红四军军官教导队','中国人民抗日军事政治大学','团结、紧张、严肃、活泼','民族的、科学的、大众的','哈尔滨工业大学'])expect(text).toContain(phrase);
 });
});
