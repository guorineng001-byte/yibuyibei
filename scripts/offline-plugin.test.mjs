import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {describe,expect,it} from 'vitest';
import {offlinePlugin} from './offline-plugin.mjs';

describe('静态托管与离线资源',()=>{
 it('只缓存可访问资源，托管配置和构建元数据不进入离线安装',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'yibuyibei-offline-'));
  try{
   await mkdir(path.join(root,'dist/content'),{recursive:true});await mkdir(path.join(root,'dist/.openai'),{recursive:true});
   for(const [file,text] of Object.entries({'index.html':'<div id="root"></div>','content/example.json':'{}','_headers':'/sw.js\n Cache-Control: no-cache','_redirects':'','sw.js':'previous worker','.nojekyll':'','.openai/hosting.json':'{}'}))await writeFile(path.join(root,'dist',file),text);
   const plugin=offlinePlugin();plugin.configResolved({root,build:{outDir:'dist'}});await plugin.closeBundle();
   const worker=await readFile(path.join(root,'dist/sw.js'),'utf8'),core=JSON.parse(worker.match(/^const CORE=(.+);$/m)[1]);
   expect(core).toEqual(['/content/example.json','/index.html']);
   async function install(finalUrl,redirected,route){
    const handlers={},stored=[];
    const context={URL,Request:class extends Request{constructor(url,options){super(new URL(url,'https://study.example'),options);}},self:{location:{origin:'https://study.example'},addEventListener:(name,handler)=>{handlers[name]=handler;}},caches:{open:async()=>({put:async url=>{stored.push(url);}}),delete:async()=>true},fetch:async request=>({ok:true,redirected,url:request.url.endsWith('/index.html')?finalUrl:request.url,headers:new Headers({'content-type':request.url.endsWith('/index.html')?'text/html':'application/json'})})};
    const source=route?worker.replace('const CORE=["/content/example.json","/index.html"];',`const CORE=${JSON.stringify([route])};`):worker;
    vm.runInNewContext(source,context);
    let finished;handlers.install({waitUntil:promise=>{finished=promise;}});await finished;return stored;
   }
   expect(await install('https://study.example/',true,'/index.html')).toEqual(['/index.html']);
   await expect(install('https://login.example/',true,'/index.html')).rejects.toThrow('Offline resource unavailable');
   await expect(install('https://study.example/',true,'/content/example.json')).rejects.toThrow('Offline resource unavailable');
  }finally{await rm(root,{recursive:true,force:true});}
 });
});
