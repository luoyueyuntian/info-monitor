<template>
  <article class="card">
    <form class="form" @submit.prevent="submitForm">
      <section class="form-section">
        <div class="section-title">
          <h3>编辑主题</h3>
          <p>修改当前主题的名称、描述和状态，保存后会立即刷新当前详情页。</p>
        </div>

        <label>
          主题名称
          <input v-model="form.name" placeholder="主题名称" />
        </label>

        <label>
          描述
          <textarea v-model="form.description" placeholder="描述当前主题的监控目标。"></textarea>
        </label>

        <label>
          状态
          <select v-model="form.status">
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </section>

      <div class="actions">
        <button class="button" type="submit" :disabled="saving">
          {{ saving ? "正在保存..." : "保存主题" }}
        </button>
        <button class="button secondary" type="button" @click="resetForm">重置</button>
      </div>
      <div v-if="statusMessage" class="muted">{{ statusMessage }}</div>
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
