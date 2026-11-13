import {useMemo} from 'react';
import {Check,ChevronDown,ChevronRight} from 'lucide-react';
import type {AppState,Step} from './types';
import {eligibleSteps} from './core';
import {buildStudyPickerTree,type StudyPickerNode} from './studyPicker';
import './sessionDirectory.css';
import type {StepOutlineGroup} from './studyOutline';
import {groupJumpTarget} from './studyOutline';

export function OutlineNavigation({groups,currentId,handled,onJump,depth=0}:{groups:StepOutlineGroup[];currentId:string;handled:Set<string>;onJump:(id:string)=>void;depth?:number}){
 return <ul className={depth===0?'outline-tree':'outline-children'}>{groups.map(group=>{
  const active=group.steps.some(t=>t.id===currentId),done=group.steps.every(t=>handled.has(t.id));
  const branch=group.children.length>0;
  return <li key={group.key}><button className={`outline-node ${depth===0?'outline-root':''} ${active?'active':''} ${done?'done':''}`} aria-current={!branch&&active?'step':undefined} onClick={()=>onJump(groupJumpTarget(group,handled))}>
   <span className="outline-marker">{done?<Check size={13}/>:branch?(active?<ChevronDown size={13}/>:<ChevronRight size={13}/>):<span className="outline-dot"/>}</span>
   <span className="outline-label">{group.label}</span>{branch&&<small>{group.steps.filter(t=>handled.has(t.id)).length}/{group.steps.length}</small>}
  </button>{branch&&active&&<OutlineNavigation groups={group.children} currentId={currentId} handled={handled} onJump={onJump} depth={depth+1}/>}</li>;
 })}</ul>;
}

export function OutlineOverview({groups}:{groups:StepOutlineGroup[]}){
 return <ul className="framework-tree">{groups.map(group=><li key={group.key}><span className={group.children.length?'framework-branch':'framework-leaf'}>{group.label}</span>{group.children.length>0&&<OutlineOverview groups={group.children}/>}</li>)}</ul>;
}

export function SessionNavigation({state,currentId,handled,onJump}:{state:AppState;currentId:string;handled:Set<string>;onJump:(id:string)=>void}){
 const ids=state.session?.initialIds;
 const steps=useMemo(()=>{const selected=new Set(ids);return eligibleSteps(state).filter(t=>selected.has(t.id));},[state.books,state.chapters,state.knowledge,state.steps,ids]);
 const books=useMemo(()=>buildStudyPickerTree(state,steps).filter(book=>book.stepCount),[state.books,state.chapters,state.knowledge,steps]);
 const current=steps.find(t=>t.id===currentId)?.knowledgeId;
 return <details className="session-directory"><summary>本次目录 · {steps.length} 个要点 · 按原书顺序</summary><nav aria-label="本次所选学习范围">{books.map(node=><SessionBranch key={node.key} node={node} steps={steps} current={current} handled={handled} onJump={onJump}/>)}</nav></details>;
}

function SessionBranch({node,steps,current,handled,onJump}:{node:StudyPickerNode;steps:Step[];current?:string;handled:Set<string>;onJump:(id:string)=>void}){
 const selected=new Set(node.knowledgeIds),items=steps.filter(t=>selected.has(t.knowledgeId)),done=items.filter(t=>handled.has(t.id)).length,active=!!current&&selected.has(current);
 if(node.kind==='knowledge')return <button className={`session-point ${active?'active':''}`} aria-current={active?'step':undefined} onClick={()=>onJump(items.find(t=>!handled.has(t.id))?.id??items[0].id)}><span>{node.label}</span><small>{done}/{items.length} · 只阅读 {items.filter(t=>t.studyMode==='read').length}</small></button>;
 return <details open={active} className="session-branch"><summary>{node.label}<small>{done}/{items.length}</small></summary><div>{node.children.map(child=><SessionBranch key={child.key} node={child} steps={items} current={current} handled={handled} onJump={onJump}/>)}</div></details>;
}
