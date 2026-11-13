import {Flag,GraduationCap,Target} from 'lucide-react';
import type {Rating,Session,StudySettings} from './types';
import {examSubjects} from './settings';
import './goal.css';

type GoalProps={settings:StudySettings};
const examName=(settings:StudySettings)=>settings.examType==='311'?'311 教育学专业基础':'333 教育综合';

export function GoalTag({settings}:GoalProps){
 return <span className="goal-tag"><Target size={13} aria-hidden="true"/>{settings.examType??'333'} · {settings.targetSchool||'每日积累'}</span>;
}

export function GoalSidebar({settings}:GoalProps){
 return <div className="sidebar-note goal-sidebar">
  <span className="goal-sidebar-label"><Flag size={14} aria-hidden="true"/>我的方向</span>
  <strong>{settings.targetSchool||'每天向前一点。'}</strong>
  <p>把目标，变成今天的行动。<br/>眼前这一点，值得认真背。</p>
  <span className="goal-sidebar-destination">{examName(settings)}</span>
 </div>;
}

export function GoalCard({settings}:GoalProps){
 const subjects=examSubjects[settings.examType??'333'];
 return <section className="goal-card" aria-labelledby="study-goal-title">
  <div className="goal-card-heading"><span><Target size={15} aria-hidden="true"/>我的学习方向</span><span>按自己的节奏，稳稳积累</span></div>
  <div className="goal-card-body">
   <div className="goal-intention"><span className="goal-intention-icon"><GraduationCap size={26} aria-hidden="true"/></span><h2 id="study-goal-title">{settings.targetSchool||'为自己，认真学。'}</h2><p>今天记牢的知识，<br/>就是下一步的底气。</p></div>
   <div className="goal-application"><h3>{examName(settings)}</h3><p className="coverage-note">现有教材内容：教育心理学 8 章、教育学原理 9 章，以及中国教育史、外国教育史。已校对卡片可直接学习，识别稿保留待校对标记。</p>{settings.examType==='311'&&<p className="coverage-note pending-subject">教育研究方法尚待补充，当前未覆盖 311 全科。</p>}<p className="coverage-note">目标院校可在学习设置中填写，也可以留空直接开始。</p></div>
  </div>
  <div className="goal-subjects" aria-label="考试科目范围">{subjects.map(name=><div key={name}><strong>{name}</strong><span>{name==='教育研究方法'?'待补充':'已有教材内容'}</span></div>)}</div>
  <div className="goal-card-footer"><span>内容来源：凯程徐影《核心框架笔记》相关分册</span><p>每一次主动回忆，都让知识更牢一点。</p></div>
 </section>;
}

const studyMessages=['认真想起这一点，就是今天的进步。','稳稳地学，知识会慢慢连起来。','暂时忘记也没关系。再想起一次，知识就更牢一点。'];
export function GoalStudyReminder({settings,phase,index,rating}:GoalProps&{phase:Session['phase'];index:number;rating?:Rating}){
 if(settings.encouragement==='brief')return null;
 const message=phase==='feedback'?(rating==='independent'?'又一个要点被你独立想起。带着这份底气，继续。':'拆小一点，再试一次。复习会帮你把它留下。'):studyMessages[index%studyMessages.length];
 return <div className="goal-study-reminder"><span><Target size={14} aria-hidden="true"/>{settings.targetSchool||'每日积累'}</span><p>{message}</p></div>;
}

export function GoalSummary({settings}:GoalProps){
 if(settings.encouragement==='brief')return null;
 return <div className="goal-summary"><GraduationCap size={24} aria-hidden="true"/><div><strong>{settings.targetSchool?`向着${settings.targetSchool}，又走了一步。`:'今天的认真，正在成为明天的底气。'}</strong><p>记住的值得肯定，没记牢的留给下一次。休息好，再继续。</p></div></div>;
}
