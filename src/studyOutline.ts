import type {Step} from './types';

export type StepOutlineGroup={key:string;label:string;steps:Step[];children:StepOutlineGroup[]};

/** Older cards keep their original grouping until their source hierarchy is reviewed. */
export function stepOutlinePath(step:Step):string[]{
 return step.outlinePath??[step.outline,step.subsection].filter((v):v is string=>!!v);
}

/** A compact fallback for older cards which still store source numbering in title. */
export function displayStepTitle(step:Step):string{
 return step.displayTitle??step.title.replace(/^\s*\d+\.(?:\([^）)]*[）)]\s*)?(?:[①-⑳]\s*)?/,'').trim();
}

export function buildStepOutline(steps:Step[]):StepOutlineGroup[]{
 const roots:StepOutlineGroup[]=[];
 for(const step of steps){
  let siblings=roots;
  const path=stepOutlinePath(step);
  for(let depth=0;depth<path.length;depth++){
   const label=path[depth],previous=siblings.at(-1);
   let group=previous?.children.length&&previous.label===label&&previous.steps[0].knowledgeId===step.knowledgeId?previous:undefined;
   if(!group){group={key:JSON.stringify([step.knowledgeId,step.id,'branch',depth]),label,steps:[],children:[]};siblings.push(group);}
   group.steps.push(step);
   siblings=group.children;
  }
  siblings.push({key:JSON.stringify([step.knowledgeId,step.id,'step']),label:displayStepTitle(step),steps:[step],children:[]});
 }
 return roots;
}

export function groupJumpTarget(group:StepOutlineGroup,handled:Set<string>):string{
 return group.steps.find(step=>!handled.has(step.id))?.id??group.steps[0].id;
}
