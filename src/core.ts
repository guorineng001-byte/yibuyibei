import type {AppState,Progress,Rating,Session,Step} from './types';
export const uid = () => crypto.randomUUID();
export function dayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function addDays(day:string,n:number){const [y,m,d]=day.split('-').map(Number);return dayKey(new Date(y,m-1,d+n,12));}
export const emptyProgress=():Progress=>({reads:0,independentDates:[],level:0,due:null,attempts:0});
export const mastered=(p?:Progress)=>!!p&&p.independentDates.length>=2;
export function eligibleSteps(s:AppState){const knowledge=new Map(s.knowledge.filter(k=>k.selected&&k.confirmed&&!k.referenceOnly).map(k=>[k.id,k]));const chapters=new Map(s.chapters.map(c=>[c.id,c]));const books=new Map(s.books.map((b,i)=>[b.id,i]));return s.steps.filter(t=>knowledge.has(t.knowledgeId)).sort((a,b)=>{const ka=knowledge.get(a.knowledgeId)!,kb=knowledge.get(b.knowledgeId)!;return (books.get(ka.bookId)??0)-(books.get(kb.bookId)??0)||(chapters.get(ka.chapterId)?.order??0)-(chapters.get(kb.chapterId)?.order??0)||ka.order-kb.order||a.order-b.order;});}
export function queues(s:AppState,today=dayKey()){
 const eligible=eligibleSteps(s);const started=Object.values(s.progress).filter(p=>p.firstStudied===today).length;
 return {fresh:eligible.filter(t=>t.studyMode==='read'?!s.progress[t.id]?.reads:!s.progress[t.id]?.firstStudied),due:eligible.filter(t=>{const p=s.progress[t.id];return t.studyMode!=='read'&&!!p?.firstStudied&&!!p.due&&p.due<=today;}).sort((a,b)=>(s.progress[a.id].due??'').localeCompare(s.progress[b.id].due??'')),started};
}
export function makeSession(s:AppState,mode:'new'|'review',custom?:string[]):Session|null{
 const q=queues(s);const allowed=new Set(eligibleSteps(s).map(t=>t.id));const ids=Array.from(new Set(custom??(mode==='new'?q.fresh:q.due).map(t=>t.id))).filter(id=>allowed.has(id));if(!ids.length)return null;
 return {id:uid(),mode,queue:[...ids],initialIds:[...ids],remainingIds:[],cursor:0,phase:s.steps.find(t=>t.id===ids[0])?.studyMode==='read'?'read':mode==='new'?'overview':'recall',usedHelp:false,retries:{},completed:[],skipped:[],readOnlyDone:[],startDay:dayKey(),seconds:0,assembled:[]};
}
export function removeSessionBatchLimit(s:AppState):AppState{
 const ss=s.session;if(!ss?.remainingIds?.length)return s;
 const valid=new Set(eligibleSteps(s).map(t=>t.id));const extra=Array.from(new Set(ss.remainingIds)).filter(id=>valid.has(id)&&!ss.queue.includes(id));
 const resuming=ss.phase==='summary'&&extra.length>0;
 return {...s,session:{...ss,queue:[...ss.queue,...extra],initialIds:Array.from(new Set([...ss.initialIds,...extra])),remainingIds:[],cursor:resuming?ss.queue.length:ss.cursor,usedHelp:resuming?false:ss.usedHelp,feedback:resuming?undefined:ss.feedback,lastRating:resuming?undefined:ss.lastRating,phase:resuming?(s.steps.find(t=>t.id===extra[0])?.studyMode==='read'?'read':(ss.continuationMode??ss.mode)==='review'?'recall':'overview'):ss.phase}};
}
export function jumpToStep(s:AppState,id:string):AppState{
 const ss=s.session,step=eligibleSteps(s).find(t=>t.id===id);if(!ss||!step)return s;
 const queue=[...ss.queue];
 // An extra point is a detour before the current point, not the end of the round.
 if(!queue.includes(id))queue.splice(ss.cursor,0,id);
 const upcoming=queue.indexOf(id,ss.cursor),cursor=upcoming>=0?upcoming:queue.indexOf(id);
 return {...s,session:{...ss,queue,initialIds:Array.from(new Set([...ss.initialIds,id])),cursor,phase:step.studyMode==='read'||ss.mode==='new'?'read':'recall',usedHelp:false,feedback:undefined}};
}
/** Open the previous point's text directly, keeping ratings and progress intact. */
export function retreatSession(s:AppState):AppState{
 const ss=s.session;if(!ss||ss.phase==='summary'||ss.cursor<=0)return s;
 return {...s,session:{...ss,cursor:ss.cursor-1,phase:'read',usedHelp:false,feedback:undefined,lastRating:undefined}};
}
export function encouragement(r:Rating,prior:Progress,brief:boolean){
 if(brief)return r==='independent'?'独立回忆 +1':r==='hint'?'稍后再试一次':'先把这一个意思拿下来';
 if(r==='independent')return prior.lastRating&&prior.lastRating!=='independent'?'刚才还需要提示的这一点，现在你独立背出来了。再拿下一点！':prior.independentDates.length?'又一次独立想起，你正在把它记得更牢。继续稳稳向前！':'这个要点，你已经不靠提示背出来了。小小一步，也是真实的进步！';
 return r==='hint'?'你已经找到回忆的线索。稍后撤掉提示，再把这一点拿下来！':'先抓住一个关键词，把这一个意思说清楚。我们一步一步来。';
}
export function rateStep(s:AppState,stepId:string,rating:Rating,usedHelp:boolean,eventId:string,now=new Date()):AppState{
 if(s.events.some(e=>e.id===eventId))return s;
 const step=s.steps.find(t=>t.id===stepId);if(!step)return s;
 const day=dayKey(now),old=s.progress[stepId]??emptyProgress();const actual=usedHelp&&rating==='independent'?'hint':rating;
 const p={...old,independentDates:[...old.independentDates],firstStudied:old.firstStudied??day,attempts:old.attempts+1,lastRating:actual};
 if(actual==='independent'){
   if(!p.independentDates.includes(day)){p.independentDates.push(day);p.level=Math.min(p.level+1,s.settings.intervals.length);}
   p.due=addDays(day,s.settings.intervals[Math.max(0,p.level-1)]);
 }else{p.level=0;p.independentDates=[];p.due=day;}
 return {...s,progress:{...s.progress,[stepId]:p},events:[...s.events,{id:eventId,stepId,version:step.version,at:now.toISOString(),day,rating:actual,usedHelp}]};
}
export function scoreSession(s:AppState,rating:Rating):AppState{
 const ss=s.session;if(!ss||ss.phase!=='compare')return s;const id=ss.queue[ss.cursor],prior=s.progress[id]??emptyProgress();
 const actual=ss.usedHelp&&rating==='independent'?'hint':rating;
 let next=rateStep(s,id,actual,ss.usedHelp,`${ss.id}:${ss.cursor}:${prior.attempts}`);
 const session={...ss,queue:[...ss.queue],retries:{...ss.retries},completed:ss.completed.filter(x=>x!==id),skipped:ss.skipped?.filter(x=>x!==id),readOnlyDone:ss.readOnlyDone?.filter(x=>x!==id),lastRating:actual,feedback:encouragement(actual,prior,s.settings.encouragement==='brief'),phase:'feedback' as const};
 if(actual==='independent'){if(!session.completed.includes(id))session.completed.push(id);}else{
  session.retries[id]=(session.retries[id]??0)+1;
  if(session.retries[id]<2)session.queue.splice(Math.min(session.cursor+3,session.queue.length),0,id);
 }
 return {...next,session};
}
export function advanceSession(s:AppState):AppState{
 const ss=s.session;if(!ss||ss.phase==='summary')return s;
 const handled=new Set([...ss.completed,...(ss.skipped??[]),...(ss.readOnlyDone??[])]);
 const valid=new Map(s.steps.map(t=>[t.id,t]));
 const pending=(id:string)=>valid.has(id)&&!handled.has(id)&&(valid.get(id)?.studyMode==='read'||(ss.retries[id]??0)<2);
 let cursor=ss.queue.findIndex((id,index)=>index>ss.cursor&&pending(id));
 // A directory jump can leave earlier points untouched. Finish those before summarizing.
 if(cursor<0)cursor=ss.queue.findIndex(pending);
 if(cursor<0)cursor=ss.queue.length;
 const id=ss.queue[cursor];const nextStep=s.steps.find(t=>t.id===id);const prev=s.steps.find(t=>t.id===ss.queue[ss.cursor]);
 return {...s,session:{...ss,cursor,phase:cursor>=ss.queue.length?'summary':nextStep?.studyMode==='read'?'read':ss.mode==='review'||ss.retries[id]?'recall':nextStep?.knowledgeId!==prev?.knowledgeId?'overview':'read',usedHelp:false,feedback:undefined}};
}
/** Skip only this round, including a queued retry. Do not invent a rating. */
export function skipSessionStep(s:AppState):AppState{
 const ss=s.session;if(!ss||ss.phase==='summary')return s;const id=ss.queue[ss.cursor];
 const queue=ss.queue.filter((x,i)=>i<=ss.cursor||x!==id);
 return advanceSession({...s,session:{...ss,queue,skipped:Array.from(new Set([...(ss.skipped??[]),id]))}});
}
export function setStepStudyMode(s:AppState,id:string,mode:'read'|'memorize'):AppState{
 return setStepsStudyMode(s,[id],mode);
}
/** Change a chosen range without changing its content or recall history. */
export function setStepsStudyMode(s:AppState,ids:string[],mode:'read'|'memorize'):AppState{
 const selected=new Set(ids),changed=new Set(s.steps.filter(t=>selected.has(t.id)&&(t.studyMode??'memorize')!==mode).map(t=>t.id));
 if(!changed.size)return s;
 const steps=s.steps.map(t=>changed.has(t.id)?{...t,studyMode:mode}:t),progress={...s.progress};
 if(mode==='memorize')for(const id of changed){const p=progress[id];if(p?.firstStudied&&!p.due)progress[id]={...p,due:dayKey()};}
 const ss=s.session;
 const session=ss&&ss.phase!=='summary'?{...ss,
  readOnlyDone:mode==='memorize'?ss.readOnlyDone?.filter(id=>!changed.has(id)):ss.readOnlyDone,
  ...(changed.has(ss.queue[ss.cursor])?{phase:'read' as const,usedHelp:false,feedback:undefined,lastRating:undefined}:{})
 }:ss;
 return {...s,steps,progress,session};
}
export function finishReadOnly(s:AppState):AppState{
 const ss=s.session;if(!ss||ss.phase!=='read')return s;const id=ss.queue[ss.cursor];if(s.steps.find(t=>t.id===id)?.studyMode!=='read')return s;
 const p=s.progress[id]??emptyProgress();
 return advanceSession({...s,progress:{...s.progress,[id]:{...p,reads:p.reads+1,firstStudied:p.firstStudied??dayKey()}},session:{...ss,queue:ss.queue.filter((x,i)=>i<=ss.cursor||x!==id),readOnlyDone:Array.from(new Set([...(ss.readOnlyDone??[]),id]))}});
}
export function chapterSteps(s:AppState,chapterIds:string[],scope:'all'|'due'|'fresh'){
 const chapters=new Set(chapterIds),knowledge=new Set(s.knowledge.filter(k=>chapters.has(k.chapterId)).map(k=>k.id));const q=queues(s);
 return (scope==='due'?q.due:scope==='fresh'?q.fresh:eligibleSteps(s)).filter(t=>knowledge.has(t.knowledgeId));
}
export function knowledgeSteps(s:AppState,knowledgeIds:string[],scope:'all'|'due'|'fresh'){
 const selected=new Set(knowledgeIds),q=queues(s);
 return (scope==='due'?q.due:scope==='fresh'?q.fresh:eligibleSteps(s)).filter(t=>selected.has(t.knowledgeId));
}
export function reviseStep(s:AppState,updated:Step):AppState{
 const old=s.steps.find(t=>t.id===updated.id);const changed=old?.text!==updated.text;
 const modeState=setStepStudyMode(s,updated.id,updated.studyMode??'memorize');
 return {...modeState,steps:modeState.steps.map(t=>t.id===updated.id?{...updated,version:changed?t.version+1:t.version}:t),progress:changed?{...modeState.progress,[updated.id]:emptyProgress()}:modeState.progress,session:changed?null:modeState.session};
}
export function validateBackup(x:unknown):x is AppState {
 if(!x||typeof x!=='object')return false;const s=x as AppState;
 if(s.schemaVersion!==1||!['books','chapters','knowledge','steps','events','assemblies','questions'].every(k=>Array.isArray((s as any)[k]))||!s.settings||!s.progress||!s.ocr)return false;
 if(s.essayPractice!==undefined&&(typeof s.essayPractice!=='object'||s.essayPractice===null||Array.isArray(s.essayPractice)||Object.values(s.essayPractice).some(r=>!r||typeof r.draft!=='string'||!['draft','practiced'].includes(r.status)||(r.lastPracticed!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(r.lastPracticed)))))return false;
 if(!Number.isInteger(s.settings.dailyNew)||s.settings.dailyNew<1||s.settings.dailyNew>100||!Number.isInteger(s.settings.roundSize)||s.settings.roundSize<1||s.settings.roundSize>30||!Array.isArray(s.settings.intervals)||!s.settings.intervals.length||!s.settings.intervals.every(n=>Number.isInteger(n)&&n>0&&n<366))return false;
 if(s.settings.examType!==undefined&&!['333','311'].includes(s.settings.examType))return false;
 if(s.settings.targetSchool!==undefined&&typeof s.settings.targetSchool!=='string')return false;
 if(!['full','brief'].includes(s.settings.encouragement))return false;
 if(s.books.some(b=>b.source!==undefined&&(!b.source||typeof b.source.citation!=='string'||typeof b.source.rights!=='string')))return false;
 const unique=(a:{id:string}[])=>a.every(t=>typeof t.id==='string')&&new Set(a.map(t=>t.id)).size===a.length;
 if(![s.books,s.chapters,s.knowledge,s.steps].every(unique))return false;
 if(s.steps.some(t=>t.outlinePath!==undefined&&(!Array.isArray(t.outlinePath)||t.outlinePath.length>8||!t.outlinePath.every(v=>typeof v==='string'&&v.trim().length>0))))return false;
 const books=new Set(s.books.map(b=>b.id)),chapters=new Set(s.chapters.map(c=>c.id)),knowledge=new Set(s.knowledge.map(k=>k.id)),steps=new Set(s.steps.map(t=>t.id));
 if(s.session){
  const ss=s.session,ids=(value:unknown,allowed:Set<string>):value is string[]=>Array.isArray(value)&&value.every(id=>typeof id==='string'&&allowed.has(id));
  if(typeof ss.id!=='string'||!['new','review'].includes(ss.mode)||!ids(ss.queue,steps)||!ss.queue.length||!ids(ss.initialIds,new Set(ss.queue))||!ss.initialIds.length||!ss.queue.every(id=>ss.initialIds.includes(id))||!Number.isInteger(ss.cursor)||ss.cursor<0||ss.cursor>ss.queue.length||!['overview','read','hint','recall','compare','feedback','summary'].includes(ss.phase)||(ss.phase!=='summary'&&ss.cursor===ss.queue.length))return false;
  const initial=new Set(ss.initialIds);
  if(typeof ss.usedHelp!=='boolean'||!Number.isInteger(ss.seconds)||ss.seconds<0||typeof ss.startDay!=='string'||!ids(ss.completed,initial)||!ids(ss.assembled,knowledge)||!ss.retries||typeof ss.retries!=='object'||Array.isArray(ss.retries)||Object.entries(ss.retries).some(([id,n])=>!initial.has(id)||!Number.isInteger(n)||n<0))return false;
  if((ss.skipped!==undefined&&!ids(ss.skipped,initial))||(ss.readOnlyDone!==undefined&&!ids(ss.readOnlyDone,initial))||(ss.remainingIds!==undefined&&!ids(ss.remainingIds,steps))||(ss.continuationMode!==undefined&&!['new','review'].includes(ss.continuationMode))||(ss.feedback!==undefined&&typeof ss.feedback!=='string')||(ss.lastRating!==undefined&&!['independent','hint','again'].includes(ss.lastRating)))return false;
 }
 return s.books.every(b=>typeof b.title==='string'&&['pdf','docx'].includes(b.kind)&&Number.isInteger(b.pages)&&b.pages>=1&&Number.isInteger(b.offset)&&(!b.sourceUrl||/^\/library\/[a-zA-Z0-9._-]+$/.test(b.sourceUrl)))&&s.chapters.every(c=>books.has(c.bookId)&&typeof c.title==='string'&&Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=1&&c.end>=c.start)&&s.knowledge.every(k=>books.has(k.bookId)&&chapters.has(k.chapterId)&&typeof k.title==='string'&&Array.isArray(k.refs)&&k.refs.every(r=>Number.isInteger(r.page)&&r.page>=1&&(!r.rect||(r.rect.length===4&&r.rect.every(n=>typeof n==='number'&&n>=0&&n<=1)))))&&s.steps.every(t=>knowledge.has(t.knowledgeId)&&typeof t.text==='string'&&typeof t.title==='string'&&Array.isArray(t.keywords)&&t.keywords.every(k=>typeof k==='string')&&Number.isInteger(t.version))&&Object.values(s.progress).every(p=>p&&Array.isArray(p.independentDates)&&p.independentDates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d))&&Number.isInteger(p.level)&&p.level>=0&&p.level<=s.settings.intervals.length&&Number.isInteger(p.reads)&&Number.isInteger(p.attempts)&&(!p.due||/^\d{4}-\d{2}-\d{2}$/.test(p.due)))&&s.events.every(e=>steps.has(e.stepId)&&['independent','hint','again'].includes(e.rating)&&typeof e.day==='string');
}
