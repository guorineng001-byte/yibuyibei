import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocked=vi.hoisted(()=>({getFile:vi.fn(),getDocument:vi.fn()}));
vi.mock('./storage',()=>({getFile:mocked.getFile}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{},getDocument:mocked.getDocument}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url',()=>({default:'/pdf-worker.mjs'}));
import {invalidatePdf,pdfDocument} from './documents';
import {eduBook} from './eduCatalog';

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
