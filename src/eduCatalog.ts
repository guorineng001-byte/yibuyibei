import type {AppState,Book,Chapter} from './types';
import {bundledBooks,EDU_BOOK_ID} from './books';
export {EDU_BOOK_ID} from './books';


// Page headings and the two subject frameworks were checked against the scans.
const ranges:[string,number,number][]=[
 ['教心 · 心理发展与教育',7,17],
 ['教心 · 学习及其理论解释',18,37],
 ['教心 · 学习动机',38,46],
 ['教心 · 知识的建构',47,56],
 ['教心 · 技能的形成',57,61],
 ['教心 · 学习策略及其教学',62,66],
 ['教心 · 问题解决能力与创造性的培养',67,74],
 ['教心 · 社会规范学习、态度与品德发展',75,79],
 ['教原 · 教育及其产生与发展',81,88],
 ['教原 · 教育与社会发展',89,95],
 ['教原 · 教育与人的发展',95,99],
 ['教原 · 教育目的与培养目标',100,104],
 ['教原 · 教育制度',105,110],
 ['教原 · 课程',111,126],
 ['教原 · 教学',127,141],
 ['教原 · 德育',142,148],
 ['教原 · 教师与学生',149,155]
];
export const eduCatalog:Chapter[]=ranges.map(([title,start,end],i)=>({id:`edu-chapter-${i}`,bookId:EDU_BOOK_ID,title,start,end,order:i+1}));
export const eduPageLabels:Record<string,string>=Object.fromEntries(Array.from({length:157},(_,i)=>{
 const p=i+1;return [String(p),p>=6&&p<=79?String(p-4).padStart(3,'0'):p>=81&&p<=155?String(p-3).padStart(3,'0'):''];
}));
export const eduBook:Book={...bundledBooks[EDU_BOOK_ID],pageLabels:eduPageLabels};

/** Append the new volume once; retain learner-owned fields and all study state. */
export function registerEduBook(state:AppState):AppState{
 const existing=state.books.find(b=>b.id===EDU_BOOK_ID);
 const book=structuredClone(eduBook);
 return {...state,books:existing?state.books:[...state.books,book],chapters:[...state.chapters,...eduCatalog.filter(c=>!state.chapters.some(x=>x.id===c.id)).map(c=>({...c}))]};
}
