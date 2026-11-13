import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook,EDU_BOOK_ID} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import firstData from '../public/content/edu-proofread-ch1.json';
import secondData from '../public/content/edu-proofread-ch2.json';
import thirdData from '../public/content/edu-proofread-ch3.json';
import fourthData from '../public/content/edu-proofread-ch4.json';
import data from '../public/content/edu-proofread-ch5.json';
const pack=data as unknown as ContentPack,previous=[firstData,secondData,thirdData,fourthData] as unknown as ContentPack[];
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const node=(key:string)=>pack.knowledge.find(k=>k.id===`edu-reviewed-ch5-${key}`)!;
const rows=(key:string)=>pack.steps.filter(s=>s.knowledgeId===node(key).id);
const text=(key:string,title:string)=>rows(key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教心第五章技能的形成校对',()=>{
 it('自动安装93个要点，前四章768个要点完整保留，刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(validContentPack(pack)).toBe(true);expect(validateBackup(s)).toBe(true);
  expect(s.installedContentPacks).toContain(pack.id);expect(s.books).toHaveLength(2);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-4')).toHaveLength(21);
  for(const [ch,count] of [[1,208],[2,264],[3,150],[4,146],[5,93]])expect(eligibleSteps(s).filter(t=>t.id.startsWith(`edu-reviewed-ch${ch}-`))).toHaveLength(count);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('覆盖57至61页，训练要求接回下一页规律，12项原图不入队',()=>{
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual([57,58,59,60,61]);
  expect(node('motor-training').refs.map(r=>r.page)).toEqual([60,61]);
  const refs=pack.knowledge.filter(k=>k.referenceOnly);expect(refs).toHaveLength(12);
  for(const k of refs){expect(k.selected).toBe(false);expect(pack.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}
  expect(pack.knowledge.every(k=>k.confirmed&&k.bookId===EDU_BOOK_ID&&k.chapterId==='edu-chapter-4')).toBe(true);
  expect(pack.steps.every(s=>s.studyMode==='memorize')).toBe(true);
 });
 it('93个叶节点各出现一次，框架与完整复习队列顺序一致',()=>{
  let count=0;
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(s=>s.knowledgeId===k.id),tree=buildStepOutline(ss);
   expect(leaves(tree),k.id).toEqual(ss.map(s=>s.id));
   const keys:string[]=[];const walk=(nodes:StepOutlineGroup[])=>{for(const n of nodes){keys.push(n.key);walk(n.children);}};walk(tree);
   expect(new Set(keys).size,k.id).toBe(keys.length);count+=ss.length;
  }
  expect(count).toBe(93);
  const s=mergeContentPack(registerEduBook(initialState()),pack),session=makeSession(s,'review',eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch5-')).map(t=>t.id));
  if(!session)throw new Error('第五章完整复习队列未能创建');
  expect(session.queue).toEqual(pack.steps.map(t=>t.id));expect(new Set(session.queue).size).toBe(93);
 });
 it('保护教育史和前四章改写、阅读方式、进度、题目与未完成队列',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[4],'independent',false,'fourth-chapter-event',new Date('2026-10-14T02:00:00Z'));
  before.session=makeSession(before,'review',ids);
  before.questions.push({id:'kept-q',title:'已有问题',answer:'自己的答案',knowledgeIds:[previous[3].steps[0].knowledgeId]});
  for(const id of ids){const s=before.steps.find(s=>s.id===id)!;s.text='我的旧改写';s.version=2;s.studyMode='read';}
  const next=mergeContentPack(before,pack);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const s of before.steps)expect(next.steps.find(t=>t.id===s.id)).toEqual(s);
  for(const k of before.knowledge)expect(next.knowledge.find(t=>t.id===k.id)).toEqual(k);
  const own=next.steps.find(s=>s.id===pack.steps[0].id)!;own.text='第五章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(next,pack)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('技能性质、正反例及内部外部反馈配对，保留否定限定和1.5倍',()=>{
  expect(text('skill-types','操作结构')).toContain('不可合并');expect(text('skill-types','心智结构')).toContain('可合并');
  expect(text('skill-types','操作执行')).toContain('外显性');expect(text('skill-types','心智执行')).toContain('内潜性');
  expect(text('mental-cultivation','正反例')).toContain('正例传递概括的信息，反例传递辨别的信息');
  expect(text('motor-types','封闭性技能')).toContain('内部肌肉反馈');expect(text('motor-types','开放性技能')).toContain('周围环境提供的信息');
  expect(text('motor-training','练习量')).toContain('1.5倍');
  expect(text('motor-training','分情况反馈')).toContain('练习初期，教师反馈；练习后期，指导学生自我反馈');
  expect(text('motor-training','动觉反馈')).toContain('动觉控制逐渐替代视觉控制');
 });
 it('两张表的合并单元格配对正确，安德森联结与菲茨联系按原书名称保留',()=>{
  for(const title of ['冯心智操作','安联结']){
   expect(text('mental-formation',title)).toContain('物质活动或物质化活动阶段');expect(text('mental-formation',title)).toContain('有声的外部言语活动阶段');
  }
  for(const title of ['冯心智内化','安自动化']){
   expect(text('mental-formation',title)).toContain('无声的外部言语活动阶段');expect(text('mental-formation',title)).toContain('内部言语活动阶段');
  }
  expect(rows('mental-formation').find(s=>s.title==='安联结')?.displayTitle).toBe('联结阶段');
  expect(rows('motor-formation').find(s=>s.title==='菲联系')?.displayTitle).toBe('联系阶段');
  expect(text('motor-formation','菲认知')).toContain('操作定向与操作模仿两个阶段');
  expect(text('motor-formation','冯操作模仿')).toContain('视觉控制');expect(text('motor-formation','冯操作整合')).toContain('动觉控制');
  expect(text('practice-laws','高原含义')).toContain('暂时停顿');expect(text('practice-laws','高原表现')).toContain('高原期后，又有所上升');
  expect(text('practice-laws','起伏含义')).toContain('时而提高，时而下降，时而停顿');
 });
 it('检索高原现象能定位练习规律原卡片和含义叶节点',()=>{
  const state=mergeContentPack(registerEduBook(initialState()),pack),results=searchKnowledge(buildSearchIndex(state),'高原现象');
  expect(results.find(r=>r.knowledgeId===node('practice-laws').id)?.stepIds).toContain(rows('practice-laws').find(s=>s.title==='高原含义')!.id);
 });
});
