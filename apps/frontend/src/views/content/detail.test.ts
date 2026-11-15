// @vitest-environment jsdom
import { flushPromises,mount } from '@vue/test-utils';
import { describe,expect,it,vi } from 'vitest';
const api=vi.hoisted(()=>({fetchCollectedContentDetail:vi.fn()}));
vi.mock('../../lib/api',()=>api);
vi.mock('vue-router',()=>({useRoute:()=>({params:{recordId:'n1'},query:{}})}));
import ContentDetail from './detail.vue';
const options={global:{stubs:{EventArticleReader:{props:['recordId'],template:'<div class="reader">原文 {{recordId}}</div>'},RouterLink:{props:['to'],template:'<a :href="to"><slot/></a>'}}}};
const row={id:'n1',title:'政策原始材料',sourceName:'证监会',sourceId:'s',themeName:'监管',themeId:'t',infoType:'financial_event',occurredAt:'2026-11-15T01:00:00Z',sourceUrl:'https://example.com/news',articleStatus:'not_requested',context:{description:'整理后的字段'}};
describe('collected record reading',()=>{
 it('opens policy original first and folds standardized fields with source/theme return paths',async()=>{
  api.fetchCollectedContentDetail.mockResolvedValue(row);
  const wrapper=mount(ContentDetail,options);await flushPromises();
  expect(wrapper.get('h1').text()).toBe(row.title);expect(wrapper.get('.reader').text()).toContain('n1');
  expect(wrapper.get('details').attributes('open')).toBeUndefined();
  expect(wrapper.findAll('a').map(a=>a.attributes('href'))).toEqual(['/sources/s?section=content#collected-content','/themes/t?section=content#collected-content']);
  expect(wrapper.text()).toContain('09:00');wrapper.unmount();
 });
 it('shows price data and its source instead of trying to extract an article',async()=>{
  api.fetchCollectedContentDetail.mockResolvedValue({...row,infoType:'price',articleStatus:'data_only',context:{price:100,currency:'CNY'}});
  const wrapper=mount(ContentDetail,options);await flushPromises();
  expect(wrapper.find('.reader').exists()).toBe(false);expect(wrapper.text()).toContain('100');expect(wrapper.get('a[target="_blank"]').attributes('href')).toBe(row.sourceUrl);wrapper.unmount();
 }); it('uses backend classification for structured financial records',async()=>{
  api.fetchCollectedContentDetail.mockResolvedValue({...row,articleStatus:'data_only',context:{event_class:'yield_curve',amount_billion_cny:100}});
  const wrapper=mount(ContentDetail,options);await flushPromises();
  expect(wrapper.find('.reader').exists()).toBe(false);expect(wrapper.text()).toContain('100');wrapper.unmount();
 });

});
