import {it,expect} from 'vitest';
import {cleanOcrText} from './text';
it('清理中文字符间空格，同时保留英文单词间空格和段落',()=>{expect(cleanOcrText(' 教 育 作 用\n\nJohn Dewey 与 教 育 。 ')).toBe('教育作用\n\nJohn Dewey 与教育。');});
