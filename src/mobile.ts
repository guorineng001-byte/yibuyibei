import type {AppState} from './types';
import {normalizeSettings} from './settings';
export const mobileEdition = true;

export function prepareMobileState(state:AppState):AppState {
 return {...state,settings:normalizeSettings(state.settings),books:state.books.map(book=>book.sourceUrl?.startsWith('/library/')
  ? {...book,sourceUrl:undefined,missing:true} : book)};
}
