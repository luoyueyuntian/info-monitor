<template>
  <article class="card">
    <form class="grid gap-4" @submit.prevent="submitForm">
      <section class="grid gap-3.5">
        <div class="grid gap-1">
          <h3>新增来源</h3>
          <p class="m-0 text-ink-body">选择来源类型，配置参数，验证后保存。</p>
        </div>

        <!-- Step 1: Choose preset -->
        <fieldset class="grid gap-2">
          <legend class="font-semibold">来源类型</legend>
          <div v-if="presetsLoading" class="text-sm text-ink-body">加载中...</div>
          <div v-else class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="preset in presetOptions"
              :key="preset.id"
              type="button"
              class="rounded-xl border px-3.5 py-3 text-left transition-colors"
              :class="selectedPresetId === preset.id ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-slate-400/20 hover:border-slate-400/40'"
              @click="selectPreset(preset.id)"
            >
              <div class="font-semibold text-sm">{{ preset.label }}</div>
              <div class="text-xs text-ink-body mt-0.5">{{ preset.description }}</div>
              <div class="text-xs text-ink-body mt-1">
                <span class="inline-block rounded bg-slate-200/60 px-1.5 py-0.5">{{ preset.sourceType }}</span>
                <span class="inline-block rounded bg-slate-200/60 px-1.5 py-0.5 ml-1">{{ preset.adapterKey || 'manual' }}</span>
              </div>
            </button>
          </div>
        </fieldset>

        <!-- Step 2: Configure source -->
        <div v-if="selectedPreset" class="grid gap-3.5">
          <label class="grid gap-2 font-semibold">
            来源名称
            <input
              class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3"
              v-model="form.name"
              :placeholder="selectedPreset.id === 'custom' ? 'My Custom Source' : selectedPreset.label"
            />
          </label>

          <!-- Preset config fields -->
          <template v-if="selectedPreset.id !== 'custom' && selectedPreset.fields.length > 0">
            <div class="grid gap-3">
              <label
                v-for="field in selectedPreset.fields"
                :key="field.key"
                class="grid gap-2 font-semibold"
              >
                {{ field.label }}
                <span v-if="field.required" class="text-xs text-red-500">*</span>
                <input
                  v-if="field.type === 'text'"
                  class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3"
                  v-model="form.configValues[field.key]"
                  :placeholder="field.placeholder"
                />
                <input
                  v-else-if="field.type === 'number'"
                  type="number"
                  class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3"
                  v-model.number="form.configValues[field.key]"
                  :placeholder="field.placeholder"
                />
                <label v-else-if="field.type === 'boolean'" class="flex items-center gap-2 font-normal">
                  <input type="checkbox" v-model="form.configValues[field.key]" />
                  <span class="text-sm">{{ field.placeholder || 'Enable' }}</span>
                </label>
              </label>
            </div>
          </template>

          <!-- Custom JSON config -->
          <template v-if="selectedPreset.id === 'custom'">
            <div class="grid two">
              <label class="grid gap-2 font-semibold">
                Source Type
                <select class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.customSourceType">
                  <option value="page_list">page_list</option>
                  <option value="api">api</option>
                  <option value="rss">rss</option>
                </select>
              </label>
              <label class="grid gap-2 font-semibold">
                Adapter Key
                <input class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.customAdapterKey" placeholder="my_adapter" />
              </label>
            </div>
            <label class="grid gap-2 font-semibold">
              Config JSON
              <textarea
                class="min-h-[120px] resize-y rounded-xl border border-slate-400/20 bg-white px-3.5 py-3"
                v-model="form.customConfigJson"
                placeholder='{"url": "https://example.com", "schedule_interval_seconds": 21600}'
              ></textarea>
            </label>
          </template>

          <!-- Help text -->
          <p v-if="selectedPreset.help" class="text-xs text-ink-body m-0">{{ selectedPreset.help }}</p>

          <!-- Onboarding status -->
          <label class="grid gap-2 font-semibold">
            初始状态
            <select class="rounded-xl border border-slate-400/20 bg-white px-3.5 py-3" v-model="form.onboardingStatus">
              <option value="draft">草稿 (Draft) — 仅保存配置，不启用</option>
              <option value="ready_to_test">待测试 (Ready to Test) — 保存并可手动触发测试</option>
              <option value="active">启用 (Active) — 保存并加入调度</option>
            </select>
          </label>

          <label class="flex items-center gap-2.5 font-semibold" v-if="form.onboardingStatus === 'active'">
            <input v-model="form.runImmediately" type="checkbox" />
            <span>保存后立即运行这个来源</span>
          </label>
        </div>
      </section>

      <!-- Step 3: Validate & Save -->
      <div class="grid gap-3" v-if="selectedPreset">
        <!-- Validation result -->
        <div v-if="validationResult" class="rounded-xl px-3.5 py-3 text-sm" :class="validationResult.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
          <div class="font-semibold">{{ validationResult.valid ? '验证通过' : '验证失败' }}</div>
          <ul v-if="validationResult.errors.length > 0" class="m-0 mt-1 pl-4">
            <li v-for="(err, i) in validationResult.errors" :key="i">{{ err }}</li>
          </ul>
          <ul v-if="validationResult.warnings.length > 0" class="m-0 mt-1 pl-4 text-amber-700">
            <li v-for="(warn, i) in validationResult.warnings" :key="i">{{ warn }}</li>
          </ul>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-xl bg-slate-200/60 px-4 py-2.5 text-ink-body transition-colors hover:bg-slate-200"
            @click="runValidation"
            :disabled="validating"
          >
            {{ validating ? "验证中..." : "验证配置" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-btn-dark px-4 py-2.5 text-ink-on-dark transition-colors hover:bg-[#241d12] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            :disabled="saving"
          >
            {{ saving ? "正在保存..." : "保存来源" }}
          </button>
          <button class="button secondary inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover" type="button" @click="resetForm">重置</button>
        </div>
        <div v-if="statusMessage" class="text-ink-body text-sm">{{ statusMessage }}</div>
      </div>
    </form>
  </article>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from "vue";
import type { SourcePreset } from "../../../sources/components/source-presets";
import { fetchSourcePresets, validateSourceConfig } from "../../../../lib/api";

const props = defineProps<{
  saving: boolean;
  statusMessage: string;
  infoType?: string;
}>();

const emit = defineEmits<{
  submit: [
    payload: {
      name: string;
      sourceType: string;
      adapterKey: string;
      config: Record<string, unknown>;
      runImmediately: boolean;
      onboardingStatus: "draft" | "ready_to_test" | "active";
    },
  ];
}>();

const presetOptions = ref<SourcePreset[]>([]);
const presetsLoading = ref(true);

function getPresetById(id: string): SourcePreset | undefined {
  return presetOptions.value.find((p) => p.id === id);
}

function buildConfigFromPreset(presetId: string, configValues: Record<string, string | number | boolean>): Record<string, unknown> {
  const preset = getPresetById(presetId);
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);
  if (presetId === "custom") return {};
  const config: Record<string, string | number | boolean> = {};
  for (const field of preset.fields) {
    const rawValue = configValues[field.key];
    if (rawValue === "" || rawValue === null || rawValue === undefined) continue;
    if (field.type === "number") { config[field.key] = Number(rawValue); continue; }
    if (field.type === "boolean") { config[field.key] = Boolean(rawValue); continue; }
    config[field.key] = String(rawValue);
  }
  return config;
}

const selectedPresetId = ref<string>("");
const selectedPreset = computed(() =>
  selectedPresetId.value ? getPresetById(selectedPresetId.value) : null,
);

const form = reactive({
  name: "",
  configValues: {} as Record<string, string | number | boolean>,
  customSourceType: "page_list",
  customAdapterKey: "",
  customConfigJson: "{}",
  runImmediately: true,
  onboardingStatus: "draft" as "draft" | "ready_to_test" | "active",
});

const validating = ref(false);
const validationResult = ref<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);

function selectPreset(presetId: string) {
  selectedPresetId.value = presetId;
  const preset = getPresetById(presetId);
  if (!preset) return;
  form.configValues = { ...preset.defaultConfig };
  form.name = "";
  form.onboardingStatus = "draft";
  validationResult.value = null;
}

async function runValidation() {
  if (!selectedPreset.value) return;

  validating.value = true;
  validationResult.value = null;

  try {
    let config: Record<string, unknown> = {};
    let adapterKey = selectedPreset.value.adapterKey;
    let sourceType = selectedPreset.value.sourceType;

    if (selectedPresetId.value === "custom") {
      adapterKey = form.customAdapterKey;
      sourceType = form.customSourceType;
      config = JSON.parse(form.customConfigJson || "{}");
    } else {
      config = buildConfigFromPreset(selectedPresetId.value, form.configValues);
    }

    const result = await validateSourceConfig({
      presetId: selectedPresetId.value,
      adapterKey,
      sourceType,
      config,
      name: form.name,
    });

    validationResult.value = result;
  } catch (err) {
    validationResult.value = {
      valid: false,
      errors: [err instanceof Error ? err.message : "Validation request failed"],
      warnings: [],
    };
  } finally {
    validating.value = false;
  }
}

function resetForm() {
  selectedPresetId.value = "";
  form.name = "";
  form.configValues = {};
  form.customSourceType = "page_list";
  form.customAdapterKey = "";
  form.customConfigJson = "{}";
  form.runImmediately = true;
  form.onboardingStatus = "draft";
  validationResult.value = null;
}

function submitForm() {
  if (!selectedPreset.value) return;

  let config: Record<string, unknown> = {};
  let adapterKey = selectedPreset.value.adapterKey;
  let sourceType = selectedPreset.value.sourceType;

  if (selectedPresetId.value === "custom") {
    adapterKey = form.customAdapterKey;
    sourceType = form.customSourceType;
    try {
      config = JSON.parse(form.customConfigJson || "{}");
    } catch {
      return;
    }
  } else {
    config = buildConfigFromPreset(selectedPresetId.value, form.configValues);
  }

  emit("submit", {
    name: form.name,
    sourceType,
    adapterKey,
    config,
    runImmediately: form.runImmediately,
    onboardingStatus: form.onboardingStatus,
  });
}

onMounted(async () => {
  try {
    const allPresets = await fetchSourcePresets();
    presetOptions.value = props.infoType
      ? allPresets.filter((p) => p.infoType === props.infoType)
      : allPresets;
  } catch (e) {
    console.error("Failed to load source presets:", e);
  } finally {
    presetsLoading.value = false;
  }
});
</script>
