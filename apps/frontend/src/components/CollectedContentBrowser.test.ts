// @vitest-environment jsdom
import { flushPromises,mount } from '@vue/test-utils';
import { describe,expect,it,vi } from 'vitest';
const api=vi.hoisted(()=>({fetchCollectedContent:vi.fn(),replace:vi.fn()}));
vi.mock('vue-router',()=>({useRoute:()=>({path:'/sources/s',query:{}}),useRouter:()=>({replace:api.replace})}));
vi.mock('../lib/api',()=>api);
import CollectedContentBrowser from './CollectedContentBrowser.vue';
const row={id:'n1',title:'没有触发事件的政策材料',sourceName:'证监会',sourceId:'s',themeName:'政策',themeId:'t',infoType:'financial_event',occurredAt:'2026-11-15T01:00:00Z',sourceUrl:'https://example.com/news',articleStatus:'not_requested'};
const options={global:{stubs:{RouterLink:{props:['to'],template:'<a :href="to"><slot/></a>'}}}};
describe('collected content browsing',()=>{
  it('leads to a reading page without requiring an event and searches/paginates within source',async()=>{
    api.fetchCollectedContent.mockResolvedValue({items:[row],total:25,page:1,limit:20});
    const wrapper=mount(CollectedContentBrowser,{props:{sourceId:'s'},...options});await flushPromises();
    expect(wrapper.text()).toContain(row.title);expect(wrapper.text()).toContain('正文尚未抓取');
    expect(wrapper.get('a').attributes('href')).toContain('/content/n1?');
    const next=wrapper.findAll('button').find(b=>b.text()==='下一页')!;
    await next.trigger('click');await flushPromises();
    expect(api.fetchCollectedContent.mock.calls.at(-1)?.[0]).toMatchObject({sourceId:'s',page:2});
    await wrapper.get('input').setValue('监管');await wrapper.get('form').trigger('submit');await flushPromises();
    expect(api.fetchCollectedContent.mock.calls.at(-1)?.[0]).toMatchObject({sourceId:'s',page:1,q:'监管'});
    wrapper.unmount();
  });
  it('aborts stale scope requests and shows load failures',async()=>{
    api.fetchCollectedContent.mockResolvedValueOnce({items:[],total:0,page:1,limit:20}).mockRejectedValueOnce(new Error('network'));
    const wrapper=mount(CollectedContentBrowser,{props:{themeId:'t'},...options});await flushPromises();
    const signal=api.fetchCollectedContent.mock.calls.at(-1)?.[1] as AbortSignal;
    await wrapper.setProps({themeId:'other'});await flushPromises();
    expect(signal.aborted).toBe(true);expect(wrapper.text()).toContain('加载失败');wrapper.unmount();
  });  it('clears stale results and retries the failed target page',async()=>{
    api.fetchCollectedContent.mockResolvedValueOnce({items:[row],total:60,page:1,limit:20}).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({items:[row],total:60,page:2,limit:20});
    const wrapper=mount(CollectedContentBrowser,{props:{sourceId:'s'},...options});await flushPromises();
    await wrapper.findAll('button').find(b=>b.text()==='下一页')!.trigger('click');await flushPromises();
    expect(wrapper.find('li').exists()).toBe(false);
    await wrapper.findAll('button').find(b=>b.text()==='重试')!.trigger('click');await flushPromises();
    expect(api.fetchCollectedContent.mock.calls.at(-1)?.[0].page).toBe(2);wrapper.unmount();
  });

});
