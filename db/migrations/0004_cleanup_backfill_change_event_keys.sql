delete from events older
using events newer
where older.id <> newer.id
  and older.event_key is null
  and newer.event_key is not null
  and older.theme_id = newer.theme_id
  and older.source_id = newer.source_id
  and older.event_type = newer.event_type
  and older.title = newer.title
  and older.occurred_at = newer.occurred_at;

update events
set event_key = 'backfill:' || md5(
  coalesce(theme_id, '') || ':' ||
  coalesce(source_id, '') || ':' ||
  coalesce(event_type, '') || ':' ||
  coalesce(title, '') || ':' ||
  coalesce(occurred_at::text, '')
)
where event_key is null;

delete from changes older
using changes newer
where older.id <> newer.id
  and older.change_key is null
  and newer.change_key is not null
  and older.theme_id = newer.theme_id
  and older.source_id = newer.source_id
  and coalesce(older.normalized_record_id, '') = coalesce(newer.normalized_record_id, '')
  and older.change_type = newer.change_type
  and older.summary = newer.summary;

update changes
set change_key = 'backfill:' || md5(
  coalesce(theme_id, '') || ':' ||
  coalesce(source_id, '') || ':' ||
  coalesce(normalized_record_id, '') || ':' ||
  coalesce(change_type, '') || ':' ||
  coalesce(summary, '')
)
where change_key is null;
