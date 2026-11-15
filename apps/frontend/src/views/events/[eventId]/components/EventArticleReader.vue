<template>
  <article class="card news-reader" aria-labelledby="news-reader-title" :aria-busy="busy">
    <div class="reader-heading">
      <h3 id="news-reader-title">{{ isPdf ? '公告原文（PDF）' : '新闻原文' }}</h3>
      <a v-if="sourceUrl" :href="sourceUrl" target="_blank" rel="noopener noreferrer">{{ isPdf ? '打开公告 PDF ↗' : '打开原始网页 ↗' }}</a>
    </div>
    <template v-if="article?.status === 'ready' && article.contentText">
      <p class="reader-meta">从原始网页提取的正文 · 保存于 {{ formatDateTimeLabel(article.fetchedAt) }}（北京时间）</p>
      <div class="article-body">{{ article.contentText }}</div>
    </template>
    <div v-else role="status" aria-live="polite" class="reader-status">
      <p v-if="error">{{ error }}</p>
      <p v-else-if="article?.status === 'pending'">正文正在排队抓取，完成后会自动显示。</p>
      <p v-else-if="article?.status === 'running'">正在获取原始网页正文…</p>
      <p v-else-if="article?.errorMessage">{{ article.errorMessage }}</p>
      <p v-else>正在加载新闻原文…</p>
      <p v-if="article?.status === 'failed' && article.retryAvailableAt" class="reader-meta">可于 {{ formatDateTimeLabel(article.retryAvailableAt) }} 后重试。</p>
      <button v-if="error || article?.status === 'failed' || paused" type="button" :disabled="busy" @click="start(article?.status === 'failed')">
        {{ busy ? '正在加载…' : article?.status === 'failed' ? '重试抓取正文' : '重新检查正文' }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { NewsArticle } from '@info-monitor/shared-contracts';
import { fetchEventArticle, requestEventArticle, fetchRecordArticle, requestRecordArticle } from '../../../../lib/api';
import { formatDateTimeLabel } from '../../../../lib/presentation';

const props = defineProps<{ eventId?: string; recordId?: string }>();
const article = ref<NewsArticle | null>(null);
const busy = ref(false);
const error = ref('');
const paused = ref(false);
const sourceUrl = computed(() => {
  try {
    const url = new URL(article.value?.url ?? '');
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
});
const isPdf = computed(() => sourceUrl.value ? new URL(sourceUrl.value).pathname.toLowerCase().endsWith('.pdf') : false);
let start: (retry?: boolean) => Promise<void> = async () => {};

watch(() => [props.eventId, props.recordId], (_, __, onCleanup) => {
  const recordId = props.recordId;
  const eventId = recordId ?? props.eventId ?? '';
  if (!eventId) return;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let polls = 0;
  let version = 0;
  article.value = null;
  error.value = '';
  paused.value = false;
  async function load(request: boolean, retry = false) {
    if (controller.signal.aborted) return;
    const current = ++version;
    if (timer) clearTimeout(timer);
    busy.value = true;
    error.value = '';
    try {
      const result = request
        ? await (recordId ? requestRecordArticle : requestEventArticle)(eventId, retry, controller.signal)
        : await (recordId ? fetchRecordArticle : fetchEventArticle)(eventId, controller.signal);
      if (controller.signal.aborted || current !== version) return;
      article.value = result;
      if (['pending', 'running'].includes(result.status)) {
        if (++polls < 120) timer = setTimeout(() => void load(false), 2000);
        else paused.value = true;
      }
    } catch {
      if (!controller.signal.aborted && current === version) error.value = '暂时无法加载原文，请稍后重新检查。';
    } finally {
      if (!controller.signal.aborted && current === version) busy.value = false;
    }
  }
  start = async (retry = false) => { polls = 0; paused.value = false; await load(true, retry); };
  void start();
  onCleanup(() => { controller.abort(); if (timer) clearTimeout(timer); });
}, { immediate: true });
</script>

<style scoped>
.news-reader { min-width: 0; }
.reader-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.reader-heading h3 { margin: 0; }
.reader-heading a { font-size: 0.9rem; color: #715119; text-decoration: underline; }
.reader-meta { font-size: 0.84rem; color: #776b59; margin: 12px 0; }
.article-body { max-width: 76ch; max-height: 75vh; overflow-y: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 1.05rem; line-height: 1.95; color: #362f25; padding: 6px 16px 6px 0; }
.reader-status { margin-top: 12px; line-height: 1.7; color: #695e4c; }
.reader-status button { padding: 6px 14px; margin-top: 8px; border: 1px solid #baab8e; border-radius: 6px; cursor: pointer; }
.reader-status button:disabled { opacity: 0.6; cursor: wait; }
</style>
