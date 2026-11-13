import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, type Worker } from 'tesseract.js';
import type {Book,OcrPage} from './types';
import {getFile} from './storage';
import {cleanOcrText} from './text';
import {mobileEdition} from './mobile';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
let cached:{id:string;doc:Promise<pdfjs.PDFDocumentProxy>}|null=null;
export function invalidatePdf(bookId:string){
 if(cached?.id!==bookId)return;
 const old=cached;cached=null;
 void old.doc.then(doc=>doc.destroy()).catch(()=>{});
}
export async function pdfDocument(book:Book){
 if(cached?.id===book.id)return cached.doc;
 const old=cached; const promise=(async()=>{const blob=await getFile(book.id);if(blob)return pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;if(book.sourceUrl)return pdfjs.getDocument(book.sourceUrl).promise;throw new Error('原文件尚未连接，请在书库中重新选择这本书的文件。');})();
 cached={id:book.id,doc:promise};promise.catch(()=>{if(cached?.id===book.id)cached=null;});
 if(old)old.doc.then(doc=>doc.cleanup()).catch(()=>{});
 return promise;
}
export async function pageImage(book:Book,page:number,scale=1.6,rotation=0){const doc=await pdfDocument(book),pg=await doc.getPage(page),viewport=pg.getViewport({scale,rotation:(pg.rotate+rotation)%360});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await pg.render({canvas,viewport}).promise;const url=canvas.toDataURL('image/jpeg',0.9);canvas.width=0;canvas.height=0;return url;}
export async function pdfInfo(file:Blob){const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const pages=doc.numPages;await doc.destroy();return pages;}
export async function wordText(file:Blob){const mammoth=await import('mammoth');return (await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;}
let ocrWorker:Worker|null=null;
let ocrProgress:((text:string)=>void)|null=null;
let generation=0;
let rejectCurrent:((e:Error)=>void)|null=null;
export async function stopOcr(){generation++;rejectCurrent?.(new Error('识别已暂停'));rejectCurrent=null;const w=ocrWorker;ocrWorker=null;if(w)await w.terminate();}
export async function recognizePage(book:Book,page:number,onProgress:(text:string)=>void):Promise<OcrPage>{
 const epoch=generation;
 try{return await Promise.race([recognizeInternal(book,page,onProgress,epoch),new Promise<OcrPage>((_,reject)=>{rejectCurrent=reject;})]);}finally{if(epoch===generation)rejectCurrent=null;}
}
async function recognizeInternal(book:Book,page:number,onProgress:(text:string)=>void,epoch:number):Promise<OcrPage>{
 ocrProgress=onProgress;
 const doc=await pdfDocument(book),pg=await doc.getPage(page);const content=await pg.getTextContent();const direct=content.items.map(t=>'str' in t?t.str:'').join('\n').trim();
 if(direct.length>30)return {bookId:book.id,page,text:direct,status:'done'};
 if(epoch!==generation)throw new Error('识别已暂停');
 if(!ocrWorker){onProgress('加载本地中文识别引擎…');const w=await createWorker('chi_sim+eng',1,{...(mobileEdition?{}:{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',workerBlobURL:false}),logger:m=>{if(epoch===generation)ocrProgress?.(m.status==='recognizing text'?`识别文字 ${Math.round((m.progress??0)*100)}%`:'准备本地识别引擎…');}});if(epoch!==generation){await w.terminate();throw new Error('识别已暂停');}ocrWorker=w;}
 const viewport=pg.getViewport({scale:2.5}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await pg.render({canvas,viewport}).promise;
 if(epoch!==generation||!ocrWorker){canvas.width=0;canvas.height=0;throw new Error('识别已暂停');}
 const {data}=await ocrWorker.recognize(canvas,{}, {text:true,blocks:true});canvas.width=0;canvas.height=0;
 const blocks=(data.blocks??[]).flatMap(b=>b.paragraphs.map(p=>({text:cleanOcrText(p.text),confidence:p.confidence,box:[p.bbox.x0/viewport.width,p.bbox.y0/viewport.height,(p.bbox.x1-p.bbox.x0)/viewport.width,(p.bbox.y1-p.bbox.y0)/viewport.height] as [number,number,number,number]})));
 return {bookId:book.id,page,text:cleanOcrText(data.text),status:'done',blocks};
}
export function textSteps(text:string){return text.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean).flatMap(t=>{
 if(t.length<=160)return [t];const sentences=t.match(/[^。！？]+[。！？]?/g)??[t];const groups:string[]=[];for(const sentence of sentences){if(groups.length&&groups[groups.length-1].length+sentence.length<=140)groups[groups.length-1]+=sentence;else groups.push(sentence);}return groups;
});}
