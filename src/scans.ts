import type {Book} from './types';
import {bundledBooks,EDU_BOOK_ID,HISTORY_BOOK_ID} from './books';

const folders:Record<string,string>={[HISTORY_BOOK_ID]:'history',[EDU_BOOK_ID]:'edu'};

export function hasBundledScan(book:Book){
 return !!folders[book.id]&&book.kind==='pdf'&&book.pages===bundledBooks[book.id].pages;
}

export function bundledScanPage(book:Book,page:number,base=import.meta.env.BASE_URL){
 if(!hasBundledScan(book)||!Number.isInteger(page)||page<1||page>book.pages)return undefined;
 return `${base}scans/${folders[book.id]}/${String(page).padStart(3,'0')}.webp`;
}
