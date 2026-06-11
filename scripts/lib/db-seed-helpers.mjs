export async function upsertTheme(client, input) {
  await client.query(
    `
      insert into themes (
        id,
        name,
        theme_type,
        info_type,
        description,
        status,
        metadata
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        'active',
        cast($6 as jsonb)
      )
      on conflict (id) do update
      set
        name = excluded.name,
        theme_type = excluded.theme_type,
        info_type = excluded.info_type,
        description = excluded.description,
        status = 'active',
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      input.id,
      input.name,
      input.themeType,
      input.infoType,
      input.description,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function upsertSource(client, input) {
  await client.query(
    `
      insert into sources (
        id,
        theme_id,
        name,
        source_type,
        adapter_key,
        status,
        is_paused,
        config,
        latest_success_at,
        latest_failure_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        cast($8 as jsonb),
        $9,
        $10
      )
      on conflict (id) do update
      set
        theme_id = excluded.theme_id,
        name = excluded.name,
        source_type = excluded.source_type,
        adapter_key = excluded.adapter_key,
        status = excluded.status,
        is_paused = excluded.is_paused,
        config = excluded.config,
        latest_success_at = excluded.latest_success_at,
        latest_failure_at = excluded.latest_failure_at,
        updated_at = now()
    `,
    [
      input.id,
      input.themeId,
      input.name,
      input.sourceType,
      input.adapterKey,
      input.status ?? "active",
      input.isPaused ?? false,
      JSON.stringify(input.config ?? {}),
      input.latestSuccessAt ?? null,
      input.latestFailureAt ?? null,
    ],
  );
}

export async function upsertSourceRun(client, input) {
  await client.query(
    `
      insert into source_runs (
        id,
        theme_id,
        source_id,
        trigger_type,
        status,
        started_at,
        finished_at,
        error_message,
        created_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
      )
      on conflict (id) do update
      set
        theme_id = excluded.theme_id,
        source_id = excluded.source_id,
        trigger_type = excluded.trigger_type,
        status = excluded.status,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        error_message = excluded.error_message,
        created_at = excluded.created_at
    `,
    [
      input.id,
      input.themeId,
      input.sourceId,
      input.triggerType,
      input.status,
      input.startedAt ?? null,
      input.finishedAt ?? null,
      input.errorMessage ?? null,
      input.createdAt ?? input.startedAt ?? input.finishedAt ?? new Date().toISOString(),
    ],
  );
}

export async function upsertRawSnapshot(client, input) {
  await client.query(
    `
      insert into raw_snapshots (
        id,
        source_run_id,
        theme_id,
        source_id,
        payload_json,
        storage_path,
        fetched_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        cast($5 as jsonb),
        $6,
        $7
      )
      on conflict (id) do update
      set
        source_run_id = excluded.source_run_id,
        theme_id = excluded.theme_id,
        source_id = excluded.source_id,
        payload_json = excluded.payload_json,
        storage_path = excluded.storage_path,
        fetched_at = excluded.fetched_at
    `,
    [
      input.id,
      input.sourceRunId,
      input.themeId,
      input.sourceId,
      JSON.stringify(input.payloadJson ?? null),
      input.storagePath ?? null,
      input.fetchedAt,
    ],
  );
}

export async function upsertNormalizedRecord(client, input) {
  await client.query(
    `
      insert into normalized_records (
        id,
        source_run_id,
        theme_id,
        source_id,
        info_type,
        occurred_at,
        title,
        fingerprint,
        logical_key,
        content,
        created_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        cast($10 as jsonb),
        $11
      )
      on conflict (id) do update
      set
        source_run_id = excluded.source_run_id,
        theme_id = excluded.theme_id,
        source_id = excluded.source_id,
        info_type = excluded.info_type,
        occurred_at = excluded.occurred_at,
        title = excluded.title,
        fingerprint = excluded.fingerprint,
        logical_key = excluded.logical_key,
        content = excluded.content,
        created_at = excluded.created_at
    `,
    [
      input.id,
      input.sourceRunId,
      input.themeId,
      input.sourceId,
      input.infoType,
      input.occurredAt,
      input.title,
      input.fingerprint,
      input.logicalKey ?? null,
      JSON.stringify(input.content),
      input.createdAt ?? input.occurredAt,
    ],
  );
}

export async function upsertChange(client, input) {
  await client.query(
    `
      insert into changes (
        id,
        source_run_id,
        theme_id,
        source_id,
        normalized_record_id,
        change_type,
        summary,
        details,
        detected_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        cast($8 as jsonb),
        $9
      )
      on conflict (id) do update
      set
        source_run_id = excluded.source_run_id,
        theme_id = excluded.theme_id,
        source_id = excluded.source_id,
        normalized_record_id = excluded.normalized_record_id,
        change_type = excluded.change_type,
        summary = excluded.summary,
        details = excluded.details,
        detected_at = excluded.detected_at
    `,
    [
      input.id,
      input.sourceRunId,
      input.themeId,
      input.sourceId,
      input.normalizedRecordId ?? null,
      input.changeType,
      input.summary,
      JSON.stringify(input.details ?? {}),
      input.detectedAt,
    ],
  );
}

export async function upsertEvent(client, input) {
  await client.query(
    `
      insert into events (
        id,
        source_run_id,
        theme_id,
        source_id,
        change_id,
        event_type,
        signal,
        title,
        summary,
        evidence,
        status,
        is_read,
        is_bookmarked,
        bookmarked_at,
        occurred_at,
        created_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        cast($10 as jsonb),
        $11,
        $12,
        $13,
        $14,
        $15,
        $16
      )
      on conflict (id) do update
      set
        source_run_id = excluded.source_run_id,
        theme_id = excluded.theme_id,
        source_id = excluded.source_id,
        change_id = excluded.change_id,
        event_type = excluded.event_type,
        signal = excluded.signal,
        title = excluded.title,
        summary = excluded.summary,
        evidence = excluded.evidence,
        status = excluded.status,
        is_read = excluded.is_read,
        is_bookmarked = excluded.is_bookmarked,
        bookmarked_at = excluded.bookmarked_at,
        occurred_at = excluded.occurred_at,
        created_at = excluded.created_at
    `,
    [
      input.id,
      input.sourceRunId,
      input.themeId,
      input.sourceId,
      input.changeId ?? null,
      input.eventType,
      input.signal,
      input.title,
      input.summary,
      JSON.stringify(input.evidence ?? []),
      input.status ?? "open",
      input.isRead ?? false,
      input.isBookmarked ?? false,
      input.bookmarkedAt ?? null,
      input.occurredAt,
      input.createdAt ?? input.occurredAt,
    ],
  );
}

export async function upsertEventStatusHistory(client, input) {
  await client.query(
    `
      insert into event_status_history (
        id,
        event_id,
        from_status,
        to_status,
        changed_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      on conflict (id) do update
      set
        event_id = excluded.event_id,
        from_status = excluded.from_status,
        to_status = excluded.to_status,
        changed_at = excluded.changed_at
    `,
    [
      input.id,
      input.eventId,
      input.fromStatus ?? null,
      input.toStatus,
      input.changedAt,
    ],
  );
}
