<template>
  <article class="card">
    <form class="grid gap-4" @submit.prevent="submitForm">
      <section class="grid gap-3.5">
        <div class="grid gap-1">
          <h3>新增来源</h3>
          <p class="m-0 text-ink-body">给当前主题补充一个新的抓取来源，可选在保存后立即触发一次运行。</p>
        </div>

        <label class="grid gap-2 font-semibold">
          来源名称
          <input class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.name" placeholder="人民银行公告列表" />
        </label>

        <div class="grid two">
          <label class="grid gap-2 font-semibold">
            来源类型
            <select class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.sourceType">
              <option value="page_list">page_list</option>
              <option value="api">api</option>
              <option value="rss">rss</option>
            </select>
          </label>

          <label class="grid gap-2 font-semibold">
            Adapter Key
            <input class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.adapterKey" placeholder="pbc_news_list" />
          </label>
        </div>

        <label class="grid gap-2 font-semibold">
          Config JSON
          <textarea
            class="min-h-[120px] resize-y rounded-xl border border-slate-400/20 bg-white px-3.5 py-3"
            v-model="form.configJson"
            placeholder='{"path": "/example", "schedule_interval_seconds": 21600}'
          ></textarea>
        </label>

        <label class="flex items-center gap-2.5 font-semibold">
          <input v-model="form.runImmediately" type="checkbox" />
          <span>保存后立即运行这个来源</span>
        </label>
      </section>

      <div class="flex flex-wrap gap-3">
        <button class="inline-flex items-center justify-center rounded-xl bg-btn-dark px-4 py-2.5 text-ink-on-dark transition-colors hover:bg-[#241d12] disabled:cursor-not-allowed disabled:opacity-60" type="submit" :disabled="saving">
          {{ saving ? "正在保存..." : "保存来源" }}
        </button>
        <button class="button secondary inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" type="button" @click="resetForm">重置</button>
      </div>
      <div v-if="statusMessage" class="text-ink-body">{{ statusMessage }}</div>
    </form>
  </article>
</template>

<script setup lang="ts">
import { reactive } from "vue";

defineProps<{
  saving: boolean;
  statusMessage: string;
}>();

const emit = defineEmits<{
  submit: [
    payload: {
      name: string;
      sourceType: string;
      adapterKey: string;
      configJson: string;
      runImmediately: boolean;
    },
  ];
}>();

const form = reactive({
  name: "",
  sourceType: "page_list",
  adapterKey: "",
  configJson: "{}",
  runImmediately: true,
});

function resetForm() {
  form.name = "";
  form.sourceType = "page_list";
  form.adapterKey = "";
  form.configJson = "{}";
  form.runImmediately = true;
}

function submitForm() {
  emit("submit", {
    name: form.name,
    sourceType: form.sourceType,
    adapterKey: form.adapterKey,
    configJson: form.configJson,
    runImmediately: form.runImmediately,
  });
}
</script>
