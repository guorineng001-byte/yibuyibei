import {useId,useMemo,useState,type Dispatch,type SetStateAction} from 'react';
import {BookOpen,ChevronRight} from 'lucide-react';
import type {AppState} from './types';
import {eligibleSteps,setStepsStudyMode} from './core';
import {Modal} from './components';
import {buildStudyPickerTree,studyPickerSteps,type StudyPickerNode,type StudyScope,type StudyModeFilter} from './studyPicker';
import './studyPicker.css';

function PickerNode({node,selected,expanded,onToggle,onExpand,readCounts}:{node:StudyPickerNode;selected:Set<string>;expanded:Set<string>;onToggle:(ids:string[],checked:boolean)=>void;onExpand:(key:string)=>void;readCounts:Map<string,number>}){
 const contentId=useId(),selectedCount=node.knowledgeIds.filter(id=>selected.has(id)).length;
 const checked=node.knowledgeIds.length>0&&selectedCount===node.knowledgeIds.length,partial=selectedCount>0&&!checked,open=expanded.has(node.key),leaf=node.kind==='knowledge';
 const checkbox=<input type="checkbox" aria-label={`选择${node.label}`} checked={checked} disabled={!node.knowledgeIds.length} ref={input=>{if(input)input.indeterminate=partial;}} onChange={e=>onToggle(node.knowledgeIds,e.target.checked)}/>;
 const reads=node.knowledgeIds.reduce((n,id)=>n+(readCounts.get(id)??0),0);
 const count=<small>{leaf?`${node.stepCount} 个要点`:`${node.knowledgeIds.length} 个知识点 · ${node.stepCount} 个要点`}{reads>0&&<span>只阅读 {reads}</span>}{selectedCount>0&&<span className="study-pick-selected">已选 {selectedCount}{leaf?'':' 项'}</span>}</small>;
 if(leaf)return <label className="study-pick-leaf">{checkbox}<span>{node.label}{count}</span></label>;
 return <div className={`study-pick-node study-pick-${node.kind}`}>
  <div className={`study-pick-heading ${selectedCount?'has-selection':''}`}>
   {checkbox}<button type="button" className="study-pick-toggle" aria-expanded={open} aria-controls={contentId} onClick={()=>onExpand(node.key)}>
    <ChevronRight size={16} className={`study-pick-chevron ${open?'is-open':''}`}/>{node.kind==='book'&&<BookOpen size={20} className="study-pick-book-icon"/>}
    <span className="study-pick-title">{node.label}{count}</span><span className="study-pick-action">{open?'收起':'展开'}</span>
   </button>
  </div>
  <div id={contentId} className="study-pick-children" hidden={!open}>{open&&(node.children.length?node.children.map(child=><PickerNode key={child.key} node={child} selected={selected} expanded={expanded} onToggle={onToggle} onExpand={onExpand} readCounts={readCounts}/>):<p className="study-pick-empty">本书暂无可学内容，可以到书库校对并勾选内容。</p>)}</div>
 </div>;
}

export function ChapterPicker({state,update,onClose,onStart}:{state:AppState;update:Dispatch<SetStateAction<AppState>>;onClose:()=>void;onStart:(mode:'new'|'review',ids:string[])=>void}){
 const [selected,setSelected]=useState<string[]>([]),[scope,setScope]=useState<StudyScope>('all'),[mode,setMode]=useState<StudyModeFilter>('all'),[expanded,setExpanded]=useState<Set<string>>(()=>new Set()),[notice,setNotice]=useState('');
 const allSteps=useMemo(()=>eligibleSteps(state),[state]);
 const books=useMemo(()=>buildStudyPickerTree(state,allSteps),[state,allSteps]);
 const readCounts=useMemo(()=>{const counts=new Map<string,number>();for(const t of allSteps)if(t.studyMode==='read')counts.set(t.knowledgeId,(counts.get(t.knowledgeId)??0)+1);return counts;},[allSteps]);
 const availableIds=useMemo(()=>books.flatMap(book=>book.knowledgeIds),[books]);
 const selectedSet=useMemo(()=>new Set(selected),[selected]),range=allSteps.filter(step=>selectedSet.has(step.knowledgeId)),items=studyPickerSteps(state,selected,scope,mode),reads=range.filter(t=>t.studyMode==='read').length;
 const selectedCount=availableIds.filter(id=>selectedSet.has(id)).length;
 const toggleMany=(ids:string[],checked:boolean)=>setSelected(current=>checked?Array.from(new Set([...current,...ids])):current.filter(id=>!ids.includes(id)));
 const toggleExpanded=(key:string)=>setExpanded(current=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next;});
 function changeMode(next:'read'|'memorize'){
  const count=range.filter(t=>(t.studyMode??'memorize')!==next).length;
  update(s=>setStepsStudyMode(s,range.map(t=>t.id),next));
  setNotice(`已将 ${count} 个要点${next==='read'?'设为只阅读':'恢复背诵'}，原有掌握记录已保留。`);
 }
 return <Modal title="精确选择学习内容" onClose={onClose} wide className="study-picker-modal">
  <p className="muted">先选书，再按分篇、章节、节／考点逐层展开，找到这次想学的知识点。勾选上层可选择其中全部内容。</p>
  <div className="study-pick-filters"><label>这次怎么学<select value={scope} onChange={e=>setScope(e.target.value as StudyScope)}><option value="all">全部要点，可重复学习</option><option value="due">只复习到期要点</option><option value="fresh">只学习未学要点</option></select></label><label>要点方式<select value={mode} onChange={e=>setMode(e.target.value as StudyModeFilter)}><option value="all">阅读与背诵，按各点设置</option><option value="memorize">只选需要背诵的要点</option><option value="read">只选阅读，按原书顺序连续读</option></select></label></div>
  <div className="chapter-pick-actions"><button className="text-btn" onClick={()=>setSelected(current=>Array.from(new Set([...current,...availableIds])))} disabled={!availableIds.length}>全选可学内容</button><button className="text-btn" onClick={()=>setSelected([])} disabled={!selected.length}>清空选择</button><button className="text-btn" onClick={()=>setExpanded(new Set())} disabled={!expanded.size}>全部收起</button></div>
  <div className="study-pick-tree" aria-label="按书目选择学习内容">{books.length?books.map(book=><PickerNode key={book.key} node={book} selected={selectedSet} expanded={expanded} onToggle={toggleMany} onExpand={toggleExpanded} readCounts={readCounts}/>):<p className="study-pick-empty">书库里还没有材料，可以先到书库导入书目。</p>}</div>
  <div className="study-pick-batch"><div><strong>勾选范围 · {selectedCount} 个知识点</strong><span>只阅读 {reads} · 需要背诵 {range.length-reads}</span></div><div className="small-actions"><button className="secondary" disabled={!range.length||reads===range.length} onClick={()=>changeMode('read')}>整批设为只阅读</button><button className="secondary" disabled={!reads} onClick={()=>changeMode('memorize')}>整批恢复背诵</button></div><p>批量修改勾选范围的全部要点，保留学习进度；上方筛选只影响本次开始的内容。</p></div>
  <div className="study-pick-summary" role="status" aria-live="polite"><strong>本次开始 {items.length} 个要点{items.length>0&&` · 阅读 ${items.filter(t=>t.studyMode==='read').length} / 背诵 ${items.filter(t=>t.studyMode!=='read').length}`}</strong><span>{notice||(!items.length&&range.length?'当前筛选下没有要点，可切换到全部或修改要点方式。':'按原书顺序，不限数量；收起目录保留选择。')}</span></div>
  <div className="modal-actions"><button className="secondary" onClick={onClose}>返回</button><button className="primary" disabled={!items.length} onClick={()=>onStart(scope==='fresh'?'new':'review',items.map(t=>t.id))}>{mode==='read'?'开始连续阅读':'开始所选内容'}</button></div>
 </Modal>;
}
