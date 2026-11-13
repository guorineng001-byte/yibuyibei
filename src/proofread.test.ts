import {describe,it,expect} from 'vitest';
import {initialState} from './seed';
import {emptyProgress} from './core';
import {mergeContentPack,validContentPack,type ContentPack} from './content';
const bookId='kaicheng-333-history';
const original={id:'draft-example',bookId,chapterId:'history-chapter-1',title:'孔子识别稿',refs:[{page:18}],confirmed:false,selected:false,order:18000};
const oldStep={id:'draft-example-0',knowledgeId:original.id,title:'原文',text:'不愤不启，不不发。',keywords:[],order:0,version:1};
const pack:ContentPack={schemaVersion:1,id:'proofread-test',bookId,knowledge:[{...original,id:'corrected-example',title:'孔子的启发诱导',confirmed:true,selected:true}],steps:[{...oldStep,id:'corrected-example-0',knowledgeId:'corrected-example',text:'不愤不启，不悱不发。'}],ocr:{},pageRotations:{},stats:{},replaces:[{knowledge:original,steps:[oldStep]}]};
function draftState(){const s=initialState();s.knowledge.push(structuredClone(original));s.steps.push(structuredClone(oldStep));return s;}
describe('逐批校对内容更新',()=>{
 it('仅替换原封未动的识别稿，不重复显示旧稿与校对稿',()=>{const s=mergeContentPack(draftState(),pack);expect(s.knowledge.some(k=>k.id===original.id)).toBe(false);expect(s.steps.some(t=>t.id===oldStep.id)).toBe(false);expect(s.knowledge.find(k=>k.id==='corrected-example')?.confirmed).toBe(true);expect(validContentPack(pack)).toBe(true);});
 it('系统补上的默认背诵方式不应阻止旧识别稿被校对稿替换',()=>{const s=draftState();s.steps[0].studyMode='memorize';const next=mergeContentPack(s,pack);expect(next.knowledge.some(k=>k.id===original.id)).toBe(false);expect(next.steps.some(t=>t.id===oldStep.id)).toBe(false);});
 it('保留用户修改的正文与只需阅读设置，校对内容另外加入',()=>{const s=draftState();const t=s.steps.find(t=>t.id===oldStep.id)!;t.text='用户自己整理的正文';t.studyMode='read';const next=mergeContentPack(s,pack);expect(next.steps.find(t=>t.id===oldStep.id)).toEqual(t);expect(next.knowledge.some(k=>k.id==='corrected-example')).toBe(true);});
 it('已有进度、题目引用或未完成队列的旧稿保持完整',()=>{for(const kind of ['progress','question','session']){const s=draftState();if(kind==='progress')s.progress[oldStep.id]=emptyProgress();if(kind==='question')s.questions=[{id:'q',title:'旧稿引用',answer:'',knowledgeIds:[original.id]}];if(kind==='session')s.session={id:'s',mode:'new',queue:[oldStep.id],initialIds:[oldStep.id],cursor:0,phase:'read',usedHelp:false,retries:{},completed:[],startDay:'2026-09-05',seconds:0,assembled:[]};const next=mergeContentPack(s,pack);expect(next.knowledge.find(k=>k.id===original.id)).toEqual(original);expect(next.progress).toEqual(s.progress);expect(next.questions).toEqual(s.questions);expect(next.session).toEqual(s.session);}});
 it('重复刷新保持用户对已校对内容的修改和学习方式',()=>{const s=mergeContentPack(draftState(),pack);s.steps.find(t=>t.id==='corrected-example-0')!.studyMode='read';const next=mergeContentPack(s,pack);expect(next.knowledge).toHaveLength(s.knowledge.length);expect(next.steps).toEqual(s.steps);});
});
