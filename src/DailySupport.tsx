import {BookOpen,Check,Download,HelpCircle,X} from 'lucide-react';
import {backupAdvice,backupExportLabel,type DevicePreferences} from './dailyUse';

export function DailySupport({preferences,hasRecords,onChoose,onDismiss,onShowGuide,onExport}:{preferences:DevicePreferences;hasRecords:boolean;onChoose:()=>void;onDismiss:()=>void;onShowGuide:()=>void;onExport:()=>void}){
 const advice=backupAdvice(preferences.lastBackupExportAt,hasRecords);
 return <div className="daily-support">
  {!preferences.gettingStartedDismissed&&<section className="getting-started" aria-labelledby="getting-started-title">
   <div className="getting-started-heading"><div><span className="eyebrow">从这一小步开始</span><h2 id="getting-started-title">不用准备文件，选一章就能学。</h2></div><button className="icon-btn" aria-label="收起入门指引" onClick={onDismiss}><X size={18}/></button></div>
   <ol><li><span>1</span><div><strong>选择想学的章节</strong><p>按书目展开目录，可选整章、整节或几个知识点。</p></div></li><li><span>2</span><div><strong>按自己的方式学习</strong><p>想先通读，点“整批设为只阅读”；准备背诵时再恢复。原书 PDF 可稍后连接。</p></div></li><li><span>3</span><div><strong>随时停下，下次接着来</strong><p>点“暂停并返回”，从首页继续。记录保存在当前浏览器，换设备请导出学习备份。</p></div></li></ol>
   <div className="getting-started-actions"><button className="primary" onClick={onChoose}><BookOpen size={16}/>选择学习内容</button><button className="text-btn" onClick={onDismiss}><Check size={15}/>我知道了</button></div>
  </section>}
  {hasRecords&&<section className={`backup-reminder ${advice==='never'||advice==='due'?'backup-due':''}`} aria-label="学习备份提醒">
   <div><h2>{advice==='never'?'给学过的内容，留一份备份':advice==='due'?'最近的进度，记得再留一份':'进度自动保存在当前浏览器'}</h2><p>{preferences.lastBackupExportAt?`上次导出：${backupExportLabel(preferences.lastBackupExportAt)}。`:'还没有在这个浏览器导出过学习备份。'}电脑和手机不会自动同步。</p></div>
   <button className="secondary" onClick={onExport}><Download size={16}/>导出学习备份</button>
  </section>}
  {preferences.gettingStartedDismissed&&<button className="text-btn reopen-guide" onClick={onShowGuide}><HelpCircle size={14}/>入门指引</button>}
 </div>;
}
