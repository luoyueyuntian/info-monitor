// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NewsArticle } from '@info-monitor/shared-contracts';
const api = vi.hoisted(() => ({ fetchEventArticle: vi.fn(), requestEventArticle: vi.fn() }));
vi.mock('../../../../lib/api', () => api);
import EventArticleReader from './EventArticleReader.vue';
const state = (status: NewsArticle['status'], extra = {}): NewsArticle => ({
  status, url:'https://example.com/news',title:'原文标题',contentText:null,fetchedAt:null,errorMessage:null,retryAvailableAt:null,...extra,
});

afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });
describe('news original reader', () => {
  it('shows original as escaped text and Shanghai fetch time', async () => {
    api.requestEventArticle.mockResolvedValue(state('ready', { contentText:'原文第一段\n\n<script>evil()</script>',fetchedAt:'2026-11-13T01:20:00Z' }));
    const wrapper = mount(EventArticleReader, { props:{ eventId:'e' } });
    await flushPromises();
    expect(wrapper.text()).toContain('原文第一段');
    expect(wrapper.text()).toContain('<script>evil()</script>');
    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.text()).toContain('09:20');
    expect(wrapper.get('a').attributes('href')).toBe('https://example.com/news');
    wrapper.unmount();
  });
  it('shows a direct PDF action instead of claiming a missing news link', async () => {
    api.requestEventArticle.mockResolvedValue(state('unsupported', { url:'https://example.com/a.PDF?download=1', errorMessage:'这条公告原文是 PDF 文件。' }));
    const wrapper = mount(EventArticleReader, { props:{eventId:'pdf'} });
    await flushPromises();
    expect(wrapper.get('h3').text()).toBe('公告原文（PDF）');
    expect(wrapper.get('a').text()).toContain('打开公告 PDF');
    expect(wrapper.get('a').attributes('href')).toBe('https://example.com/a.PDF?download=1');
    expect(wrapper.find('.article-body').exists()).toBe(false);
    wrapper.unmount();
  });
  it('polls queued work and stops after ready', async () => {
    vi.useFakeTimers();
    api.requestEventArticle.mockResolvedValue(state('pending'));
    api.fetchEventArticle.mockResolvedValue(state('ready', { contentText:'已抓取的原文' }));
    const wrapper = mount(EventArticleReader, { props:{ eventId:'e' } });
    await flushPromises();
    expect(wrapper.text()).toContain('排队');
    await vi.advanceTimersByTimeAsync(2000); await flushPromises();
    expect(wrapper.text()).toContain('已抓取的原文');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.fetchEventArticle).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
  it('offers explicit retry without fabricating content on failure', async () => {
    api.requestEventArticle.mockResolvedValueOnce(state('failed', { errorMessage:'来源限制访问' })).mockResolvedValueOnce(state('pending'));
    const wrapper = mount(EventArticleReader, { props:{ eventId:'e' } });
    await flushPromises();
    expect(wrapper.text()).toContain('来源限制访问');
    expect(wrapper.find('.article-body').exists()).toBe(false);
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(api.requestEventArticle.mock.calls[1][1]).toBe(true);
    wrapper.unmount();
  });
  it('aborts requests and clears poll timers on navigation', async () => {
    vi.useFakeTimers();
    api.requestEventArticle.mockResolvedValue(state('pending'));
    const wrapper = mount(EventArticleReader, { props:{ eventId:'old' } });
    await flushPromises();
    const signal = api.requestEventArticle.mock.calls[0][2] as AbortSignal;
    await wrapper.setProps({ eventId:'new' }); await flushPromises();
    expect(signal.aborted).toBe(true);
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.fetchEventArticle).not.toHaveBeenCalled();
  });
  it('shows API errors and rejects unsafe source links', async () => {
    api.requestEventArticle.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(state('unsupported',{url:'javascript:alert(1)',errorMessage:'PDF 请打开来源'}));
    const wrapper = mount(EventArticleReader, { props:{ eventId:'e' } });
    await flushPromises(); expect(wrapper.text()).toContain('暂时无法加载');
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).toContain('PDF 请打开来源');
    wrapper.unmount();
  });
});
