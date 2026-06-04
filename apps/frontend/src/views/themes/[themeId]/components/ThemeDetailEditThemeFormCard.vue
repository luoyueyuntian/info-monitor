<template>
  <article class="card">
    <form class="grid gap-4" @submit.prevent="submitForm">
      <section class="grid gap-3.5">
        <div class="grid gap-1">
          <h3>编辑主题</h3>
          <p class="m-0 text-[#6f665a]">修改当前主题的名称、描述和状态，保存后会立即刷新当前详情页。</p>
        </div>

        <label class="grid gap-2 font-semibold">
          主题名称
          <input class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.name" placeholder="主题名称" />
        </label>

        <label class="grid gap-2 font-semibold">
          描述
          <textarea class="min-h-[120px] resize-y rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.description" placeholder="描述当前主题的监控目标。"></textarea>
        </label>

        <label class="grid gap-2 font-semibold">
          状态
          <select class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.status">
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </section>

      <div class="flex flex-wrap gap-3">
        <button class="inline-flex items-center justify-center rounded-xl bg-[#2f2618] px-4 py-2.5 text-[#fff7e7] transition-colors hover:bg-[#241d12] disabled:cursor-not-allowed disabled:opacity-60" type="submit" :disabled="saving">
          {{ saving ? "正在保存..." : "保存主题" }}
        </button>
        <button class="button secondary inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" type="button" @click="resetForm">重置</button>
      </div>
      <div v-if="statusMessage" class="text-[#6f665a]">{{ statusMessage }}</div>
    </form>
  </article>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";

const props = defineProps<{
  saving: boolean;
  statusMessage: string;
  theme: {
    name: string;
    description?: string;
    status: string;
  };
}>();

const emit = defineEmits<{
  submit: [
    payload: {
      name: string;
      description: string;
      status: string;
    },
  ];
}>();

const form = reactive({
  name: "",
  description: "",
  status: "active",
});

function applyTheme() {
  form.name = props.theme.name;
  form.description = props.theme.description ?? "";
  form.status = props.theme.status;
}

function resetForm() {
  applyTheme();
}

function submitForm() {
  emit("submit", {
    name: form.name,
    description: form.description,
    status: form.status,
  });
}

watch(
  () => props.theme,
  () => {
    applyTheme();
  },
  { immediate: true },
);
</script>
