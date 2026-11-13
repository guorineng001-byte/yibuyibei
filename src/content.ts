import type {AppState,Knowledge,Step,OcrPage} from './types';
import {removeSessionBatchLimit} from './core';
import {bookCatalog,historyPageLabels} from './catalog';
import {EDU_BOOK_ID,eduCatalog,registerEduBook} from './eduCatalog';
export type OutlineBaseline=Pick<Step,'id'|'title'|'outline'|'subsection'|'displayTitle'>;
export type ContentPack={schemaVersion:1;id:string;bookId:string;knowledge:Knowledge[];steps:Step[];ocr:Record<string,OcrPage>;pageRotations:Record<string,number>;stats:Record<string,number>;replaces?:{knowledge:Knowledge;steps:Step[]}[];outlineRevision?:string;outlineBaseline?:OutlineBaseline[]};
import {historyPackUrls,eduPackUrls} from './contentCatalog';
export * from './contentCatalog';
const USER_CONTROLLED_STUDY_MODE='user-controlled-study-mode-v1';
const SOURCE_STRUCTURE_CH5_SECTION2='source-structure-ch5-section2-v3';
const SOURCE_STRUCTURE_CH6='source-structure-ch6-v2';
const SOURCE_STRUCTURE_CH7='source-structure-ch7-v2';
const SOURCE_STRUCTURE_CH8='source-structure-ch8-v3';
const historyBook='kaicheng-333-history';
const sampleIds=new Set(['practice','soul','role','moral','harmony','nature','age']);

/** Reparent content by stable ID, keeping every learned step and event intact. */
export function migrateHistoryOrder(state:AppState):AppState{
 if(!state.books.some(b=>b.id===historyBook))return state;
 const catalog=new Map(bookCatalog.map(c=>[c.id,c]));
 const chapters=state.chapters.filter(c=>!(c.id==='aristotle'&&c.bookId===historyBook)).map(c=>{const official=catalog.get(c.id);return official&&c.bookId===historyBook?{...c,start:official.start,end:official.end,order:official.order}:c;});
 for(const c of bookCatalog)if(!chapters.some(x=>x.id===c.id))chapters.push({...c});
 chapters.sort((a,b)=>state.books.findIndex(x=>x.id===a.bookId)-state.books.findIndex(x=>x.id===b.bookId)||a.order-b.order);
 const knowledge=state.knowledge.map(k=>k.bookId===historyBook&&(k.chapterId==='aristotle'||sampleIds.has(k.id))?{...k,chapterId:'history-chapter-13',section:k.section??'亚里士多德的教育思想',order:(k.refs[0]?.page??121)*1000+(sampleIds.has(k.id)?Array.from(sampleIds).indexOf(k.id):k.order)}:k);
 knowledge.sort((a,b)=>chapters.findIndex(c=>c.id===a.chapterId)-chapters.findIndex(c=>c.id===b.chapterId)||a.order-b.order);
 return {...state,chapters,knowledge,books:state.books.map(b=>b.id===historyBook?{...b,pageLabels:historyPageLabels}:b)};
}
export function validContentPack(x:unknown):x is ContentPack{
 if(!x||typeof x!=='object')return false;const p=x as ContentPack;
 if(p.schemaVersion!==1||typeof p.id!=='string'||![historyBook,EDU_BOOK_ID].includes(p.bookId)||!Array.isArray(p.knowledge)||!Array.isArray(p.steps)||!p.ocr||!p.pageRotations)return false;
 const catalog=p.bookId===historyBook?bookCatalog:eduCatalog;
 const firstPage=p.bookId===historyBook?10:6,lastPage=p.bookId===historyBook?214:155;
 if(p.steps.some(t=>t.outlinePath!==undefined&&(!Array.isArray(t.outlinePath)||t.outlinePath.length>8||!t.outlinePath.every(v=>typeof v==='string'&&v.trim().length>0))))return false;
 if(p.outlineRevision!==undefined&&(typeof p.outlineRevision!=='string'||!Array.isArray(p.outlineBaseline)||!p.outlineBaseline.every(t=>typeof t.id==='string'&&typeof t.title==='string')))return false;
 if(p.replaces&&(!Array.isArray(p.replaces)||!p.replaces.every(r=>r&&r.knowledge?.bookId===p.bookId&&r.knowledge.confirmed===false&&typeof r.knowledge.id==='string'&&Array.isArray(r.steps)&&r.steps.every(t=>typeof t.id==='string'&&t.knowledgeId===r.knowledge.id))))return false;
 const ids=new Set(p.knowledge.map(k=>k.id));
 return ids.size===p.knowledge.length&&new Set(p.steps.map(t=>t.id)).size===p.steps.length&&p.knowledge.every(k=>k.bookId===p.bookId&&catalog.some(c=>c.id===k.chapterId)&&typeof k.title==='string'&&typeof k.confirmed==='boolean'&&Array.isArray(k.refs)&&k.refs.every(r=>Number.isInteger(r.page)&&r.page>=firstPage&&r.page<=lastPage&&(p.bookId!==EDU_BOOK_ID||r.page!==80)))&&p.steps.every(t=>ids.has(t.knowledgeId)&&typeof t.text==='string'&&Array.isArray(t.keywords))&&Object.entries(p.ocr).every(([key,o])=>o&&o.bookId===p.bookId&&Number.isInteger(o.page)&&o.page>=1&&o.page<=(p.bookId===historyBook?215:157)&&key===`${p.bookId}:${o.page}`);
}
export function mergeContentPack(state:AppState,pack:ContentPack):AppState{
 let s=migrateHistoryOrder(state);
 if(s.installedContentPacks?.includes(pack.id)||!s.books.some(b=>b.id===pack.bookId))return s;
 if(pack.replaces?.length){
  const removeKnowledge=new Set<string>(),removeSteps=new Set<string>();
  const sessionIds=new Set([...(s.session?.queue??[]),...(s.session?.initialIds??[]),...(s.session?.remainingIds??[])]);
  for(const original of pack.replaces){
   const old=s.knowledge.find(k=>k.id===original.knowledge.id),oldSteps=s.steps.filter(t=>t.knowledgeId===old?.id);
   if(!old||old.confirmed||old.bookId!==pack.bookId||original.knowledge.confirmed)continue;
   const inUse=oldSteps.some(t=>s.progress[t.id]||s.events.some(e=>e.stepId===t.id)||sessionIds.has(t.id))||s.questions.some(q=>q.knowledgeIds.includes(old.id))||s.assemblies.some(a=>a.knowledgeId===old.id);
   if(!inUse&&sameJson(old,original.knowledge)&&sameOriginalSteps(oldSteps,original.steps)){
    removeKnowledge.add(old.id);oldSteps.forEach(t=>removeSteps.add(t.id));
   }
  }
  s={...s,knowledge:s.knowledge.filter(k=>!removeKnowledge.has(k.id)),steps:s.steps.filter(t=>!removeSteps.has(t.id))};
 }
 const knowledgeIds=new Set(s.knowledge.map(k=>k.id)),stepIds=new Set(s.steps.map(t=>t.id));
 // Existing content wins, including user corrections, selections, and OCR edits.
 const ocr={...structuredClone(pack.ocr),...s.ocr};
 const incomingSteps=structuredClone(pack.steps.filter(t=>!stepIds.has(t.id))).map(t=>({...t,studyMode:'memorize' as const}));
 return migrateHistoryOrder({...s,knowledge:[...s.knowledge,...structuredClone(pack.knowledge.filter(k=>!knowledgeIds.has(k.id)))],steps:[...s.steps,...incomingSteps],ocr,books:s.books.map(b=>b.id===pack.bookId?{...b,pageRotations:{...pack.pageRotations,...b.pageRotations}}:b),installedContentPacks:[...(s.installedContentPacks??[]),pack.id]});
}
function sameOriginalSteps(current:Step[],original:Step[]):boolean{
 const originals=new Map(original.map(t=>[t.id,t]));
 const normalized=current.map(t=>{
  const source=originals.get(t.id);
  if(source&&!Object.prototype.hasOwnProperty.call(source,'studyMode')&&t.studyMode==='memorize'){
   const withoutDefault={...t};delete withoutDefault.studyMode;return withoutDefault;
  }
  return t;
 });
 return sameJson([...normalized].sort((a,b)=>a.id.localeCompare(b.id)),[...original].sort((a,b)=>a.id.localeCompare(b.id)));
}
function sameJson(a:unknown,b:unknown):boolean{
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>sameJson(v,b[i]));
 const left=a as Record<string,unknown>,right=b as Record<string,unknown>,keys=Object.keys(left).filter(k=>left[k]!==undefined);
 return keys.length===Object.keys(right).filter(k=>right[k]!==undefined).length&&keys.every(k=>sameJson(left[k],right[k]));
}
/** Apply reviewed navigation metadata only; learner wording and learning history win. */
export function migrateOutlineStructure(state:AppState,pack:ContentPack):AppState{
 const revision=pack.outlineRevision;
 if(!revision||state.appliedMigrations?.includes(revision))return state;
 const baseline=new Map((pack.outlineBaseline??[]).map(t=>[t.id,t]));
 const revised=new Map(pack.steps.map(t=>[t.id,t]));
 const steps=state.steps.map(step=>{
  const old=baseline.get(step.id),next=revised.get(step.id);
  if(!old||!next?.outlinePath||step.version!==1||step.outlinePath!==undefined)return step;
  if(step.title!==old.title||step.outline!==old.outline||step.subsection!==old.subsection||step.displayTitle!==old.displayTitle)return step;
  return {...step,outline:next.outline,subsection:next.subsection,displayTitle:next.displayTitle,outlinePath:[...next.outlinePath]};
 });
 return {...state,steps,appliedMigrations:[...(state.appliedMigrations??[]),revision]};
}
/** One-time migration: old content packs chose "read" for the learner. From now on only the learner does. */
export function migrateUserControlledStudyModes(state:AppState):AppState{
 if(state.appliedMigrations?.includes(USER_CONTROLLED_STUDY_MODE))return state;
 const clearPresetNote=(note?:string)=>note?.replace(/；[^。]*(?:默认只需阅读|默认只读|设为只需阅读)[^。]*。/g,'；学习方式由你自行决定。');
 return {...state,knowledge:state.knowledge.map(k=>({...k,reviewNote:clearPresetNote(k.reviewNote)})),steps:state.steps.map(t=>({...t,studyMode:'memorize'})),appliedMigrations:[...(state.appliedMigrations??[]),USER_CONTROLLED_STUDY_MODE]};
}
/** Refresh chapter 5 section 2 from the book while preserving progress and explicit learner edits. */
export function migrateChapter5Section2(state:AppState,pack:ContentPack):AppState{
 if(state.appliedMigrations?.includes(SOURCE_STRUCTURE_CH5_SECTION2))return state;
 const revisedKnowledge=pack.knowledge.filter(k=>k.section?.startsWith('第二节 ·'));
 const targetIds=new Set(revisedKnowledge.map(k=>k.id));
 const revisedSteps=pack.steps.filter(t=>targetIds.has(t.knowledgeId));
 const revisedStepIds=new Set(revisedSteps.map(t=>t.id));
 const currentSteps=new Map(state.steps.map(t=>[t.id,t]));
 const protectedIds=new Set([...Object.keys(state.progress),...state.events.map(e=>e.stepId),...(state.session?.queue??[]),...(state.session?.initialIds??[]),...(state.session?.remainingIds??[])]);
 const knowledgeById=new Map(revisedKnowledge.map(k=>[k.id,k]));
 const knowledge=state.knowledge.map(k=>{
  const replacement=knowledgeById.get(k.id);if(!replacement)return k;
  return {...structuredClone(replacement),selected:k.selected,reviewNote:'已逐项对照原书标题、编号、分支关系、引文和正文；学习方式由你自行决定。'};
 });
 const refreshed=revisedSteps.map(t=>{
  const current=currentSteps.get(t.id);
  // A version above 1 means the learner revised this card; keep that wording intact.
  return current&&current.version>1?current:{...structuredClone(t),studyMode:current?.studyMode??'memorize'};
 });
 const retainedCustom=state.steps.filter(t=>targetIds.has(t.knowledgeId)&&!revisedStepIds.has(t.id)&&(t.version>1||protectedIds.has(t.id)));
 const steps=[...state.steps.filter(t=>!targetIds.has(t.knowledgeId)),...refreshed,...retainedCustom];
 return {...state,knowledge,steps,appliedMigrations:[...(state.appliedMigrations??[]),SOURCE_STRUCTURE_CH5_SECTION2]};
}
/** Refresh chapter 7's source hierarchy without resetting learner-owned state. */
export function migrateChapter7Structure(state:AppState,pack:ContentPack):AppState{
 if(state.appliedMigrations?.includes(SOURCE_STRUCTURE_CH7))return state;
 const revisedKnowledge=pack.knowledge.filter(k=>k.id.startsWith('china-reviewed-ch7-'));
 const targetIds=new Set(revisedKnowledge.map(k=>k.id));
 const revisedSteps=pack.steps.filter(t=>targetIds.has(t.knowledgeId));
 const revisedStepIds=new Set(revisedSteps.map(t=>t.id));
 const currentSteps=new Map(state.steps.map(t=>[t.id,t]));
 const protectedIds=new Set([...Object.keys(state.progress),...state.events.map(e=>e.stepId),...(state.session?.queue??[]),...(state.session?.initialIds??[]),...(state.session?.remainingIds??[])]);
 const knowledgeById=new Map(revisedKnowledge.map(k=>[k.id,k]));
 const knowledge=state.knowledge.map(k=>{const replacement=knowledgeById.get(k.id);return replacement?{...structuredClone(replacement),selected:k.selected}:k;});
 const refreshed=revisedSteps.map(t=>{const current=currentSteps.get(t.id);return current&&current.version>1?current:{...structuredClone(t),studyMode:current?.studyMode??'memorize'};});
 const retainedCustom=state.steps.filter(t=>targetIds.has(t.knowledgeId)&&!revisedStepIds.has(t.id)&&(t.version>1||protectedIds.has(t.id)));
 return {...state,knowledge,steps:[...state.steps.filter(t=>!targetIds.has(t.knowledgeId)),...refreshed,...retainedCustom],appliedMigrations:[...(state.appliedMigrations??[]),SOURCE_STRUCTURE_CH7]};
}
/** Refresh chapter 8's source hierarchy without resetting learner-owned state. */
export function migrateChapter8Structure(state:AppState,pack:ContentPack):AppState{
 if(state.appliedMigrations?.includes(SOURCE_STRUCTURE_CH8))return state;
 const revisedKnowledge=pack.knowledge.filter(k=>k.id.startsWith('china-reviewed-ch8-'));
 const targetIds=new Set(revisedKnowledge.map(k=>k.id));
 const revisedSteps=pack.steps.filter(t=>targetIds.has(t.knowledgeId));
 const revisedStepIds=new Set(revisedSteps.map(t=>t.id));
 const currentSteps=new Map(state.steps.map(t=>[t.id,t]));
 const protectedIds=new Set([...Object.keys(state.progress),...state.events.map(e=>e.stepId),...(state.session?.queue??[]),...(state.session?.initialIds??[]),...(state.session?.remainingIds??[])]);
 const knowledgeById=new Map(revisedKnowledge.map(k=>[k.id,k]));
 const knowledge=state.knowledge.map(k=>{const replacement=knowledgeById.get(k.id);return replacement?{...structuredClone(replacement),selected:k.selected}:k;});
 const refreshed=revisedSteps.map(t=>{const current=currentSteps.get(t.id);return current&&current.version>1?current:{...structuredClone(t),studyMode:current?.studyMode??'memorize'};});
 const retainedCustom=state.steps.filter(t=>targetIds.has(t.knowledgeId)&&!revisedStepIds.has(t.id)&&(t.version>1||protectedIds.has(t.id)));
 return {...state,knowledge,steps:[...state.steps.filter(t=>!targetIds.has(t.knowledgeId)),...refreshed,...retainedCustom],appliedMigrations:[...(state.appliedMigrations??[]),SOURCE_STRUCTURE_CH8]};
}
/** Align chapter 6 labels with the book's four numbered test points and discard untouched editorial filler. */
export function migrateSourceStructure(state:AppState):AppState{
 if(state.appliedMigrations?.includes(SOURCE_STRUCTURE_CH6))return state;
 const labels:Record<string,string>={
  'china-reviewed-ch6-outline':'章节框架',
  'china-reviewed-ch6-early-enlightenment':'考点一 · 理学教育思想的批判',
  'china-reviewed-ch6-huang-school':'考点二 · 黄宗羲的教育思想 · （二）“公其非是于学校”',
  'china-reviewed-ch6-huang-content':'考点二 · 黄宗羲的教育思想 · （三）论教育内容',
  'china-reviewed-ch6-huang-teaching':'考点二 · 黄宗羲的教育思想 · （四）论教学思想',
  'china-reviewed-ch6-huang-teacher':'考点二 · 黄宗羲的教育思想 · （五）论教师',
  'china-reviewed-ch6-wang-nature-role':'考点三 · 王夫之的教育思想 · （一）人性论、（二）教育作用',
  'china-reviewed-ch6-wang-teaching':'考点三 · 王夫之的教育思想 · （三）教学思想',
  'china-reviewed-ch6-wang-moral':'考点三 · 王夫之的教育思想 · （四）德育论',
  'china-reviewed-ch6-wang-teacher':'考点三 · 王夫之的教育思想 · （五）论教师',
  'china-reviewed-ch6-yan-intro-profit':'考点四 · 颜元的教育思想 · （一）简介、（二）义利合一观',
  'china-reviewed-ch6-yan-practical':'考点四 · 颜元的教育思想 · （三）实学思想'
 };
 const editorial=new Set(['china-reviewed-ch6-outline-1','china-reviewed-ch6-yan-intro-profit-2','china-reviewed-ch6-yan-practical-3']);
 const protectedIds=new Set([...Object.keys(state.progress),...state.events.map(e=>e.stepId),...(state.session?.queue??[]),...(state.session?.initialIds??[]),...(state.session?.remainingIds??[])]);
 return {...state,
  knowledge:state.knowledge.map(k=>labels[k.id]?{...k,section:labels[k.id],reviewNote:'已逐项对照原书标题、编号、分支关系、引文和正文；学习方式由你自行决定。'}:k),
  steps:state.steps.filter(t=>!editorial.has(t.id)||protectedIds.has(t.id)),
  appliedMigrations:[...(state.appliedMigrations??[]),SOURCE_STRUCTURE_CH6]
 };
}
export async function loadBundledContent(state:AppState){
 const historyPacks:ContentPack[]=[];
 for(const url of historyPackUrls){
  const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('教育史内容未能读取，请刷新后重试。');
  const pack:unknown=await response.json();if(!validContentPack(pack))throw new Error('内容包格式或版本无效，现有记录未被覆盖。');
  historyPacks.push(pack);
 }
 const [pack,update,last,finalPack,classicsPack,hanPack,suiTangPack,neoConfucianPack,earlyQingPack,modernBeginningsPack,modernSystemPack,modernTransformationPack,nanjingEducationPack,newDemocraticEducationPack,modernEducatorsPack,ancientEastPack,ancientGreecePack,ancientRomePack,medievalPack,renaissancePack,britishEducationPack,frenchEducationPack,germanEducationPack,russianEducationPack,americanEducationPack,japaneseEducationPack,modernForeignEducatorsPack,majorForeignEducatorsPack,foreignMovementsPack]=historyPacks;
 let merged=state;
 for(const contentPack of [pack,update,last,finalPack,classicsPack,hanPack,suiTangPack,neoConfucianPack,earlyQingPack,modernBeginningsPack,modernSystemPack,modernTransformationPack,nanjingEducationPack,newDemocraticEducationPack,modernEducatorsPack,ancientEastPack,ancientGreecePack,ancientRomePack,medievalPack,renaissancePack,britishEducationPack,frenchEducationPack,germanEducationPack,russianEducationPack,americanEducationPack,japaneseEducationPack,modernForeignEducatorsPack,majorForeignEducatorsPack,foreignMovementsPack])merged=mergeContentPack(merged,contentPack);
 merged=removeSessionBatchLimit(merged);
 merged=migrateUserControlledStudyModes(merged);
 merged=migrateChapter5Section2(merged,neoConfucianPack);
 merged=migrateChapter7Structure(merged,modernBeginningsPack);
 merged=migrateChapter8Structure(merged,modernSystemPack);
 for(const sourcePack of [germanEducationPack,russianEducationPack,americanEducationPack])merged=migrateOutlineStructure(merged,sourcePack);
 merged=migrateSourceStructure(merged);
 // Validate the new volume before adding it; a failed fetch leaves existing state intact.
 const eduPacks:ContentPack[]=[];
 for(const url of eduPackUrls){
  const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('教心、教原内容未能读取，请刷新后重试。');
  const data:unknown=await response.json();if(!validContentPack(data)||data.bookId!==EDU_BOOK_ID)throw new Error('教心、教原内容校验失败，现有学习记录未被覆盖。');
  eduPacks.push(data);
 }
 merged=registerEduBook(merged);
 for(const contentPack of eduPacks)merged=mergeContentPack(merged,contentPack);
 return merged;
}
