import {useMemo,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {Download,Upload,BookOpen,Copy,FileJson} from 'lucide-react';
import type {AppState,Chapter} from './types';
import {Modal} from './components';
import {downloadText,exportLearningPackage,importLearningPackage,parseLearningPackage,previewLearningPackage,type LearningPackage,type PackagePreview} from './learningPackage';
import './learningPackage.css';

type Props={state:AppState;update:Dispatch<SetStateAction<AppState>>;bookId:string;chapterId?:string;onClose:()=>void;onImported:(bookId:string,chapter?:Chapter)=>void;toast:(message:string)=>void};
export function LearningPackageCenter({state,update,bookId,chapterId,onClose,onImported,toast}:Props){
 const [tab,setTab]=useState<'import'|'export'|'guide'>('import'),[input,setInput]=useState(''),[pack,setPack]=useState<LearningPackage|null>(null),[error,setError]=useState(''),[adoptChanges,setAdoptChanges]=useState(false),[keepReviewed,setKeepReviewed]=useState(false),[scope,setScope]=useState<'chapter'|'book'>(chapterId?'chapter':'book'),[prompt,setPrompt]=useState('');
 const upload=useRef<HTMLInputElement>(null);
 const [exportText,setExportText]=useState('');
 const book=state.books.find(b=>b.id===bookId),chapter=state.chapters.find(c=>c.id===chapterId);
 const inspection=useMemo<{preview?:PackagePreview;error?:string}>(()=>{if(!pack)return {};try{return {preview:previewLearningPackage(state,pack)};}catch(e){return {error:(e as Error).message};}},[pack,state]);
 const preview=inspection.preview;
 const resetCount=preview?.changes.filter(c=>c.resetsProgress).length??0;
 const newInExisting=useMemo(()=>{if(!pack)return 0;const existingSteps=new Set(state.steps.map(t=>t.id)),existingKnowledge=new Set(state.knowledge.map(k=>k.id));return new Set(pack.steps.filter(t=>!existingSteps.has(t.id)&&existingKnowledge.has(t.knowledgeId)).map(t=>t.knowledgeId)).size;},[state,pack]);
 function inspect(content:string){setError('');setPack(null);setAdoptChanges(false);setKeepReviewed(false);try{setPack(parseLearningPackage(content));}catch(e){setError((e as Error).message);}}
 async function readFile(file:File){setError('');try{if(file.size>50*1024*1024)throw new Error('学习包超过 50 MB，请按章节拆分 JSON；原 PDF 请通过原书重连选择。');const content=await file.text();setInput(content);inspect(content);}catch(e){setPack(null);setError((e as Error).message);}}
 async function loadExample(){try{const response=await fetch('/guide/learning-package-example.json');if(!response.ok)throw new Error('示例读取失败，请联网打开后重试。');const content=await response.text();setInput(content);inspect(content);setTab('import');}catch(e){setError((e as Error).message);}}
 async function showPrompt(){try{const response=await fetch('/guide/agent-instructions.md');if(!response.ok)throw new Error('整理说明读取失败，请联网后重试。');const content=await response.text();setPrompt(content);try{await navigator.clipboard.writeText(content);toast('整理提示词已复制，可粘贴到你自己的 AI 对话中。');}catch{toast('可在下方文本框中选择并复制整理提示词。');}}catch(e){setError((e as Error).message);}}
 function exportPackage(){try{const data=exportLearningPackage(state,bookId,scope==='chapter'?chapterId:undefined);downloadText(`${bookId}${scope==='chapter'?'-chapter':''}.learning.json`,JSON.stringify(data,null,2));toast('学习包已导出，未包含个人设置、学习进度和原书文件。');}catch(e){setError((e as Error).message);}}
 function previewExport(){try{setExportText(JSON.stringify(exportLearningPackage(state,bookId,scope==='chapter'?chapterId:undefined),null,2));}catch(e){setError((e as Error).message);}}
 function confirmImport(){if(!pack||!preview)return;try{update(s=>importLearningPackage(s,pack,{adoptChanges,keepReviewed}));onImported(pack.book.id,pack.chapters[0]);toast('学习包已导入。待校对卡片请对照原书确认后再学习。');onClose();}catch(e){setError((e as Error).message);}}
 return <Modal title="Agent 学习包" onClose={onClose} wide className="package-center">
  <p className="package-intro">用自己的 AI 整理教材，把学习内容带进来。学习备份仍在“学习设置”中管理。</p>
  <div className="package-tabs" role="tablist" aria-label="学习包操作">{[['import','导入学习包'],['export','导出学习包'],['guide','新手教程']].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>{setTab(id as typeof tab);setError('');}}>{label}</button>)}</div>
  {(error||tab==='import'&&inspection.error)&&<p className="error-box" role="alert">{error||inspection.error}</p>}
  {tab==='import'&&<section className="package-section" aria-label="导入学习包">
   <div className="small-actions"><button className="secondary" onClick={()=>upload.current?.click()}><Upload size={16}/>选择 JSON 文件</button><button className="secondary" onClick={()=>void loadExample()}><FileJson size={16}/>载入原创示例</button><a className="text-btn" href="/guide/learning-package-example.json" download>下载示例</a></div>
   <input hidden type="file" accept=".json,application/json" ref={upload} onChange={e=>{const file=e.target.files?.[0];if(file)void readFile(file);e.target.value='';}}/>
   <label>或粘贴 AI 返回的完整 JSON<textarea rows={7} spellCheck={false} value={input} onChange={e=>{setInput(e.target.value);setPack(null);setError('');}} placeholder="把整理工具返回的 JSON 粘贴到这里，先预览再确认。"/></label>
   <button className="secondary" disabled={!input.trim()} onClick={()=>inspect(input)}>预览导入</button>
   {pack&&preview&&<div className="package-preview" aria-label="学习包预览">
    <h3>{pack.book.title}</h3><p>{pack.book.subject} · {pack.book.pages} 页 · 本包 {pack.chapters.length} 章、{pack.knowledge.length} 个知识点、{pack.steps.length} 个要点</p>
    <dl className="package-source"><div><dt>来源</dt><dd>{pack.book.source?.citation}</dd></div><div><dt>使用范围</dt><dd>{pack.book.source?.rights}</dd></div></dl>
    <p className="package-counts">{preview.newBook?'新增 1 本书':'接入已有书目'} · 新增 {preview.newChapters} 章、{preview.newKnowledge} 个知识点、{preview.newSteps} 个要点 · {preview.unchangedSteps} 个要点不变</p>
    {preview.changes.length>0&&<><p>有 {preview.changes.length} 项内容与现有记录不同。默认保留已有内容，仍可追加本包的新条目。</p><div className="package-change-list">{preview.changes.map(change=><details key={`${change.kind}:${change.id}`}><summary>{change.title}{change.resetsProgress?' · 正文修订':''}</summary><div className="package-comparison"><div><strong>现有内容</strong><p>{change.before}</p></div><div><strong>学习包内容</strong><p>{change.after}</p></div></div></details>)}</div><label className="check-label"><input type="checkbox" checked={adoptChanges} onChange={e=>setAdoptChanges(e.target.checked)}/>采用上方修订，保留学习包中未提及的内容</label>{adoptChanges&&<p className="hint-text">将重置 {resetCount} 个正文改变的要点进度，保留回忆事件和其他要点进度。知识点或要点的修订会结束当前学习会话；修订内容默认需重新校对。</p>}</>}
    {!!newInExisting&&<p className="hint-text">有 {newInExisting} 个已有知识点新增了要点，需要重新核对；其中原有要点的进度保留。</p>}
    <label className="check-label"><input type="checkbox" checked={keepReviewed} onChange={e=>setKeepReviewed(e.target.checked)}/>保留包中的已校对标记（我已逐条对照原书确认）</label>
    <p className="hint-text">未勾选时，新内容按待校对导入。学习包不包含个人设置、学习进度或原 PDF，也不会删除现有内容。</p>
    <div className="modal-actions"><button className="secondary" onClick={onClose}>取消</button><button className="primary" onClick={confirmImport}>确认导入学习包</button></div>
   </div>}
  </section>}
  {tab==='export'&&<section className="package-section" aria-label="导出学习包"><h3>{book?.title??'请先选择一本书'}</h3><label>导出范围<select value={scope} onChange={e=>{setScope(e.target.value as typeof scope);setExportText('');}}>{chapter&&<option value="chapter">当前章节：{chapter.title}</option>}<option value="book">整本书的已整理内容</option></select></label><p>保留书目、来源说明、章节、知识点、要点、校对状态和稳定 ID，方便交给自己的 Agent 续接整理，或带到另一份学习库。</p><p className="hint-text">导出不包含考试设置、院校、进度、回忆记录、OCR 缓存或原书文件。跨设备恢复进度请使用学习设置中的完整学习备份。</p><div className="small-actions"><button className="primary" disabled={!book} onClick={exportPackage}><Download size={16}/>下载学习包 JSON</button><button className="secondary" disabled={!book} onClick={previewExport}>显示可复制 JSON</button></div>{exportText&&<label>导出的学习包 JSON<textarea readOnly rows={9} value={exportText} onFocus={e=>e.target.select()}/></label>}<p className="hint-text">将这个文件和待整理的教材页一起交给 AI，使用“新手教程”中的整理提示词。</p></section>}
  {tab==='guide'&&<section className="package-section package-guide" aria-label="新手教程">
   <h3>从几页教材开始，不用写代码</h3>
   <ol><li><strong>先试示例。</strong>载入原创示例，预览后导入，熟悉书库中的“待校对 → 确认 → 学习”。示例没有配套原书，可按示例文字演示核对。</li><li><strong>准备自己的材料。</strong>一次选一节或 3–5 页，记下原 PDF 总页数与本次 PDF 页码。扫描页可用清晰截图；已有书目续接时，先在导出页下载当前章节学习包。</li><li><strong>交给自己的 AI。</strong>可从 <a href="https://www.kimi.com/" target="_blank" rel="noreferrer">Kimi</a> 开始，上传教材片段；也可在 <a href="https://chat.deepseek.com/" target="_blank" rel="noreferrer">DeepSeek</a> 或 <a href="https://www.doubao.com/" target="_blank" rel="noreferrer">豆包</a> 中粘贴整理文字。复制下方提示词，让它返回完整 JSON。</li><li><strong>带回学习包。</strong>下载 AI 给出的 .json 文件，或把完整 JSON 粘贴到导入页。先看来源、页数、新增数量和修订对比，再确认导入。</li><li><strong>对照后开始。</strong>到书库重连自己的原书，逐条核对文字与层级。确认已校对并勾选后，即可按章节学习和检索。下一次先导出已有包，让 AI 沿用 ID 追加。</li></ol>
   <div className="small-actions"><button className="secondary" onClick={()=>void loadExample()}><BookOpen size={16}/>载入原创示例</button><button className="primary" onClick={()=>void showPrompt()}><Copy size={16}/>复制整理提示词</button><a className="text-btn" href="/guide/agent-instructions.md" download>下载整理说明</a></div>
   {prompt&&<label>可直接复制的整理提示词<textarea rows={9} readOnly value={prompt} onFocus={e=>e.target.select()}/></label>}
   <details><summary>遇到问题时</summary><p>JSON 格式有误：把程序给出的错误信息发回原 AI 对话，请它保留 ID 并返回完整文件。重复导入不会重复增加条目；不确定修订时保持“采用修订”不勾选。</p><p>附件太大或额度不足：缩小到几页或粘贴文字，分次续接。工具不提供文件下载时，直接复制 JSON。原 PDF 与个人学习备份无需发给 AI。</p><p>AI 可能识别错字或层级；待校对内容须由你核对。各工具的附件能力、额度及收费以其当前页面为准。文字和文件由你主动交给所选工具，本程序不代传教材、不要求 API 密钥。</p><p>资料：<a href="https://www.kimi.com/help/others/capability" target="_blank" rel="noreferrer">Kimi 文件能力说明</a> · <a href="/guide/AI_STARTER_GUIDE.md" download>完整使用教程</a></p></details>
  </section>}
 </Modal>;
}
