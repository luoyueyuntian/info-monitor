<template>
  <section class="page">
    <p v-if="error" role="alert">{{ error }} <button @click="reload">重试</button></p>
    <p v-else-if="!detail" role="status">正在加载内容…</p>
    <template v-else>
      <nav class="flex flex-wrap gap-4 text-ink-link" aria-label="返回阅读列表">
        <RouterLink v-if="route.query.contentOrigin" :to="returnTarget(detail,route.query)">← 返回刚才的阅读列表</RouterLink>
        <RouterLink :to="`/sources/${encodeURIComponent(detail.sourceId)}?section=content#collected-content`">← {{ detail.sourceName }}的采集内容</RouterLink>
        <RouterLink :to="`/themes/${encodeURIComponent(detail.themeId)}?section=content#collected-content`">{{ detail.themeName }}的采集内容</RouterLink>
      </nav>
      <header><h1>{{ detail.title }}</h1><p>{{ detail.sourceName }} · {{ formatDateTimeLabel(detail.occurredAt) }}（北京时间）</p></header>
      <EventArticleReader v-if="readable" :key="detail.id" :record-id="detail.id" />
      <article v-else class="card">
        <h3>采集数值</h3><p>此条内容是行情或数值记录。</p>
        <dl class="grid gap-2"><template v-for="(value,key) in detail.context" :key="key"><div v-if="key !== 'url'"><dt class="font-semibold">{{ key }}</dt><dd>{{ value }}</dd></div></template></dl>
        <a v-if="detail.sourceUrl" :href="detail.sourceUrl" target="_blank" rel="noopener noreferrer">打开原始来源 ↗</a>
      </article>
      <details class="card"><summary>查看采集字段</summary><p>以下是采集后整理的字段，完整原文以正文或原始来源为准。</p><pre class="fields">{{ JSON.stringify(detail.context,null,2) }}</pre></details>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed,onBeforeUnmount,ref,watch } from 'vue';
import { useRoute } from 'vue-router';
import type { CollectedContentDetail } from '@info-monitor/shared-contracts';
import { fetchCollectedContentDetail } from '../../lib/api';
import { returnTarget } from '../../lib/content-navigation';
import { formatDateTimeLabel } from '../../lib/presentation';
import EventArticleReader from '../events/[eventId]/components/EventArticleReader.vue';
const route=useRoute(),detail=ref<CollectedContentDetail|null>(null),error=ref('');
const readable=computed(()=>detail.value && detail.value.articleStatus!=='data_only');
let controller:AbortController|undefined;
async function reload(){
  controller?.abort();const request=new AbortController();controller=request;detail.value=null;error.value='';
  try {const value=await fetchCollectedContentDetail(String(route.params.recordId),request.signal);if(!request.signal.aborted)detail.value=value;}
  catch {if(!request.signal.aborted)error.value='内容不存在或暂时无法加载。';}
}
watch(()=>route.params.recordId,()=>void reload(),{immediate:true});
onBeforeUnmount(()=>controller?.abort());
</script>
<style scoped>.fields {white-space:pre-wrap;overflow-wrap:anywhere;margin-top:16px;font-size:.9rem;}</style>
