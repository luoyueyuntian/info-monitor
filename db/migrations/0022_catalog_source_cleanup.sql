-- Normalize catalog-created price themes back to the canonical worker/frontend type.
update themes
set
  theme_type = 'price',
  info_type = 'price',
  updated_at = now()
where theme_type in ('stock_price', 'commodity_price')
   or info_type in ('stock_price', 'commodity_price');

-- Pause generic sources that were created from catalog presets without the required
-- runtime config, so they stop generating repeated failures until configured.
update sources
set
  status = 'paused',
  is_paused = true,
  onboarding_status = 'draft',
  updated_at = now()
where
  (
    adapter_key = 'generic_content_update_list'
    and (
      coalesce(config->>'url', '') = ''
      or coalesce(config->>'item_selector', '') = ''
      or coalesce(config->>'title_selector', '') = ''
    )
  )
  or (
    adapter_key = 'generic_announcement_list'
    and coalesce(config->>'url', '') = ''
  )
  or (
    adapter_key = 'generic_news_announcement_list'
    and coalesce(config->>'url', '') = ''
  )
  or (
    adapter_key = 'generic_price_list'
    and coalesce(config->>'url', '') = ''
  )
  or (
    adapter_key = 'generic_html_price_list'
    and (
      coalesce(config->>'url', '') = ''
      or coalesce(config->>'item_selector', '') = ''
      or coalesce(config->>'title_selector', '') = ''
      or coalesce(config->>'price_selector', '') = ''
    )
  );
