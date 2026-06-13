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
      <form class="grid gap-4" @submit.prevent="handleSubmit">
        <section class="grid gap-3.5">
          <div class="grid gap-1">
            <h3>Preset</h3>
            <p class="m-0 text-ink-body">Choose a source template, then adjust the fields below if needed.</p>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label
              v-for="preset in presetOptions"
              :key="preset.id"
              class="grid gap-2 rounded-2xl border p-3.5"
              :class="form.presetId === preset.id ? 'border-slate-500/35 bg-slate-200/80' : 'border-slate-400/20 bg-slate-50/85'"
            >
              <div class="flex items-start gap-2.5">
                <input v-model="form.presetId" type="radio" :value="preset.id" />
                <div>
                  <strong class="mb-1 block">{{ preset.label }}</strong>
                  <p class="m-0 leading-[1.45] text-[#6d6659]">{{ preset.description }}</p>
                </div>
              </div>
              <div class="text-[0.88rem] text-ink-secondary">
                {{ preset.themeType }} · {{ preset.infoType }} · {{ preset.sourceType }}
              </div>
            </label>
          </div>
        </section>

        <section class="grid gap-3.5">
          <div class="grid gap-1">
            <h3 class="m-0 text-base font-semibold">Theme</h3>
            <p class="m-0 text-ink-body">These fields define the long-running topic that will appear in your workspace.</p>
          </div>

          <label class="grid gap-2 font-semibold">
            Theme Name
            <input class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.name" placeholder="Surface Pro 8 16G + 512G Price" />
          </label>

          <div class="grid two">
            <label class="grid gap-2 font-semibold">
              Theme Type
              <select class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.themeType">
                <option value="price">price</option>
                <option value="financial_event">financial_event</option>
                <option value="news_announcement">news_announcement</option>
                <option value="content_update">content_update</option>
              </select>
            </label>

            <label class="grid gap-2 font-semibold">
              Info Type
              <select class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.infoType">
                <option value="price">price</option>
                <option value="financial_event">financial_event</option>
                <option value="news_announcement">news_announcement</option>
                <option value="content_update">content_update</option>
              </select>
            </label>
          </div>

          <label class="grid gap-2 font-semibold">
            Description
            <textarea class="min-h-[120px] resize-y rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.description" placeholder="Describe what the theme should monitor."></textarea>
          </label>
        </section>

        <section class="grid gap-3.5">
          <div class="grid gap-1">
            <h3 class="m-0 text-base font-semibold">Source</h3>
            <p class="m-0 text-ink-body">Define the first source attached to this theme.</p>
          </div>

          <label class="grid gap-2 font-semibold">
            Source Name
            <input class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.sourceName" placeholder="Xianyu Search Results" />
          </label>

          <div class="grid two">
            <label class="grid gap-2 font-semibold">
              Source Type
              <select class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.sourceType">
                <option value="page_list">page_list</option>
                <option value="api">api</option>
                <option value="rss">rss</option>
              </select>
            </label>

            <label class="grid gap-2 font-semibold">
              Adapter Key
              <input class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.adapterKey" placeholder="demo_price_feed" />
            </label>
          </div>
        </section>

        <section class="grid gap-3.5">
          <div class="grid gap-1">
            <h3 class="m-0 text-base font-semibold">Adapter Config</h3>
            <p class="m-0 text-ink-body">{{ activePreset.description }}</p>
          </div>

          <template v-if="activePreset.id !== 'custom'">
            <div class="grid two">
              <template v-for="field in activePreset.fields" :key="field.key">
                <label v-if="field.type !== 'boolean'" class="grid gap-2 font-semibold">
                  {{ field.label }}
                  <input
                    class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3"
                    v-model="form.config[field.key]"
                    :placeholder="field.placeholder ?? ''"
                    :type="field.type === 'number' ? 'number' : 'text'"
                  />
                </label>
                <label v-else class="flex items-center gap-2.5 font-semibold">
                  <input v-model="form.config[field.key]" type="checkbox" />
                  <span>{{ field.label }}</span>
                </label>
              </template>
            </div>
            <p v-if="activePreset.help" class="m-0 text-[0.9rem] leading-[1.5] text-[#746a5d]">{{ activePreset.help }}</p>
          </template>

          <template v-else>
            <p class="m-0 text-[0.9rem] leading-[1.5] text-[#746a5d]">
              Custom mode keeps the form flexible, but you need to know the adapter and config shape.
            </p>
            <label class="grid gap-2 font-semibold">
              Config JSON
              <textarea
                class="min-h-[120px] resize-y rounded-xl border border-slate-400/20 bg-white px-3.5 py-3"
                v-model="form.customConfigJson"
                placeholder='{"path": "/example", "schedule_interval_seconds": 3600}'
              ></textarea>
            </label>
          </template>
        </section>

        <section class="grid gap-3.5">
          <div class="grid gap-1">
            <h3 class="m-0 text-base font-semibold">Run Behavior</h3>
            <p class="m-0 text-ink-body">Choose whether the first source should be queued immediately after the theme is created.</p>
          </div>

          <label class="flex items-center gap-2.5 font-semibold">
            <input v-model="form.runImmediately" type="checkbox" />
            <span>Run the first source immediately after save</span>
          </label>
        </section>

        <div class="flex flex-wrap gap-3">
          <button class="inline-flex items-center justify-center rounded-xl bg-btn-dark px-4 py-2.5 text-ink-on-dark transition-colors hover:bg-[#241d12] disabled:cursor-not-allowed disabled:opacity-60" type="submit" :disabled="submitting">
            {{ submitting ? "Saving..." : "Save Theme" }}
          </button>
          <button class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" type="button" @click="handleCancel">Cancel</button>
        </div>
        <div v-if="status" class="text-ink-body">{{ status }}</div>
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

const activePreset = computed(() => getThemePresetById(form.presetId) ?? themePresetOptions[0]);

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
