# Competitor Watch Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `competitor-watch` into a dedicated competitor-intelligence workspace with custom dashboard, actions, and topics views built on current frontend data and mock fixtures.

**Architecture:** Keep the current API and workspace dataset flow intact, then add a competitor-specific intelligence layer that derives object names, action types, pulses, focus objects, and topic cards from existing `theme/event/source` data. Register three competitor-specific section boards through `section-resolver.ts`, while leaving `sources` and `reports` on shared implementations.

**Tech Stack:** Vue 3, Vue Router, TypeScript, Vitest, Vue Test Utils

---

### Task 1: Build The Competitor Intelligence Helper

**Files:**
- Create: `apps/frontend/src/workspaces/competitor-watch/intelligence.ts`
- Create: `apps/frontend/src/workspaces/competitor-watch/intelligence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { fallbackEvents, fallbackSources, fallbackThemes } from "../../lib/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../lib/workspaces";
import {
  buildCompetitorActionBuckets,
  buildCompetitorFocusList,
  buildCompetitorPulse,
  buildCompetitorTopicCards,
  resolveCompetitorActionType,
  resolveCompetitorObjectName,
} from "./intelligence";

describe("competitor workspace intelligence", () => {
  const dataset = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);
  const nowValue = workspaceReferenceNow(dataset);
  const figmaEvent = dataset.events.find((event) => event.themeName === "Figma Product Updates");
  const figmaTheme = dataset.themes.find((theme) => theme.name === "Figma Product Updates");

  it("resolves object names and action types from structured content update fields", () => {
    expect(figmaEvent).toBeTruthy();
    expect(figmaTheme).toBeTruthy();
    expect(resolveCompetitorObjectName(figmaEvent!, figmaTheme!)).toBe("Figma");
    expect(resolveCompetitorActionType(figmaEvent!)).toBe("feature_release");
  });

  it("builds dashboard pulse and focus data from current competitor events", () => {
    expect(buildCompetitorPulse(dataset, nowValue).map((item) => item.actionType)).toContain("feature_release");
    expect(buildCompetitorFocusList(dataset, nowValue)[0]?.objectName).toBe("Figma");
  });

  it("builds action buckets and topic cards with workspace recommendations", () => {
    expect(buildCompetitorActionBuckets(dataset, nowValue).find((bucket) => bucket.actionType === "feature_release")?.events.length).toBeGreaterThan(0);
    expect(buildCompetitorTopicCards(dataset, nowValue).find((card) => card.theme.name === "Figma Product Updates")?.recommendation).toContain("待判断");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/workspaces/competitor-watch/intelligence.test.ts`
Expected: FAIL because `apps/frontend/src/workspaces/competitor-watch/intelligence.ts` does not exist yet

- [ ] **Step 3: Write minimal implementation**

Create `apps/frontend/src/workspaces/competitor-watch/intelligence.ts` with typed, deterministic helpers:

```ts
import type { EventSummary, ThemeSummary } from "../../lib/api";
import {
  scoreWorkspaceEventPriority,
  sortWorkspaceEvents,
  type WorkspaceDataset,
} from "../../lib/workspaces";

export type CompetitorActionType =
  | "feature_release"
  | "pricing_packaging"
  | "campaign_content"
  | "docs_support"
  | "other";

export function resolveCompetitorObjectName(event: EventSummary, theme?: ThemeSummary | null) {
  const objectName = typeof event.context?.object_name === "string" ? event.context.object_name.trim() : "";
  return objectName || theme?.name || event.themeName;
}

export function resolveCompetitorActionType(event: EventSummary): CompetitorActionType {
  const structured = typeof event.context?.update_type === "string" ? event.context.update_type : "";
  if (structured === "feature_release") return "feature_release";

  const text = `${event.title} ${event.summary}`.toLowerCase();
  if (/(feature|release|version|update|dev mode|changelog)/i.test(text)) return "feature_release";
  if (/(pricing|plan|package|enterprise|billing)/i.test(text)) return "pricing_packaging";
  if (/(campaign|activity|launch|social|content|marketing)/i.test(text)) return "campaign_content";
  if (/(help|docs|guide|support|faq)/i.test(text)) return "docs_support";
  return "other";
}

export function buildCompetitorPulse(dataset: WorkspaceDataset, nowValue: Date) {
  return ["feature_release", "pricing_packaging", "campaign_content", "docs_support", "other"].map((actionType) => ({
    actionType: actionType as CompetitorActionType,
    count: dataset.events.filter((event) => resolveCompetitorActionType(event) === actionType).length,
    openCount: dataset.events.filter((event) => resolveCompetitorActionType(event) === actionType && (event.status ?? "open") === "open").length,
  })).filter((item) => item.count > 0);
}

export function buildCompetitorFocusList(dataset: WorkspaceDataset, nowValue: Date) {
  const themeById = new Map(dataset.themes.map((theme) => [theme.id, theme]));
  const byObject = new Map<string, { objectName: string; eventCount: number; openCount: number; latestOccurredAt: string | null }>();

  for (const event of dataset.events) {
    const objectName = resolveCompetitorObjectName(event, themeById.get(event.themeId));
    const current = byObject.get(objectName) ?? { objectName, eventCount: 0, openCount: 0, latestOccurredAt: null };
    current.eventCount += 1;
    if ((event.status ?? "open") === "open") current.openCount += 1;
    if (!current.latestOccurredAt || new Date(event.occurredAt).getTime() > new Date(current.latestOccurredAt).getTime()) {
      current.latestOccurredAt = event.occurredAt;
    }
    byObject.set(objectName, current);
  }

  return [...byObject.values()].sort((left, right) => right.eventCount - left.eventCount);
}

export function buildCompetitorActionBuckets(dataset: WorkspaceDataset, nowValue: Date) {
  const sorted = sortWorkspaceEvents(dataset.events);
  return ["feature_release", "pricing_packaging", "campaign_content", "docs_support", "other"].map((actionType) => ({
    actionType: actionType as CompetitorActionType,
    events: sorted.filter((event) => resolveCompetitorActionType(event) === actionType),
  })).filter((bucket) => bucket.events.length > 0);
}

export function buildCompetitorTopicCards(dataset: WorkspaceDataset, nowValue: Date) {
  return dataset.themes.map((theme) => {
    const themeEvents = dataset.events.filter((event) => event.themeId === theme.id);
    const themeSources = dataset.sources.filter((source) => source.themeId === theme.id);
    const latestEvent = sortWorkspaceEvents(themeEvents)[0] ?? null;
    const openCount = themeEvents.filter((event) => (event.status ?? "open") === "open").length;
    const trackingCount = themeEvents.filter((event) => event.status === "tracking").length;

    return {
      theme,
      objectName: latestEvent ? resolveCompetitorObjectName(latestEvent, theme) : theme.name,
      latestActionType: latestEvent ? resolveCompetitorActionType(latestEvent) : "other",
      latestOccurredAt: latestEvent?.occurredAt ?? theme.latestEventAt ?? null,
      openCount,
      trackingCount,
      sourceCount: themeSources.length,
      recommendation: theme.sourceHealth === "warning"
        ? "优先验证来源，再继续基于这个对象做判断。"
        : openCount > 0
          ? "当前仍有待判断动作，建议先完成首轮分诊。"
          : trackingCount > 0
            ? "这个对象已经进入持续跟踪，适合结合时间线低频回看。"
            : "当前节奏稳定，可以继续观察下一轮动作。",
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/workspaces/competitor-watch/intelligence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/workspaces/competitor-watch/intelligence.ts apps/frontend/src/workspaces/competitor-watch/intelligence.test.ts
git commit -m "feat: add competitor workspace intelligence helpers"
```

### Task 2: Register Competitor-Specific Workspace Sections

**Files:**
- Modify: `apps/frontend/src/workspaces/section-resolver.ts`
- Modify: `apps/frontend/src/workspaces/section-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

Update `apps/frontend/src/workspaces/section-resolver.test.ts` so it expects:

```ts
it("resolves competitor-watch sections to competitor-specific views where registered", () => {
  expect(resolveWorkspaceSectionViewId("competitor-watch", "dashboard")).toBe("competitor-watch/dashboard");
  expect(resolveWorkspaceSectionViewId("competitor-watch", "actions")).toBe("competitor-watch/actions");
  expect(resolveWorkspaceSectionViewId("competitor-watch", "topics")).toBe("competitor-watch/topics");
  expect(resolveWorkspaceSectionViewId("competitor-watch", "sources")).toBe("shared/sources");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/workspaces/section-resolver.test.ts`
Expected: FAIL because competitor-specific view IDs are not registered yet

- [ ] **Step 3: Write minimal implementation**

Extend `apps/frontend/src/workspaces/section-resolver.ts` with new IDs, overrides, and lazy imports:

```ts
export type WorkspaceSectionViewId =
  | "shared/actions"
  | "shared/dashboard"
  | "shared/reports"
  | "shared/sources"
  | "shared/topics"
  | "competitor-watch/actions"
  | "competitor-watch/dashboard"
  | "competitor-watch/topics"
  | "stock-market/actions"
  | "stock-market/dashboard"
  | "stock-market/reports"
  | "stock-market/topics";

const workspaceSectionOverrides = {
  "competitor-watch": {
    actions: "competitor-watch/actions",
    dashboard: "competitor-watch/dashboard",
    topics: "competitor-watch/topics",
  },
  "stock-market": {
    actions: "stock-market/actions",
    dashboard: "stock-market/dashboard",
    reports: "stock-market/reports",
    topics: "stock-market/topics",
  },
} satisfies Partial<Record<WorkspaceId, Partial<Record<WorkspaceSectionId, WorkspaceSectionViewId>>>>;

const sectionComponents = {
  "competitor-watch/actions": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/actions/components/CompetitorWatchActionsBoard.vue")),
  "competitor-watch/dashboard": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/dashboard/components/CompetitorWatchDashboardBoard.vue")),
  "competitor-watch/topics": defineAsyncComponent(() => import("../views/workspace/[workspaceId]/topics/components/CompetitorWatchTopicsBoard.vue")),
  // keep existing shared and stock-market entries
} satisfies Record<WorkspaceSectionViewId, Component>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/workspaces/section-resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/workspaces/section-resolver.ts apps/frontend/src/workspaces/section-resolver.test.ts
git commit -m "feat: register competitor workspace boards"
```

### Task 3: Build The Competitor Dashboard Board

**Files:**
- Create: `apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/CompetitorWatchDashboardBoard.vue`
- Create: `apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/competitor-watch-dashboard-board.test.ts`

- [ ] **Step 1: Write the failing test**

Create a lightweight dashboard smoke test:

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchDashboardBoard from "./CompetitorWatchDashboardBoard.vue";
import { fallbackEvents, fallbackSources, fallbackThemes } from "../../../../../lib/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../../../../lib/workspaces";

const dataset = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);

vi.mock("../../../shared/useWorkspaceData", () => ({
  useWorkspaceData: () => ({
    workspace: computed(() => dataset.workspace),
    dataset: computed(() => dataset),
    referenceNow: computed(() => workspaceReferenceNow(dataset)),
    load: vi.fn(),
  }),
}));

describe("CompetitorWatchDashboardBoard", () => {
  it("renders competitor radar sections", () => {
    const wrapper = mount(CompetitorWatchDashboardBoard, {
      global: {
        stubs: { RouterLink: { template: "<a><slot /></a>" } },
      },
    });

    expect(wrapper.text()).toContain("竞品动作雷达");
    expect(wrapper.text()).toContain("动作脉冲");
    expect(wrapper.text()).toContain("活跃观察对象");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/competitor-watch-dashboard-board.test.ts`
Expected: FAIL because the competitor dashboard board does not exist yet

- [ ] **Step 3: Write minimal implementation**

Create a dedicated board that reuses workspace data and the intelligence helper:

```vue
<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#172a1f_0%,#1e4632_48%,#305f43_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.18)]">
      <div class="grid gap-3">
        <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
          竞品动作雷达
        </div>
        <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">最近哪些对象在连续出招</h2>
        <p class="m-0 max-w-[58rem] text-[0.98rem] leading-7 text-white/72">
          从发版、定价、活动和文档动作里快速判断哪些变化值得继续跟踪，哪些来源需要先验证。
        </p>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article v-for="metric in metrics" :key="metric.label" class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.7rem] font-semibold text-ink-heading">{{ metric.value }}</div>
        <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ metric.description }}</div>
      </article>
    </section>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.48fr)_minmax(340px,0.9fr)]">
      <section class="grid gap-4">
        <article class="card">
          <div class="card-topline"><h3>动作脉冲</h3><span class="text-[0.88rem] text-ink-secondary">按动作类型聚合</span></div>
          <div class="grid gap-3">
            <div v-for="item in pulse" :key="item.actionType" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4">
              <div class="font-semibold text-ink-heading">{{ actionTypeLabel(item.actionType) }}</div>
              <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">累计 {{ item.count }} 条动作，其中 {{ item.openCount }} 条仍待判断。</div>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-topline"><h3>高优先级动作</h3><span class="text-[0.88rem] text-ink-secondary">优先判断影响范围</span></div>
          <RouterLink v-for="event in priorityEvents" :key="event.id" :to="`/workspace/${workspace.id}/actions/${event.id}`" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white">
            <div class="font-semibold text-ink-heading">{{ event.title }}</div>
            <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ event.summary }}</div>
          </RouterLink>
        </article>
      </section>

      <aside class="grid gap-4">
        <article class="card">
          <div class="card-topline"><h3>活跃观察对象</h3><span class="text-[0.88rem] text-ink-secondary">最近谁动作最多</span></div>
          <div class="grid gap-3">
            <div v-for="item in focusObjects" :key="item.objectName" class="rounded-2xl bg-slate-50/90 px-4 py-4">
              <div class="font-semibold text-ink-heading">{{ item.objectName }}</div>
              <div class="mt-2 text-[0.9rem] leading-6 text-ink-body">{{ item.eventCount }} 条动作，{{ item.openCount }} 条待判断。</div>
            </div>
          </div>
        </article>
      </aside>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/competitor-watch-dashboard-board.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/CompetitorWatchDashboardBoard.vue apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/competitor-watch-dashboard-board.test.ts
git commit -m "feat: add competitor workspace dashboard board"
```

### Task 4: Build The Competitor Actions Board

**Files:**
- Create: `apps/frontend/src/views/workspace/[workspaceId]/actions/components/CompetitorWatchActionsBoard.vue`
- Create: `apps/frontend/src/views/workspace/[workspaceId]/actions/components/competitor-watch-actions-board.test.ts`

- [ ] **Step 1: Write the failing test**

Create a focused test that proves grouped competitor buckets render:

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchActionsBoard from "./CompetitorWatchActionsBoard.vue";
import { fallbackEvents, fallbackSources, fallbackThemes } from "../../../../../lib/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../../../../lib/workspaces";

const dataset = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);

vi.mock("../../../../../lib/api", () => ({
  updateEventStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../shared/useWorkspaceData", () => ({
  useWorkspaceData: () => ({
    workspace: computed(() => dataset.workspace),
    dataset: computed(() => dataset),
    referenceNow: computed(() => workspaceReferenceNow(dataset)),
    load: vi.fn(),
  }),
}));

describe("CompetitorWatchActionsBoard", () => {
  it("renders competitor action groupings and object labels", () => {
    const wrapper = mount(CompetitorWatchActionsBoard, {
      global: {
        stubs: { RouterLink: { template: "<a><slot /></a>" } },
      },
    });

    expect(wrapper.text()).toContain("竞品分诊台");
    expect(wrapper.text()).toContain("功能与版本");
    expect(wrapper.text()).toContain("Figma");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/views/workspace/[workspaceId]/actions/components/competitor-watch-actions-board.test.ts`
Expected: FAIL because the competitor actions board does not exist yet

- [ ] **Step 3: Write minimal implementation**

Create a custom actions board that keeps shared filters/status mutations but renders grouped competitor buckets:

```vue
<template>
  <div v-if="workspace" class="page">
    <WorkspacePageHeader
      :workspace="workspace"
      title="竞品分诊台"
      description="先判断这次变化属于发版、定价、活动还是文档动作，再决定继续跟踪还是先搁置。"
    />

    <section class="card">
      <div class="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(180px,1fr))]">
        <input v-model="query" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5" placeholder="搜索对象、标题或摘要..." />
        <select v-model="priorityFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">...</select>
        <select v-model="statusFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">...</select>
        <select v-model="readFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">...</select>
      </div>
    </section>

    <section class="grid gap-4">
      <article v-for="bucket in visibleBuckets" :key="bucket.actionType" class="card">
        <div class="card-topline">
          <h3>{{ actionTypeSectionLabel(bucket.actionType) }}</h3>
          <span class="text-[0.88rem] text-ink-secondary">{{ bucket.events.length }} 条</span>
        </div>
        <div class="grid gap-3">
          <div v-for="event in bucket.events" :key="event.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <span :class="pillToneClass(priorityMeta(event).tone)">{{ priorityMeta(event).label }}</span>
              <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            </div>
            <div class="mt-3 font-semibold text-ink-heading">{{ resolveObjectName(event) }}</div>
            <div class="mt-1 text-[0.88rem] text-ink-secondary">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt, referenceNow) }}</div>
            <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ event.summary }}</div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/views/workspace/[workspaceId]/actions/components/competitor-watch-actions-board.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/views/workspace/[workspaceId]/actions/components/CompetitorWatchActionsBoard.vue apps/frontend/src/views/workspace/[workspaceId]/actions/components/competitor-watch-actions-board.test.ts
git commit -m "feat: add competitor workspace actions board"
```

### Task 5: Build The Competitor Topics Board

**Files:**
- Create: `apps/frontend/src/views/workspace/[workspaceId]/topics/components/CompetitorWatchTopicsBoard.vue`
- Create: `apps/frontend/src/views/workspace/[workspaceId]/topics/components/competitor-watch-topics-board.test.ts`

- [ ] **Step 1: Write the failing test**

Create a topics board test that verifies grouped cards and recommendations:

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchTopicsBoard from "./CompetitorWatchTopicsBoard.vue";
import { fallbackEvents, fallbackSources, fallbackThemes } from "../../../../../lib/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../../../../lib/workspaces";

const dataset = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);

vi.mock("../../../shared/useWorkspaceData", () => ({
  useWorkspaceData: () => ({
    workspace: computed(() => dataset.workspace),
    dataset: computed(() => dataset),
    referenceNow: computed(() => workspaceReferenceNow(dataset)),
    load: vi.fn(),
  }),
}));

describe("CompetitorWatchTopicsBoard", () => {
  it("renders competitor profile groupings and observation recommendations", () => {
    const wrapper = mount(CompetitorWatchTopicsBoard, {
      global: {
        stubs: { RouterLink: { template: "<a><slot /></a>" } },
      },
    });

    expect(wrapper.text()).toContain("竞品画像墙");
    expect(wrapper.text()).toContain("高频变化对象");
    expect(wrapper.text()).toContain("待判断");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/views/workspace/[workspaceId]/topics/components/competitor-watch-topics-board.test.ts`
Expected: FAIL because the competitor topics board does not exist yet

- [ ] **Step 3: Write minimal implementation**

Create a grouped topic wall that consumes `buildCompetitorTopicCards()`:

```vue
<template>
  <div v-if="workspace" class="page">
    <section class="mb-5 rounded-[28px] border border-slate-400/15 bg-[linear-gradient(135deg,#13283a_0%,#244c56_50%,#3f6c55_100%)] px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]">
      <div class="grid gap-3">
        <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-white/82">
          竞品画像墙
        </div>
        <h2 class="m-0 text-[2rem] font-semibold tracking-[-0.03em] text-white">把单次变化沉淀成长期观察对象</h2>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article v-for="metric in metrics" :key="metric.label" class="card">
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ metric.label }}</div>
        <div class="mt-3 text-[1.6rem] font-semibold text-ink-heading">{{ metric.value }}</div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <article class="card">
        <div class="card-topline"><h3>高频变化对象</h3><span class="text-[0.88rem] text-ink-secondary">{{ highFrequencyCards.length }} 个</span></div>
        <RouterLink v-for="card in highFrequencyCards" :key="card.theme.id" :to="`/workspace/${workspace.id}/topics/${card.theme.id}`" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-4 transition-colors hover:bg-white">
          <div class="font-semibold text-ink-heading">{{ card.objectName }}</div>
          <div class="mt-2 text-[0.92rem] leading-6 text-ink-body">{{ card.recommendation }}</div>
        </RouterLink>
      </article>
    </section>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/views/workspace/[workspaceId]/topics/components/competitor-watch-topics-board.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/views/workspace/[workspaceId]/topics/components/CompetitorWatchTopicsBoard.vue apps/frontend/src/views/workspace/[workspaceId]/topics/components/competitor-watch-topics-board.test.ts
git commit -m "feat: add competitor workspace topics board"
```

### Task 6: Verify The Competitor Workspace End-To-End Frontend Surface

**Files:**
- Verify only

- [ ] **Step 1: Run targeted competitor workspace tests**

Run: `npm --workspace @info-monitor/frontend test -- apps/frontend/src/workspaces/competitor-watch/intelligence.test.ts apps/frontend/src/workspaces/section-resolver.test.ts apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/competitor-watch-dashboard-board.test.ts apps/frontend/src/views/workspace/[workspaceId]/actions/components/competitor-watch-actions-board.test.ts apps/frontend/src/views/workspace/[workspaceId]/topics/components/competitor-watch-topics-board.test.ts`
Expected: PASS

- [ ] **Step 2: Run frontend typecheck**

Run: `npm --workspace @info-monitor/frontend typecheck`
Expected: PASS

- [ ] **Step 3: Run frontend build**

Run: `npm --workspace @info-monitor/frontend build`
Expected: PASS

- [ ] **Step 4: Commit the finished workspace slice**

```bash
git add apps/frontend/src/workspaces/competitor-watch apps/frontend/src/workspaces/section-resolver.ts apps/frontend/src/workspaces/section-resolver.test.ts apps/frontend/src/views/workspace/[workspaceId]/dashboard/components/CompetitorWatchDashboardBoard.vue apps/frontend/src/views/workspace/[workspaceId]/actions/components/CompetitorWatchActionsBoard.vue apps/frontend/src/views/workspace/[workspaceId]/topics/components/CompetitorWatchTopicsBoard.vue
git commit -m "feat: specialize competitor watch workspace"
```
