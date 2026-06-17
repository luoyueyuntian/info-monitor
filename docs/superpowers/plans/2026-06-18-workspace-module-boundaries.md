# Workspace Module Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove top-level workspace special-casing from the frontend shell and establish a workspace module registry that supports parallel development of the four business workspaces.

**Architecture:** Keep the current route URLs and existing business pages, but replace shell branching with a module registry and section resolver. This phase stays frontend-first and only lays groundwork for future API-owned workspace scoping.

**Tech Stack:** Vue 3, Vue Router, TypeScript, Vitest

---

### Task 1: Lock Workspace Module Registry Behavior With Tests

**Files:**
- Create: `apps/frontend/src/workspaces/registry.test.ts`
- Create: `apps/frontend/src/workspaces/types.ts`
- Create: `apps/frontend/src/workspaces/catalog.ts`
- Create: `apps/frontend/src/workspaces/registry.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { getWorkspaceModule, getWorkspaceNavItems, getWorkspaceSectionMeta } from "./registry";

describe("workspace registry", () => {
  it("returns section navigation for every workspace from one registry", () => {
    expect(getWorkspaceNavItems("stock-market").map((item) => item.label)).toEqual([
      "大盘",
      "动作",
      "主题",
      "来源",
      "报告",
    ]);
    expect(getWorkspaceNavItems("market-impact")).toHaveLength(5);
  });

  it("exposes section metadata without route-level conditionals", () => {
    expect(getWorkspaceSectionMeta("stock-market", "reports")?.label).toBe("报告");
    expect(getWorkspaceSectionMeta("stock-market", "reports")?.description).toContain("盘后");
    expect(getWorkspaceSectionMeta("competitor-watch", "actions")?.description).toContain("动作");
  });

  it("returns null for unknown workspaces", () => {
    expect(getWorkspaceModule("missing-workspace")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: FAIL because the registry module does not exist yet

- [ ] **Step 3: Write minimal implementation**

Implement a pure workspace registry with:

- shared workspace IDs and section IDs
- shared workspace definitions
- shared section metadata
- pure lookup helpers for module, nav items, and section metadata

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: PASS

### Task 2: Simplify The App Shell

**Files:**
- Modify: `apps/frontend/src/App.vue`
- Modify: `apps/frontend/src/lib/workspaces.ts`

- [ ] **Step 1: Write the failing test**

Extend the registry test or add a focused helper test that proves the shell can render navigation from the registry without using stock-market-only metadata sources.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: FAIL until helper output matches the new shell usage

- [ ] **Step 3: Write minimal implementation**

Change the shell so:

- the left sidebar only renders the brand block and workspace list
- the top content area always renders workspace section navigation through the registry
- `StockMarketAppShell` and stock sidebar polling are removed from the shell path

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: PASS

### Task 3: Resolve Workspace Section Views Through The Registry

**Files:**
- Create: `apps/frontend/src/workspaces/section-resolver.ts`
- Modify: `apps/frontend/src/views/workspace/[workspaceId]/dashboard/index.vue`
- Modify: `apps/frontend/src/views/workspace/[workspaceId]/actions/index.vue`
- Modify: `apps/frontend/src/views/workspace/[workspaceId]/topics/index.vue`
- Modify: `apps/frontend/src/views/workspace/[workspaceId]/reports/index.vue`

- [ ] **Step 1: Write the failing test**

Add a resolver test that proves:

- stock-market resolves to stock-specific boards where registered
- other workspaces resolve to the default shared boards

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: FAIL until the resolver exists

- [ ] **Step 3: Write minimal implementation**

Add a section component resolver and update route entry files to render:

```vue
<component :is="resolvedComponent" />
```

instead of:

```vue
<StockMarketReportsBoard v-if="isStockMarket" />
<WorkspaceReportsBoard v-else />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: PASS

### Task 4: Prepare Shared Workspace Identifiers For Future API Ownership

**Files:**
- Modify: `packages/shared-contracts/src/index.ts`
- Modify: `apps/frontend/src/lib/workspaces.ts`

- [ ] **Step 1: Write the failing test**

Add a small frontend test or type-usage assertion that imports the shared workspace identifier type and uses it in the registry layer.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: FAIL or typecheck fail until the shared type exists

- [ ] **Step 3: Write minimal implementation**

Add shared workspace identifier exports that the frontend registry can consume without redefining IDs locally.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: PASS

### Task 5: Verify The Frontend Build Surface

**Files:**
- Verify only

- [ ] **Step 1: Run targeted frontend tests**

Run: `npm --workspace @info-monitor/frontend test -- workspace-registry`
Expected: PASS

- [ ] **Step 2: Run frontend typecheck**

Run: `npm --workspace @info-monitor/frontend typecheck`
Expected: PASS

- [ ] **Step 3: Run frontend build**

Run: `npm --workspace @info-monitor/frontend build`
Expected: PASS
