<template>
  <article class="card">
    <div class="card-topline">
      <div>
        <h3>{{ compare.headline }}</h3>
        <p class="m-0 mt-2 text-ink-body">{{ compare.summary }}</p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2.5">
      <span
        v-for="stat in compare.stats"
        :key="stat"
        class="rounded-full border border-slate-400/15 bg-slate-50/90 px-3 py-1.5 text-[0.84rem] font-semibold text-[#5f574a]"
      >
        {{ stat }}
      </span>
    </div>

    <div
      v-if="compare.diagnostic"
      class="mt-4 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
    >
      <div class="flex flex-wrap items-center gap-2">
        <strong>快照判断</strong>
        <span :class="pillToneClass(compare.diagnostic.tone)">{{ compare.diagnostic.toneLabel }}</span>
      </div>
      <div class="mt-2 text-[0.98rem] font-semibold text-[#1f2937]">{{ compare.diagnostic.headline }}</div>
      <div class="mt-2 text-ink-body">{{ compare.diagnostic.summary }}</div>

      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-400/15 bg-white/70 px-3.5 py-3">
          <strong class="text-[0.92rem] text-ink-heading">当前重点</strong>
          <div class="mt-2 grid gap-2">
            <div
              v-for="item in compare.diagnostic.keyPoints"
              :key="`compare-point-${item}`"
              class="rounded-xl border border-slate-400/15 bg-slate-50/80 px-3 py-2.5 text-[0.9rem] leading-6 text-[#4b5563]"
            >
              {{ item }}
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-400/15 bg-white/70 px-3.5 py-3">
          <strong class="text-[0.92rem] text-ink-heading">建议先做</strong>
          <div class="mt-2 grid gap-2">
            <div
              v-for="item in compare.diagnostic.actions"
              :key="`compare-action-${item}`"
              class="rounded-xl border border-slate-400/15 bg-slate-50/80 px-3 py-2.5 text-[0.9rem] leading-6 text-[#4b5563]"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="compare.diagnostic.timing"
        class="mt-3 rounded-2xl border border-slate-400/15 bg-white/70 px-3.5 py-3"
      >
        <strong class="text-[0.92rem] text-ink-heading">连续快照判断</strong>
        <div class="mt-2 text-[0.96rem] font-semibold text-[#1f2937]">{{ compare.diagnostic.timing.headline }}</div>
        <div class="mt-2 text-ink-body">{{ compare.diagnostic.timing.summary }}</div>
        <div class="mt-2 grid gap-2">
          <div
            v-for="item in compare.diagnostic.timing.signals"
            :key="`compare-timing-${item}`"
            class="rounded-xl border border-slate-400/15 bg-slate-50/80 px-3 py-2.5 text-[0.9rem] leading-6 text-[#4b5563]"
          >
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="compare.items.length" class="mt-4 grid gap-3 md:grid-cols-2">
      <article
        v-for="item in compare.items"
        :key="item.sourceId"
        class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="grid gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink
                class="text-[1rem] font-semibold text-[#1f2937] transition-colors hover:text-[#111827]"
                :to="`/sources/${item.sourceId}`"
              >
                {{ item.sourceName }}
              </RouterLink>
              <span :class="pillToneClass(item.sourceStatus)">{{ sourceHealthLabel(item.sourceStatus) }}</span>
              <span
                v-if="item.badge"
                class="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[0.8rem] font-semibold text-[#6a4b14]"
              >
                {{ item.badge }}
              </span>
            </div>
            <span class="text-[0.88rem] text-ink-secondary">{{ formatDateTimeLabel(item.latestRecordAt) }}</span>
          </div>

          <a
            v-if="item.recordLink"
            class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
            :href="item.recordLink"
            target="_blank"
            rel="noreferrer"
          >
            打开原始来源
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </a>
        </div>

        <div class="mt-3 grid gap-2">
          <strong class="text-[1.02rem] text-[#1f2937]">{{ item.primaryValue }}</strong>
          <div v-if="item.secondaryValue" class="text-[0.92rem] text-[#5f574a]">{{ item.secondaryValue }}</div>
          <div v-if="item.tertiaryValue" class="text-[0.9rem] text-ink-secondary">{{ item.tertiaryValue }}</div>
          <div v-if="item.deltaLabel" class="text-[0.88rem] font-semibold text-ink-link">{{ item.deltaLabel }}</div>
          <div
            v-if="item.trendPoints.length"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5"
          >
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span class="text-[0.84rem] font-semibold text-ink-heading">{{ item.trendLabel }}</span>
              <span class="text-[0.84rem] text-ink-secondary">{{ item.trendDeltaLabel }}</span>
            </div>
            <svg viewBox="0 0 144 64" class="h-16 w-full">
              <polyline
                :points="item.trendPoints.map((point) => `${point.x},${point.y}`).join(' ')"
                fill="none"
                stroke="#8a5b1f"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
              />
              <circle
                v-for="point in item.trendPoints"
                :key="`${item.sourceId}-${point.label}`"
                :cx="point.x"
                :cy="point.y"
                r="2.8"
                fill="#8a5b1f"
              />
            </svg>
            <div class="mt-1 flex items-center justify-between text-[0.78rem] text-ink-secondary">
              <span>{{ item.trendPoints[0]?.label }}</span>
              <span>{{ item.trendPoints[item.trendPoints.length - 1]?.label }}</span>
            </div>
          </div>
          <div
            v-if="item.summary"
            class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 text-[0.9rem] leading-6 text-[#4b5563]"
          >
            {{ item.summary }}
          </div>
        </div>
      </article>
    </div>

    <div v-else class="mt-4 rounded-2xl bg-slate-100/90 p-4 text-ink-body">
      这个主题当前还没有可用于跨来源比较的记录。
    </div>
  </article>
</template>

<script setup lang="ts">
import { formatDateTimeLabel, pillToneClass, sourceHealthLabel } from "../../../../lib/presentation";
import type { ThemeSourceCompareData } from "./theme-detail-source-compare";

defineProps<{
  compare: ThemeSourceCompareData;
}>();
</script>
