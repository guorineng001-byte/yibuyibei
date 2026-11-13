import type {AppState,Chapter,Knowledge,Step} from './types';
import {knowledgeSteps} from './core';

export type StudyScope='all'|'due'|'fresh';
export type StudyModeFilter='all'|'memorize'|'read';

/** Custom ranges follow source order, even when due dates differ. */
export function studyPickerSteps(state:AppState,knowledgeIds:string[],scope:StudyScope,mode:StudyModeFilter){
 const matching=new Set(knowledgeSteps(state,knowledgeIds,scope).filter(t=>mode==='all'||(t.studyMode??'memorize')===mode).map(t=>t.id));
 return knowledgeSteps(state,knowledgeIds,'all').filter(t=>matching.has(t.id));
}

export type StudyPickerNode={
 key:string;
 label:string;
 kind:'book'|'part'|'chapter'|'section'|'knowledge';
 knowledgeIds:string[];
 stepCount:number;
 children:StudyPickerNode[];
};

const partNames:Record<string,string>={'中教':'中国教育史','外教':'外国教育史','教心':'教育心理学','教原':'教育学原理'};
const splitPath=(value:string)=>value.split(/\s*·\s*/).map(label=>label.trim()).filter(Boolean);
const nodeKey=(...path:string[])=>JSON.stringify(path);
const makeNode=(key:string,label:string,kind:StudyPickerNode['kind']):StudyPickerNode=>({key,label,kind,knowledgeIds:[],stepCount:0,children:[]});
function chapterInfo(chapter:Chapter){
 const [prefix,...rest]=splitPath(chapter.title);
 return rest.length&&Object.hasOwn(partNames,prefix)?{part:prefix,title:rest.join(' · ')}:{part:'',title:chapter.title};
}

// Reference cards often carry the full section heading while learning cards use
// only its number. Keep those cards together under the original section title.
function sectionHeadings(knowledge:Knowledge[]){
 const headings=new Map<string,string>();
 for(const item of knowledge){
  const [number,title]=splitPath(item.section??'');
  if(number&&/^第.+节$/.test(number)&&title&&!/^(?:考点|[（(]|\d|[一二三四五六七八九十]+[、.．])/.test(title)&&!headings.has(number))headings.set(number,title);
 }
 return headings;
}
function sectionPath(item:Knowledge,headings:Map<string,string>){
 const labels=splitPath(item.section??'');
 if(!labels.length)return ['未分节内容'];
 const title=headings.get(labels[0]);
 if(title){
  const number=labels.shift()!;
  if(labels[0]===title)labels.shift();
  labels.unshift(`${number} · ${title}`);
 }
 return labels;
}
function summarize(node:StudyPickerNode):StudyPickerNode{
 if(node.kind==='knowledge')return node;
 node.children.forEach(summarize);
 node.knowledgeIds=node.children.flatMap(child=>child.knowledgeIds);
 node.stepCount=node.children.reduce((count,child)=>count+child.stepCount,0);
 return node;
}

/** Build from book/chapter relationships so imported books join automatically. */
export function buildStudyPickerTree(state:AppState,availableSteps:Step[]):StudyPickerNode[]{
 const counts=new Map<string,number>();
 for(const step of availableSteps)counts.set(step.knowledgeId,(counts.get(step.knowledgeId)??0)+1);
 return state.books.map(book=>{
  const root=makeNode(nodeKey('book',book.id),book.title,'book');
  const chapters=state.chapters.filter(chapter=>chapter.bookId===book.id).sort((a,b)=>a.order-b.order);
  const numbering=new Map<string,number>();
  for(const chapter of chapters){
   const {part,title}=chapterInfo(chapter),number=(numbering.get(part)??0)+1;
   numbering.set(part,number);
   const allKnowledge=state.knowledge.filter(item=>item.bookId===book.id&&item.chapterId===chapter.id).sort((a,b)=>a.order-b.order);
   const knowledge=allKnowledge.filter(item=>item.selected&&item.confirmed&&!item.referenceOnly&&counts.has(item.id));
   if(!knowledge.length)continue;
   let parent=root;
   if(part){
    const key=nodeKey('part',book.id,part);
    let branch=root.children.find(child=>child.key===key);
    if(!branch){branch=makeNode(key,partNames[part]??part,'part');root.children.push(branch);}
    parent=branch;
   }
   const label=part&&!/^第.+章/.test(title)?`第${number}章 · ${title}`:title;
   const chapterNode=makeNode(nodeKey('chapter',book.id,chapter.id),label,'chapter');
   parent.children.push(chapterNode);
   const headings=sectionHeadings(allKnowledge);
   for(const item of knowledge){
    let section=chapterNode;
    const path:string[]=[];
    for(const label of sectionPath(item,headings)){
     path.push(label);
     const key=nodeKey('section',book.id,chapter.id,...path);
     let branch=section.children.find(child=>child.key===key);
     if(!branch){branch=makeNode(key,label,'section');section.children.push(branch);}
     section=branch;
    }
    section.children.push({...makeNode(nodeKey('knowledge',item.id),item.title,'knowledge'),knowledgeIds:[item.id],stepCount:counts.get(item.id)!});
   }
  }
  return summarize(root);
 });
}
