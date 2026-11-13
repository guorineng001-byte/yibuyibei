import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile,rm,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
export function offlinePlugin(){
 let output,base;
 return {name:'mobile-offline',apply:'build',configResolved(config){output=path.resolve(config.root,config.build.outDir);base=config.base;},async closeBundle(){
  // Mobile loads optional OCR from Tesseract's official default CDN on demand.
  // Remove only the generated OCR copy, after checking the resolved build path.
  const ocr=path.resolve(output,'ocr');
  const stat=await lstat(ocr).catch(()=>null);
  if(stat){if(stat.isSymbolicLink()||!stat.isDirectory()||!(await realpath(ocr)).startsWith((await realpath(output))+path.sep))throw Error('Invalid generated OCR directory');await rm(ocr,{recursive:true});}
  async function files(dir){const entries=await readdir(path.join(output,dir),{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.posix.join(dir,e.name)):[path.posix.join(dir,e.name)]))).flat();}
  const core=(await files('')).filter(f=>!f.startsWith('ocr/')&&!f.startsWith('.openai/')&&!['sw.js','_headers','_redirects','.nojekyll'].includes(f)).sort();
  const hash=createHash('sha256');hash.update(base);for(const file of core){hash.update(file);hash.update(await readFile(path.join(output,file)));}
  const cacheName='yibuyibei-public-offline-'+hash.digest('hex').slice(0,16);
  const source=`const CACHE=${JSON.stringify(cacheName)};
const ROOT=${JSON.stringify(base)};
const INDEX=ROOT+'index.html';
const CORE=${JSON.stringify(core.map(f=>base+f))};
const ALLOWED=new Set(CORE);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try { for(const url of CORE){
  const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
  const homeRedirect=url===INDEX&&new URL(response.url).origin===self.location.origin&&new URL(response.url).pathname===ROOT;
  if(!response.ok||(response.redirected&&!homeRedirect))throw Error('Offline resource unavailable: '+url);
  if(url!==INDEX&&(response.headers.get('content-type')||'').includes('text/html'))throw Error('Unexpected sign-in page');
  await cache.put(url,response);
 }}catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('yibuyibei-public-offline-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const isHome=request.mode==='navigate'&&(url.pathname===ROOT||url.pathname===INDEX);
 if(!isHome&&!ALLOWED.has(url.pathname))return;
 event.respondWith((async()=>{
  const cached=await (await caches.open(CACHE)).match(isHome?INDEX:url.pathname);
  return cached||fetch(request);
 })());
});
`;
  await writeFile(path.join(output,'sw.js'),source);
  console.log('Offline core: '+core.length+' files, '+cacheName);
 }};
}
