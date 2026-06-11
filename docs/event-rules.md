# 事件规则扩展指南

本文档说明如何扩展 Info Monitor 的事件规则系统。

## 概述

事件规则系统负责从标准化记录中检测有意义的变化并生成事件。每个规则针对特定类型的信息进行分析。

## 现有规则

| 规则 | 文件 | 说明 |
|------|------|------|
| `price_30d_low` | `event_rules/price_30d_low.py` | 检测 30 天价格新低 |
| `price_breakout` | `event_rules/price_breakout.py` | 检测价格突破 |
| `consecutive_movement` | `event_rules/consecutive_movement.py` | 检测连续同向变动 |
| `financial_direction` | `event_rules/financial_direction.py` | 检测金融事件方向 |
| `keyword_match` | `event_rules/keyword_match.py` | 检测关键词命中 |
| `macro_deviation` | `event_rules/macro_deviation.py` | 检测宏观数据偏差 |

## 创建新规则

### 1. 创建规则文件

在 `apps/python-worker/src/info_monitor_worker/event_rules/` 下创建新文件：

```python
"""My custom event rule."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from info_monitor_worker.event_rules.base import BaseEventRule
from info_monitor_worker.models import NormalizedRecord


@dataclass
class MyRuleResult:
    triggered: bool
    signal: str
    title: str
    summary: str
    evidence: list[str]


class MyCustomRule(BaseEventRule):
    """Rule description."""

    def evaluate(
        self,
        normalized_record: NormalizedRecord,
        config: Optional[dict] = None,
    ) -> MyRuleResult:
        config = config or {}
        
        # Your detection logic here
        if some_condition:
            return MyRuleResult(
                triggered=True,
                signal="my_signal",
                title="Event title",
                summary="Event summary",
                evidence=["Evidence 1", "Evidence 2"],
            )
        
        return MyRuleResult(
            triggered=False,
            signal="neutral",
            title="",
            summary="",
            evidence=[],
        )
```

### 2. 注册规则

在 `event_rules/__init__.py` 中添加：

```python
from info_monitor_worker.event_rules.my_custom_rule import MyCustomRule

__all__ = [
    # ... existing rules
    "MyCustomRule",
]
```

### 3. 添加配置支持

规则可以通过数据库配置进行参数化：

```sql
INSERT INTO rule_configurations (id, rule_key, theme_id, config)
VALUES (
  'rule-my-custom-theme-xxx',
  'my_custom_rule',
  'theme-xxx',
  '{"threshold": 10, "enabled": true}'::jsonb
);
```

### 4. 编写测试

使用测试夹具快速编写测试：

```python
"""Tests for my custom rule."""

import pytest

from tests.fixtures import MockNormalizedRecord, ExpectedRuleResult
from info_monitor_worker.event_rules.my_custom_rule import MyCustomRule


class TestMyCustomRule:
    def test_triggers_when_condition_met(self):
        rule = MyCustomRule()
        record = MockNormalizedRecord(
            content={"key": "value"}
        )
        result = rule.evaluate(record)
        assert result.triggered is True
        assert result.signal == "my_signal"

    def test_does_not_trigger_when_condition_not_met(self):
        rule = MyCustomRule()
        record = MockNormalizedRecord(
            content={"key": "other"}
        )
        result = rule.evaluate(record)
        assert result.triggered is False
```

## 信号类型

定义事件的信号类型，用于前端展示和筛选：

| 信号 | 说明 | 优先级 |
|------|------|--------|
| `30d_low` | 30天新低 | 高 |
| `bullish` | 利好 | 高 |
| `bearish` | 利空 | 高 |
| `liquidity_injection` | 流动性注入 | 高 |
| `liquidity_withdrawal` | 流动性回笼 | 高 |
| `new_announcement` | 新公告 | 中 |
| `content_update` | 内容更新 | 低 |
| `neutral` | 中性 | 低 |

## 测试夹具

`tests/fixtures.py` 提供了常用的测试数据工厂：

```python
from tests.fixtures import (
    make_price_record,
    make_financial_event_record,
    make_content_update_record,
    make_news_announcement_record,
    make_macro_data_record,
    make_price_rule_config,
    ExpectedRuleResult,
    PRICE_LOW_SCENARIO,
    FINANCIAL_INJECTION_SCENARIO,
)
```

## 配置参数

规则配置存储在 `rule_configurations` 表中：

```typescript
type RuleConfiguration = {
  id: string;
  ruleKey: string;           // 规则标识
  themeId?: string | null;   // 关联主题（null 表示全局）
  config: RuleConfig;        // 规则特定配置
  isEnabled: boolean;        // 是否启用
  priority: number;          // 优先级
  createdAt: string;
  updatedAt: string;
};
```

通过 API 管理配置：

```
GET    /api/rule-configurations
POST   /api/rule-configurations
PATCH  /api/rule-configurations/:id
DELETE /api/rule-configurations/:id
```
