<script setup lang="ts">
import { computed } from 'vue'
import IndicatorSignalCard from './IndicatorSignalCard.vue'

type MACDIndicator = {
  dif?: number | null
  dea?: number | null
  hist?: number | null
  signal?: string | null
}

type KDJIndicator = {
  k?: number | null
  d?: number | null
  j?: number | null
  signal?: string | null
}

type BOLLIndicator = {
  upper?: number | null
  middle?: number | null
  lower?: number | null
  position?: string | null
  currentPrice?: number | null
}

type MAIndicator = {
  ma5?: number | null
  ma10?: number | null
  ma20?: number | null
  ma60?: number | null
  trend?: string | null
}

type TechnicalIndicators = {
  rsi_14?: number | null
  macd?: MACDIndicator | null
  kdj?: KDJIndicator | null
  boll?: BOLLIndicator | null
  ma?: MAIndicator | null
}

const props = defineProps<{
  indicators?: TechnicalIndicators | null
}>()

const hasIndicators = computed(() => {
  return props.indicators && Object.keys(props.indicators).length > 0
})

const rsiCard = computed(() => {
  const rsi = props.indicators?.rsi_14
  if (rsi == null) return null

  let signal = 'neutral'
  let description = 'RSI 处于正常区间'

  if (rsi >= 70) {
    signal = 'overbought'
    description = 'RSI 超买区间，价格可能面临回调压力'
  } else if (rsi <= 30) {
    signal = 'oversold'
    description = 'RSI 超卖区间，价格可能存在反弹机会'
  }

  return { title: 'RSI(14)', value: rsi.toFixed(1), signal, description }
})

const macdCard = computed(() => {
  const macd = props.indicators?.macd
  if (!macd) return null

  return {
    title: 'MACD',
    value: `DIF ${macd.dif?.toFixed(3) ?? '-'} / DEA ${macd.dea?.toFixed(3) ?? '-'}`,
    signal: macd.signal ?? 'neutral',
    description: macd.signal === 'golden_cross'
      ? 'DIF 上穿 DEA，金叉形成'
      : macd.signal === 'death_cross'
      ? 'DIF 下穿 DEA，死叉形成'
      : undefined,
  }
})

const kdjCard = computed(() => {
  const kdj = props.indicators?.kdj
  if (!kdj) return null

  return {
    title: 'KDJ',
    value: `K ${kdj.k?.toFixed(1) ?? '-'} / D ${kdj.d?.toFixed(1) ?? '-'} / J ${kdj.j?.toFixed(1) ?? '-'}`,
    signal: kdj.signal ?? 'neutral',
  }
})

const bollCard = computed(() => {
  const boll = props.indicators?.boll
  if (!boll) return null

  const upper = boll.upper?.toFixed(2) ?? '-'
  const middle = boll.middle?.toFixed(2) ?? '-'
  const lower = boll.lower?.toFixed(2) ?? '-'

  return {
    title: 'BOLL(20)',
    value: `上轨 ${upper} / 中轨 ${middle} / 下轨 ${lower}`,
    signal: boll.position === 'above_upper' ? 'above_upper'
      : boll.position === 'below_lower' ? 'below_lower'
      : boll.position ?? 'neutral',
  }
})

const maCard = computed(() => {
  const ma = props.indicators?.ma
  if (!ma) return null

  return {
    title: '均线排列',
    value: `MA5 ${ma.ma5?.toFixed(2) ?? '-'} / MA10 ${ma.ma10?.toFixed(2) ?? '-'} / MA20 ${ma.ma20?.toFixed(2) ?? '-'}`,
    signal: ma.trend === 'bullish_alignment' ? 'bullish_alignment'
      : ma.trend === 'bearish_alignment' ? 'bearish_alignment'
      : 'mixed',
  }
})
</script>

<template>
  <article class="card">
    <div class="card-topline">
      <h3>技术指标</h3>
      <span class="text-[0.88rem] text-ink-secondary">当前周期关键信号</span>
    </div>

    <div v-if="!hasIndicators" class="rounded-2xl bg-slate-50/90 px-4 py-6 text-[0.92rem] leading-6 text-ink-secondary">
      暂无可用的技术指标数据，请确认数据源已返回 K 线序列。
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <IndicatorSignalCard
        v-if="rsiCard"
        :title="rsiCard.title"
        :value="rsiCard.value"
        :signal="rsiCard.signal"
        :description="rsiCard.description"
      />
      <IndicatorSignalCard
        v-if="macdCard"
        :title="macdCard.title"
        :value="macdCard.value"
        :signal="macdCard.signal"
        :description="macdCard.description"
      />
      <IndicatorSignalCard
        v-if="kdjCard"
        :title="kdjCard.title"
        :value="kdjCard.value"
        :signal="kdjCard.signal"
      />
      <IndicatorSignalCard
        v-if="bollCard"
        :title="bollCard.title"
        :value="bollCard.value"
        :signal="bollCard.signal"
      />
      <IndicatorSignalCard
        v-if="maCard"
        :title="maCard.title"
        :value="maCard.value"
        :signal="maCard.signal"
      />
    </div>
  </article>
</template>
