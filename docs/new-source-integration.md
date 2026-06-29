# New Source Integration Guide

## Real Source Integration (Tasks 1-3)

### Task 1: Second-Hand Price Source — 完整落地实例

Use the `generic_price_list` adapter for JSON API price sources.

#### 落地实例：监控 Surface Pro 8 闲鱼价格

**Step 1: 准备 API 代理**

闲鱼没有公开 API，需要通过以下方式之一获取数据：
- 自建爬虫代理（推荐）
- 使用第三方价格监控 API
- 本地 JSON 文件模拟（开发测试用）

**Step 2: 配置 Source**

在 UI 中创建 Source 时，选择 "Second-Hand Price API" preset，填写：

```json
{
  "url": "https://your-proxy.example.com/api/xianyu/search?q=Surface+Pro+8",
  "items_field": "data.items",
  "title_field": "title",
  "price_field": "price",
  "spec_field": "spec",
  "url_field": "url",
  "time_field": "created_at",
  "currency": "CNY",
  "max_items": 20,
  "schedule_interval_seconds": 21600,
  "emit_events_on_latest_only": true
}
```

**Step 3: API 响应格式要求**

你的 API 代理需要返回如下格式（参考 `examples/xianyu-api-response.json`）：

```json
{
  "data": {
    "items": [
      {
        "title": "Surface Pro 8 i5 16G 512G 国行 95新",
        "price": 3899,
        "spec": "16G+512G",
        "url": "https://www.goofish.com/item/123456789",
        "created_at": "2026-06-13T10:30:00+08:00"
      }
    ]
  }
}
```

**Step 4: 验证端到端流程**

1. 创建 Theme: "Surface Pro 8 价格监控" (type: price)
2. 添加 Source: 使用上述配置
3. 运行 Test Run 验证数据解析
4. 激活 Source，等待定时任务触发
5. 在 Theme Detail 查看价格趋势和事件

**价格异常检测特性：**
- 价格必须为正数且小于 1000万
- 异常低价检测：低于中位数 30% 的价格标记为 `is_outlier`
- 30天新低事件自动触发
- 价格突破事件自动触发（默认阈值 5%）

#### 其他真实源配置示例

**Example: Zhuanzhuan (转转) API**
```json
{
  "url": "https://api.example.com/zhuanzhuan/list",
  "items_field": "result.list",
  "title_field": "product_name",
  "price_field": "sell_price",
  "spec_field": "version",
  "url_field": "product_url",
  "time_field": "update_time",
  "currency": "CNY",
  "max_items": 15
}
```

### Task 2: Product Update / Announcement Source

Use `generic_content_update_list` for HTML pages or `generic_announcement_list` for JSON APIs.

**Example: Figma Release Notes (HTML)**
```json
{
  "url": "https://www.figma.com/release-notes/",
  "item_selector": "article",
  "title_selector": "h2",
  "link_selector": "a",
  "time_selector": "time",
  "update_type": "feature_release",
  "max_items": 10
}
```

**Example: Product Changelog API (JSON)**
```json
{
  "url": "https://api.example.com/changelog",
  "items_field": "releases",
  "title_field": "title",
  "time_field": "published_at",
  "url_field": "url",
  "summary_field": "description",
  "category_field": "type",
  "object_name": "Product Name",
  "max_items": 20
}
```

**Update Type Classification:**
- `feature_release`: 功能发布
- `marketing`: 营销活动
- `announcement`: 官方公告
- `content_update`: 内容更新

### Task 3: Financial / Macro Data Source

Use `pbc_open_market_announcements` for PBOC operations or `stats_data_release_list` for NBS releases.

**Example: PBOC Open Market Operations**
```json
{
  "url": "http://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125431/index.html",
  "base_url": "http://www.pbc.gov.cn"
}
```

**Impact Level Assessment:**
- High impact: amount >= 500B CNY, or >= 100B with term >= 14 days
- Medium impact: amount >= 100B CNY
- Low impact: smaller operations

## Content Update Style Source

### Steps
1. **Adapter**: Create `apps/python-worker/src/info_monitor_worker/adapters/<name>.py`
   - Extend `BaseAdapter`
   - Implement `fetch()` → return `RawFetchResult`
   - Implement `map_to_normalizer_input()` → return list of items with `title`, `occurred_at`, `url`
   - Use `_ensure_iso_with_tz()` for time parsing

2. **Normalizer**: Use existing `content_update.py` normalizer (or create new one)

3. **Adapter Registry**: Register in `apps/python-worker/src/info_monitor_worker/adapters/registry.py`

4. **Demo Seed**: Create `scripts/db-seed-<name>-demo.mjs`
   - Use helpers from `scripts/lib/db-seed-helpers.mjs`
   - Use IDs from `scripts/lib/demo-scene-ids.mjs`

5. **Source Config**: See examples above

6. **Preview / Test Data**: If this source needs local preview data, add a dedicated DB seed script. If frontend tests need static sample data, keep it under `apps/frontend/src/test-fixtures/demo-fixtures.ts` rather than runtime API mocks.

### Checklist
- [ ] Adapter fetches and parses HTML correctly
- [ ] Time parsing handles ISO, human-readable, and timezone variants
- [ ] Normalizer produces correct `NormalizedRecord` shape
- [ ] Demo seed creates theme, source, run, snapshot, record, event
- [ ] Local preview or demo seed covers the new theme when needed
- [ ] Frontend displays records, timeline, history, breakdown

## Announcement/Release Style Source

Same as above but:
- Use `news_announcement` info type
- Include `publisher`, `category`, `release_topic`, `release_topic_label` in content
- Use `stats_data_release_list.py` as reference
