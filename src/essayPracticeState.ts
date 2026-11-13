import type {AppState,EssayPracticeRecord} from './types';
import {dayKey} from './core';

export function updateEssayPractice(state:AppState,id:string,draft:string,practiced=false):AppState {
 const previous=state.essayPractice?.[id];
 if(!practiced&&previous?.draft===draft)return state;
 if(!practiced&&!previous&&!draft)return state;
 const record:EssayPracticeRecord={draft,status:practiced?'practiced':'draft',lastPracticed:practiced?dayKey():previous?.lastPracticed};
 return {...state,essayPractice:{...state.essayPractice,[id]:record}};
}
