import type {Book,SourceRef} from './types';
export function replacementMatches(book:Book,kind:Book['kind'],pages:number){return book.kind===kind&&book.pages===pages;}
export function printedPage(book:Book,page:number){return book.pageLabels?.[String(page)]??(page>book.offset?String(page-book.offset):'');}
export function rotateRect(rect:NonNullable<SourceRef['rect']>,degrees:number):NonNullable<SourceRef['rect']>{const [x,y,w,h]=rect;switch((degrees+360)%360){case 90:return [1-y-h,x,h,w];case 180:return [1-x-w,1-y-h,w,h];case 270:return [y,1-x-w,h,w];default:return rect;}}
