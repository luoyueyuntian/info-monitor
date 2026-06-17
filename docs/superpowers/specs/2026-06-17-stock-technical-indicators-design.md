# 股票技术指标集成设计文档

更新时间：2026-06-17

## 1. 概述

本设计文档描述如何在 info-monitor 系统中集成股票技术指标计算与展示功能。
主要目标：
1. 在 Worker 层实时计算常用技术指标（RSI、MACD、KDJ、BOLL 等）
2. 基于指标结果生成交易信号事件
3. 在前端展示技术指标图表与当前状态

## 2. 技术选型

### 2.1 核心指标
- **RSI (Relative Strength Index)**: 14 日 RSI，判断超买 (>70) / 超卖 (<30)
- **MACD (Moving Average Convergence Divergence)**: 12/26/9 参数，金叉/死叉信号
- **KDJ (Stochastic Oscillator)**: 9/3/3 参数，J 值超买 (>100) / 超卖 (<0)
- **BOLL (Bollinger Bands)**: 20 日移动平均 ± 2 倍标准差，突破上/下轨信号
- **MA (Moving Average)**: 5/10/20/60 日均线，多头/空头排列

### 2.2 计算层
- 位置：`apps/python-worker/src/info_monitor_worker/indicators.py`
- 依赖：pandas（已在 requirements 中）
- 特点：纯函数实现，方便单元测试

### 2.3 存储方案
- 存储位置：`NormalizedRecord.content` 字段扩展
- 字段结构：
```json
{
  "indicators": {
    "rsi_14": 45.2,
    "macd": {
      "dif": 1.23,
      "dea": 1.15,
      "hist": 0.08,
      "signal": "golden_cross"
    },
    "kdj": {
      "k": 65.4,
      "d": 62.1,
      "j": 71.9
    },
    "boll": {
      "upper": 120.5,
      "middle": 115.2,
      "lower": 109.9,
      "position": "above_middle"
    },
    "ma": {
      "ma5": 116.5,
      "ma10": 114.2,
      "ma20": 112.8,
      "ma60": 110.5,
      "trend": "bullish_alignment"
    }
  }
}
```

## 3. 架构变更

### 3.1 Worker 层变更

#### 3.1.1 新增模块
- `apps/python-worker/src/info_monitor_worker/indicators.py`
  - `TechnicalIndicators` 类
  - `calculate_rsi(prices, period=14) -> float`
  - `calculate_macd(prices, fast=12, slow=26, signal=9) -> dict`
  - `calculate_kdj(highs, lows, closes, n=9, m1=3, m2=3) -> dict`
  - `calculate_boll(prices, period=20, std_dev=2) -> dict`
  - `calculate_ma(prices, periods=[5, 10, 20, 60]) -> dict`

#### 3.1.2 修改模块
- `apps/python-worker/src/info_monitor_worker/normalizers/price.py`
  - 调用 `TechnicalIndicators` 计算指标
  - 将结果写入 `content.indicators`
  - 保留原有字段不变

#### 3.1.3 新增 Event Rules
- `apps/python-worker/src/info_monitor_worker/event_rules/rsi_signal.py`
  - 超买 (>70) / 超卖 (<30) 信号
- `apps/python-worker/src/info_monitor_worker/event_rules/macd_signal.py`
  - 金叉/死叉信号
- `apps/python-worker/src/info_monitor_worker/event_rules/kdj_signal.py`
  - J 值超买 (>100) / 超卖 (<0) 信号
- `apps/python-worker/src/info_monitor_worker/event_rules/boll_signal.py`
  - 突破上轨/下轨信号
- `apps/python-worker/src/info_monitor_worker/event_rules/moving_average_signal.py`
  - 均线多头/空头排列信号

### 3.2 API 层变更

#### 3.2.1 修改类型定义
- `packages/shared-contracts/src/price.ts`
  - 扩展 `PriceRecord` 接口，添加 `indicators` 字段

#### 3.2.2 新增查询接口
- `apps/api/src/routes/price-indicators.ts`
  - GET `/api/price/:symbol/indicators` - 获取指定股票的最新指标
  - GET `/api/price/:symbol/indicators/history` - 获取历史指标数据

### 3.3 前端层变更

#### 3.3.1 新增组件
- `apps/frontend/src/views/workspace/[workspaceId]/reports/components/TechnicalIndicatorsPanel.vue`
  - 展示 RSI、MACD、KDJ、BOLL 图表
- `apps/frontend/src/views/workspace/[workspaceId]/reports/components/IndicatorSignalCard.vue`
  - 展示当前信号状态

#### 3.3.2 修改现有组件
- `apps/frontend/src/views/workspace/[workspaceId]/reports/components/StockMarketReportsBoard.vue`
  - 集成 `TechnicalIndicatorsPanel`

## 4. 数据流

1. Scheduler 触发 kline 数据采集
2. Worker 调用 `eastmoney_stock_kline` adapter 获取原始数据
3. Worker 调用 `PriceNormalizer` 进行归一化
4. `PriceNormalizer` 内部调用 `TechnicalIndicators` 计算指标
5. 指标结果写入 `NormalizedRecord.content.indicators`
6. Event rules 评估指标信号，生成事件
7. API 返回包含指标的 price record
8. 前端展示指标图表

## 5. 实施顺序

1. **Phase 1: 指标计算模块**
   - 实现 `indicators.py`
   - 单元测试

2. **Phase 2: Worker 集成**
   - 修改 `PriceNormalizer`
   - 集成测试

3. **Phase 3: Event Rules**
   - 实现各指标信号规则
   - 规则测试

4. **Phase 4: API 层**
   - 修改 shared-contracts
   - 实现 API routes

5. **Phase 5: 前端层**
   - 实现指标图表组件
   - 集成到报表页面

## 6. 风险与应对

- **性能风险**：指标计算可能增加 worker 处理时间
  - 应对：使用 pandas 向量化计算，优化性能
- **数据质量风险**：kline 数据缺失可能导致指标计算失败
  - 应对：添加数据校验，缺失数据时跳过计算
- **存储风险**：indicators 字段可能过大
  - 应对：仅存储必要指标值，不存储中间计算结果
