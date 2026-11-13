import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import {buildSearchIndex,searchKnowledge} from './search';
import systemData from '../public/content/edu-proofread-ch13.json';
import curriculumData from '../public/content/edu-proofread-ch14.json';
const system=systemData as unknown as ContentPack,curriculum=curriculumData as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const previous=Array.from({length:12},(_,i)=>bundled[`../public/content/edu-proofread-ch${i+1}.json`] as ContentPack);
const node=(p:ContentPack,key:string)=>p.knowledge.find(k=>k.id===`edu-reviewed-ch${p===system?13:14}-${key}`)!;
const rows=(p:ContentPack,key:string)=>p.steps.filter(s=>s.knowledgeId===node(p,key).id);
const text=(p:ContentPack,key:string,title:string)=>rows(p,key).find(s=>s.title===title)!.text;
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
afterEach(()=>vi.unstubAllGlobals());

describe('教原第五、六章完整校对',()=>{
 it('启动追加107与348项，前十二包1637项保留，刷新幂等',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  for(const p of [system,curriculum]){expect(validContentPack(p)).toBe(true);expect(s.installedContentPacks).toContain(p.id);}
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-12')).toHaveLength(22);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-13')).toHaveLength(80);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch13-'))).toHaveLength(107);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch14-'))).toHaveLength(348);
  const oldIds=new Set(previous.flatMap(p=>p.steps.map(t=>t.id)));
  expect(eligibleSteps(s).filter(t=>oldIds.has(t.id))).toHaveLength(1637);
  expect(await loadBundledContent(s)).toEqual(s);expect(validateBackup(s)).toBe(true);
 });
 it('覆盖105至126全部22页，28项参考不入队，三组跨页来源完整',()=>{
  for(const [p,start,end,count] of [[system,105,110,7],[curriculum,111,126,21]] as const){
   expect([...new Set(p.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:end-start+1},(_,i)=>start+i));
   expect(p.knowledge.filter(k=>k.referenceOnly)).toHaveLength(count);
   for(const k of p.knowledge){if(k.referenceOnly){expect(k.selected).toBe(false);expect(p.steps.some(t=>t.knowledgeId===k.id)).toBe(false);}for(const r of k.refs){const [x,y,w,h]=r.rect!;expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+w).toBeLessThanOrEqual(1);expect(y+h).toBeLessThanOrEqual(1);}}
  }
  expect(node(system,'system-types-table').refs.map(r=>r.page)).toEqual([107,108]);
  for(const key of ['tyler-development','stenhouse-development','schwab-development','development-models-tables'])expect(node(curriculum,key).refs.map(r=>r.page)).toEqual([117,118]);
  expect(node(curriculum,'curriculum-2022-grid').refs.map(r=>r.page)).toEqual([125,126]);
 });
 it('455个叶各出现一次，74张学习卡排序唯一，实际复习队列与原序相同',()=>{
  for(const p of [system,curriculum]){
   const orders=p.knowledge.filter(k=>!k.referenceOnly).map(k=>k.order);expect(new Set(orders).size).toBe(orders.length);
   for(const k of p.knowledge){const ss=p.steps.filter(t=>t.knowledgeId===k.id),tree=buildStepOutline(ss);expect(leaves(tree),k.id).toEqual(ss.map(t=>t.id));const keys:string[]=[];const walk=(ns:StepOutlineGroup[])=>{for(const n of ns){keys.push(n.key);walk(n.children);}};walk(tree);expect(new Set(keys).size).toBe(keys.length);}
   const s=mergeContentPack(registerEduBook(initialState()),p),ids=new Set(p.steps.map(t=>t.id));
   expect(makeSession(s,'review',eligibleSteps(s).filter(t=>ids.has(t.id)).map(t=>t.id))?.queue).toEqual(p.steps.map(t=>t.id));
  }
  expect(system.steps.length+curriculum.steps.length).toBe(455);
 });
 it('安装两章保护教育史、教心八章与教原前四章的改写和学习存档',()=>{
  let before=previous.reduce((s,p)=>mergeContentPack(s,p),registerEduBook(initialState()));
  const ids=['practice-0',...previous.map(p=>p.steps[0].id)];
  before=rateStep(before,ids[12],'independent',false,'kept-principles-fourth',new Date('2026-10-21T01:00:00Z'));
  before.session=makeSession(before,'review',ids);before.session!.cursor=5;
  before.questions.push({id:'kept-question',title:'自己的问题',answer:'原来的答案',knowledgeIds:[previous[11].steps[0].knowledgeId]});
  for(const id of ids){const t=before.steps.find(t=>t.id===id)!;t.text='已有改写';t.version=2;t.studyMode='read';}
  const frozen=structuredClone(before),next=mergeContentPack(mergeContentPack(before,system),curriculum);
  expect(before).toEqual(frozen);
  for(const key of ['books','chapters','progress','events','questions','session','assemblies'] as const)expect(next[key]).toEqual(before[key]);
  for(const t of before.steps)expect(next.steps.find(x=>x.id===t.id)).toEqual(t);
  for(const k of before.knowledge)expect(next.knowledge.find(x=>x.id===k.id)).toEqual(k);
  const own=next.steps.find(t=>t.id===system.steps[0].id)!;own.text='第五章我的改写';own.version=2;own.studyMode='read';
  expect(mergeContentPack(mergeContentPack(next,system),curriculum)).toEqual(next);expect(validateBackup(next)).toBe(true);
 });
 it('分支型不误写双轨，非正规不等于无组织，终身教育九项措施齐全',()=>{
  expect(text(system,'branched-system','区别双轨')).toContain('职业学校毕业生');
  expect(text(system,'branched-system','区别单轨')).toContain('分叉');
  expect(text(system,'nonformal-education','非正规含义')).toContain('有组织、有计划');
  expect(text(system,'nonformal-education','非正规缺点')).toContain('公平与质量');
  expect(rows(system,'lifelong-system').filter(s=>s.outlinePath?.[0]==='4. 推动终身教育发展及其意义')).toHaveLength(9);
  expect(system.steps.some(s=>s.title.includes('1951'))).toBe(false);
 });
 it('古德莱德实行与经验课程区分，综合课程四型不混同',()=>{
  expect(text(curriculum,'goodlad','实行课程')).toContain('教师实际开展');
  expect(text(curriculum,'goodlad','经验课程')).toContain('学生实际体会');
  expect(text(curriculum,'integrated-curriculum','相关课程')).toContain('不打破');
  expect(text(curriculum,'integrated-curriculum','融合课程')).toContain('动物学');
  expect(text(curriculum,'integrated-curriculum','核心课程')).toContain('轮形');
  expect(text(curriculum,'explicit-hidden','隐性转化影响')).toContain('消极影响');
 });
 it('开发三模式包含跨页补充，新旧布卢姆顺序不混，课程产品的核心限定保留',()=>{
  expect(text(curriculum,'tyler-development','目标模式补充')).toContain('专家');
  expect(text(curriculum,'stenhouse-development','过程模式补充')).toContain('十二条标准');
  expect(text(curriculum,'schwab-development','实践模式补充')).toContain('实际问题');
  expect(text(curriculum,'bloom-taxonomy','新版认知过程')).toContain('分析→评价→创造');
  expect(text(curriculum,'bloom-taxonomy','旧版认知过程')).toContain('分析→综合→评价');
  expect(text(curriculum,'curriculum-plan','课程计划内容')).toContain('学科设置（课程计划的核心问题）');
  expect(text(curriculum,'curriculum-standard','课程目标内容')).toContain('学段目标');
 });
 it('直线螺旋的重复性和适用范围区分，目标游离强调实际结果，CSE不补造缺点',()=>{
  expect(text(curriculum,'organize-content','直线式含义')).toContain('知识不重复');
  expect(text(curriculum,'organize-content','螺旋式含义')).toContain('重复出现');
  expect(text(curriculum,'organize-content','直线式适用')).toContain('数学');
  expect(text(curriculum,'organize-content','螺旋式适用')).toContain('低年级');
  expect(rows(curriculum,'evaluation-goal-free')[0].text).toBe('从预期效果转向实际结果。');
  expect(rows(curriculum,'evaluation-cse')).toHaveLength(2);
 });
 it('六项改革目标旧问题与新方向成对，跨页课程表及深化五项意义完整',()=>{
  for(const key of ['goals','structure','content','implementation','evaluation','management'])expect(rows(curriculum,'reform-'+key).map(s=>s.displayTitle)).toEqual(['改变的倾向','改革的方向']);
  expect(text(curriculum,'reform-management','改革方向')).toContain('国家、地方和学校');
  expect(rows(curriculum,'reform-content-extension').filter(s=>s.outlinePath?.[0]==='后期改革延伸')).toHaveLength(6);
  expect(rows(curriculum,'comprehensive-practice').filter(s=>s.outlinePath?.[0]==='（二）意义')).toHaveLength(5);
  expect(text(curriculum,'comprehensive-practice','科学态度道德')).toContain('科学的态度和道德');
 });
 it('新章可检索终身教育和目标游离模式',()=>{
  const s=mergeContentPack(mergeContentPack(registerEduBook(initialState()),system),curriculum),index=buildSearchIndex(s);
  expect(searchKnowledge(index,'终身教育').some(r=>r.knowledgeId===node(system,'lifelong-system').id)).toBe(true);
  expect(searchKnowledge(index,'目标游离').some(r=>r.knowledgeId===node(curriculum,'evaluation-goal-free').id)).toBe(true);
 });
});
