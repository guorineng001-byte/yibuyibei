import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe,expect,it} from 'vitest';
import {bundledBooks,EDU_BOOK_ID,HISTORY_BOOK_ID} from '../src/books';
import {bundledScanPage,hasBundledScan} from '../src/scans';
const packs=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});

describe('两册扫描原书资源',()=>{
 it('支持根路径和 Pages 子路径，页码与原 PDF 一致',()=>{
  expect(bundledScanPage(bundledBooks[HISTORY_BOOK_ID],215)).toBe('/scans/history/215.webp');
  expect(bundledScanPage(bundledBooks[EDU_BOOK_ID],1,'/yibuyibei/')).toBe('/yibuyibei/scans/edu/001.webp');
  expect(bundledScanPage(bundledBooks[EDU_BOOK_ID],158)).toBeUndefined();
  expect(hasBundledScan({...bundledBooks[EDU_BOOK_ID],id:'another-book'})).toBe(false);
  expect(hasBundledScan({...bundledBooks[EDU_BOOK_ID],pages:158})).toBe(false);
 });
 it('整册 372 页和预置知识点的全部来源页都有扫描图',()=>{
  const urls=new Set();
  for(const book of Object.values(bundledBooks))for(let page=1;page<=book.pages;page++)urls.add(bundledScanPage(book,page));
  expect(urls.size).toBe(372);
  for(const pack of Object.values(packs)){
   if(!pack.knowledge)continue;
   for(const knowledge of pack.knowledge)for(const ref of knowledge.refs){
    expect(urls.has(bundledScanPage(bundledBooks[knowledge.bookId],ref.page))).toBe(true);
   }
  }
  for(const url of urls)expect(existsSync(fileURLToPath(new URL(`../public${url}`,import.meta.url))),url).toBe(true);
 });
});
