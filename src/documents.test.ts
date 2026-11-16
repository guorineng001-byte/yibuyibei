import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocked=vi.hoisted(()=>({getFile:vi.fn(),getDocument:vi.fn(),createWorker:vi.fn()}));
vi.mock('./storage',()=>({getFile:mocked.getFile}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{},getDocument:mocked.getDocument}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url',()=>({default:'/pdf-worker.mjs'}));
vi.mock('tesseract.js',()=>({createWorker:mocked.createWorker}));
import {invalidatePdf,pageImage,pdfDocument,recognizePage,stopOcr} from './documents';
import {eduBook} from './eduCatalog';
afterEach(async()=>{await stopOcr();vi.unstubAllGlobals();});

describe('重新连接本地原书',()=>{
 beforeEach(()=>{invalidatePdf(eduBook.id);vi.clearAllMocks();});
 it('重连后读取新文件，清除原文件的解析缓存',async()=>{
  const old={destroy:vi.fn().mockResolvedValue(undefined)},clean={destroy:vi.fn().mockResolvedValue(undefined)};
  mocked.getFile.mockResolvedValueOnce(new Blob(['original'])).mockResolvedValueOnce(new Blob(['cleaned']));
  mocked.getDocument.mockReturnValueOnce({promise:Promise.resolve(old)}).mockReturnValueOnce({promise:Promise.resolve(clean)});
  expect(await pdfDocument(eduBook)).toBe(old);expect(await pdfDocument(eduBook)).toBe(old);
  expect(mocked.getFile).toHaveBeenCalledTimes(1);
  invalidatePdf(eduBook.id);
  expect(await pdfDocument(eduBook)).toBe(clean);
  expect(old.destroy).toHaveBeenCalledOnce();
  expect(new TextDecoder().decode(mocked.getDocument.mock.calls[1][0].data)).toBe('cleaned');
 });
 it('缺原文件不会请求私人文件服务器，并允许随后重连',async()=>{
  mocked.getFile.mockResolvedValueOnce(undefined).mockResolvedValueOnce(new Blob(['connected']));
  await expect(pdfDocument(eduBook)).rejects.toThrow('重新选择');
  expect(mocked.getDocument).not.toHaveBeenCalled();
  const doc={destroy:vi.fn().mockResolvedValue(undefined)};mocked.getDocument.mockReturnValueOnce({promise:Promise.resolve(doc)});
  expect(await pdfDocument(eduBook)).toBe(doc);
 });
});

describe('预置扫描页',()=>{
 const context={translate:vi.fn(),rotate:vi.fn(),drawImage:vi.fn()};
 const canvas={width:0,height:0,getContext:()=>context,toDataURL:()=> 'data:image/jpeg;rotated'};
 beforeEach(()=>{
  invalidatePdf(eduBook.id);vi.clearAllMocks();mocked.getFile.mockResolvedValue(undefined);
  vi.stubGlobal('Image',class {
   naturalWidth=2200;naturalHeight=3000;onload?:()=>void;onerror?:()=>void;url='';
   set src(value:string){this.url=value;queueMicrotask(()=>this.onload?.());}get src(){return this.url;}
  });
  vi.stubGlobal('document',{createElement:()=>canvas});
 });
 it('未连接本地文件也能按 PDF 页码直接打开扫描页',async()=>{
  expect(await pageImage({...eduBook,missing:true},41)).toBe('/scans/edu/041.webp');
  expect(mocked.getDocument).not.toHaveBeenCalled();
 });
 it('旋转扫描页时交换宽高并保持完整原图',async()=>{
  const sizes:number[][]=[];
  context.drawImage.mockImplementation(()=>{sizes.push([canvas.width,canvas.height]);});
  expect(await pageImage(eduBook,41,1.6,90)).toBe('data:image/jpeg;rotated');
  expect(sizes).toEqual([[3000,2200]]);expect(context.rotate).toHaveBeenCalledWith(Math.PI/2);
 });
 it('本地连接的 PDF 优先于预置扫描页',async()=>{
  mocked.getFile.mockResolvedValue(new Blob(['local book']));
  const render=vi.fn().mockReturnValue({promise:Promise.resolve()});
  mocked.getDocument.mockReturnValue({promise:Promise.resolve({getPage:async()=>({rotate:0,getViewport:()=>({width:900,height:1200}),render}),destroy:vi.fn()})});
  await pageImage(eduBook,41);expect(render).toHaveBeenCalledOnce();
  expect(new TextDecoder().decode(mocked.getDocument.mock.calls[0][0].data)).toBe('local book');
 });
 it('扫描图不可达时提示联网或连接本地原书',async()=>{
  vi.stubGlobal('Image',class {onerror?:()=>void;set src(_value:string){queueMicrotask(()=>this.onerror?.());}});
  await expect(pageImage(eduBook,41)).rejects.toThrow('联网后重试');
  expect(mocked.getDocument).not.toHaveBeenCalled();
 });
 it('扫描页可用于识别与整理，识别框按原页尺寸归一化',async()=>{
  const recognize=vi.fn().mockResolvedValue({data:{text:'扫描文字',blocks:[{paragraphs:[{text:'扫描文字',confidence:95,bbox:{x0:220,y0:300,x1:660,y1:900}}]}]}});
  mocked.createWorker.mockResolvedValue({recognize,terminate:vi.fn()});
  const result=await recognizePage(eduBook,41,()=>{});
  expect(result).toMatchObject({status:'done',text:'扫描文字',blocks:[{box:[.1,.1,.2,.2]}]});
  expect(recognize).toHaveBeenCalledOnce();expect(mocked.getDocument).not.toHaveBeenCalled();
 });
});
