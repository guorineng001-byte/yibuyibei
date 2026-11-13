import {cp,mkdir,readFile,readdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),release=path.join(root,'release'),source=path.join(release,'source');
const entries=['src','public','scripts','docs','.github','.gitignore','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','index.html','LICENSE',...(await readdir(root)).filter(file=>file.endsWith('.md'))];
await readFile(path.join(root,'dist/index.html'));
const sw=await readFile(path.join(root,'dist/sw.js'),'utf8');
const core=JSON.parse(sw.match(/^const CORE=(.+);$/m)?.[1]??'null');
if(!Array.isArray(core)||!core.includes('/index.html')||!core.some(file=>file.startsWith('/content/')))throw Error('生产构建缺少离线资源或教材内容，请先运行构建。');
for(const file of core)await readFile(path.join(root,'dist',file));

await mkdir(source,{recursive:true});
for(const entry of [...entries,'dist']){
 const target=path.resolve(source,entry);
 if(!target.startsWith(source+path.sep))throw Error('发行目录无效。');
 await rm(target,{recursive:true,force:true});
 await cp(path.join(root,entry),target,{recursive:true});
}
const forbidden=(await walk(source)).filter(file=>/\.(?:pdf|docx|log|tsbuildinfo)$/i.test(file)||/(?:^|\/)\.env(?:\.|$)/.test(file));
if(forbidden.length)throw Error('发行内容包含本地文件：'+forbidden.join('、'));
const tar=process.platform==='win32'?'tar.exe':'tar';
execFileSync(tar,['-czf',path.join(release,'yibuyibei-site.tar.gz'),'-C',path.join(root,'dist'),'.'],{windowsHide:true});
execFileSync(tar,['--exclude=.git','--exclude=dist','--exclude=node_modules','-czf',path.join(release,'yibuyibei-source.tar.gz'),'-C',source,'.'],{windowsHide:true});
console.log('源码目录：'+source);
console.log('源码发行包：'+path.join(release,'yibuyibei-source.tar.gz'));
console.log('静态站点包：'+path.join(release,'yibuyibei-site.tar.gz'));
console.log('离线核心资源：'+core.length+' 项');

async function walk(directory){
 const result=[];
 for(const item of await readdir(directory,{withFileTypes:true})){
  if(['.git','node_modules'].includes(item.name))continue;
  const full=path.join(directory,item.name);
  if(item.isDirectory())result.push(...await walk(full));
  else result.push(path.relative(source,full).replaceAll(path.sep,'/'));
 }
 return result;
}
