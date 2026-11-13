import type {AppState, Book, Chapter, Knowledge, Step} from './types';
import {searchAliases} from './searchAliases';

export type HighlightRange = {start: number; end: number};
type NormalizedText = {text: string; offsets: HighlightRange[]};
export type SearchField = {
  key: string;
  label: string;
  text: string;
  stepId?: string;
  normalized: NormalizedText;
};
export type SearchEntry = {
  knowledge: Knowledge;
  book?: Book;
  chapter?: Chapter;
  steps: Step[];
  fields: SearchField[];
  bookOrder: number;
};
export type SearchFilters = {bookId?: string; chapterId?: string; status?: 'all' | 'confirmed' | 'draft'};
export type SearchHit = {field: SearchField; ranges: HighlightRange[]};
export type SearchResult = {
  knowledgeId: string;
  entry: SearchEntry;
  stepIds: string[];
  hits: SearchHit[];
  mode: 'phrase' | 'keywords' | 'related';
  associations: {from: string; to: string}[];
  rank: number;
};

// Map every normalized UTF-16 unit back to the unmodified source for highlighting.
export function normalizeSearchText(source: string): NormalizedText {
  let text = '', offset = 0;
  const offsets: HighlightRange[] = [];
  for (const char of source) {
    const end = offset + char.length;
    for (const normalized of char.normalize('NFKC').toLowerCase()) {
      if (/[\p{P}\p{Z}\p{C}\s]/u.test(normalized)) continue;
      text += normalized;
      for (let i = 0; i < normalized.length; i++) offsets.push({start: offset, end});
    }
    offset = end;
  }
  return {text, offsets};
}

export function buildSearchIndex(state: Pick<AppState, 'books' | 'chapters' | 'knowledge' | 'steps'>): SearchEntry[] {
  const books = new Map(state.books.map((book, order) => [book.id, {book, order}]));
  const chapters = new Map(state.chapters.map(chapter => [chapter.id, chapter]));
  const stepsByKnowledge = new Map<string, Step[]>();
  for (const step of state.steps) {
    const steps = stepsByKnowledge.get(step.knowledgeId) ?? [];
    steps.push(step);
    stepsByKnowledge.set(step.knowledgeId, steps);
  }
  return state.knowledge.map(knowledge => {
    const steps = (stepsByKnowledge.get(knowledge.id) ?? []).sort((a, b) => a.order - b.order);
    const fields: SearchField[] = [];
    const add = (key: string, label: string, text?: string, stepId?: string) => {
      if (text) fields.push({key, label, text, stepId, normalized: normalizeSearchText(text)});
    };
    add('title', '知识点', knowledge.title);
    add('section', '所属小节', knowledge.section);
    for (const step of steps) {
      add(`${step.id}:title`, '要点标题', step.title, step.id);
      add(`${step.id}:text`, '原文', step.text, step.id);
      // Keep keywords separate: adjacent hints must not form an invented phrase.
      step.keywords.forEach((keyword, i) => add(`${step.id}:keyword:${i}`, '提示词', keyword, step.id));
      add(`${step.id}:outline`, '层级', step.outlinePath?.join(' › ')??step.outline, step.id);
      add(`${step.id}:subsection`, '要点小节', step.subsection, step.id);
      add(`${step.id}:displayTitle`, '展示标题', step.displayTitle, step.id);
    }
    return {knowledge, book: books.get(knowledge.bookId)?.book, chapter: chapters.get(knowledge.chapterId),
      steps, fields, bookOrder: books.get(knowledge.bookId)?.order ?? state.books.length};
  });
}

export function mergeHighlightRanges(ranges: HighlightRange[]): HighlightRange[] {
  const merged: HighlightRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({...range});
  }
  return merged;
}

function findRanges(field: SearchField, term: string): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  let from = 0;
  while (from < field.normalized.text.length) {
    const at = field.normalized.text.indexOf(term, from);
    if (at < 0) break;
    ranges.push({start: field.normalized.offsets[at].start, end: field.normalized.offsets[at + term.length - 1].end});
    from = at + 1;
  }
  return ranges;
}

function variants(term: string) {
  const result: {text: string; from: string; to: string}[] = [];
  const seen = new Set([term]);
  for (const group of searchAliases) {
    for (const from of group) {
      const needle = normalizeSearchText(from).text;
      if (!term.includes(needle)) continue;
      for (const to of group) {
        const text = term.replaceAll(needle, normalizeSearchText(to).text);
        if (!seen.has(text)) {seen.add(text); result.push({text, from, to});}
      }
    }
  }
  return result;
}

export function searchKnowledge(index: SearchEntry[], query: string, filters: SearchFilters = {}): SearchResult[] {
  // Line breaks inside copied quotations are formatting; horizontal spaces separate keywords.
  const terms = [...new Set(query.split(/[\t \u3000]+/u).map(t => normalizeSearchText(t).text).filter(Boolean))];
  if (!terms.length) return [];
  const expanded = terms.map(term => ({term, variants: variants(term)}));
  const phrase = normalizeSearchText(query).text;
  const results: SearchResult[] = [];
  for (const entry of index) {
    const k = entry.knowledge;
    if (filters.bookId && k.bookId !== filters.bookId || filters.chapterId && k.chapterId !== filters.chapterId) continue;
    if (filters.status === 'confirmed' && !k.confirmed || filters.status === 'draft' && k.confirmed) continue;
    const hitMap = new Map<string, SearchHit>();
    const associations: SearchResult['associations'] = [];
    let allMatched = true;
    const collect = (term: string) => {
      let found = false;
      for (const field of entry.fields) {
        const ranges = findRanges(field, term);
        if (!ranges.length) continue;
        found = true;
        const existing = hitMap.get(field.key);
        if (existing) existing.ranges.push(...ranges);
        else hitMap.set(field.key, {field, ranges});
      }
      return found;
    };
    for (const item of expanded) {
      if (collect(item.term)) continue;
      let related = false;
      for (const variant of item.variants) {
        if (collect(variant.text)) {
          related = true;
          if (!associations.some(a => a.from === variant.from && a.to === variant.to)) associations.push({from: variant.from, to: variant.to});
        }
      }
      if (!related) {allMatched = false; break;}
    }
    if (!allMatched) continue;
    const mode = associations.length ? 'related' : entry.fields.some(f => f.normalized.text.includes(phrase)) ? 'phrase' : 'keywords';
    const hits = [...hitMap.values()].map(hit => ({...hit, ranges: mergeHighlightRanges(hit.ranges)}));
    results.push({knowledgeId: k.id, entry, hits, mode, associations, rank: mode === 'phrase' ? 0 : mode === 'keywords' ? 1 : 2,
      stepIds: [...new Set(hits.flatMap(h => h.field.stepId ? [h.field.stepId] : []))]});
  }
  return results.sort((a, b) => a.rank - b.rank || Number(b.entry.knowledge.confirmed) - Number(a.entry.knowledge.confirmed)
    || a.entry.bookOrder - b.entry.bookOrder || (a.entry.chapter?.order ?? 0) - (b.entry.chapter?.order ?? 0)
    || a.entry.knowledge.order - b.entry.knowledge.order || a.knowledgeId.localeCompare(b.knowledgeId));
}

/** Context windows around every occurrence, avoiding previews that hide the actual hit. */
export function searchExcerpt(text: string, ranges: HighlightRange[], context = 50): {text: string; ranges: HighlightRange[]}[] {
  if (!ranges.length) return [{text: text.slice(0, 160) + (text.length > 160 ? '…' : ''), ranges: []}];
  return mergeHighlightRanges(ranges.map(r => ({start: Math.max(0, r.start - context), end: Math.min(text.length, r.end + context)})))
    .map(window => {
      const prefix = window.start ? '…' : '';
      return {text: prefix + text.slice(window.start, window.end) + (window.end < text.length ? '…' : ''),
        ranges: ranges.filter(r => r.start < window.end && r.end > window.start).map(r => ({
          start: Math.max(r.start, window.start) - window.start + prefix.length,
          end: Math.min(r.end, window.end) - window.start + prefix.length,
        }))};
    });
}
