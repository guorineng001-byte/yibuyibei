import type {AppState,Book,Chapter,Knowledge,SourceRef,Step} from './types';
import {reviseStep} from './core';
import {bundledBooks} from './books';

export type LearningPackage={format:'yibuyibei-learning-package';schemaVersion:1;book:Book;chapters:Chapter[];knowledge:Knowledge[];steps:Step[]};
export type ImportOptions={adoptChanges:boolean;keepReviewed:boolean};
export type PackageChange={kind:'book'|'chapter'|'knowledge'|'step';id:string;title:string;before:string;after:string;resetsProgress:boolean};
export type PackagePreview={newBook:boolean;newChapters:number;newKnowledge:number;newSteps:number;unchangedSteps:number;changes:PackageChange[]};

function fail(path:string,message:string):never{throw new Error(`${path}：${message}`);}
function object(value:unknown,path:string):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))fail(path,'需要一个对象');return value as Record<string,unknown>;}
function text(value:unknown,path:string,allowEmpty=false):string{if(typeof value!=='string'||(!allowEmpty&&!value.trim()))fail(path,'需要文字'+(allowEmpty?'':'，不能为空'));return value;}
function integer(value:unknown,path:string,min=0):number{if(typeof value!=='number'||!Number.isInteger(value)||value<min)fail(path,`需要不小于 ${min} 的整数`);return value;}
function boolean(value:unknown,path:string):boolean{if(typeof value!=='boolean')fail(path,'需要 true 或 false');return value;}
function rows(value:unknown,path:string):unknown[]{if(!Array.isArray(value))fail(path,'需要一个数组');return value;}
function strings(value:unknown,path:string):string[]{return rows(value,path).map((x,i)=>text(x,`${path}[${i}]`));}
function optionalText(value:unknown,path:string):string|undefined{return value===undefined?undefined:text(value,path,true);}
function unique(items:{id:string}[],path:string){const ids=new Set<string>();for(const item of items){if(ids.has(item.id))fail(path,`ID ${item.id} 重复，请为不同条目使用不同 ID`);ids.add(item.id);}}

export function parseLearningPackage(input:string|unknown):LearningPackage{
 let data:unknown=input;
 if(typeof input==='string'){
  const content=input.trim().replace(/^```(?:json)?\s*\n/i,'').replace(/\n```\s*$/,'');
  try{data=JSON.parse(content);}catch(e){throw new Error('JSON 格式有误：'+(e as Error).message+'。请让整理工具返回完整 JSON，或复制代码框内的全部内容。');}
 }
 const p=object(data,'学习包');
 if(p.format!=='yibuyibei-learning-package')fail('format',p.schemaVersion===1&&Array.isArray(p.books)?'这是学习备份，请到学习设置中恢复':'需要 yibuyibei-learning-package，请使用本程序的学习包模板');
 if(p.schemaVersion!==1)fail('schemaVersion','当前支持版本 1');
 const b=object(p.book,'book'),source=object(b.source,'book.source');
 const kind=b.kind;if(kind!=='pdf'&&kind!=='docx')fail('book.kind','需要 pdf 或 docx');
 const book:Book={id:text(b.id,'book.id'),title:text(b.title,'book.title'),subject:text(b.subject,'book.subject'),filename:text(b.filename,'book.filename'),pages:integer(b.pages,'book.pages',1),offset:integer(b.offset,'book.offset'),kind,source:{citation:text(source.citation,'book.source.citation'),rights:text(source.rights,'book.source.rights')},missing:true};
 if(book.offset>=book.pages)fail('book.offset','必须小于文件总页数');
 if(kind==='docx'&&book.pages!==1)fail('book.pages','Word 文字材料使用 1 页');
 if(b.pageLabels!==undefined){book.pageLabels={};for(const [key,value] of Object.entries(object(b.pageLabels,'book.pageLabels'))){if(!/^\d+$/.test(key)||Number(key)<1||Number(key)>book.pages)fail('book.pageLabels',`页码 ${key} 超出原书范围`);book.pageLabels[key]=text(value,`book.pageLabels.${key}`,true);}}
 if(b.pageRotations!==undefined){book.pageRotations={};for(const [key,value] of Object.entries(object(b.pageRotations,'book.pageRotations'))){if(!/^\d+$/.test(key)||Number(key)<1||Number(key)>book.pages||typeof value!=='number'||!Number.isInteger(value)||value%90!==0)fail('book.pageRotations',`第 ${key} 页需要有效页码及 90 的整数倍角度`);book.pageRotations[key]=value;}}
 const chapters=rows(p.chapters,'chapters').map((value,i):Chapter=>{const path=`chapters[${i}]`,c=object(value,path);return {id:text(c.id,path+'.id'),bookId:text(c.bookId,path+'.bookId'),title:text(c.title,path+'.title'),start:integer(c.start,path+'.start',1),end:integer(c.end,path+'.end',1),order:integer(c.order,path+'.order')};});
 if(!chapters.length)fail('chapters','至少提供一个章节');unique(chapters,'chapters');
 for(const c of chapters)if(c.bookId!==book.id||c.end<c.start||c.end>book.pages)fail(`章节 ${c.title}`,'书目关联或 PDF 页码范围不正确');
 const chapterIds=new Set(chapters.map(c=>c.id));
 const knowledge=rows(p.knowledge,'knowledge').map((value,i):Knowledge=>{
  const path=`knowledge[${i}]`,k=object(value,path);
  const refs=rows(k.refs,path+'.refs').map((value,j):SourceRef=>{const r=object(value,`${path}.refs[${j}]`),page=integer(r.page,`${path}.refs[${j}].page`,1);if(page>book.pages)fail(path+'.refs','来源页超过 PDF 总页数');let rect:SourceRef['rect'];if(r.rect!==undefined){const coords=rows(r.rect,path+'.rect');if(coords.length!==4||coords.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)||Number(coords[2])===0||Number(coords[3])===0)fail(path+'.rect','框选需要 [x,y,width,height] 四个 0 到 1 的数，宽高大于 0');rect=coords as SourceRef['rect'];}return rect?{page,rect}:{page};});
  const item:Knowledge={id:text(k.id,path+'.id'),bookId:text(k.bookId,path+'.bookId'),chapterId:text(k.chapterId,path+'.chapterId'),title:text(k.title,path+'.title'),refs,confirmed:boolean(k.confirmed,path+'.confirmed'),selected:boolean(k.selected,path+'.selected'),order:integer(k.order,path+'.order')};
  if(item.bookId!==book.id||!chapterIds.has(item.chapterId))fail(path,'知识点必须关联本包的书目与章节');
  if(k.referenceOnly!==undefined)item.referenceOnly=boolean(k.referenceOnly,path+'.referenceOnly');
  item.section=optionalText(k.section,path+'.section');item.reviewNote=optionalText(k.reviewNote,path+'.reviewNote');return item;
 });
 unique(knowledge,'knowledge');const knowledgeById=new Map(knowledge.map(k=>[k.id,k]));
 const steps=rows(p.steps,'steps').map((value,i):Step=>{
  const path=`steps[${i}]`,t=object(value,path),item:Step={id:text(t.id,path+'.id'),knowledgeId:text(t.knowledgeId,path+'.knowledgeId'),title:text(t.title,path+'.title'),text:text(t.text,path+'.text'),keywords:strings(t.keywords,path+'.keywords'),order:integer(t.order,path+'.order'),version:integer(t.version,path+'.version',1)};
  if(!knowledgeById.has(item.knowledgeId))fail(path+'.knowledgeId','没有对应的知识点');
  if(knowledgeById.get(item.knowledgeId)?.referenceOnly)fail(path,'原图参考卡不能含背诵要点');
  for(const key of ['outline','subsection','displayTitle'] as const)item[key]=optionalText(t[key],path+'.'+key);
  if(t.outlinePath!==undefined){item.outlinePath=strings(t.outlinePath,path+'.outlinePath');if(item.outlinePath.length>8)fail(path+'.outlinePath','层级最多 8 层');}
  if(t.studyMode!==undefined&&t.studyMode!=='read'&&t.studyMode!=='memorize')fail(path+'.studyMode','需要 read 或 memorize');
  item.studyMode=t.studyMode as Step['studyMode'];return item;
 });
 unique(steps,'steps');
 for(const k of knowledge)if(!k.referenceOnly&&!steps.some(t=>t.knowledgeId===k.id))fail(`知识点 ${k.title}`,'至少需要一个要点');
 return {format:'yibuyibei-learning-package',schemaVersion:1,book,chapters,knowledge,steps};
}

const sameChapter=(a:Chapter,b:Chapter)=>a.title===b.title&&a.start===b.start&&a.end===b.end&&a.order===b.order;
const sameKnowledge=(a:Knowledge,b:Knowledge)=>a.title===b.title&&(a.section??'')===(b.section??'')&&(a.reviewNote??'')===(b.reviewNote??'')&&a.order===b.order&&!!a.referenceOnly===!!b.referenceOnly&&JSON.stringify(a.refs)===JSON.stringify(b.refs);
const sameStep=(a:Step,b:Step)=>['title','text','outline','subsection','displayTitle','order'].every(key=>(a[key as keyof Step]??'')===(b[key as keyof Step]??''))&&JSON.stringify(a.keywords)===JSON.stringify(b.keywords)&&JSON.stringify(a.outlinePath??[])===JSON.stringify(b.outlinePath??[]);
const sameMap=(a:Record<string,unknown>={},b:Record<string,unknown>={})=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>a[key]===b[key]);
const sourceOf=(b:Book)=>b.source??bundledBooks[b.id]?.source??{citation:b.title,rights:'未提供授权范围说明'};
const bookDescription=(b:Book)=>{const source=sourceOf(b);return `${b.title}\n科目：${b.subject}\n正文页偏移：${b.offset}\n纸面页码：${Object.entries(b.pageLabels??{}).map(([page,label])=>`${page} → ${label}`).join('；')||'未设置'}\n页面旋转：${Object.entries(b.pageRotations??{}).map(([page,rotation])=>`${page} 页 ${rotation}°`).join('；')||'未设置'}\n来源：${source.citation}\n使用范围：${source.rights}`;};
const chapterDescription=(c:Chapter)=>`${c.title}\nPDF ${c.start}–${c.end} 页\n同层顺序：${c.order}`;
const knowledgeDescription=(k:Knowledge)=>`${k.title}\n分节：${k.section||'未设置'}\n同层顺序：${k.order}\n来源：${k.refs.map(r=>`PDF 第 ${r.page} 页${r.rect?`（框选 ${r.rect.map(n=>Number((n*100).toFixed(2))+'%').join('，')}）`:''}`).join('；')||'未定位'}\n校对备注：${k.reviewNote||'未填写'}`;
const stepDescription=(t:Step)=>`${t.title}\n${t.text}\n目录标题：${t.displayTitle||'未设置'}\n提纲：${t.outline||'未设置'}\n小节：${t.subsection||'未设置'}\n层级：${t.outlinePath?.join(' → ')||'未设置'}\n同层顺序：${t.order}\n关键词：${t.keywords.join('、')||'未设置'}`;

export function previewLearningPackage(state:AppState,pack:LearningPackage):PackagePreview{
 const book=state.books.find(b=>b.id===pack.book.id);
 if(book&&(book.pages!==pack.book.pages||book.kind!==pack.book.kind))throw new Error('同一书目 ID 的文件类型和总页数必须相同。不同分页版本请使用新书目 ID。');
 const chapters=new Map(state.chapters.map(c=>[c.id,c])),knowledge=new Map(state.knowledge.map(k=>[k.id,k])),steps=new Map(state.steps.map(t=>[t.id,t]));
 const result:PackagePreview={newBook:!book,newChapters:0,newKnowledge:0,newSteps:0,unchangedSteps:0,changes:[]};
 if(book){const source=sourceOf(book);if(book.title!==pack.book.title||book.subject!==pack.book.subject||book.offset!==pack.book.offset||!sameMap(book.pageLabels,pack.book.pageLabels)||!sameMap(book.pageRotations,pack.book.pageRotations)||source.citation!==pack.book.source?.citation||source.rights!==pack.book.source?.rights)result.changes.push({kind:'book',id:book.id,title:pack.book.title,before:bookDescription(book),after:bookDescription(pack.book),resetsProgress:false});}
 for(const c of pack.chapters){const old=chapters.get(c.id);if(!old){result.newChapters++;continue;}if(old.bookId!==pack.book.id)throw new Error(`章节 ID ${c.id} 已用于其他书目，请为新书使用独立 ID。`);if(!sameChapter(old,c))result.changes.push({kind:'chapter',id:c.id,title:c.title,before:chapterDescription(old),after:chapterDescription(c),resetsProgress:false});}
 for(const k of pack.knowledge){const old=knowledge.get(k.id);if(!old){result.newKnowledge++;continue;}if(old.bookId!==pack.book.id||old.chapterId!==k.chapterId)throw new Error(`知识点 ID ${k.id} 已关联其他书目或章节，请检查 ID 与 chapterId。`);if(!!old.referenceOnly!==!!k.referenceOnly)throw new Error(`知识点 ${k.title} 的原图参考类型与现有内容不同，请使用新 ID。`);if(!sameKnowledge(old,k))result.changes.push({kind:'knowledge',id:k.id,title:k.title,before:knowledgeDescription(old),after:knowledgeDescription(k),resetsProgress:false});}
 for(const t of pack.steps){const old=steps.get(t.id);if(!old){result.newSteps++;continue;}if(old.knowledgeId!==t.knowledgeId)throw new Error(`要点 ID ${t.id} 已用于其他知识点，请检查 ID 与 knowledgeId。`);if(sameStep(old,t))result.unchangedSteps++;else result.changes.push({kind:'step',id:t.id,title:t.title,before:stepDescription(old),after:stepDescription(t),resetsProgress:old.text!==t.text});}
 return result;
}

export function importLearningPackage(state:AppState,pack:LearningPackage,options:ImportOptions):AppState{
 const preview=previewLearningPackage(state,pack),changed=(kind:PackageChange['kind'])=>new Set(preview.changes.filter(c=>c.kind===kind).map(c=>c.id));
 const changedChapters=changed('chapter'),changedKnowledge=changed('knowledge'),changedSteps=changed('step');
 const existingBook=state.books.find(b=>b.id===pack.book.id);
 let next:AppState={...state,books:existingBook?state.books.map(b=>b.id===pack.book.id&&options.adoptChanges?{...structuredClone(pack.book),filename:b.filename,sourceUrl:b.sourceUrl,missing:b.missing}:b):[...state.books,{...structuredClone(pack.book),sourceUrl:undefined,missing:true}]};
 const chapters=new Map(state.chapters.map(c=>[c.id,c]));
 const incomingChapters=new Map(pack.chapters.map(c=>[c.id,c]));
 next={...next,chapters:[...state.chapters.map(c=>options.adoptChanges&&changedChapters.has(c.id)?{...incomingChapters.get(c.id)!}:c),...structuredClone(pack.chapters.filter(c=>!chapters.has(c.id)))]};
 const knowledge=new Map(state.knowledge.map(k=>[k.id,k])),oldSteps=new Map(state.steps.map(t=>[t.id,t])),stepIds=new Set(oldSteps.keys()),incomingKnowledgeById=new Map(pack.knowledge.map(k=>[k.id,k]));
 const revisedKnowledge=new Set(pack.steps.filter(t=>stepIds.has(t.id)&&changedSteps.has(t.id)).map(t=>t.knowledgeId));
 const extendedKnowledge=new Set(pack.steps.filter(t=>!stepIds.has(t.id)&&knowledge.has(t.knowledgeId)).map(t=>t.knowledgeId));
 const incomingKnowledge=(k:Knowledge,old?:Knowledge):Knowledge=>{const confirmed=options.keepReviewed&&k.confirmed&&!k.referenceOnly;return {...structuredClone(k),confirmed,selected:confirmed&&(old?.selected??k.selected)};};
 next={...next,knowledge:[...state.knowledge.map(k=>{const incoming=incomingKnowledgeById.get(k.id);if(!incoming)return k;if(options.adoptChanges&&(changedKnowledge.has(k.id)||revisedKnowledge.has(k.id)))return incomingKnowledge(incoming,k);if(extendedKnowledge.has(k.id)){const confirmed=options.keepReviewed&&incoming.confirmed;return {...k,confirmed,selected:confirmed&&k.selected};}if(options.keepReviewed&&incoming.confirmed&&!k.confirmed&&!k.referenceOnly)return {...k,confirmed:true};return k;}),...pack.knowledge.filter(k=>!knowledge.has(k.id)).map(k=>incomingKnowledge(k))]};
 for(const t of pack.steps){const old=oldSteps.get(t.id);if(old&&options.adoptChanges&&changedSteps.has(t.id))next=reviseStep(next,{...structuredClone(t),version:old.version,studyMode:old.studyMode});}
 next={...next,steps:[...next.steps,...pack.steps.filter(t=>!stepIds.has(t.id)).map(t=>({...structuredClone(t),studyMode:'memorize' as const}))]};
 if(extendedKnowledge.size||options.adoptChanges&&preview.changes.some(c=>c.kind==='knowledge'||c.kind==='step'))next={...next,session:null};
 return next;
}

export function exportLearningPackage(state:AppState,bookId:string,chapterId?:string):LearningPackage{
 const book=state.books.find(b=>b.id===bookId);if(!book)throw new Error('请先选择一本书');
 const chapters=state.chapters.filter(c=>c.bookId===bookId&&(!chapterId||c.id===chapterId));
 const chapterIds=new Set(chapters.map(c=>c.id)),knowledge=state.knowledge.filter(k=>k.bookId===bookId&&chapterIds.has(k.chapterId)),ids=new Set(knowledge.map(k=>k.id));
 const source=sourceOf(book);
 const {sourceUrl:_url,missing:_missing,...metadata}=book;
 return structuredClone({format:'yibuyibei-learning-package',schemaVersion:1,book:{...metadata,filename:metadata.filename.split(/[\\/]/).pop()||metadata.filename,source},chapters,knowledge:knowledge.map(k=>({...k,selected:false})),steps:state.steps.filter(t=>ids.has(t.knowledgeId)).map(({studyMode:_mode,...content})=>content)});
}

export function downloadText(filename:string,content:string,mime='application/json'){
 const url=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
