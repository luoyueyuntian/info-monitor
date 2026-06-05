import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";
import { mockEvents, mockSources, mockThemes } from "../lib/mock-store.js";

type SourceInput = {
  themeId: string;
  name: string;
  sourceType: string;
  adapterKey: string;
  config?: Record<string, unknown>;
};

type SourceUpdateInput = {
  name?: string;
  sourceType?: string;
  adapterKey?: string;
  config?: Record<string, unknown>;
  isPaused?: boolean;
};

function toTimestamp(value?: string | Date | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildSourceAnalysis(input: {
  source: {
    name: string;
    status: string;
    isPaused?: boolean | null;
    latestRunStatus?: string | null;
    latestSuccessAt?: string | Date | null;
    latestFailureAt?: string | Date | null;
    lastErrorMessage?: string | null;
  };
  runs: Array<{ status: string; finishedAt?: string | Date | null; startedAt?: string | Date | null }>;
  events: Array<{ title: string; occurredAt: string | Date; summary: string }>;
}) {
  const warning = input.source.status === "warning" || input.source.latestRunStatus === "failed";
  const latestActivity = Math.max(
    toTimestamp(input.source.latestSuccessAt),
    toTimestamp(input.source.latestFailureAt),
  );
  const stale = latestActivity > 0 && latestActivity < Date.now() - 48 * 60 * 60 * 1000;
  const recentEventCount = input.events.filter((event) => toTimestamp(event.occurredAt) >= Date.now() - 24 * 60 * 60 * 1000).length;

  if (warning) {
    return {
      tone: "warning",
      toneLabel: "需要优先处理",
      headline: "当前来源存在异常，建议先处理抓取链路问题。",
      summary: input.source.lastErrorMessage ?? "最近运行出现失败或异常，当前输出可靠性需要复核。",
      keyPoints: [
        `来源状态：${input.source.status}`,
        `最近运行状态：${input.source.latestRunStatus ?? "暂无"}`,
        recentEventCount > 0 ? `最近24小时仍产生了 ${recentEventCount} 条相关事件。` : "最近24小时没有新的相关事件。",
      ],
      risks: [
        "如果该来源持续失败，主题判断可能会漏掉最新变化。",
        stale ? "该来源超过48小时没有有效更新，当前结论可能滞后。" : "当前需要重点确认失败是否可复现。",
      ],
      actions: [
        "优先查看最近运行记录和错误信息，判断是抓取失败还是解析失败。",
        "修复后手动补跑一次，确认来源恢复正常。",
      ],
    };
  }

  if (input.source.isPaused) {
    return {
      tone: "pending",
      toneLabel: "当前已暂停",
      headline: "来源当前被暂停，信息覆盖可能不完整。",
      summary: "如果该来源仍然有价值，建议确认暂停是否仍然必要。",
      keyPoints: [
        `来源状态：${input.source.status}`,
        `最近运行状态：${input.source.latestRunStatus ?? "暂无"}`,
        recentEventCount > 0 ? `最近24小时历史上产生过 ${recentEventCount} 条相关事件。` : "最近24小时没有新的相关事件。",
      ],
      risks: [
        "暂停状态会让主题长期缺少这一路来源的数据补充。",
        stale ? "同时该来源最近也较久未更新，恢复前建议先确认配置。" : "恢复后建议先补跑再观察。",
      ],
      actions: [
        "先确认暂停原因是否仍然成立。",
        "如需恢复，先恢复来源并手动补跑一次验证结果。",
      ],
    };
  }

  return {
    tone: "healthy",
    toneLabel: "整体稳定",
    headline: "当前来源运行稳定，可继续作为该主题的有效输入。",
    summary: stale ? "来源没有明显报错，但更新时效偏慢，建议留意是否需要补跑。" : "最近运行状态整体正常，当前更适合继续观察其输出质量。",
    keyPoints: [
      `最近运行状态：${input.source.latestRunStatus ?? "暂无"}`,
      recentEventCount > 0 ? `最近24小时产生了 ${recentEventCount} 条相关事件。` : "最近24小时没有新的相关事件。",
      `最近运行记录数：${input.runs.length}`,
    ],
    risks: [
      stale ? "更新时效偏慢，可能导致主题判断滞后。" : "当前未发现明显风险。",
      "即使状态正常，也建议周期性抽查输出内容是否仍然符合预期。",
    ],
    actions: [
      stale ? "手动补跑一次，确认来源是否仍可稳定产出。" : "继续观察后续运行结果，重点关注是否开始出现波动。",
      "如该来源是关键输入，可与同主题其他来源交叉验证。",
    ],
  };
}

export async function listSourceStatuses() {
  const db = getDatabase();

  if (!db) {
    return mockSources;
  }

  const rows = await db
    .selectFrom("sources as s")
    .innerJoin("themes as t", "t.id", "s.theme_id")
    .select([
      "s.id as id",
      "s.theme_id as themeId",
      "t.name as themeName",
      "t.theme_type as themeType",
      "s.name as name",
      "s.status as status",
      "s.source_type as sourceType",
      "s.adapter_key as adapterKey",
      "s.is_paused as isPaused",
      "s.latest_success_at as latestSuccessAt",
      "s.latest_failure_at as latestFailureAt",
    ])
    .orderBy("s.created_at desc")
    .execute();

  const latestEvents = await Promise.all(
    rows.map(async (row) => {
      const latestEvent = await db
        .selectFrom("events")
        .select(["signal"])
        .where("theme_id", "=", row.themeId)
        .orderBy("occurred_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        sourceId: row.id,
        latestEventSignal: latestEvent?.signal ?? null,
      };
    }),
  );

  const latestRuns = await Promise.all(
    rows.map(async (row) => {
      const latestRun = await db
        .selectFrom("source_runs")
        .select(["status", "finished_at as finishedAt", "started_at as startedAt", "error_message as errorMessage"])
        .where("source_id", "=", row.id)
        .orderBy("created_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        sourceId: row.id,
        latestRunStatus: latestRun?.status ?? null,
        latestRunAt:
          latestRun?.finishedAt?.toISOString?.() ??
          latestRun?.startedAt?.toISOString?.() ??
          null,
        lastErrorMessage: latestRun?.errorMessage ?? null,
      };
    }),
  );

  return rows.map((row) => {
    const latestRun = latestRuns.find((item) => item.sourceId === row.id);
    const latestEvent = latestEvents.find((item) => item.sourceId === row.id);

    return {
      ...row,
      latestEventSignal: latestEvent?.latestEventSignal ?? null,
      latestSuccessAt: row.latestSuccessAt?.toISOString?.() ?? null,
      latestFailureAt: row.latestFailureAt?.toISOString?.() ?? null,
      latestRunStatus: latestRun?.latestRunStatus ?? null,
      latestRunAt: latestRun?.latestRunAt ?? null,
      lastErrorMessage: latestRun?.lastErrorMessage ?? null,
    };
  });
}

export async function getSourceDetail(sourceId: string) {
  const db = getDatabase();

  if (!db) {
    const source = mockSources.find((item) => item.id === sourceId);

    if (!source) {
      return null;
    }

    const runs = [
      {
        id: `run-${sourceId}-latest`,
        status: source.latestRunStatus ?? "completed",
        triggerType: "manual",
        startedAt: source.latestRunAt,
        finishedAt: source.latestRunAt,
        errorMessage: source.lastErrorMessage ?? null,
      },
    ];
    const events = mockEvents
      .filter((item) => item.themeId === source.themeId)
      .map((item) => ({
        id: item.id,
        title: item.title,
        signal: item.signal,
        status: item.status,
        occurredAt: item.occurredAt,
        summary: item.summary,
      }));

    return {
      source,
      runs,
      events,
      records: [],
      changes: [],
      snapshots: [
        {
          id: `snapshot-${source.id}-latest`,
          sourceRunId: `run-${source.id}-latest`,
          fetchedAt: source.latestRunAt ?? source.latestSuccessAt ?? null,
          storagePath: null,
          payloadPreview: JSON.stringify(
            [
              {
                title: source.name,
                fetched_from: source.themeName,
                status: source.status,
              },
            ],
            null,
            2,
          ),
        },
      ],
      analysis: buildSourceAnalysis({ source, runs, events }),
    };
  }

  const source = await db
    .selectFrom("sources as s")
    .innerJoin("themes as t", "t.id", "s.theme_id")
    .select([
      "s.id as id",
      "s.theme_id as themeId",
      "t.name as themeName",
      "t.theme_type as themeType",
      "s.name as name",
      "s.status as status",
      "s.source_type as sourceType",
      "s.adapter_key as adapterKey",
      "s.config as config",
      "s.is_paused as isPaused",
      "s.latest_success_at as latestSuccessAt",
      "s.latest_failure_at as latestFailureAt",
    ])
    .where("s.id", "=", sourceId)
    .executeTakeFirst();

  if (!source) {
    return null;
  }

  const runs = await db
    .selectFrom("source_runs")
    .select([
      "id",
      "status",
      "trigger_type as triggerType",
      "started_at as startedAt",
      "finished_at as finishedAt",
      "error_message as errorMessage",
    ])
    .where("source_id", "=", sourceId)
    .orderBy("created_at desc")
    .limit(10)
    .execute();

  const latestThemeEvent = await db
    .selectFrom("events")
    .select(["signal"])
    .where("theme_id", "=", source.themeId)
    .orderBy("occurred_at desc")
    .limit(1)
    .executeTakeFirst();

  const events = await db
    .selectFrom("events")
    .select([
      "id",
      "title",
      "signal",
      "status",
      "is_read as isRead",
      "is_bookmarked as isBookmarked",
      "occurred_at as occurredAt",
      "summary",
    ])
    .where("source_id", "=", sourceId)
    .orderBy("occurred_at desc")
    .limit(10)
    .execute();

  const records = await db
    .selectFrom("normalized_records")
    .select(["id", "title", "occurred_at as occurredAt", "info_type as infoType", "content"])
    .where("source_id", "=", sourceId)
    .orderBy("occurred_at desc")
    .limit(10)
    .execute();

  const changes = await db
    .selectFrom("changes")
    .select(["id", "change_type as changeType", "summary", "detected_at as detectedAt", "details"])
    .where("source_id", "=", sourceId)
    .orderBy("detected_at desc")
    .limit(10)
    .execute();

  const snapshots = await db
    .selectFrom("raw_snapshots")
    .select([
      "id",
      "source_run_id as sourceRunId",
      "fetched_at as fetchedAt",
      "storage_path as storagePath",
      "payload_json as payloadJson",
    ])
    .where("source_id", "=", sourceId)
    .orderBy("fetched_at desc")
    .limit(5)
    .execute();

  const latestRun = runs[0];
  const normalizedSource = {
    ...source,
    latestEventSignal: latestThemeEvent?.signal ?? null,
    latestSuccessAt: source.latestSuccessAt?.toISOString?.() ?? null,
    latestFailureAt: source.latestFailureAt?.toISOString?.() ?? null,
    latestRunStatus: latestRun?.status ?? null,
    latestRunAt:
      latestRun?.finishedAt?.toISOString?.() ??
      latestRun?.startedAt?.toISOString?.() ??
      null,
    lastErrorMessage: latestRun?.errorMessage ?? null,
  };
  const normalizedRuns = runs.map((run) => ({
    ...run,
    startedAt: run.startedAt?.toISOString?.() ?? null,
    finishedAt: run.finishedAt?.toISOString?.() ?? null,
  }));
  const normalizedEvents = events.map((event) => ({
    ...event,
    occurredAt: event.occurredAt.toISOString?.() ?? event.occurredAt,
  }));
  const normalizedRecords = records.map((record) => ({
    ...record,
    occurredAt: record.occurredAt.toISOString?.() ?? record.occurredAt,
  }));
  const normalizedChanges = changes.map((change) => ({
    ...change,
    detectedAt: change.detectedAt.toISOString?.() ?? change.detectedAt,
  }));
  const normalizedSnapshots = snapshots.map((snapshot) => ({
    id: snapshot.id,
    sourceRunId: snapshot.sourceRunId,
    fetchedAt: snapshot.fetchedAt.toISOString?.() ?? snapshot.fetchedAt,
    storagePath: snapshot.storagePath,
    payloadPreview: JSON.stringify(snapshot.payloadJson ?? {}, null, 2),
  }));

  return {
    source: normalizedSource,
    runs: normalizedRuns,
    events: normalizedEvents,
    records: normalizedRecords,
    changes: normalizedChanges,
    snapshots: normalizedSnapshots,
    analysis: buildSourceAnalysis({
      source: normalizedSource,
      runs: normalizedRuns,
      events: normalizedEvents,
    }),
  };
}

export async function createSource(input: SourceInput) {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (!db) {
    const id = createId("source");
    const theme = mockThemes.find((item) => item.id === input.themeId);
    mockSources.push({
      id,
      themeId: input.themeId,
      themeName: theme?.name ?? input.themeId,
      name: input.name,
      status: "active",
      latestSuccessAt: null,
      latestFailureAt: null,
    });
    if (theme) {
      theme.sourceCount += 1;
    }
    return { id };
  }

  const id = createId("source");

  await db
    .insertInto("sources")
    .values({
      id,
      theme_id: input.themeId,
      name: input.name,
      source_type: input.sourceType,
      adapter_key: input.adapterKey,
      status: "active",
      is_paused: false,
      config: input.config ?? {},
      created_at: now,
      updated_at: now,
    })
    .execute();

  return { id };
}

export async function enqueueManualSourceRun(sourceId: string) {
  const db = getDatabase();

  if (!db) {
    return { queued: true, mode: "mock" };
  }

  const source = await db
    .selectFrom("sources")
    .select(["id", "theme_id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!source) {
    return null;
  }

  await db
    .insertInto("source_runs")
    .values({
      id: createId("run"),
      source_id: source.id,
      theme_id: source.theme_id,
      trigger_type: "manual",
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .execute();

  return { queued: true, mode: "db" };
}

export async function updateSource(sourceId: string, input: SourceUpdateInput) {
  const db = getDatabase();

  if (!db) {
    const source = mockSources.find((item) => item.id === sourceId);

    if (!source) {
      return null;
    }

    if (input.name !== undefined) {
      source.name = input.name;
    }

    if (input.sourceType !== undefined) {
      source.sourceType = input.sourceType;
    }

    if (input.adapterKey !== undefined) {
      source.adapterKey = input.adapterKey;
    }

    if (input.isPaused !== undefined) {
      source.isPaused = input.isPaused;
    }

    return {
      id: source.id,
      isPaused: source.isPaused ?? false,
      mode: "mock",
    };
  }

  const existing = await db
    .selectFrom("sources")
    .select(["id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  const nextValues: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    nextValues.name = input.name;
  }

  if (input.sourceType !== undefined) {
    nextValues.source_type = input.sourceType;
  }

  if (input.adapterKey !== undefined) {
    nextValues.adapter_key = input.adapterKey;
  }

  if (input.config !== undefined) {
    nextValues.config = input.config;
  }

  if (input.isPaused !== undefined) {
    nextValues.is_paused = input.isPaused;
  }

  await db
    .updateTable("sources")
    .set(nextValues)
    .where("id", "=", sourceId)
    .execute();

  return {
    id: sourceId,
    isPaused: input.isPaused ?? false,
    mode: "db",
  };
}

export async function updateSourcePaused(sourceId: string, isPaused: boolean) {
  return updateSource(sourceId, { isPaused });
}

export async function deleteSource(sourceId: string) {
  const db = getDatabase();

  if (!db) {
    const index = mockSources.findIndex((item) => item.id === sourceId);

    if (index === -1) {
      return null;
    }

    const themeId = mockSources[index].themeId;
    mockSources.splice(index, 1);
    const theme = mockThemes.find((item) => item.id === themeId);
    if (theme) {
      theme.sourceCount = Math.max(0, theme.sourceCount - 1);
    }
    return { id: sourceId };
  }

  const existing = await db
    .selectFrom("sources")
    .select(["id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  await db
    .deleteFrom("sources")
    .where("id", "=", sourceId)
    .execute();

  return { id: sourceId };
}
