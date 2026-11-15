<template>
  <article id="collected-content" class="card" :aria-busy="loading">
    <div class="card-topline"><h3>采集内容</h3><span v-if="result">共 {{ result.total }} 条</span></div>
    <p class="text-ink-secondary">按此{{ sourceId ? '来源' : '主题' }}浏览全部采集记录，点击标题查看内容和原文。</p>
    <form class="content-filters" @submit.prevent="search">
      <label class="sr-only" :for="`${controlId}-query`">搜索内容标题</label>
      <input :id="`${controlId}-query`" v-model="draft" placeholder="搜索内容标题…" maxlength="200" />
      <label v-if="!sourceId && sources?.length" class="sr-only" :for="`${controlId}-source`">按来源筛选</label>
      <select v-if="!sourceId && sources?.length" :id="`${controlId}-source`" v-model="selectedSource" @change="search">
        <option value="">全部来源</option><option v-for="source in sources" :key="source.id" :value="source.id">{{ source.name }}</option>
      </select>
      <button type="submit" :disabled="loading">搜索</button>
    </form>
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="load(attemptedPage)">重试</button></p>
    <p v-else-if="loading && !result" role="status">正在加载采集内容…</p>
    <p v-else-if="result && !result.items.length">{{ query ? '没有找到匹配的内容。' : '这个范围内还没有采集记录。' }}</p>
    <ul v-if="result?.items.length" class="content-list">
      <li v-for="item in result.items" :key="item.id">
        <RouterLink class="content-title" :to="readingTarget(item.id,route.path,route.query,{page,q:query,sourceId:selectedSource})">{{ item.title }}</RouterLink>
        <div class="content-meta"><span>{{ item.sourceName }}</span><time>{{ formatDateTimeLabel(item.occurredAt) }}</time><span>{{ statusLabels[item.articleStatus] }}</span></div>
      </li>
    </ul>
    <nav v-if="result && result.total > result.limit" class="content-paging" aria-label="采集内容分页">
      <button type="button" :disabled="loading || page <= 1" @click="load(page-1)">上一页</button>
      <span>第 {{ page }} / {{ Math.max(1,Math.ceil(result.total/result.limit)) }} 页</span>
      <button type="button" :disabled="loading || page*result.limit >= result.total" @click="load(page+1)">下一页</button>
    </nav>
  </article>
</template>
<script setup lang="ts">
import { useRoute,useRouter } from 'vue-router';
import { browseState,readingTarget } from '../lib/content-navigation';
import { onBeforeUnmount,ref,useId,watch } from 'vue';
import type { CollectedContentPage,CollectedContentStatus } from '@info-monitor/shared-contracts';
import { fetchCollectedContent } from '../lib/api';
import { formatDateTimeLabel } from '../lib/presentation';
const props=defineProps<{sourceId?:string;themeId?:string;sources?:Array<{id:string;name:string}>}>();
const controlId=useId(),route=useRoute(),router=useRouter();
const attemptedPage=ref(1);
const result=ref<CollectedContentPage|null>(null),loading=ref(false),error=ref('');
const draft=ref(''),query=ref(''),selectedSource=ref(''),page=ref(1);
const statusLabels:Record<CollectedContentStatus,string>={ready:'已保存正文',pending:'正文排队中',running:'正在抓取正文',failed:'正文抓取失败',not_requested:'正文尚未抓取',unsupported:'原文暂不可读取',pdf:'PDF 原文',data_only:'数值记录',no_link:'无可读原文链接'};
let controller:AbortController|undefined;
async function load(target:number) {
  controller?.abort(); const request=new AbortController();controller=request;
  loading.value=true;error.value='';attemptedPage.value=target;result.value=null;
  try {
    const response=await fetchCollectedContent({themeId:props.themeId,sourceId:props.sourceId||selectedSource.value||undefined,q:query.value,page:target},request.signal);
    if(request.signal.aborted)return;
    result.value=response;page.value=response.page;
    void router.replace({query:{...route.query,contentPage:String(page.value),contentQuery:query.value,contentSource:selectedSource.value}});
  } catch {if(!request.signal.aborted)error.value='采集内容加载失败，请重试。';}
  finally {if(!request.signal.aborted)loading.value=false;}
}
function search(){query.value=draft.value.trim();void load(1);}
watch(()=>[props.sourceId,props.themeId],()=>{
  const state=browseState(route.query);
  draft.value=state.q;query.value=state.q;
  selectedSource.value=!props.sourceId && props.sources?.some(s=>s.id===state.sourceId)?state.sourceId:'';
  result.value=null;page.value=state.page;void load(state.page);
},{immediate:true});
onBeforeUnmount(()=>controller?.abort());
</script>
<style scoped>
.content-filters { display:flex;flex-wrap:wrap;gap:8px;margin:16px 0; }
.content-filters input,.content-filters select,.content-filters button,.content-paging button {border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;background:white;}
.content-filters input {flex:1;min-width:160px;}
.content-list {list-style:none;padding:0;margin:0;}
.content-list li {padding:16px 0;border-bottom:1px solid #e2e8f0;}
.content-title {font-size:1.04rem;font-weight:600;color:#604510;overflow-wrap:anywhere;}
.content-title:hover {text-decoration:underline;}
.content-meta {display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:8px;font-size:.86rem;color:#695e4c;}
.content-paging {display:flex;align-items:center;gap:16px;margin-top:18px;}
button:disabled {opacity:.5;cursor:default;}
</style>
