import type {Book} from './types';
export const HISTORY_BOOK_ID='kaicheng-333-history';
export const EDU_BOOK_ID='kaicheng-333-edu';
const contentSource={citation:'凯程徐影《2027 333 教育综合核心框架笔记》相关分册',rights:'第三方教材整理；对外分发授权范围待落实'};
export const bundledBooks:Record<string,Book>={
 [HISTORY_BOOK_ID]:{id:HISTORY_BOOK_ID,title:'教育综合 · 中外教育史核心框架笔记',subject:'中国教育史 / 外国教育史',filename:'kaicheng-history.pdf',pages:215,offset:8,kind:'pdf',source:contentSource,missing:true},
 [EDU_BOOK_ID]:{id:EDU_BOOK_ID,title:'教育综合 · 教心、教原核心框架笔记',subject:'教育心理学 / 教育学原理',filename:'kaicheng-edu-clean.pdf',pages:157,offset:4,kind:'pdf',source:contentSource,missing:true},
};
