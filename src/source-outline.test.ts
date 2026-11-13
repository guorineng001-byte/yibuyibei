import {describe,expect,it,vi} from 'vitest';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {loadBundledContent,migrateOutlineStructure,mergeContentPack,validContentPack,type ContentPack} from './content';
import {initialState} from './seed';
import {emptyProgress,makeSession,validateBackup} from './core';
import {buildSearchIndex,searchKnowledge} from './search';
import type {AppState} from './types';
import learningData from '../public/content/edu-proofread-ch2.json';
import motivationData from '../public/content/edu-proofread-ch3.json';
import knowledgeData from '../public/content/edu-proofread-ch4.json';
import skillsData from '../public/content/edu-proofread-ch5.json';
import strategiesData from '../public/content/edu-proofread-ch6.json';
import creativityData from '../public/content/edu-proofread-ch7.json';
import moralityData from '../public/content/edu-proofread-ch8.json';
import principlesOriginData from '../public/content/edu-proofread-ch9.json';
import principlesSocietyData from '../public/content/edu-proofread-ch10.json';
import principlesDevelopmentData from '../public/content/edu-proofread-ch11.json';
import principlesPurposeData from '../public/content/edu-proofread-ch12.json';
import principlesSystemData from '../public/content/edu-proofread-ch13.json';
import principlesCurriculumData from '../public/content/edu-proofread-ch14.json';
import principlesTeachingData from '../public/content/edu-proofread-ch15.json';
import principlesMoralData from '../public/content/edu-proofread-ch16.json';
import principlesTeachersData from '../public/content/edu-proofread-ch17.json';

const learningPack=learningData as unknown as ContentPack;
const learningTree=(key:string)=>buildStepOutline(learningPack.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch2-${key}`));
const motivationPack=motivationData as unknown as ContentPack;
const motivationTree=(key:string)=>buildStepOutline(motivationPack.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch3-${key}`));
const knowledgePack=knowledgeData as unknown as ContentPack;
const knowledgeTree=(key:string)=>buildStepOutline(knowledgePack.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch4-${key}`));
const skillsPack=skillsData as unknown as ContentPack;
const skillsTree=(key:string)=>buildStepOutline(skillsPack.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch5-${key}`));

const packs=import.meta.glob<ContentPack>('../public/content/foreign-proofread-ch*.json',{eager:true,import:'default'});
const pack=(chapter:number)=>packs[`../public/content/foreign-proofread-ch${chapter}.json`];
const tree=(chapter:number,key:string)=>buildStepOutline(pack(chapter).steps.filter(t=>t.knowledgeId===`foreign-reviewed-ch${chapter}-${key}`));
const labels=(nodes:StepOutlineGroup[])=>nodes.map(n=>n.label);
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);

describe('教原第九章原书框架',()=>{
 const p=principlesTeachersData as unknown as ContentPack;
 const t=(key:string)=>buildStepOutline(p.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch17-${key}`));
 it('队伍专业化保留职前、入职、在职三层与2/2/3个要点，个体五项独立',()=>{
  const roots=t('development-paths');expect(labels(roots)).toEqual(['1. 队伍专业化','2. 个体专业化']);
  expect(labels(roots[0].children)).toEqual(['（1）职前培养','（2）入职教育','（3）在职成长']);
  expect(roots[0].children.map(n=>n.children.length)).toEqual([2,2,3]);expect(roots[1].children).toHaveLength(5);
 });
 it('地位内保留社会五分支与教育过程直接要点，师德含义与核心不混到六项义务',()=>{
  const status=t('teacher-status-role')[0];expect(labels(status.children)).toEqual(['1. 社会地位','2. 教育过程中的地位']);
  expect(status.children[0].children).toHaveLength(5);
  const duties=t('teacher-duties');expect(duties[0].children).toHaveLength(6);
  expect(duties[1].children[0].children).toHaveLength(2);
 });
 it('少年与青年各有正式非正式分类，生涯三意义接在第四项之下',()=>{
  expect(t('student-organizations').map(n=>n.children[1].children.length)).toEqual([2,2]);
  const roots=t('student-development');expect(roots).toHaveLength(4);
  expect(labels(roots[3].children)).toEqual(['（1）含义','（2）生涯发展规划','（3）意义']);
  expect(roots[3].children[2].children).toHaveLength(3);
 });
 it('良好师生关系途径保留根本、重点、保障，根本与重点下直接要点和子项并存',()=>{
  const roots=t('relationship-methods');expect(roots.map(n=>n.children.length)).toEqual([4,5,0]);
  expect(labels(roots[0].children)[0]).toBe('根本');expect(labels(roots[1].children)[0]).toBe('重点');
 });
});

describe('教原第七、八章原书框架',()=>{
 const teaching=principlesTeachingData as unknown as ContentPack,moral=principlesMoralData as unknown as ContentPack;
 const a=(key:string)=>buildStepOutline(teaching.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch15-${key}`));
 const b=(key:string)=>buildStepOutline(moral.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch16-${key}`));
 it('教学与智育的双向辨析、三作用三任务及四理论过程保持层级',()=>{
  const t=a('teaching-overview');expect(t[1].children[2].children).toHaveLength(2);expect(t[2].children).toHaveLength(3);expect(t[3].children).toHaveLength(3);
  expect(a('behaviorism')[2].children).toHaveLength(6);expect(a('cognitivism')[2].children).toHaveLength(6);
  expect(a('humanism')[2].children).toHaveLength(6);expect(a('social-interaction')[2].children).toHaveLength(5);
 });
 it('备课三项上课七项、作业问题措施各七项、班级授课评价四优五缺',()=>{
  expect(a('preparation-class').map(n=>n.children.length)).toEqual([3,7]);
  expect(a('homework').map(n=>n.children.length)).toEqual([7,7]);
  expect(a('class-teaching')[1].children).toHaveLength(6);
  expect(a('class-teaching')[3].children.map(n=>n.children.length)).toEqual([4,5]);
  expect(a('organization-reform').map(n=>n.children.length)).toEqual([4,5,0]);
 });
 it('时间评价三维对应，表现性两类各含义举例、档案袋优缺各二项',()=>{
  expect(a('evaluation-time-types').map(n=>labels(n.children))).toEqual([['含义','作用','方法'],['含义','作用','方法'],['含义','作用','方法']]);
  expect(a('performance-assessment')[1].children.map(n=>labels(n.children))).toEqual([['a. 含义','b. 举例'],['a. 含义','b. 举例']]);
  expect(a('portfolio').map(n=>n.children.length)).toEqual([0,2,2]);
 });
 it('道德发展三阶段与三水平分开，价值澄清三实践分支与社会行动过程不混层',()=>{
  const c=b('cognitive-moral-development');expect(c.slice(0,2).map(n=>n.children.length)).toEqual([3,3]);expect(c[3].children.map(n=>n.children.length)).toEqual([3,2]);
  const v=b('value-clarification');expect(v[2].children).toHaveLength(3);expect(v[2].children[2].children).toHaveLength(4);
  expect(v[3].children.map(n=>n.children.length)).toEqual([2,2]);
  const s=b('social-action');expect(s[1].children[3].children).toHaveLength(3);expect(s[3].children.map(n=>n.children.length)).toEqual([3,5]);
 });
 it('自我教育意义三规律二、间接途径六项、立德路径家庭二社会三',()=>{
  expect(b('self-education').map(n=>n.children.length)).toEqual([3,0,2]);
  expect(b('direct-approach')[1].children).toHaveLength(3);expect(b('indirect-approach')[1].children).toHaveLength(6);
  expect(b('moral-root-paths').map(n=>n.children.length)).toEqual([0,2,3]);
  expect(b('school-moral-problems').map(n=>n.children.length)).toEqual([6,6]);
 });
 it('两章460个叶按原序各出现一次，26项图表无学习叶',()=>{
  for(const p of [teaching,moral])for(const k of p.knowledge){const ss=p.steps.filter(s=>s.knowledgeId===k.id);expect(leaves(buildStepOutline(ss)),k.id).toEqual(ss.map(s=>s.id));if(k.referenceOnly)expect(ss).toHaveLength(0);}
  expect(teaching.steps.length+moral.steps.length).toBe(460);
 });
});

describe('教原第五、六章原书框架',()=>{
 const system=principlesSystemData as unknown as ContentPack,curriculum=principlesCurriculumData as unknown as ContentPack;
 const a=(key:string)=>buildStepOutline(system.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch13-${key}`));
 const b=(key:string)=>buildStepOutline(curriculum.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch14-${key}`));
 it('基本制度按学制四项考核三项其他两项，非正规三项优点及终身九项措施归位',()=>{
  expect(a('basic-systems').map(n=>n.children.length)).toEqual([4,3,2]);
  expect(a('nonformal-education')[1].children[1].children).toHaveLength(3);
  expect(a('lifelong-system')[3].children).toHaveLength(9);
 });
 it('课程三理论的观点和评价分层，学科活动各优缺点与综合四型保留',()=>{
  for(const key of ['knowledge-theory','learner-theory','social-theory'])expect(labels(b(key))).toEqual(['代表人物','观点','评价']);
  expect(b('knowledge-theory')[2].children.map(n=>n.children.length)).toEqual([5,5]);
  expect(b('learner-theory')[2].children.map(n=>n.children.length)).toEqual([4,5]);
  expect(b('social-theory')[2].children.map(n=>n.children.length)).toEqual([2,3]);
  expect(b('integrated-curriculum').at(-1)?.children).toHaveLength(4);
 });
 it('隐性课程四分类三特点，校本课程意义四项问题四项原因两项不混层',()=>{
  const hidden=b('explicit-hidden')[1];expect(hidden.children[1].children).toHaveLength(4);expect(hidden.children[2].children).toHaveLength(3);
  expect(b('school-based').map(n=>n.children.length)).toEqual([0,0,4,4,2]);
 });
 it('布卢姆认知新旧版同属认知领域，技能情感与知识维度分开，三对组织方式归位',()=>{
  const t=b('bloom-taxonomy');expect(t[0].children[0].children).toHaveLength(4);expect(t[0].children).toHaveLength(2);
  expect(t[2].children).toHaveLength(4);expect(t[3].children.map(n=>n.children.length)).toEqual([2,2]);
  const pairs=b('organize-content')[1].children;expect(pairs.map(n=>n.children.length)).toEqual([2,2,2]);
  expect(pairs[1].children.map(n=>n.children.length)).toEqual([3,3]);expect(pairs[2].children.map(n=>n.children.length)).toEqual([2,2]);
 });
 it('改革因素五组三项，早晚改革不串列，全部455个叶保持原序',()=>{
  expect(b('reform-factors').map(n=>n.children.length)).toEqual([3,3,3,3,3]);
  expect(b('reform-structure-extension').map(n=>n.children.length)).toEqual([4,3]);
  expect(b('reform-implementation-extension').map(n=>n.children.length)).toEqual([3,4]);
  for(const p of [system,curriculum])for(const k of p.knowledge){const ss=p.steps.filter(s=>s.knowledgeId===k.id);expect(leaves(buildStepOutline(ss)),k.id).toEqual(ss.map(s=>s.id));if(k.referenceOnly)expect(ss).toHaveLength(0);}
  expect(system.steps.length+curriculum.steps.length).toBe(455);
 });
});

describe('教原第三、四章原书框架',()=>{
 const development=principlesDevelopmentData as unknown as ContentPack,purpose=principlesPurposeData as unknown as ContentPack;
 const d=(key:string)=>buildStepOutline(development.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch11-${key}`));
 const p=(key:string)=>buildStepOutline(purpose.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch12-${key}`));
 it('不平衡性两类举例保持同一父级，单多因素与内外动因各自分组',()=>{
  expect(labels(d('imbalance'))).toEqual(['含义','举例','对教育的制约性']);expect(d('imbalance')[1].children).toHaveLength(2);
  expect(d('factor-count').map(n=>n.children.length)).toEqual([3,3]);
  expect(d('internal-external').map(n=>labels(n.children))).toEqual([['（1）含义','（2）表现','（3）评价'],['（1）含义','（2）表现','（3）评价']]);
 });
 it('学校主导作用个性化和社会化各三项，发挥条件校内四校外三',()=>{
  const m=d('school-manifestations');expect(labels(m)).toEqual(['（1）个体个性化','（2）个体社会化','（3）关系']);expect(m.map(n=>n.children.length)).toEqual([3,3,0]);
  expect(d('school-reasons')).toHaveLength(5);expect(d('school-conditions').map(n=>n.children.length)).toEqual([4,3]);
 });
 it('培养目标三种依据和三次演变保留，四层目的结构不混为学校目标',()=>{
  const t=p('training-goals');expect(t[2].children).toHaveLength(3);expect(t[3].children).toHaveLength(3);
  expect(labels(p('education-purpose')[3].children)).toEqual(['教育目的','培养目标','课程目标','教学目标','层次关系']);
 });
 it('个人社会比较按四维观点对应，内在目的四观点与正反评价不串列',()=>{
  const t=p('individual-social');expect(t[1].children.map(n=>n.children.length)).toEqual([2,2,2,2]);
  expect(labels(t)).toEqual(['人物','观点','优点','局限','总结']);
  const external=p('external-internal');expect(external[1].children[1].children).toHaveLength(4);
  expect(external[2].children[1].children).toHaveLength(2);expect(external[3].children[1].children).toHaveLength(2);
 });
 it('五育含义作用分别成对，关系四项独立，素质教育五点及全面观细分不混层',()=>{
  const t=p('five-educations');expect(labels(t)).toEqual(['德育','智育','体育','美育','劳育','各育的关系']);
  for(const n of t.slice(0,5))expect(labels(n.children)).toEqual(['含义','作用']);expect(t[5].children).toHaveLength(4);
  const implementation=p('whole-development-implementation');expect(implementation[0].children).toHaveLength(5);
  expect(implementation[1].children).toHaveLength(4);expect(implementation[1].children[1].children).toHaveLength(2);
 });
 it('两章161个叶按原序各出现一次，所有图表参考无学习叶',()=>{
  for(const pack of [development,purpose])for(const k of pack.knowledge){const ss=pack.steps.filter(s=>s.knowledgeId===k.id);expect(leaves(buildStepOutline(ss)),k.id).toEqual(ss.map(s=>s.id));if(k.referenceOnly)expect(ss).toHaveLength(0);}
  expect(development.steps.length+purpose.steps.length).toBe(161);
 });
});

describe('教原第二章原书框架',()=>{
 const p=principlesSocietyData as unknown as ContentPack;
 const tree=(key:string)=>buildStepOutline(p.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch10-${key}`));
 it('教育独立论积极与消极评价各二项，万能论跨页评价与观点区分',()=>{
  const t=tree('education-independence');expect(labels(t)).toEqual(['1. 人物','2. 内容','3. 评价']);
  expect(t[1].children).toHaveLength(4);expect(t[2].children.map(n=>n.children.length)).toEqual([2,2]);
  const omni=tree('education-omnipotence');expect(labels(omni)).toEqual(['（一）人物','（二）背景','（三）内容','（四）评价']);
  expect(omni[2].children).toHaveLength(2);expect(omni[3].children[0].children).toHaveLength(2);
 });
 it('社会制约六类及四五三三三三项、社会功能六类及三四四四四三项保持横表对应',()=>{
  const limits=tree('social-constraints');expect(labels(limits)).toEqual(['生产力','政治','文化','科技','人口','媒介']);
  expect(limits.map(n=>n.children.length)).toEqual([4,5,3,3,3,3]);
  const functions=tree('social-functions');expect(labels(functions)).toEqual(['经济功能','政治功能','文化功能','科技功能','人口功能','生态功能']);
  expect(functions.map(n=>n.children.length)).toEqual([3,4,4,4,4,3]);
 });
 it('需求挑战保留内涵与变革两列，人工智能八项与本土民族共用单元格不串列',()=>{
  const ai=tree('artificial-intelligence');expect(labels(ai)).toEqual(['内涵','教育变革']);expect(ai[1].children).toHaveLength(8);
  expect(tree('informatization')[1].children).toHaveLength(5);expect(tree('democratization')[1].children).toHaveLength(5);
  const local=tree('localization-nationalization');expect(labels(local)).toEqual(['内涵','教育变革']);expect(labels(local[0].children)).toEqual(['教育本土化','教育民族化']);
  expect(tree('learning-society')[1].children).toHaveLength(4);
 });
 it('教育先行三个原因隶属于原因，全部150个叶节点与学习队列原序一致',()=>{
  const priority=tree('education-priority');expect(labels(priority)).toEqual(['（一）含义','（二）理论基础','（三）原因','（四）地位']);
  expect(labels(priority[2].children)).toEqual(['1. 基础性','2. 全局性','3. 先导性']);
  for(const k of p.knowledge){const ss=p.steps.filter(s=>s.knowledgeId===k.id);expect(leaves(buildStepOutline(ss)),k.id).toEqual(ss.map(s=>s.id));}
  expect(p.steps).toHaveLength(150);
 });
});

describe('教原第一章原书框架',()=>{
 const p=principlesOriginData as unknown as ContentPack;
 const tree=(key:string)=>buildStepOutline(p.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch9-${key}`));
 it('正规和非正规均属正式教育的分类，非正规四特点三意义归位',()=>{
  const t=tree('formal-education');expect(labels(t)).toEqual(['（1）含义','（2）优点','（3）缺点','（4）分类']);
  const kinds=t[3].children;expect(labels(kinds)).toEqual(['①正规教育','②非正规教育']);
  expect(labels(kinds[1].children)).toEqual(['含义','特点','意义']);
  expect(kinds[1].children.map(n=>n.children.length)).toEqual([0,4,3]);
 });
 it('教育活动四要素各三项，中介系统仍在教育活动下，功能按三个维度分类',()=>{
  const activity=tree('education-structure')[1];
  expect(labels(activity.children)).toEqual(['1. 教育者','2. 受教育者','3. 教育内容','4. 教育活动方式','注：教育中介系统']);
  expect(activity.children.slice(0,4).map(n=>n.children.length)).toEqual([3,3,3,3]);
  const functions=tree('education-functions');expect(labels(functions)).toEqual(['（一）按教育作用的对象划分','（二）按教育作用的方向划分','（三）按教育的呈现方式划分']);
  expect(functions.map(n=>n.children.length)).toEqual([3,3,3]);
 });
 it('三起源说保留人物观点评价，劳动五观点及心理四评价不混列',()=>{
  const t=tree('education-origin');expect(labels(t)).toEqual(['生物起源说','心理起源说','劳动起源说（社会起源说）']);
  expect(t.map(n=>labels(n.children))).toEqual([['人物','观点','评价'],['人物','观点','评价'],['人物','观点','评价']]);
  expect(t[0].children[2].children).toHaveLength(2);expect(t[1].children[2].children).toHaveLength(4);expect(t[2].children[1].children).toHaveLength(5);
 });
 it('当代成就公平三项质量五项，改革难点和措施均保留原序，131叶恰好出现一次',()=>{
  expect(tree('reform-achievements').map(n=>n.children.length)).toEqual([0,0,3,5]);
  expect(tree('reform-difficulties').map(n=>n.children.length)).toEqual([3,2]);
  expect(tree('reform-path').map(n=>n.children.length)).toEqual([3,2,0]);
  for(const k of p.knowledge){const ss=p.steps.filter(s=>s.knowledgeId===k.id);expect(leaves(buildStepOutline(ss)),k.id).toEqual(ss.map(s=>s.id));}
  expect(p.steps).toHaveLength(131);
 });
});

describe('社会规范、态度与品德发展的原书框架',()=>{
 const p=moralityData as unknown as ContentPack;
 const tree=(key:string)=>buildStepOutline(p.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch8-${key}`));
 it('遵从认同内化的含义特点条件各自独立，条件项数为三三二',()=>{
  const t=tree('social-norms');expect(labels(t)).toEqual(['（一）含义','（二）过程与条件']);
  expect(labels(t[1].children)).toEqual(['1. 遵从','2. 认同','3. 内化']);
  expect(t[1].children.map(n=>n.children.length)).toEqual([3,3,3]);
  expect(t[1].children.map(n=>n.children[2].children.length)).toEqual([3,3,2]);
 });
 it('说服性沟通下分证据情理差距，跨页因素外部三组与内部知情行衔接',()=>{
  const change=tree('attitude-change');expect(labels(change)).toEqual(['1. 提供榜样法','2. 说服性沟通法','3. 角色扮演法']);
  expect(labels(change[1].children)).toEqual(['（1）选择证据','（2）情理服人','（3）逐渐缩小态度差距']);
  expect(change[1].children.map(n=>n.children.length)).toEqual([2,3,0]);
  const factors=tree('moral-factors');expect(labels(factors)).toEqual(['（一）影响品德形成的外部因素','（二）影响品德形成的内部因素']);
  expect(factors[0].children.map(n=>n.children.length)).toEqual([4,2,2]);expect(factors[1].children).toHaveLength(3);
 });
 it('培养四组及移情四法不混层，品德不良原因与转化阶段完整',()=>{
  const cultivate=tree('moral-cultivation');expect(cultivate).toHaveLength(4);
  expect(cultivate[1].children[0].children).toHaveLength(4);expect(cultivate[2].children).toHaveLength(5);expect(cultivate[3].children).toHaveLength(2);
  const causes=tree('misconduct-causes');expect(labels(causes)).toEqual(['1. 客观','2. 主观']);
  expect(causes[0].children.map(n=>n.children.length)).toEqual([5,3,0]);expect(causes[1].children).toHaveLength(4);
  const correction=tree('misconduct-correction');expect(correction.map(n=>n.children.length)).toEqual([3,6]);
 });
});

describe('问题解决与创造性的原书框架',()=>{
 const p=creativityData as unknown as ContentPack;
 const tree=(key:string)=>buildStepOutline(p.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch7-${key}`));
 it('多元智力四种教育观归尊重差异，发展整体保持同级',()=>{
  const t=tree('multiple-intelligences');expect(labels(t)).toEqual(['1. 代表人物','2. 主要内容','3. 评价']);
  expect(labels(t[2].children)).toEqual(['（1）尊重差异','（2）发展整体']);
  expect(labels(t[2].children[0].children)).toEqual(['①教育观','②评价观','③教学观','④课程观']);
 });
 it('五种启发式位于方法下，结构不良七步及第一步三项完整',()=>{
  const methods=tree('general-process')[1];expect(labels(methods.children)).toEqual(['（1）算法式','（2）启发式']);
  expect(methods.children[1].children[1].children).toHaveLength(5);
  const process=tree('ill-structured')[1];expect(process.children).toHaveLength(7);expect(process.children[0].children).toHaveLength(3);
 });
 it('创造性思维五特点属于认知品质，培养方法五组与分合法双向保留',()=>{
  const structure=tree('creativity-overview')[1];expect(labels(structure.children)).toEqual(['1. 创造性认知品质','2. 创造性人格品质','3. 创造性适应品质']);
  expect(labels(structure.children[0].children)).toEqual(['（1）创造性想象','（2）创造性思维','（3）创造性认知策略']);
  expect(structure.children[0].children[1].children).toHaveLength(5);
  const cultivation=tree('creativity-cultivation');expect(cultivation).toHaveLength(5);
  expect(cultivation.map(n=>n.children.length)).toEqual([2,3,4,2,2]);
  expect(cultivation[1].children[1].children).toHaveLength(2);
 });
});

describe('学习策略原书深层框架',()=>{
 const p=strategiesData as unknown as ContentPack;
 const tree=(key:string)=>buildStepOutline(p.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch6-${key}`));
 it('复述六组策略保持连续，抑制与促进各保留含义及两个方向',()=>{
  const t=tree('rehearsal');expect(labels(t)).toEqual(['1. 含义','2. 常用策略']);
  expect(t[1].children).toHaveLength(6);
  const effects=t[1].children[0].children[1];expect(labels(effects.children)).toEqual(['a. 抑制','b. 促进']);
  expect(labels(effects.children[0].children)).toEqual(['含义','前摄抑制','倒摄抑制']);
  expect(labels(effects.children[1].children)).toEqual(['含义','前摄促进','倒摄促进']);
  expect(t[1].children[1].children).toHaveLength(5);
 });
 it('元认知知情行及资源管理四类不混层，求助教学的五项均归属学业求助',()=>{
  const meta=tree('metacognition');expect(labels(meta[1].children)).toEqual(['1. 元认知知识（知）','2. 元认知体验（情）','3. 元认知控制（行）']);
  expect(meta[1].children.map(n=>n.children.length)).toEqual([4,0,4]);
  const resources=tree('resource-management');expect(labels(resources)).toEqual(['（一）含义','（二）分类']);
  expect(labels(resources[1].children)).toEqual(['1. 时间管理策略','2. 努力管理策略','3. 环境管理策略','4. 学业求助策略']);
  const help=resources[1].children[3];expect(labels(help.children)).toEqual(['（1）含义','（2）类型','（3）教学']);
  expect(help.children[1].children).toHaveLength(2);expect(help.children[2].children).toHaveLength(5);
 });
});

describe('技能形成的原书深层框架',()=>{
 it('技能比较六维独立，心智举例下分具体和一般，智慧技能五层级均有含义举例',()=>{
  const comparison=skillsTree('skill-types');
  expect(labels(comparison)).toEqual(['含义','动作对象','动作执行','动作结构','举例','联系']);
  expect(labels(comparison[4].children[1].children)).toEqual(['具体的心智技能','一般的心智技能']);
  const mental=skillsTree('mental-types');
  expect(labels(mental)).toEqual(['辨别学习','具体概念学习','定义概念学习','规则学习（原理学习）','高级规则学习（问题解决学习）']);
  for(const n of mental)expect(labels(n.children)).toEqual(['含义','举例']);
 });
 it('心智五三三阶段与操作三四阶段按作者分开，避免两个认知阶段被合并',()=>{
  const mental=skillsTree('mental-formation');
  expect(labels(mental)).toEqual(['加里培林（理论基础：维果茨基的内化论）','冯忠良','安德森']);
  expect(mental.map(n=>n.children.length)).toEqual([5,3,3]);
  for(const n of mental[0].children)expect(labels(n.children)).toEqual(['特点','举例']);
  const motor=skillsTree('motor-formation');expect(labels(motor)).toEqual(['菲茨、波斯纳','冯忠良']);expect(motor.map(n=>n.children.length)).toEqual([3,4]);
 });
 it('训练要求三组各四项，练习规律的高原和起伏原因保留各自父路径',()=>{
  const training=skillsTree('motor-training');
  expect(labels(training)).toEqual(['（一）指导和示范','（二）必要而适当的练习','（三）充分而有效的反馈']);
  expect(training.map(n=>n.children.length)).toEqual([4,4,4]);
  const laws=skillsTree('practice-laws');expect(labels(laws)).toEqual(['（一）练习曲线','（二）规律']);
  expect(laws[0].children).toHaveLength(3);const regular=laws[1].children;expect(regular).toHaveLength(4);
  expect(labels(regular[1].children[2].children)).toEqual(['①改变活动结构和活动方式','②兴趣下降']);
  expect(labels(regular[2].children[1].children)).toEqual(['①主观','②客观']);expect(regular[3].children).toHaveLength(0);
 });
});

describe('知识的建构的原书深层框架',()=>{
 it('主要知识类型按维度展开，两页的七种其他分类接在同一父级',()=>{
  const roots=knowledgeTree('knowledge-types');
  expect(labels(roots)).toEqual(['（一）含义','（二）主要类型','（三）其他分类']);
  expect(labels(roots[1].children)).toEqual(['含义','区别','联系']);
  expect(labels(roots[1].children[1].children)).toEqual(['知识形态','知识获得','知识是否言传','知识建构机制']);
  for(const n of roots[1].children[1].children)expect(labels(n.children)).toEqual(['陈述性知识','程序性知识']);
  expect(roots[2].children).toHaveLength(7);expect(roots[2].children.every(n=>n.children.length===2)).toBe(true);
 });
 it('理解类型保留陈述与程序的两组分类，表征七方式与图式三例保持父路径',()=>{
  const types=knowledgeTree('understanding-types')[1];
  expect(types.children.map(n=>n.children.map(c=>c.children.length))).toEqual([[3,3],[3,2]]);
  const representation=knowledgeTree('knowledge-representation')[1];
  expect(labels(representation.children)).toEqual(['1. 符号','2. 概念','3. 命题','4. 命题网络','5. 表象','6. 图式','7. 产生式']);
  expect(labels(representation.children[5].children[1].children)).toEqual(['①物体图式','②事件图式','③动作图式']);
 });
 it('迁移九种依据和竖向两类举例完整，五种遗忘原因及整合措施分开',()=>{
  const classification=knowledgeTree('transfer-types')[1];expect(classification.children).toHaveLength(9);
  const abstraction=classification.children[6];expect(labels(abstraction.children)).toEqual(['横向迁移（水平迁移）','竖向迁移（垂直迁移）']);
  const vertical=abstraction.children[1];expect(labels(vertical.children)).toEqual(['含义','举例']);
  expect(labels(vertical.children[1].children)).toEqual(['（1）同化性迁移（自上而下）','（2）顺应性迁移（自下而上）']);
  const integration=knowledgeTree('integration-deepening');expect(labels(integration)).toEqual(['（一）记忆','（二）遗忘','（三）促进整合措施']);
  const reasons=integration[1].children[1];expect(reasons.children).toHaveLength(5);
  for(const n of reasons.children)expect(labels(n.children)).toEqual(['含义','举例']);expect(integration[2].children).toHaveLength(5);
 });
});

describe('学习动机的原书深层框架',()=>{
 it('马斯洛成长需要3项和缺失需要4项保留编号，罗杰斯内容原则与十种应用分开',()=>{
  const needs=motivationTree('maslow')[0];
  expect(labels(needs.children)).toEqual(['（1）成长需要','（2）缺失需要','特点']);
  expect(needs.children.map(n=>n.children.length)).toEqual([3,4,2]);
  expect(labels(needs.children[1].children)).toEqual(['④尊重的需要','⑤归属与爱的需要','⑥安全的需要','⑦生理的需要']);
  const rogers=motivationTree('rogers');
  expect(labels(rogers)).toEqual(['1. 观点','2. 应用']);
  expect(rogers[0].children.map(n=>n.children.length)).toEqual([4,4]);expect(rogers[1].children).toHaveLength(10);
 });
 it('目标定向两种能力观各有自己的特点，四种趋近回避归入理论发展',()=>{
  const roots=motivationTree('goal-orientation'),basic=roots[0].children[0];
  expect(labels(basic.children)).toEqual(['能力实体观与成绩目标定向','能力增长观与学习目标定向']);
  for(const n of basic.children){expect(labels(n.children)).toEqual(['能力内隐观','目标定向','特点','理论的发展']);expect(n.children[2].children).toHaveLength(3);}
  expect(labels(roots[0].children[1].children)).toEqual(['①掌握趋近目标','②掌握回避目标','③表现趋近目标','④表现回避目标']);
  expect(roots[1].children).toHaveLength(2);
 });
 it('有机整合保留三类动机，其中外部动机含四种调节，应用五项独立',()=>{
  const roots=motivationTree('self-determination'),integration=roots[0].children[2];
  expect(labels(integration.children)).toEqual(['自我决定程度递增的连续体','无动机','外部动机','内部动机']);
  expect(labels(integration.children[2].children)).toEqual(['外部调节','内摄调节','认同调节','整合调节']);
  expect(labels(integration.children[3].children)).toEqual(['内部调节']);expect(roots[1].children).toHaveLength(5);
 });
});

describe('学习及其理论解释的原书深层框架',()=>{
 it('班杜拉动机的三种强化归入规律，五种效应归入教学应用且抑制与去抑制同组',()=>{
  const roots=learningTree('bandura');
  expect(labels(roots)).toEqual(['1. 实验','2. 学习的本质','3. 规律（过程）','4. 应用']);
  expect(labels(roots[2].children[3].children)).toEqual(['①外部／直接强化','②替代强化','③自我强化']);
  const effects=roots[3].children[5];expect(effects.children).toHaveLength(5);
  expect(labels(effects.children[1].children)).toEqual(['抑制效应','去抑制效应']);
 });
 it('奥苏伯尔的客观主观条件、下位学习和两条学习维度分别保持真实父路径',()=>{
  const roots=learningTree('ausubel');
  const conditions=roots[0].children[1];expect(conditions.children.map(n=>n.children.length)).toEqual([2,3]);
  const assimilation=roots[1].children[2];expect(labels(assimilation.children[1].children)).toEqual(['①派生类属学习','②相关类属学习']);
  const matrix=roots[3].children[1];expect(labels(matrix.children)).toEqual(['有意义','机械']);
  expect(matrix.children.map(n=>labels(n.children))).toEqual([['接受','发现'],['接受','发现']]);
 });
 it('认知建构主义三种代表理论各有自己的下位分支，间歇强化四程式连续',()=>{
  const representatives=learningTree('cognitive-constructivism')[1];
  expect(labels(representatives.children)).toEqual(['1. 激进建构主义','2. 生成学习理论','3. 认知灵活性理论']);
  expect(representatives.children.slice(1).map(n=>n.children.length)).toEqual([3,4]);
  const intermittent=learningTree('behavior-increase').find(n=>n.label==='间歇强化')!;
  expect(labels(intermittent.children)).toEqual(['总体特点','程式']);
  expect(labels(intermittent.children[1].children)).toEqual(['（1）定时强化','（2）定比强化','（3）变时强化','（4）变比强化']);
 });
});

describe('日本与近现代主要教育家的原书层级',()=>{
 it('日本1996年措施保留四层父路径，1947年两法内容分开',()=>{
  const japan=tree(23,'reform1990s');
  expect(labels(japan)).toEqual(['（一）简介','（二）内容','（三）评价']);
  expect(labels(japan[1].children)).toEqual(['1. 基础教育','2. 高等教育']);
  const reform1996=japan[1].children[0].children[1];
  expect(reform1996.children[1].children).toHaveLength(4);
  expect(labels(tree(23,'laws1947')[1].children)).toEqual(['1.《教育基本法》：原则、宗旨','2.《学校教育法》：具体改革措施']);
 });
 it('洛克体育德育智育各含地位内容方法，乌申斯基广狭义不脱离教育学分支',()=>{
  const locke=tree(24,'locke');
  expect(labels(locke)).toEqual(['（一）简介','（二）绅士教育思想','（三）贫民教育思想']);
  const contents=locke[1].children[3];
  expect(labels(contents.children)).toEqual(['（1）体育','（2）德育','（3）智育']);
  expect(contents.children.map(n=>n.children.length)).toEqual([3,3,3]);
  const education=tree(24,'ushinsky')[1].children[4];
  expect(labels(education.children[0].children)).toEqual(['①广义','②狭义']);
 });
 it('两章全部271个要点恰好出现一次且叶顺序不变',()=>{
  let count=0;
  for(const ch of [23,24])for(const k of pack(ch).knowledge){
   const steps=pack(ch).steps.filter(t=>t.knowledgeId===k.id),roots=buildStepOutline(steps);
   expect(leaves(roots),k.id).toEqual(steps.map(t=>t.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(roots);
   expect(new Set(keys).size,k.id).toBe(keys.length);
   expect(steps.every(t=>Array.isArray(t.outlinePath)&&!!t.displayTitle)).toBe(true);
   count+=steps.length;
  }
  expect(count).toBe(271);
 });
});

describe('五星级教育家的原书层级',()=>{
 it('赫尔巴特跨页道德与课程保留深层分支，教学四阶段独立于弟子五段式',()=>{
  const moral=tree(25,'herbart-moral');
  expect(labels(moral)).toEqual(['（一）简介','（二）内容','（三）评价']);
  expect(labels(moral[1].children[1].children[1].children)).toEqual(['基本途径','①养成德行','②多方面的兴趣']);
  const curriculum=tree(25,'herbart-curriculum');
  expect(labels(curriculum[1].children)).toEqual(['1. 兴趣','2. 经验','3. 统觉论','4. 儿童发展']);
  expect(curriculum[1].children[0].children.slice(3).map(n=>n.children.length)).toEqual([3,3]);
  expect(labels(tree(25,'herbart-teaching')[1].children)).toEqual(['明了','联想','系统','方法']);
 });
 it('蒙台梭利创造期含两个子阶段，杜威反省五步和德育方法归于各自父级',()=>{
  const stages=tree(25,'montessori-development')[1].children[1].children[3];
  expect(labels(stages.children)).toEqual(['第一阶段（0～6岁）：创造期','第二阶段（6～12岁）','第三阶段（12～18岁）']);
  expect(labels(stages.children[0].children)).toEqual(['0～3岁','3～6岁']);
  expect(labels(tree(25,'dewey-thinking')[1].children[1].children)).toEqual(['（1）创设情境','（2）提出问题','（3）提出假设','（4）推论假设','（5）验证与结论']);
  expect(labels(tree(25,'dewey-moral')[1].children[3].children[0].children)).toEqual(['①社会方面','②心理方面']);
 });
 it('全章460个要点各出现一次且叶顺序与背诵队列一致',()=>{
  let count=0;
  for(const k of pack(25).knowledge){
   const steps=pack(25).steps.filter(t=>t.knowledgeId===k.id),roots=buildStepOutline(steps);
   expect(leaves(roots),k.id).toEqual(steps.map(t=>t.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(roots);
   expect(new Set(keys).size,k.id).toBe(keys.length);
   expect(steps.every(t=>Array.isArray(t.outlinePath)&&!!t.displayTitle),k.id).toBe(true);
   count+=steps.length;
  }
  expect(count).toBe(460);
 });
});

describe('近现代教育思潮的原书层级',()=>{
 it('心理学化的课程与方法保持各自父级，科学教育评价保留两组下位分支',()=>{
  const psychology=tree(26,'psychologization');
  expect(labels(psychology)).toEqual(['（一）理论渊源','（二）发展阶段','（三）内容','（四）评价']);
  expect(labels(psychology[2].children)).toEqual(['1. 总论','2. 内容','3. 组织','4. 方法']);
  expect(psychology[2].children.slice(2).map(n=>n.children.length)).toEqual([4,4]);
  expect(labels(tree(26,'scientific')[3].children)).toEqual(['1. 对经济与社会的影响','2. 对科学革命的影响','3. 对教育改革的影响']);
 });
 it('葛雷制配对、设计教学四步骤和新传统教育评价保留原书关系',()=>{
  const gary=tree(26,'gary')[1].children[1];
  expect(labels(gary.children[1].children)).toEqual(['体育运动场 → 体育和游戏','教室 → 学术工作和科学','工厂和商店 → 工艺和家政','礼堂 → 团体活动']);
  expect(labels(tree(26,'project-method')[1].children[2].children)).toEqual(['决定目的','制订计划','实施计划','评判结果']);
  const evaluation=tree(26,'neo-traditional')[2];
  expect(labels(evaluation.children)).toEqual(['1. 积极方面','2. 消极方面','3. 总结']);
  expect(labels(evaluation.children[0].children)).toEqual(['（1）对美国','（2）对世界']);
  expect(evaluation.children[0].children[0].children).toHaveLength(3);
  expect(evaluation.children[1].children).toHaveLength(3);
 });
 it('整章273个叶节点依照学习顺序各出现一次，引用图不含学习要点',()=>{
  let count=0;
  for(const k of pack(26).knowledge){
   const steps=pack(26).steps.filter(t=>t.knowledgeId===k.id),roots=buildStepOutline(steps);
   expect(leaves(roots),k.id).toEqual(steps.map(t=>t.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(roots);
   expect(new Set(keys).size,k.id).toBe(keys.length);
   expect(steps.every(t=>Array.isArray(t.outlinePath)&&!!t.displayTitle),k.id).toBe(true);
   if(k.referenceOnly)expect(steps).toHaveLength(0);
   count+=steps.length;
  }
  expect(count).toBe(273);
 });
});

describe('已对照原书的德国、俄国和美国框架',()=>{
 it('柏林大学只有三个主分支，管理在内容下，教自由和学自由在管理下',()=>{
  const roots=tree(20,'berlin');
  expect(labels(roots)).toEqual(['（一）简介','（二）内容','（三）评价']);
  expect(labels(roots[1].children)).toEqual(['1.宗旨','2. 管理','3.学生','4.教师']);
  expect(labels(roots[1].children[1].children)).toEqual(['办学自主','“教自由”','“学自由”']);
  expect(roots[1].steps).toHaveLength(6);
 });
 it('新大学运动属于高等教育，背景、内容、评价完整保留',()=>{
  const roots=tree(20,'early-higher');
  expect(labels(roots)).toEqual(['（三）高等教育','（四）教育管理']);
  expect(labels(roots[0].children)).toEqual(['1.古典大学','2. 新大学运动']);
  expect(labels(roots[0].children[1].children)).toEqual(['（1）背景','（2）内容','（3）评价']);
 });
 it('苏联1966、1984年改革的细分任务不会被提到内容之外',()=>{
  for(const key of ['reform1966','reform1984'])expect(labels(tree(21,key))).toEqual(['（一）简介','（二）内容','（三）评价']);
  expect(labels(tree(21,'reform1966')[1].children)).toEqual(['1. 学校任务','2. 教学内容']);
  expect(tree(21,'reform1966')[1].children[1].children).toHaveLength(5);
  expect(labels(tree(21,'reform1984')[1].children)).toEqual(['1. 完成两个任务','2. 四五二学制']);
 });
 it('美国评价的优点与局限不再成为两个顶层评价，课程标准分类归在内容下',()=>{
  expect(labels(tree(22,'eight-year'))).toEqual(['（一）简介','（二）过程','（三）结论','（四）特点','（五）评价']);
  const nation=tree(22,'nation-at-risk');
  expect(labels(nation)).toEqual(['（一）简介','（二）内容','（三）评价']);
  expect(labels(nation[2].children)).toEqual(['1. 优点','2. 局限（三个过分强调）']);
  expect(nation[2].children.map(n=>n.children.length)).toEqual([5,3]);
  expect(labels(tree(22,'goals2000')[1].children)).toEqual(['（1）课程标准确立','（2）课程标准分类']);
 });
 it('三章全部296个要点按原顺序出现一次，所有层级标识唯一',()=>{
  let count=0;
  for(const ch of [20,21,22]){
   const p=pack(ch);expect(validContentPack(p)).toBe(true);
   expect(p.outlineBaseline).toHaveLength(p.steps.length);
   for(const k of p.knowledge){
    const steps=p.steps.filter(t=>t.knowledgeId===k.id).sort((a,b)=>a.order-b.order),roots=buildStepOutline(steps);
    expect(leaves(roots),k.id).toEqual(steps.map(t=>t.id));
    const keys:string[]=[];
    const inspect=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);inspect(n.children);}};
    inspect(roots);expect(new Set(keys).size,k.id).toBe(keys.length);
    expect(steps.every(t=>Array.isArray(t.outlinePath)&&!!t.displayTitle),k.id).toBe(true);
    count+=steps.length;
   }
  }
  expect(count).toBe(296);
 });
});

function legacyState(p:ContentPack):AppState{
 const s=mergeContentPack(initialState(),p),baseline=new Map(p.outlineBaseline!.map(t=>[t.id,t]));
 return {...s,steps:s.steps.map(t=>{const old=baseline.get(t.id);return old?{...t,...old,outline:old.outline,subsection:old.subsection,displayTitle:old.displayTitle,outlinePath:undefined}:t;})};
}
describe('现有学习存档的框架升级',()=>{
 it('正常启动会更新已安装内容包，不重复导入，搜索也能找到新的下级分支',async()=>{
  const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  try{
   let s=await loadBundledContent(initialState());
   const p=pack(20),id='foreign-reviewed-ch20-berlin-3',old=p.outlineBaseline!.find(t=>t.id===id)!;
   s={...s,appliedMigrations:s.appliedMigrations!.filter(r=>r!==p.outlineRevision),steps:s.steps.map(t=>t.id===id?{...t,...old,outlinePath:undefined,displayTitle:old.displayTitle}:t)};
   const next=await loadBundledContent(s);
   expect(next.steps).toHaveLength(s.steps.length);
   expect(next.steps.find(t=>t.id===id)?.outlinePath).toEqual(['（二）内容','2. 管理']);
   const results=searchKnowledge(buildSearchIndex(next),'管理');
   expect(results.find(r=>r.knowledgeId==='foreign-reviewed-ch20-berlin')?.stepIds).toContain(id);
   expect(validateBackup(next)).toBe(true);
   (next.steps[0] as any).outlinePath='invalid';expect(validateBackup(next)).toBe(false);
  }finally{vi.unstubAllGlobals();}
 });
 it('已安装内容包也能升级，进度、正文、自定义学习方式和未完成队列不变；重复加载幂等',()=>{
  const p=pack(20),s=legacyState(p),id='foreign-reviewed-ch20-berlin-3';
  s.steps=s.steps.map(t=>t.id===id?{...t,studyMode:'read'}:t);
  s.progress[id]={...emptyProgress(),reads:5,attempts:3,due:'2026-10-01'};
  s.session=makeSession(s,'review',p.steps.map(t=>t.id));s.session!.cursor=12;
  s.events=[{id:'kept',stepId:id,version:1,at:'2026-09-25',day:'2026-09-25',rating:'hint',usedHelp:true}];
  const before=structuredClone(s),next=migrateOutlineStructure(s,p);
  expect(s).toEqual(before);
  expect(next.steps.find(t=>t.id===id)?.outlinePath).toEqual(['（二）内容','2. 管理']);
  const material=(x:AppState)=>x.steps.map(({id,title,text,keywords,order,knowledgeId,studyMode,version})=>({id,title,text,keywords,order,knowledgeId,studyMode,version}));
  expect(material(next)).toEqual(material(s));
  for(const key of ['knowledge','progress','events','session','questions','assemblies'] as const)expect(next[key]).toEqual(s[key]);
  expect(migrateOutlineStructure(next,p)).toBe(next);
 });
 it('用户改过正文版本、标题或分组的卡片不会被框架升级覆盖',()=>{
  const p=pack(20),s=legacyState(p),ids=p.steps.slice(0,4).map(t=>t.id);
  s.steps=s.steps.map(t=>t.id===ids[0]?{...t,version:2,text:'自己改写'}:t.id===ids[1]?{...t,title:'自定标题'}:t.id===ids[2]?{...t,outline:'自定分组'}:t.id===ids[3]?{...t,outlinePath:['自定路径']}:t);
  const next=migrateOutlineStructure(s,p);
  for(const id of ids)expect(next.steps.find(t=>t.id===id)).toEqual(s.steps.find(t=>t.id===id));
 });
 it('不接受错误结构的层级元数据',()=>{
  const p=structuredClone(pack(20));(p.steps[0] as any).outlinePath='内容 > 管理';expect(validContentPack(p)).toBe(false);
  p.steps[0].outlinePath=[''];expect(validContentPack(p)).toBe(false);
 });
});
