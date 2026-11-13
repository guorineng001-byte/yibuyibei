import {useEffect,useState} from 'react';

export function MobileSupport(){
 const [status,setStatus]=useState('正在准备离线背诵…');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  if(import.meta.env.DEV){setStatus('开发预览；生产构建支持离线');return;}
  let disposed=false;
  const show=(text:string)=>{if(!disposed)setStatus(text);};
  if(!('serviceWorker' in navigator)||!window.isSecureContext){show('当前环境不支持离线，请使用现代浏览器并通过 localhost 或 HTTPS 打开。');return;}
  const timeout=setTimeout(()=>show('离线准备尚未完成，请保持联网后重试。'),45000);
  const ready=()=>{clearTimeout(timeout);show('离线背诵已就绪');};
  const changed=()=>{if(navigator.serviceWorker.controller)ready();};
  navigator.serviceWorker.addEventListener('controllerchange',changed);
  navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{updateViaCache:'none'}).then(reg=>{
   if(disposed)return;
   if(reg.active)ready();
   const watch=()=>{
    const worker=reg.installing;
    worker?.addEventListener('statechange',()=>{
     if(worker.state==='activated')ready();
     if(worker.state==='redundant'){clearTimeout(timeout);show('离线准备失败，请联网重试。');}
     if(worker.state==='installed'&&reg.active){clearTimeout(timeout);show('新版已准备好，关闭本程序的所有窗口后重新打开即可更新。');}
    });
   };
   watch();reg.addEventListener('updatefound',watch);
   if(reg.waiting)show('新版已准备好，关闭本程序的所有窗口后重新打开即可更新。');
   void navigator.storage?.persist?.().catch(()=>false);
  }).catch(()=>{clearTimeout(timeout);show('离线准备失败，请联网重试。');});
  return()=>{disposed=true;clearTimeout(timeout);navigator.serviceWorker.removeEventListener('controllerchange',changed);};
 },[retry]);
 return <details className="mobile-support"><summary>随身背诵 <span role="status">{status}</span></summary><div>
  <p>电脑和安卓可使用浏览器的“安装应用”或“添加到主屏幕”。在 iPhone 的 Safari 中打开，点“分享 → 添加到主屏幕”，保留“作为网页 App 打开”（如有）。以后直接点主屏幕上的“一步一背”。</p>
  <p>首次请联网打开主屏幕上的程序，等到“离线背诵已就绪”后再离线使用。文字背诵、检索和进度保存在当前设备；首次使用文字识别仍需联网。</p>
  <p>带入电脑进度：电脑“学习设置 → 导出学习备份”，把 JSON 发到手机并存入“文件”，再在主屏幕程序中点“学习设置 → 恢复备份”。两台设备的进度不会自动同步，恢复会替换当前进度。</p>
  <p>查看原书：把原 PDF 存入手机“文件”，到“我的书库 → 重新连接原文件”选择它；保存成功后可离线对照。清理网站数据会删除本机记录，请定期导出备份。</p>
  <button className="secondary" type="button" onClick={()=>{setStatus('正在准备离线背诵…');setRetry(n=>n+1);}}>重新检查离线准备</button>
 </div></details>;
}
