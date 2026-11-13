import type {AppState} from './types';
const dbPromise=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('yibuyibei-public',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('files');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function get<T>(store:string,key:string):Promise<T|undefined>{const db=await dbPromise;return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly'),r=tx.objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function put(store:string,key:string,value:unknown){const db=await dbPromise;return new Promise<void>((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error??new Error('保存未完成'));});}
export const loadState=()=>get<AppState>('state','main');
let chain=Promise.resolve();
export function saveState(s:AppState){chain=chain.catch(()=>{}).then(()=>put('state','main',s));return chain;}
export const getFile=(id:string)=>get<Blob>('files',id);
export async function saveFile(id:string,file:Blob){const e=await navigator.storage?.estimate?.();if(e?.quota&&e.usage!==undefined&&e.quota-e.usage<file.size*1.15)throw new Error('浏览器剩余存储空间不足。请先导出备份并释放空间。');await put('files',id,file);await navigator.storage?.persist?.().catch(()=>false);}
