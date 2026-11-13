import {describe,expect,it} from 'vitest';
import {initialState} from './seed';
import {prepareMobileState} from './mobile';
describe('public library state',()=>{
 it('restores desktop backups without depending on the private library server',()=>{
  const source=initialState();source.books[0].sourceUrl='/library/kaicheng-history.pdf';
  const next=prepareMobileState(source);
  expect(next.books[0].sourceUrl).toBeUndefined();expect(next.books[0].missing).toBe(true);
  expect(source.books[0].sourceUrl).toBe('/library/kaicheng-history.pdf');
  expect(next.progress).toBe(source.progress);expect(next.steps).toBe(source.steps);expect(next.knowledge).toBe(source.knowledge);
  expect(prepareMobileState(next)).toEqual(next);
 });
 it('keeps independently connected files available',()=>{
  const source=initialState();source.books[0].missing=false;
  expect(prepareMobileState(source).books[0].missing).toBe(false);
 });
});
