import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {prepareMobileState} from './mobile';
import {loadBundledContent,validContentPack,type ContentPack} from './content';
import {emptyProgress,makeSession,rateStep,validateBackup} from './core';
import {replacementMatches} from './source';
import {eduBook} from './eduCatalog';
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
afterEach(()=>vi.unstubAllGlobals());

describe('公开版设置、内容与备份',()=>{
 it('恢复未包含新设置的备份时补齐默认值并保留学习进度',()=>{
  const state=initialState();delete state.settings.examType;delete state.settings.targetSchool;
  state.progress['practice-0']=emptyProgress();state.progress['practice-0'].reads=2;
  expect(validateBackup(state)).toBe(true);
  const restored=prepareMobileState(JSON.parse(JSON.stringify(state)));
  expect(restored.settings).toMatchObject({examType:'333',targetSchool:''});
  expect(restored.progress).toEqual(state.progress);
 });
 it('考试、院校、鼓励偏好、已学记录和当前会话一起往返备份',()=>{
  let state=initialState();state.settings={...state.settings,examType:'311',targetSchool:'华东师范大学',encouragement:'brief'};
  state.session=makeSession(state,'new',['practice-0']);state=rateStep(state,'practice-0','independent',false,'review-one');
  const exported=JSON.parse(JSON.stringify(state));
  expect(validateBackup(exported)).toBe(true);
  const restored=prepareMobileState(exported);
  expect(restored.settings).toEqual(state.settings);expect(restored.progress).toEqual(state.progress);expect(restored.events).toEqual(state.events);expect(restored.session).toEqual(state.session);
 });
 it('内容包全部接入，缺原书仍可完成一次学习评分',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  let state=await loadBundledContent(initialState());
  expect(state.books).toHaveLength(2);expect(state.chapters).toHaveLength(43);
  expect(state.books.every(b=>!b.sourceUrl&&b.missing)).toBe(true);
  expect(state.knowledge.every(k=>k.confirmed||k.referenceOnly)).toBe(true);
  expect(state.knowledge.filter(k=>k.bookId===eduBook.id&&!k.referenceOnly).every(k=>k.confirmed)).toBe(true);
  const id=state.steps.find(t=>t.id.startsWith('edu-reviewed-ch1-'))!.id;
  state.session=makeSession(state,'new',[id]);state=rateStep(state,id,'independent',false,'edu-one');
  expect(state.progress[id].attempts).toBe(1);expect(state.events.at(-1)?.stepId).toBe(id);
  const packs=Object.values(bundled).filter(x=>!Array.isArray(x)) as ContentPack[];
  expect(packs.every(validContentPack)).toBe(true);
  expect(validContentPack({...packs[0],schemaVersion:2})).toBe(false);
 });
 it('原书与同页清理副本都可连接，其他页数或文件类型不能连接',()=>{
  expect(replacementMatches(eduBook,'pdf',157)).toBe(true);
  expect(replacementMatches(eduBook,'pdf',156)).toBe(false);
  expect(replacementMatches(eduBook,'docx',157)).toBe(false);
 });
 it('OCR 草稿层保留书名、作者和习题入口，移除广告文案',()=>{
  const scan=bundled['../public/content/edu-scan-index.json'] as ContentPack;
  const text=Object.values(scan.ocr).map(page=>page.text).join('\n');
  expect(text).not.toMatch(/配套课程公众号|联系微信|云上印|刺猬云印|微信刷题小程序|线上5分/);
  expect(scan.ocr[`${eduBook.id}:3`].text).toContain('徐影');
  expect(scan.ocr[`${eduBook.id}:2`].text).toContain('本书勘误');
  expect(scan.ocr[`${eduBook.id}:13`].text).toContain('知识速练');
 });
});
