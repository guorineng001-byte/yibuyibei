import {performance} from 'node:perf_hooks';

const target=process.argv[2];
if(!target){console.error('用法：pnpm check:deployment https://站点域名');process.exit(1);}
const origin=new URL(target).origin,started=performance.now(),failures=[],checked=[];
async function get(route){
 const home=route==='/index.html',start=performance.now(),response=await fetch(new URL(home?'/':route,origin),{redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 const type=response.headers.get('content-type')??'',data=await response.arrayBuffer();
 if(!data.byteLength)throw Error('空响应');
 if(route!=='/index.html'&&type.includes('text/html'))throw Error('返回 HTML，可能是登录页或错误的静态回退');
 const text=()=>new TextDecoder().decode(data);
 if(route.endsWith('.json')||route.endsWith('.webmanifest'))JSON.parse(text());
 if(route==='/index.html'&&!text().includes('id="root"'))throw Error('不是应用首页');
 if(route.endsWith('.js')||route.endsWith('.mjs')){if(!/(?:javascript|ecmascript)/.test(type))throw Error('脚本 Content-Type 无效：'+type);}
 checked.push({route:home?'/':route,status:response.status,milliseconds:Math.round(performance.now()-start),bytes:data.byteLength});
 return text();
}

try{
 const sw=await get('/sw.js'),core=JSON.parse(sw.match(/^const CORE=(.+);$/m)?.[1]??'null');
 if(!Array.isArray(core)||!core.includes('/index.html')||!core.some(route=>route.startsWith('/content/')))throw Error('离线资源表缺失');
 let cursor=0;
 await Promise.all(Array.from({length:6},async()=>{while(cursor<core.length){const route=core[cursor++];try{await get(route);}catch(error){failures.push({route,error:error.message});}}}));
 console.log(JSON.stringify({origin,checked:checked.length,seconds:Number(((performance.now()-started)/1000).toFixed(2)),slowest:checked.sort((a,b)=>b.milliseconds-a.milliseconds).slice(0,5),failures},null,2));
 if(failures.length)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}
