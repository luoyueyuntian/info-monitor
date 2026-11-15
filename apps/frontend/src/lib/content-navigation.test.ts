import { describe,expect,it } from 'vitest';
import { readingTarget,returnTarget } from './content-navigation';
describe('source/theme reading navigation',()=>{
 it('preserves workspace, filtered second page and report context',()=>{
  const target=readingTarget('n1','/workspace/stock-market/topics/t',{reportDate:'2026-11-15'},{page:2,q:'政策',sourceId:'s'});
  const url=new URL(target,'https://local');
  expect(url.pathname).toBe('/workspace/stock-market/content/n1');
  const query=Object.fromEntries(url.searchParams);
  const back=returnTarget({sourceId:'s',themeId:'t'},query);
  expect(back).toContain('/workspace/stock-market/topics/t?');
  const backUrl=new URL(back,'https://local');
  expect(Object.fromEntries(backUrl.searchParams)).toMatchObject({contentPage:'2',contentQuery:'政策',contentSource:'s',reportDate:'2026-11-15'});
 });
 it('rejects external or unrelated return origins',()=>{
  expect(returnTarget({sourceId:'s',themeId:'t'},{contentOrigin:'https://evil.test'})).toBe('/sources/s?section=content#collected-content');
  expect(returnTarget({sourceId:'s',themeId:'t'},{contentOrigin:'/sources/other'})).toBe('/sources/s?section=content#collected-content');
 });
});
