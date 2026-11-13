import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialState} from './seed';
import {EDU_BOOK_ID,eduCatalog,eduBook,registerEduBook} from './eduCatalog';
import {eligibleSteps,makeSession,rateStep,validateBackup} from './core';
import {loadBundledContent,mergeContentPack,validContentPack,type ContentPack} from './content';
import {printedPage} from './source';
import {buildStepOutline,type StepOutlineGroup} from './studyOutline';
import data from '../public/content/edu-proofread-ch1.json';
import scanData from '../public/content/edu-scan-index.json';
const pack=data as unknown as ContentPack,scan=scanData as unknown as ContentPack;
const bundled=import.meta.glob('../public/content/*.json',{eager:true,import:'default'});
const leaves=(nodes:StepOutlineGroup[]):string[]=>nodes.flatMap(n=>n.children.length?leaves(n.children):[n.steps[0].id]);
const steps=(key:string)=>pack.steps.filter(s=>s.knowledgeId===`edu-reviewed-ch1-${key}`);
afterEach(()=>vi.unstubAllGlobals());

describe('教心、教原新分册和首章校对',()=>{
 it('自动追加一本书与17章，首章208个要点完整进入学习，重复加载不重复安装',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:!!bundled[`../public${url}`],json:async()=>structuredClone(bundled[`../public${url}`])})));
  const s=await loadBundledContent(initialState());
  expect(s.books).toHaveLength(2);expect(s.books[0].id).toBe('kaicheng-333-history');
  expect(s.chapters.filter(c=>c.bookId===EDU_BOOK_ID)).toEqual(eduCatalog);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-0')).toHaveLength(30);
  expect(eligibleSteps(s).filter(t=>t.id.startsWith('edu-reviewed-ch1-'))).toHaveLength(208);
  expect(s.knowledge.filter(k=>k.chapterId==='edu-chapter-0'&&!k.referenceOnly).every(k=>k.confirmed)).toBe(true);
  expect(scan.steps).toHaveLength(0);expect(scan.knowledge).toHaveLength(0);
  expect(s.installedContentPacks).toEqual(expect.arrayContaining([pack.id,scan.id]));
  expect(validateBackup(s)).toBe(true);
  expect(await loadBundledContent(s)).toEqual(s);
 });
 it('章节共页、分册偏移和封底按扫描原页映射',()=>{
  expect(eduCatalog.slice(0,8)).toHaveLength(8);expect(eduCatalog.slice(8)).toHaveLength(9);
  expect(eduCatalog[0]).toMatchObject({start:7,end:17});expect(eduCatalog[1].start).toBe(18);
  expect(eduCatalog[7].end).toBe(79);expect(eduCatalog[8].start).toBe(81);
  expect(eduCatalog[9].end).toBe(95);expect(eduCatalog[10].start).toBe(95);
  for(const [page,label] of [[7,'003'],[17,'013'],[79,'075'],[80,''],[81,'078'],[82,'079'],[95,'092'],[155,'152'],[156,''],[157,'']] as const)expect(printedPage(eduBook,page)).toBe(label);
 });
 it('校验拒绝跨书章节、分隔页、封底、越界和非整数来源',()=>{
  expect(validContentPack(pack)).toBe(true);expect(validContentPack(scan)).toBe(true);
  for(const page of [0,5,80,156,157,158,7.5]){const bad=structuredClone(pack);bad.knowledge[0].refs[0].page=page;expect(validContentPack(bad)).toBe(false);}
  const bad=structuredClone(pack);bad.knowledge[0].chapterId='history-chapter-0';expect(validContentPack(bad)).toBe(false);
  const badOcr=structuredClone(scan);badOcr.ocr['kaicheng-333-edu:1'].bookId='kaicheng-333-history';expect(validContentPack(badOcr)).toBe(false);
 });
 it('追加与重复安装保护历史分册进度、事件、问题、队列以及两本书用户改写',()=>{
  const before=rateStep(initialState(),'practice-0','independent',false,'history-event',new Date('2026-10-09T02:00:00Z'));
  before.session=makeSession(before,'review',['practice-0','practice-1']);
  before.questions.push({id:'old-question',title:'我的题目',answer:'答案',knowledgeIds:['practice']});
  before.steps[0].text='历史分册我的改写';before.steps[0].version=2;before.steps[0].studyMode='read';
  const s=mergeContentPack(registerEduBook(before),pack);
  for(const key of ['progress','events','session','questions','assemblies'] as const)expect(s[key]).toEqual(before[key]);
  expect(s.steps.find(t=>t.id===before.steps[0].id)).toEqual(before.steps[0]);
  expect(s.books[0]).toEqual(before.books[0]);
  const t=s.steps.find(t=>t.id===pack.steps[0].id)!;t.text='教心我的改写';t.version=2;t.studyMode='read';
  s.knowledge.find(k=>k.id===pack.knowledge[1].id)!.selected=false;
  s.books[1].title='我命名的新教材';
  expect(mergeContentPack(registerEduBook(s),pack)).toEqual(s);
  expect(validateBackup(s)).toBe(true);
 });
 it('208个叶节点各出现一次，12项参考不入队，保留皮亚杰跨页与深层分支',()=>{
  let count=0;
  for(const k of pack.knowledge){
   const ss=pack.steps.filter(t=>t.knowledgeId===k.id);
   expect(leaves(buildStepOutline(ss)),k.id).toEqual(ss.map(t=>t.id));count+=ss.length;
   if(k.referenceOnly){expect(k.selected).toBe(false);expect(ss).toHaveLength(0);}
  }
  expect(count).toBe(208);expect(pack.knowledge.filter(k=>k.referenceOnly)).toHaveLength(12);
  expect(pack.knowledge.find(k=>k.id.endsWith('-piaget'))?.refs.map(r=>r.page)).toEqual([9,10]);
  const piaget=buildStepOutline(steps('piaget'))[1];
  expect(piaget.children.map(n=>n.label)).toEqual(['1. 感知运动阶段（0～2岁）','2. 前运算阶段（2～7岁）','3. 具体运算阶段（7～11岁）','4. 形式运算阶段（11岁至成年）']);
  expect(piaget.children[1].children.map(n=>n.children.length)).toEqual([3,2,2]);
  expect(piaget.children[2].children[0].children.map(n=>n.label)).toEqual(['①同一性','②可逆性','③补偿性']);
  expect([...new Set(pack.knowledge.flatMap(k=>k.refs.map(r=>r.page)))].sort((a,b)=>a-b)).toEqual(Array.from({length:11},(_,i)=>i+7));
 });
 it('阶段表与四类认知方式按原书配对，保留关键限定和失败归因的漏识别内容',()=>{
  expect(steps('erikson').filter(s=>s.outlinePath?.[0]==='（二）八阶段')).toHaveLength(8);
  const kohlberg=buildStepOutline(steps('kohlberg'))[1];expect(kohlberg.children.map(n=>n.children.length)).toEqual([3,3,3]);
  expect(steps('kohlberg').find(t=>t.id.endsWith('-13'))?.text).toContain('并非每个人');
  expect(steps('field-style').filter(s=>s.outlinePath?.[0]==='其他特点')).toHaveLength(10);
  expect(steps('reflection-style').at(-1)?.text).toContain('不一定比反思型学生差');
  expect(steps('gender-differences').find(s=>s.title==='女归因')?.text).toContain('失败归因为能力');
  expect(steps('bronfenbrenner').filter(s=>s.outlinePath?.length===2)).toHaveLength(5);
 });
});
