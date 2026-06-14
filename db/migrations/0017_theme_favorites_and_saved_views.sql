-- Theme favorites: persist user's favorited themes in DB instead of localStorage
CREATE TABLE IF NOT EXISTS theme_favorites (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(theme_id)
);

CREATE INDEX IF NOT EXISTS idx_theme_favorites_theme_id ON theme_favorites(theme_id);

-- Saved filter views: persist user's saved filter presets in DB instead of localStorage
CREATE TABLE IF NOT EXISTS saved_filter_views (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('events', 'themes', 'sources')),
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_filter_views_type ON saved_filter_views(view_type);
