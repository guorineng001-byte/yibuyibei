import {describe, expect, it} from 'vitest';
import {initialState} from './seed';
import {mergeContentPack, validContentPack} from './content';
import {buildSearchIndex, normalizeSearchText, searchExcerpt, searchKnowledge} from './search';
import type {AppState, Knowledge, Step} from './types';
import xunPack from '../public/content/china-proofread-ch2b.json';
import wangPack from '../public/content/china-proofread-ch6.json';

function fixture(): AppState {
  const state = initialState();
  state.books = [{...state.books[0], id: 'book-a'}, {...state.books[0], id: 'book-b'}];
  state.chapters = [
    {id: 'early', bookId: 'book-a', title: '早期', start: 1, end: 10, order: 0},
    {id: 'late', bookId: 'book-a', title: '晚期', start: 11, end: 20, order: 1},
    {id: 'other', bookId: 'book-b', title: '其他', start: 1, end: 10, order: 0},
  ];
  state.knowledge = [];
  state.steps = [];
  return state;
}
function add(state: AppState, id: string, text: string, knowledge: Partial<Knowledge> = {}, step: Partial<Step> = {}) {
  state.knowledge.push({id, title: id, bookId: 'book-a', chapterId: 'early', refs: [{page: 3}], confirmed: true, selected: false, order: state.knowledge.length, ...knowledge});
  state.steps.push({id: `${id}-0`, knowledgeId: id, title: '要点', text, keywords: [], order: 0, version: 1, ...step});
}
const find = (state: AppState, query: string) => searchKnowledge(buildSearchIndex(state), query);

describe('知识检索', () => {
  it('在真实校对资料中找到王夫之和荀子，保留不同观点对象和原书来源', () => {
    let state = initialState();
    for (const pack of [xunPack, wangPack]) {
      if (!validContentPack(pack)) throw new Error('校对内容包格式无效');
      state = mergeContentPack(state, pack);
    }
    const results = find(state, '治国之本');
    const wang = results.find(r => r.entry.knowledge.title.includes('王夫之'))!;
    const xun = results.find(r => r.entry.knowledge.title.includes('荀子'))!;
    expect(wang.hits.some(h => h.field.text === '教育是治国之本。')).toBe(true);
    expect(xun.hits.some(h => h.field.text.includes('视教师为治国之本'))).toBe(true);
    expect(wang.entry.knowledge.refs[0].page).toBe(64);
    expect(xun.entry.knowledge.refs[0].page).toBe(24);
    expect(wang.mode).toBe('phrase');
    expect(xun.mode).toBe('phrase');
    const related = find(state, '治理国家');
    expect(related.find(r => r.knowledgeId === xun.knowledgeId)?.mode).toBe('phrase');
    expect(related.find(r => r.knowledgeId === wang.knowledgeId)?.associations).toEqual([{from: '治理国家', to: '治国'}]);
  });

  it('按原文位置高亮，兼容大小写、全半角、标点和换行', () => {
    const state = fixture();
    add(state, 'mixed', 'ＡＢＣ：“治，国\n之本”。');
    const hit = find(state, 'abc治国之本')[0].hits.find(h => h.field.label === '原文')!;
    expect(hit.field.text.slice(hit.ranges[0].start, hit.ranges[0].end)).toBe('ＡＢＣ：“治，国\n之本');
    expect(find(state, '治国\n之本')).toHaveLength(1);
    expect(find(state, 'ＡＢＣ　治国之本')).toHaveLength(1);
  });

  it('归一化展开字符和非 BMP 字符的偏移仍正确', () => {
    const state = fixture();
    add(state, 'unicode', '𠮷ﬃＡ');
    const hit = find(state, 'ffi')[0].hits[0];
    expect(hit.ranges).toEqual([{start: 2, end: 3}]);
    expect(find(state, '𠮷')[0].hits[0].ranges).toEqual([{start: 0, end: 2}]);
    expect(normalizeSearchText('Ａ，Ｂ\nＣ').text).toBe('abc');
  });

  it('多个关键词可以分散在同卡片不同要点，但必须全部匹配', () => {
    const state = fixture();
    add(state, 'xun', '视教师为治国之本。', {section: '荀子的教育思想'});
    state.steps.push({...state.steps[0], id: 'xun-1', text: '教师通过施教治理国家。', order: 1});
    add(state, 'other', '荀子提出学习方法。');
    const results = find(state, '荀子 教师 治理国家');
    expect(results.map(r => r.knowledgeId)).toEqual(['xun']);
    expect(results[0].stepIds).toEqual(['xun-0', 'xun-1']);
    expect(results[0].mode).toBe('keywords');
    expect(find(state, '荀子 不存在的词')).toHaveLength(0);
  });

  it('不把不同卡片、字段或相邻提示词拼成一句原文', () => {
    const state = fixture();
    add(state, 'one', '治理', {}, {keywords: ['因材', '施教']});
    add(state, 'two', '国家');
    expect(find(state, '治理 国家')).toHaveLength(0);
    expect(find(state, '治理国家')).toHaveLength(0);
    expect(find(state, '因材施教')).toHaveLength(0);
  });

  it('索引所有层级信息、提示词以及没有要点的原表卡片', () => {
    const state = fixture();
    add(state, 'layers', '正文', {}, {keywords: ['记忆线索'], outline: '思想层次', subsection: '教学方法', displayTitle: '原书展示名', studyMode: 'read'});
    state.knowledge.push({...state.knowledge[0], id: 'table', title: '人物对照表', referenceOnly: true});
    for (const query of ['记忆线索', '思想层次', '教学方法', '原书展示名']) expect(find(state, query)[0].knowledgeId).toBe('layers');
    expect(find(state, '人物对照表')[0].entry.steps).toHaveLength(0);
  });

  it.each([
    ['治理国家', '治国'], ['因人而异', '因材施教'], ['循序渐进', '盈科而进'],
    ['由浅入深', '循序渐进'], ['启发式教学', '启发诱导'], ['因材施教', '因人而异'],
  ])('近义关联 %s → %s 显示真实命中文字', (query, text) => {
    const state = fixture(); add(state, 'related', `主张${text}。`);
    const result = find(state, query)[0];
    expect(result.mode).toBe('related');
    expect(result.associations).toEqual([{from: query, to: text}]);
    const hit = result.hits[0];
    expect(hit.field.text.slice(hit.ranges[0].start, hit.ranges[0].end)).toBe(text);
  });

  it('完整短语优先于多关键词，直接命中优先于近义关联', () => {
    const state = fixture();
    add(state, 'related', '教育是治国之本。');
    add(state, 'keywords', '治理国家。', {title: '教育思想'});
    add(state, 'phrase', '教育治理国家。', {confirmed: false});
    expect(find(state, '教育 治理国家').map(r => [r.knowledgeId, r.mode])).toEqual([
      ['phrase', 'phrase'], ['keywords', 'keywords'], ['related', 'related'],
    ]);
  });

  it('相同相关度按校对状态、书籍、章节、知识点顺序排列并可筛选', () => {
    const state = fixture();
    add(state, 'draft', '教师', {confirmed: false});
    add(state, 'book-b', '教师', {bookId: 'book-b', chapterId: 'other'});
    add(state, 'late', '教师', {chapterId: 'late'});
    add(state, 'early', '教师');
    const index = buildSearchIndex(state);
    expect(searchKnowledge(index, '教师').map(r => r.knowledgeId)).toEqual(['early', 'late', 'book-b', 'draft']);
    expect(searchKnowledge(index, '教师', {bookId: 'book-b'}).map(r => r.knowledgeId)).toEqual(['book-b']);
    expect(searchKnowledge(index, '教师', {chapterId: 'late'}).map(r => r.knowledgeId)).toEqual(['late']);
    expect(searchKnowledge(index, '教师', {status: 'draft'}).map(r => r.knowledgeId)).toEqual(['draft']);
    expect(searchKnowledge(index, '教师', {status: 'confirmed'})).toHaveLength(3);
    expect(searchKnowledge(index, '教师', {bookId: 'book-b', chapterId: 'late'})).toHaveLength(0);
  });

  it('相邻和重复命中合并高亮，一个知识点只返回一条结果', () => {
    const state = fixture(); add(state, 'repeat', '治国之本，治国之本。');
    const result = find(state, '治国 治国之本 治国');
    expect(result).toHaveLength(1);
    expect(result[0].hits[0].ranges).toEqual([{start: 0, end: 4}, {start: 5, end: 9}]);
  });

  it('空输入、只有标点和未收录表达不产生伪结果，也不检索 OCR', () => {
    const state = fixture(); add(state, 'one', '教育思想');
    state.ocr['book-a:1'] = {bookId: 'book-a', page: 1, status: 'done', text: '只存在于OCR'};
    for (const query of ['', '  \n ', '，。！？', '只存在于OCR', '完全未收录的表达']) expect(find(state, query)).toHaveLength(0);
  });

  it('重建索引反映编辑、导入和恢复，不残留旧文', () => {
    const state = fixture(); add(state, 'one', '旧观点');
    expect(find(state, '旧观点')).toHaveLength(1);
    const updated = {...state, steps: state.steps.map(s => ({...s, text: '新观点'}))};
    expect(find(updated, '旧观点')).toHaveLength(0);
    expect(find(updated, '新观点')).toHaveLength(1);
    add(updated, 'imported', '新导入知识');
    expect(find(updated, '新导入知识')).toHaveLength(1);
    expect(find(fixture(), '新观点')).toHaveLength(0);
  });

  it('检索不修改内容、学习记录或未完成队列，结果保留完整来源引用', () => {
    const state = fixture();
    add(state, 'one', '教育是治国之本', {refs: [{page: 3, rect: [.1, .2, .3, .4]}, {page: 4}]});
    state.session = {id: 'session', mode: 'review', queue: ['one-0'], initialIds: ['one-0'], cursor: 0, phase: 'recall', usedHelp: false, retries: {}, completed: [], startDay: '2026-09-09', seconds: 5, assembled: []};
    state.progress['one-0'] = {reads: 2, independentDates: ['2026-09-08'], level: 1, due: '2026-09-09', attempts: 1};
    const before = JSON.stringify(state);
    const results = find(state, '治国');
    expect(results[0].entry.knowledge.refs).toEqual(state.knowledge[0].refs);
    searchKnowledge(buildSearchIndex(state), '治理国家', {status: 'draft'});
    expect(JSON.stringify(state)).toBe(before);
  });

  it('长段落摘要围绕每个实际命中生成，并保留高亮偏移', () => {
    const text = '前'.repeat(180) + '治国' + '中'.repeat(180) + '教师' + '后'.repeat(100);
    const excerpts = searchExcerpt(text, [{start: 180, end: 182}, {start: 362, end: 364}]);
    expect(excerpts).toHaveLength(2);
    expect(excerpts.map(e => e.text.slice(e.ranges[0].start, e.ranges[0].end))).toEqual(['治国', '教师']);
    expect(excerpts.every(e => e.text.startsWith('…') && e.text.endsWith('…'))).toBe(true);
  });
});
