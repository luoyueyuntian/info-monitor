<template>
  <article class="card">
    <form class="form" @submit.prevent="submitForm">
      <section class="form-section">
        <div class="section-title">
          <h3>新增来源</h3>
          <p>给当前主题补充一个新的抓取来源，可选在保存后立即触发一次运行。</p>
        </div>

        <label>
          来源名称
          <input v-model="form.name" placeholder="人民银行公告列表" />
        </label>

        <div class="grid two">
          <label>
            来源类型
            <select v-model="form.sourceType">
              <option value="page_list">page_list</option>
              <option value="api">api</option>
              <option value="rss">rss</option>
            </select>
          </label>

          <label>
            Adapter Key
            <input v-model="form.adapterKey" placeholder="pbc_news_list" />
          </label>
        </div>

        <label>
          Config JSON
          <textarea
            v-model="form.configJson"
            placeholder='{"path": "/example", "schedule_interval_seconds": 21600}'
          ></textarea>
        </label>

        <label class="checkbox-row">
          <input v-model="form.runImmediately" type="checkbox" />
          <span>保存后立即运行这个来源</span>
        </label>
      </section>

      <div class="actions">
        <button class="button" type="submit" :disabled="saving">
          {{ saving ? "正在保存..." : "保存来源" }}
        </button>
        <button class="button secondary" type="button" @click="resetForm">重置</button>
      </div>
      <div v-if="statusMessage" class="muted">{{ statusMessage }}</div>
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
