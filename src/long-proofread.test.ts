import {describe,expect,it} from 'vitest';
import ch12raw from '../public/content/china-proofread-ch12.json';
import ch13raw from '../public/content/foreign-proofread-ch13.json';
import ch14raw from '../public/content/foreign-proofread-ch14.json';
import ch15raw from '../public/content/foreign-proofread-ch15.json';
import {initialState} from './seed';
import {mergeContentPack,validContentPack,type ContentPack} from './content';

const packs=[ch12raw,ch13raw,ch14raw,ch15raw] as unknown as ContentPack[];

describe('连续四章校对内容',()=>{
 it('四个内容包结构、章节归属与页码边界正确',()=>{
  expect(packs.every(validContentPack)).toBe(true);
  expect(packs.map(p=>p.stats)).toEqual([
   expect.objectContaining({knowledge:34,steps:165,replacedDrafts:17}),
   expect.objectContaining({knowledge:9,steps:35}),
   expect.objectContaining({knowledge:19,steps:84}),
   expect.objectContaining({knowledge:10,steps:52})
  ]);
  expect(packs.flatMap(p=>p.knowledge).every(k=>k.refs.every(r=>r.page>=98&&r.page<=125))).toBe(true);
 });

 it('第十二章替换全部剩余中教草稿，并保留五张总结表',()=>{
  const ch12=packs[0];expect(ch12.replaces).toHaveLength(17);
  const base=initialState();let next=mergeContentPack(base,ch12);
  expect(next.knowledge.filter(k=>k.id.startsWith('china-reviewed-ch12-'))).toHaveLength(34);
  expect(next.steps.filter(t=>t.id.startsWith('china-reviewed-ch12-'))).toHaveLength(165);
 });

 it('古希腊包不覆盖已有亚里士多德学习卡',()=>{
  const before=initialState();before.steps.find(t=>t.id==='practice-0')!.text='用户自己的吕克昂笔记';
  const next=mergeContentPack(before,packs[2]);
  expect(next.steps.find(t=>t.id==='practice-0')?.text).toBe('用户自己的吕克昂笔记');
  expect(next.knowledge.filter(k=>k.id.startsWith('foreign-reviewed-ch14-'))).toHaveLength(19);
 });

 it('关键漏识文字与外国教育史专名已经校正',()=>{
  const text=packs.flatMap(p=>[...p.knowledge.map(k=>k.title),...p.steps.flatMap(s=>[s.title,s.outline??'',s.text])]).join('\n');
  for(const phrase of ['教学做合一','事怎样做便怎样学','梁漱溟','庠、序、校、学','亚历山大利亚城','讥讽','埃佛比','卢达斯','《雄辩术原理》','马丁·路德'])expect(text).toContain(phrase);
 });
});
