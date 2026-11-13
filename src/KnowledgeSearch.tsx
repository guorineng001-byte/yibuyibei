import {Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {BookOpen, Search, X} from 'lucide-react';
import type {AppState, Book} from './types';
import {Empty, Modal, PdfPage} from './components';
import {printedPage} from './source';
import {getFile} from './storage';
import {buildSearchIndex, normalizeSearchText, searchExcerpt, searchKnowledge, type HighlightRange, type SearchFilters, type SearchResult} from './search';
import './search.css';

function Highlight({text, ranges = []}: {text: string; ranges?: HighlightRange[]}) {
  let cursor = 0;
  return <>{ranges.map((range, i) => {
    const before = text.slice(cursor, range.start);
    cursor = range.end;
    return <Fragment key={i}>{before}<mark>{text.slice(range.start, range.end)}</mark></Fragment>;
  })}{text.slice(cursor)}</>;
}

function FieldText({result, fieldKey, text}: {result: SearchResult; fieldKey: string; text: string}) {
  return <Highlight text={text} ranges={result.hits.find(h => h.field.key === fieldKey)?.ranges}/>;
}

function SourcePages({book, pages}: {book?: Book; pages: number[]}) {
  if (!pages.length) return <>未标注来源页</>;
  if (book?.kind === 'docx') return <>Word 导入内容</>;
  return <>{pages.map((page, i) => <Fragment key={i}>{i > 0 ? '；' : ''}PDF 第 {page} 页{book && printedPage(book, page) ? ` · 书上第 ${printedPage(book, page)} 页` : ''}</Fragment>)}</>;
}

function SourcePreview({book, page, rect, onLibrary}: {
  book?: Book; page: number; rect?: [number, number, number, number]; onLibrary: () => void;
}) {
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'missing'>('loading');
  useEffect(() => {
    let alive = true;
    setAvailability('loading');
    if (!book || book.missing) setAvailability('missing');
    else if (book.sourceUrl || book.kind === 'docx') setAvailability('ready');
    else void getFile(book.id).then(file => {if (alive) setAvailability(file ? 'ready' : 'missing');})
      .catch(() => {if (alive) setAvailability('missing');});
    return () => {alive = false;};
  }, [book?.id, book?.sourceUrl, book?.missing, book?.kind]);
  return <>
    {availability === 'loading' ? <p role="status">正在检查原书…</p> : availability === 'missing' ?
      <p className="notice">未找到可用的原书文件。卡片文字仍可阅读，请到书库重新连接原文件。</p> :
      book && <PdfPage key={`${book.id}:${page}`} book={book} page={page} rect={rect}/>}
    <div className="search-source-help"><p>原书若无法打开，可到书库重新连接原文件。</p><button className="secondary" onClick={onLibrary}>去我的书库</button></div>
  </>;
}

function SourceDialog({result, onClose, onLibrary}: {result: SearchResult; onClose: () => void; onLibrary: () => void}) {
  const [refIndex, setRefIndex] = useState(0);
  const {knowledge, book} = result.entry;
  const source = knowledge.refs[refIndex] ?? knowledge.refs[0];
  useLayoutEffect(() => {
    const overflow = document.body.style.overflow, top = window.scrollY;
    document.body.style.overflow = 'hidden';
    return () => {document.body.style.overflow = overflow; requestAnimationFrame(() => window.scrollTo(0, top));};
  }, []);
  return <Modal title={`原书对照 · ${knowledge.title}`} onClose={onClose} wide>
    {knowledge.refs.length > 1 && <label>来源页<select value={refIndex} onChange={e => setRefIndex(Number(e.target.value))}>
      {knowledge.refs.map((ref, i) => <option key={i} value={i}>来源 {i + 1} · PDF 第 {ref.page} 页{book && printedPage(book, ref.page) ? ` · 书上第 ${printedPage(book, ref.page)} 页` : ''}</option>)}
    </select></label>}
    {source ? <SourcePreview book={book} page={source.page} rect={source.rect} onLibrary={onLibrary}/> : <p>这个知识点尚未标注来源页。</p>}
  </Modal>;
}

function ResultCard({result, onSource}: {result: SearchResult; onSource: () => void}) {
  const {knowledge: k, book, chapter, steps} = result.entry;
  const bodyHits = result.hits.filter(h => h.field.label === '原文');
  const previews = result.hits.filter(h => h.field.stepId && (h.field.label === '原文' || !bodyHits.some(body =>
    body.field.stepId === h.field.stepId && h.ranges.every(range => body.ranges.some(bodyRange =>
      normalizeSearchText(body.field.text.slice(bodyRange.start, bodyRange.end)).text.includes(normalizeSearchText(h.field.text.slice(range.start, range.end)).text))))))
    .sort((a, b) => Number(b.field.label === '原文') - Number(a.field.label === '原文'));
  const contextStep = steps.find(step => result.stepIds.includes(step.id)) ?? steps[0];
  const renderPreview = (hit: typeof previews[number]) => <div className="search-hit" key={hit.field.key}>
    <div className="search-hit-label">{steps.find(s => s.id === hit.field.stepId)?.title} · {hit.field.label}</div>
    {searchExcerpt(hit.field.text, hit.ranges).map((excerpt, i) => <p key={i}><Highlight {...excerpt}/></p>)}
  </div>;
  return <article className="search-result">
    <div className="search-result-heading"><h2><FieldText result={result} fieldKey="title" text={k.title}/></h2>
      <span className={`tag ${k.confirmed ? 'green' : 'amber'}`}>{k.confirmed ? '已校对' : '待校对'}</span>{k.referenceOnly && <span className="tag">原表对照</span>}
    </div>
    <p className="search-location">{book?.title ?? '未关联书籍'} / {chapter?.title ?? '未关联章节'}</p>
    {k.section && <p className="search-section"><FieldText result={result} fieldKey="section" text={k.section}/></p>}
    <div className="search-match-kind">{result.mode === 'related' ? <>{result.associations.map(a => <span key={`${a.from}:${a.to}`}>通过“{a.from} → {a.to}”找到</span>)}<small>近义关联，仅作回顾线索，请结合原文理解。</small></> :
      <span>{result.mode === 'phrase' ? '原文匹配' : '多关键词匹配'}</span>}</div>
    {previews.slice(0, 3).map(renderPreview)}
    {previews.length > 3 && <details className="search-more-hits"><summary>展开其余 {previews.length - 3} 处命中</summary>{previews.slice(3).map(renderPreview)}</details>}
    {!bodyHits.length && contextStep && <div className="search-hit"><div className="search-hit-label">正文预览 · {contextStep.title}</div><p>{searchExcerpt(contextStep.text, [])[0].text}</p></div>}
    {!steps.length && <p className="search-section">此卡片暂无文字要点，可查看原书对照。</p>}
    <div className="search-card-footer"><span><SourcePages book={book} pages={[...new Set(k.refs.map(r => r.page))]}/></span>
      <button className="secondary" disabled={!k.refs.length} onClick={onSource} aria-label={`查看原书：${k.title}`}><BookOpen size={15}/>查看原书</button>
    </div>
    <details className="search-full-card"><summary>阅读完整知识点 · {steps.length} 个要点</summary>
      {k.reviewNote && <p className="search-review-note">{k.reviewNote}</p>}
      {steps.map(step => <section className="search-full-step" key={step.id}>
        <h3><FieldText result={result} fieldKey={`${step.id}:title`} text={step.title}/><span className="tag subtle">{step.studyMode === 'read' ? '阅读' : '背诵'}</span></h3>
        {([['displayTitle', step.displayTitle], ['outline', step.outline], ['subsection', step.subsection]] as const).map(([key, text]) => text && text !== step.title ?
          <p className="search-section" key={key}><FieldText result={result} fieldKey={`${step.id}:${key}`} text={text}/></p> : null)}
        <p className="search-original"><FieldText result={result} fieldKey={`${step.id}:text`} text={step.text}/></p>
        {!!step.keywords.length && <p className="search-keywords">提示词：{step.keywords.map((word, i) => <Fragment key={i}>{i > 0 ? '、' : ''}<FieldText result={result} fieldKey={`${step.id}:keyword:${i}`} text={word}/></Fragment>)}</p>}
      </section>)}
    </details>
  </article>;
}

export function KnowledgeSearch({state, active, onLibrary}: {state: AppState; active: boolean; onLibrary: () => void}) {
  const [query, setQuery] = useState(''), [bookId, setBookId] = useState(''), [chapterId, setChapterId] = useState('');
  const [status, setStatus] = useState<NonNullable<SearchFilters['status']>>('all');
  const [limit, setLimit] = useState(30), [sourceId, setSourceId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null), scroll = useRef(0);
  const index = useMemo(() => buildSearchIndex(state), [state.books, state.chapters, state.knowledge, state.steps]);
  const effectiveBook = state.books.some(b => b.id === bookId) ? bookId : '';
  const chapters = state.chapters.filter(c => !effectiveBook || c.bookId === effectiveBook).sort((a, b) => a.order - b.order);
  const effectiveChapter = chapters.some(c => c.id === chapterId) ? chapterId : '';
  const results = useMemo(() => searchKnowledge(index, query, {bookId: effectiveBook, chapterId: effectiveChapter, status}), [index, query, effectiveBook, effectiveChapter, status]);
  const hasQuery = !!normalizeSearchText(query).text;
  const sourceResult = results.find(r => r.knowledgeId === sourceId);
  useEffect(() => {setLimit(30); setSourceId(null);}, [query, effectiveBook, effectiveChapter, status, index]);
  useLayoutEffect(() => {
    if (!active) {setSourceId(null); return;}
    window.scrollTo(0, scroll.current);
    const remember = () => {scroll.current = window.scrollY;};
    window.addEventListener('scroll', remember);
    return () => window.removeEventListener('scroll', remember);
  }, [active]);
  function chooseExample(value: string) {setQuery(value); input.current?.focus();}
  return <div hidden={!active} className="search-page">
    <div className="page-heading"><div><div className="eyebrow">FIND YOUR KNOWLEDGE</div><h1>记得一点，就从这里找起。</h1><p>输入人物、观点或原文片段，把散落在不同章节的知识一起找回来。</p></div></div>
    <section className="search-controls panel" aria-label="检索条件">
      <label htmlFor="knowledge-query">想起了什么？</label><div className="search-input-row"><Search size={20} aria-hidden="true"/>
        <input ref={input} id="knowledge-query" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="例如：治国之本、因材施教，或 荀子 教师" aria-describedby="search-help"/>
        {query && <button className="icon-btn" aria-label="清空检索" onClick={() => chooseExample('')}><X size={18}/></button>}
      </div>
      <p id="search-help" className="search-help">多个关键词用空格分隔；支持常见近义表达。搜索全部已入库卡片，包含未学和待校对内容。</p>
      <div className="search-filters">
        <label>书籍<select value={effectiveBook} onChange={e => {setBookId(e.target.value); setChapterId('');}}><option value="">全部书籍</option>{state.books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
        <label>章节<select value={effectiveChapter} onChange={e => setChapterId(e.target.value)}><option value="">全部章节</option>{chapters.map(c => <option key={c.id} value={c.id}>{!effectiveBook && state.books.length > 1 ? `${state.books.find(b => b.id === c.bookId)?.title} / ` : ''}{c.title}</option>)}</select></label>
        <label>校对状态<select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="all">全部状态</option><option value="confirmed">已校对</option><option value="draft">待校对</option></select></label>
      </div>
      {(effectiveBook || effectiveChapter || status !== 'all') && <button className="text-btn" onClick={() => {setBookId(''); setChapterId(''); setStatus('all');}}>重置筛选</button>}
    </section>
    {!hasQuery ? <div className="search-start panel"><Search size={30}/><h2>从一句话，找到相关知识点</h2><p>只记得部分原文也可以。试试这些关键词：</p><div className="search-examples">{['治国之本', '治理国家', '因材施教', '荀子 教师'].map(example => <button className="secondary" key={example} onClick={() => chooseExample(example)}>{example}</button>)}</div><p className="search-help">检索卡片文字与提示词；未整理的扫描图片和 OCR 全文不在本次检索范围内。</p></div> : <>
      <p className="search-count" role="status" aria-live="polite">找到 {results.length} 个知识点{results.length > 0 ? ` · 已显示 ${Math.min(limit, results.length)} 个` : ''}</p>
      {!results.length ? <Empty title="暂时没有找到相关知识点" description="试试更短的关键词，用空格拆开多个线索，或扩大书籍、章节及校对状态的筛选范围。"/> :
        <div className="search-results" key={`${query}:${effectiveBook}:${effectiveChapter}:${status}`}>{results.slice(0, limit).map(result => <ResultCard key={result.knowledgeId} result={result} onSource={() => setSourceId(result.knowledgeId)}/>)}</div>}
      {results.length > limit && <div className="search-load-more"><button className="secondary" onClick={() => setLimit(n => n + 30)}>加载更多 · 还有 {results.length - limit} 个知识点</button></div>}
    </>}
    {active && sourceResult && <SourceDialog key={sourceResult.knowledgeId} result={sourceResult} onClose={() => setSourceId(null)} onLibrary={() => {setSourceId(null); onLibrary();}}/>}
  </div>;
}
