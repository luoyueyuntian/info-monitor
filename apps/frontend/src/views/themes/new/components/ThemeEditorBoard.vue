<template>
  <section class="page">
    <header class="page-header">
      <div class="page-header-bar">
        <button class="back-icon-button" type="button" aria-label="返回上一级" @click="handleBack">
          <span aria-hidden="true">‹</span>
        </button>
        <nav class="breadcrumb" aria-label="面包屑">
          <RouterLink to="/themes">主题中心</RouterLink>
          <span class="breadcrumb-divider">/</span>
          <span>新增主题</span>
        </nav>
      </div>
      <h2>New Theme</h2>
      <p>Create a long-running topic using a preset for the real sources we have already wired up.</p>
    </header>

    <article class="card">
      <form class="form" @submit.prevent="handleSubmit">
        <section class="form-section">
          <div class="section-title">
            <h3>Preset</h3>
            <p>Choose a source template, then adjust the fields below if needed.</p>
          </div>

          <div class="preset-grid">
            <label
              v-for="preset in presetOptions"
              :key="preset.id"
              class="preset-option"
              :class="{ active: form.presetId === preset.id }"
            >
              <div class="preset-head">
                <input v-model="form.presetId" type="radio" :value="preset.id" />
                <div class="preset-copy">
                  <strong>{{ preset.label }}</strong>
                  <p>{{ preset.description }}</p>
                </div>
              </div>
              <div class="meta">
                {{ preset.themeType }} · {{ preset.infoType }} · {{ preset.sourceType }}
              </div>
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <h3>Theme</h3>
            <p>These fields define the long-running topic that will appear in your workspace.</p>
          </div>

          <label>
            Theme Name
            <input v-model="form.name" placeholder="Surface Pro 8 16G + 512G Price" />
          </label>

          <div class="grid two">
            <label>
              Theme Type
              <select v-model="form.themeType">
                <option value="price">price</option>
                <option value="financial_event">financial_event</option>
                <option value="news_announcement">news_announcement</option>
                <option value="content_update">content_update</option>
              </select>
            </label>

            <label>
              Info Type
              <select v-model="form.infoType">
                <option value="price">price</option>
                <option value="financial_event">financial_event</option>
                <option value="news_announcement">news_announcement</option>
                <option value="content_update">content_update</option>
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea v-model="form.description" placeholder="Describe what the theme should monitor."></textarea>
          </label>
        </section>

        <section class="form-section">
          <div class="section-title">
            <h3>Source</h3>
            <p>Define the first source attached to this theme.</p>
          </div>

          <label>
            Source Name
            <input v-model="form.sourceName" placeholder="Xianyu Search Results" />
          </label>

          <div class="grid two">
            <label>
              Source Type
              <select v-model="form.sourceType">
                <option value="page_list">page_list</option>
                <option value="api">api</option>
                <option value="rss">rss</option>
              </select>
            </label>

            <label>
              Adapter Key
              <input v-model="form.adapterKey" placeholder="demo_price_feed" />
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <h3>Adapter Config</h3>
            <p>{{ activePreset.description }}</p>
          </div>

          <template v-if="activePreset.id !== 'custom'">
            <div class="grid two">
              <template v-for="field in activePreset.fields" :key="field.key">
                <label v-if="field.type !== 'boolean'">
                  {{ field.label }}
                  <input
                    v-model="form.config[field.key]"
                    :placeholder="field.placeholder ?? ''"
                    :type="field.type === 'number' ? 'number' : 'text'"
                  />
                </label>
                <label v-else class="checkbox-row">
                  <input v-model="form.config[field.key]" type="checkbox" />
                  <span>{{ field.label }}</span>
                </label>
              </template>
            </div>
            <p v-if="activePreset.help" class="helper-text">{{ activePreset.help }}</p>
          </template>

          <template v-else>
            <p class="helper-text">
              Custom mode keeps the form flexible, but you need to know the adapter and config shape.
            </p>
            <label>
              Config JSON
              <textarea
                v-model="form.customConfigJson"
                placeholder='{"path": "/example", "schedule_interval_seconds": 3600}'
              ></textarea>
            </label>
          </template>
        </section>

        <section class="form-section">
          <div class="section-title">
            <h3>Run Behavior</h3>
            <p>Choose whether the first source should be queued immediately after the theme is created.</p>
          </div>

          <label class="checkbox-row">
            <input v-model="form.runImmediately" type="checkbox" />
            <span>Run the first source immediately after save</span>
          </label>
        </section>

        <div class="actions">
          <button class="button" type="submit" :disabled="submitting">
            {{ submitting ? "Saving..." : "Save Theme" }}
          </button>
          <button class="button secondary" type="button" @click="handleCancel">Cancel</button>
        </div>
        <div v-if="status" class="muted">{{ status }}</div>
      </form>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { createTheme } from "../../../../lib/api";
import {
  buildThemePresetFormState,
  buildThemeSourceConfig,
  getThemePresetById,
  themePresetOptions,
  type ThemePreset,
} from "./theme-editor-presets";

const router = useRouter();
const status = ref("");
const submitting = ref(false);

const presetOptions: ThemePreset[] = themePresetOptions;

const form = reactive({
  presetId: "demo-price-feed",
  name: "",
  infoType: "price",
  themeType: "price",
  description: "",
  runImmediately: true,
  sourceName: "",
  sourceType: "page_list",
  adapterKey: "demo_price_feed",
  config: {} as Record<string, string | number | boolean>,
  customConfigJson: "{}",
});

const activePreset = computed(() => getThemePresetById(form.presetId));

function applyPreset(presetId: string) {
  const presetState = buildThemePresetFormState(presetId);

  form.themeType = presetState.themeType;
  form.infoType = presetState.infoType;
  form.name = presetState.name;
  form.description = presetState.description;
  form.sourceName = presetState.sourceName;
  form.sourceType = presetState.sourceType;
  form.adapterKey = presetState.adapterKey;
  form.config = presetState.config;
  form.customConfigJson = presetState.customConfigJson;
}

watch(
  () => form.presetId,
  (presetId) => {
    applyPreset(presetId);
  },
  { immediate: true },
);

function buildSourceConfig() {
  return buildThemeSourceConfig(form.presetId, form.customConfigJson, form.config);
}

function handleCancel() {
  void router.push("/themes");
}

function handleBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  void router.push("/themes");
}

async function handleSubmit() {
  status.value = "";
  submitting.value = true;

  try {
    const created = await createTheme({
      name: form.name,
      themeType: form.themeType,
      infoType: form.infoType,
      description: form.description,
      runImmediately: form.runImmediately,
      sources: form.sourceName
        ? [
            {
              name: form.sourceName,
              sourceType: form.sourceType,
              adapterKey: form.adapterKey,
              config: buildSourceConfig(),
            },
          ]
        : [],
    });

    const queuedCount = created.queuedSourceIds.length;
    await router.push({
      path: `/themes/${created.id}`,
      query: queuedCount > 0 ? { queued: "1", queuedSources: String(queuedCount) } : {},
    });
  } catch (error) {
    status.value = error instanceof Error ? error.message : "Failed to create theme.";
  } finally {
    submitting.value = false;
  }
}
</script>
