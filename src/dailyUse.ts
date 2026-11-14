import type {AppState} from './types';
import {addDays,dayKey} from './core';

export type DevicePreferences={gettingStartedDismissed?:boolean;lastBackupExportAt?:string};

export function hasLearningRecords(state:AppState){
 return state.events.length>0||state.assemblies.length>0||state.questions.length>0
  ||Object.values(state.progress).some(p=>p.reads>0||p.attempts>0||!!p.firstStudied)
  ||Object.values(state.essayPractice??{}).some(p=>p.draft.trim()||p.status==='practiced');
}

export function backupAdvice(lastExportAt:string|undefined,hasRecords:boolean,today=dayKey()):'new'|'never'|'due'|'recent'{
 if(!hasRecords)return 'new';
 if(!lastExportAt)return 'never';
 return addDays(dayKey(new Date(lastExportAt)),7)<=today?'due':'recent';
}

export function backupExportLabel(at?:string){
 return at?new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(at)):'尚未导出';
}
