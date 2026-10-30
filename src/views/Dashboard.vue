<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DownOutlined,
  EnvironmentOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@antdv-next/icons'
import {
  communityRanking,
  communityStats,
  districtMetrics,
  eventTrend,
  formatNumber,
  getCommunity,
  refreshAnalytics,
  type GridStat,
} from '@/mock/analytics'
import { safetyEvents, type EventLevel } from '@/mock/events'
import { elders } from '@/mock/elders'
import { devices } from '@/mock/devices'

const VIEW_WIDTH = 1920
const VIEW_HEIGHT = 1080
const pendingStatuses = ['待确认', '处置中', '已到场']

const router = useRouter()
const winWidth = ref(window.innerWidth)
const winHeight = ref(window.innerHeight)
const ready = ref(false)
const refreshing = ref(false)
const online = ref(true)
const scopeCommunity = ref('')
const selectedGridId = ref('')
const scopeOpen = ref(false)
const scopeKeyword = ref('')
const scopeSearchRef = ref<HTMLInputElement | null>(null)
const isFullscreen = ref(false)
const now = ref(new Date())
const lastRefresh = ref('--:--:--')

let clockTimer = 0
let refreshTimer = 0
let readyTimer = 0
let refreshDoneTimer = 0

const pad = (value: number) => String(value).padStart(2, '0')
const timeText = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
const pct = (value: number) => value.toFixed(1)

const clockText = computed(() => timeText(now.value))
const weekText = computed(
  () => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.value.getDay()],
)
const dateText = computed(
  () =>
    `${now.value.getFullYear()}-${pad(now.value.getMonth() + 1)}-${pad(now.value.getDate())} ${weekText.value}`,
)

const scale = computed(() =>
  Math.min(winWidth.value / VIEW_WIDTH, winHeight.value / VIEW_HEIGHT),
)

// 画布按最小比例缩放，同时把画布尺寸扩展到铺满视口；
// 多出的高度按比例分配给头部、指标带与底部，中间主区吸收剩余空间
const stageStyle = computed(() => {
  const stageWidth = winWidth.value / scale.value
  const stageHeight = winHeight.value / scale.value
  const extra = Math.max(0, stageHeight - VIEW_HEIGHT)
  return {
    width: `${stageWidth}px`,
    height: `${stageHeight}px`,
    transform: `scale(${scale.value})`,
    '--h-header': `${72 + extra * 0.05}px`,
    '--h-kpi': `${122 + extra * 0.15}px`,
    '--h-bottom': `${250 + extra * 0.3}px`,
  }
})

function handleResize() {
  winWidth.value = window.innerWidth
  winHeight.value = window.innerHeight
}

const filteredCommunities = computed(() => {
  const keyword = scopeKeyword.value.trim()
  if (!keyword) return communityStats
  return communityStats.filter((item) => item.name.includes(keyword))
})

async function openScopePanel() {
  scopeKeyword.value = ''
  scopeOpen.value = true
  await nextTick()
  scopeSearchRef.value?.focus()
}

function closeScopePanel() {
  scopeOpen.value = false
}

function toggleScopePanel() {
  if (scopeOpen.value) closeScopePanel()
  else void openScopePanel()
}

function pickScope(name: string) {
  setCommunity(name)
  closeScopePanel()
}

function handleFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    // 浏览器不支持或用户拒绝时保持当前窗口
  }
  handleFullscreenChange()
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && scopeOpen.value) closeScopePanel()
}

watch(scopeOpen, (open) => {
  if (!open) scopeKeyword.value = ''
})

function tickClock() {
  now.value = new Date()
}

function handleOnline() {
  online.value = navigator.onLine
}

function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  tickClock()
  window.clearTimeout(refreshDoneTimer)
  refreshDoneTimer = window.setTimeout(() => {
    refreshAnalytics()
    lastRefresh.value = timeText(new Date())
    refreshing.value = false
  }, 500)
}

onMounted(() => {
  tickClock()
  handleResize()
  window.addEventListener('resize', handleResize)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOnline)
  window.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  online.value = navigator.onLine
  clockTimer = window.setInterval(tickClock, 1000)
  refreshTimer = window.setInterval(refresh, 60000)
  readyTimer = window.setTimeout(() => {
    ready.value = true
    lastRefresh.value = timeText(new Date())
  }, 600)
})

onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.clearInterval(refreshTimer)
  window.clearTimeout(readyTimer)
  window.clearTimeout(refreshDoneTimer)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOnline)
  window.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

const currentCommunity = computed(() =>
  scopeCommunity.value ? getCommunity(scopeCommunity.value) : null,
)

const scopeInfo = computed(() => {
  const community = currentCommunity.value
  if (community) {
    return {
      elders: community.elders,
      highRisk: community.highRisk,
      onlineRate: community.onlineRate,
      onlineDevices: community.onlineDevices,
      devices: community.devices,
      l3: community.l3Pending,
      pending: community.pendingEvents,
      closure: community.closureRate,
      households: community.households,
      grids: community.grids.length,
      communities: 1,
    }
  }
  const metrics = districtMetrics
  return {
    elders: metrics.elders,
    highRisk: metrics.highRisk,
    onlineRate: metrics.onlineRate,
    onlineDevices: metrics.onlineDevices,
    devices: metrics.devices,
    l3: metrics.l3Pending,
    pending: metrics.pendingEvents,
    closure: metrics.closureRate,
    households: metrics.households,
    grids: metrics.grids,
    communities: metrics.communities,
  }
})

const kpis = computed(() => {
  const info = scopeInfo.value
  const riskPercent = info.elders ? pct((info.highRisk / info.elders) * 100) : '0.0'
  return [
    {
      key: 'elders',
      label: '服务老人',
      value: formatNumber(info.elders),
      unit: '人',
      hint: `设备覆盖 ${formatNumber(info.households)} 户`,
      tone: 'cyan',
    },
    {
      key: 'highRisk',
      label: '高风险老人',
      value: formatNumber(info.highRisk),
      unit: '人',
      hint: `占在册老人 ${riskPercent}%`,
      tone: 'red',
    },
    {
      key: 'online',
      label: '设备在线率',
      value: pct(info.onlineRate),
      unit: '%',
      hint: `离线 ${info.devices - info.onlineDevices} 台 / 启用 ${info.devices} 台`,
      tone: 'blue',
    },
    {
      key: 'l3',
      label: 'L3 待处置',
      value: String(info.l3),
      unit: '起',
      hint: info.l3 > 0 ? '需 5 分钟内响应' : '当前无紧急事件',
      tone: 'danger',
    },
    {
      key: 'pending',
      label: '待处置事件',
      value: String(info.pending),
      unit: '起',
      hint: `L3 ${info.l3} 起 · 其他 ${Math.max(0, info.pending - info.l3)} 起`,
      tone: 'amber',
    },
    {
      key: 'closure',
      label: '24h 闭环率',
      value: pct(info.closure),
      unit: '%',
      hint: '近 7 天已关闭 / 归档',
      tone: 'green',
    },
  ]
})

const elderCommunity = computed(() => new Map(elders.map((item) => [item.id, item.community])))

const l3Events = computed(() =>
  safetyEvents
    .filter((item) => item.level === 'L3' && pendingStatuses.includes(item.status))
    .filter((item) => !scopeCommunity.value || elderCommunity.value.get(item.elderId) === scopeCommunity.value)
    .sort((a, b) => b.occurredMinutesAgo - a.occurredMinutesAgo),
)

const latestL3 = computed(() => l3Events.value[0] ?? null)

function waitText(minutes: number) {
  if (minutes >= 60) {
    const hour = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest > 0 ? `${hour}h ${rest}m` : `${hour}h`
  }
  return `${Math.max(1, minutes)} 分钟`
}

const feed = computed(() => {
  const levelOrder: Record<EventLevel, number> = { L3: 0, L2: 1, L1: 2 }
  return safetyEvents
    .filter((item) => pendingStatuses.includes(item.status))
    .filter((item) => !scopeCommunity.value || elderCommunity.value.get(item.elderId) === scopeCommunity.value)
    .sort(
      (a, b) =>
        levelOrder[a.level] - levelOrder[b.level] || b.occurredMinutesAgo - a.occurredMinutesAgo,
    )
    .slice(0, 6)
})

const visibleCommunities = computed(() => {
  if (scopeCommunity.value) {
    const community = getCommunity(scopeCommunity.value)
    return community ? [community] : []
  }
  return communityStats
})

const scopedGrids = computed(() => visibleCommunities.value.flatMap((item) => item.grids))

const mapColumns = computed(() => {
  const total = scopedGrids.value.length
  if (total >= 9) return 5
  if (total >= 6) return 3
  return Math.max(1, Math.min(total, 4))
})

const mapSummary = computed(() => ({
  grids: scopedGrids.value.length,
  high: scopedGrids.value.filter((item) => item.riskScore >= 70).length,
  households: visibleCommunities.value.reduce((sum, item) => sum + item.households, 0),
}))

const selectedGrid = computed<GridStat | null>(
  () => scopedGrids.value.find((item) => item.id === selectedGridId.value) ?? null,
)

const scopedElders = computed(() =>
  scopeCommunity.value
    ? elders.filter((item) => item.status !== '已归档' && item.community === scopeCommunity.value)
    : elders.filter((item) => item.status !== '已归档'),
)

const scopedRiskSlices = computed(() => {
  const total = scopedElders.value.length
  const high = scopedElders.value.filter((item) => item.riskLevel === '高风险').length
  const medium = scopedElders.value.filter((item) => item.riskLevel === '中风险').length
  const low = total - high - medium
  const percent = (value: number) => (total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0)
  return [
    { label: '高风险', value: high, percent: percent(high), color: '#F87171' },
    { label: '中风险', value: medium, percent: percent(medium), color: '#FBBF24' },
    { label: '低风险', value: low, percent: percent(low), color: '#34D399' },
  ]
})

const riskTotal = computed(() => scopedRiskSlices.value.reduce((sum, item) => sum + item.value, 0))

const donutStyle = computed(() => {
  if (riskTotal.value === 0) return { background: 'rgba(143, 179, 217, 0.16)' }
  const [high, medium] = scopedRiskSlices.value
  const first = high.percent
  const second = first + medium.percent
  return {
    background: `conic-gradient(#F87171 0% ${first}%, #FBBF24 ${first}% ${second}%, #34D399 ${second}% 100%)`,
  }
})

const scopedDeviceStats = computed(() => {
  const list = scopeCommunity.value
    ? devices.filter((item) => {
        if (!item.enabled) return false
        const elder = elders.find((person) => person.id === item.elderId)
        return elder?.community === scopeCommunity.value
      })
    : devices.filter((item) => item.enabled)
  const types = [...new Set(list.map((item) => item.type))]
  return types
    .map((type) => {
      const typeList = list.filter((item) => item.type === type)
      const online = typeList.filter((item) => item.status === '在线').length
      return {
        type,
        total: typeList.length,
        online,
        rate: typeList.length > 0 ? Number(((online / typeList.length) * 100).toFixed(1)) : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
})

const trendEmpty = computed(
  () => Boolean(scopeCommunity.value) && (currentCommunity.value?.eventsToday ?? 0) === 0,
)

const trendPoints = computed(() => {
  const empty = trendEmpty.value
  return eventTrend.map((item) => ({
    ...item,
    l1: empty ? 0 : item.l1,
    l2: empty ? 0 : item.l2,
    l3: empty ? 0 : item.l3,
  }))
})

const trendMax = computed(() => Math.max(1, ...trendPoints.value.map((item) => item.l1 + item.l2 + item.l3)))
const trendTotal = computed(() =>
  trendPoints.value.reduce((sum, item) => sum + item.l1 + item.l2 + item.l3, 0),
)
const trendPeak = computed(() => Math.max(...trendPoints.value.map((item) => item.l1 + item.l2 + item.l3), 0))
const trendBars = computed(() =>
  trendPoints.value.map((item) => ({
    ...item,
    total: item.l1 + item.l2 + item.l3,
    l1Height: `${(item.l1 / trendMax.value) * 100}%`,
    l2Height: `${(item.l2 / trendMax.value) * 100}%`,
    l3Height: `${(item.l3 / trendMax.value) * 100}%`,
  })),
)

const ranking = computed(() => {
  if (scopeCommunity.value) {
    const list = [...(currentCommunity.value?.grids ?? [])]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 4)
    const max = Math.max(1, ...list.map((item) => item.riskScore))
    return list.map((grid) => ({
      name: grid.name,
      sub: `${grid.elders} 位老人 · 在线 ${pct(grid.onlineRate)}%`,
      value: grid.l3Pending > 0 ? `L3 ${grid.l3Pending}` : `${grid.pendingEvents} 起`,
      percent: Math.round((grid.riskScore / max) * 100),
      warn: grid.riskScore >= 70,
    }))
  }
  const list = communityRanking.slice(0, 4)
  const scores = list.map((item) => item.l3Pending * 50 + item.pendingEvents * 10 + item.highRisk * 0.5)
  const max = Math.max(1, ...scores)
  return list.map((item, index) => ({
    name: item.name,
    sub: `${item.elders} 位老人 · ${item.grids.length} 个网格`,
    value: item.l3Pending > 0 ? `L3 ${item.l3Pending}` : `${item.pendingEvents} 起`,
    percent: Math.round((scores[index] / max) * 100),
    warn: item.l3Pending > 0,
  }))
})

function riskLevelText(score: number) {
  if (score >= 70) return '高风险网格'
  if (score >= 40) return '中风险网格'
  return '低风险网格'
}

function riskTone(score: number) {
  if (score >= 70) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}

function gridStyle(score: number) {
  const rgb = score >= 70 ? '248, 113, 113' : score >= 40 ? '251, 191, 36' : '52, 211, 153'
  const alpha = 0.07 + (Math.min(score, 100) / 100) * 0.3
  return {
    background: `linear-gradient(150deg, rgba(${rgb}, ${alpha}), rgba(${rgb}, ${alpha * 0.35}))`,
    borderColor: `rgba(${rgb}, ${0.28 + alpha * 0.6})`,
  }
}

function selectGrid(grid: GridStat) {
  selectedGridId.value = selectedGridId.value === grid.id ? '' : grid.id
}

function setCommunity(value: string) {
  scopeCommunity.value = value
  selectedGridId.value = ''
}

function goMap() {
  router.push('/map')
}
</script>

<template>
  <div class="viewport">
    <div class="stage" :style="stageStyle">
      <div class="stage-bg"></div>
      <div class="stage-grid"></div>

      <div class="screen" :class="{ loading: !ready }">
        <header class="screen-header">
          <div class="brand">
            <div class="brand-mark">智</div>
            <div class="brand-text">
              <h1>智慧养老 · 区域安全驾驶舱</h1>
              <div class="brand-sub">
                <EnvironmentOutlined />
                <span>{{ districtMetrics.district }} · {{ districtMetrics.street }}</span>
                <i></i>
                <span>{{ scopeCommunity || '全区' }} · 实时态势</span>
              </div>
            </div>
          </div>

          <div class="scope-switcher">
            <button class="scope-trigger" :class="{ open: scopeOpen }" @click="toggleScopePanel">
              <span class="scope-caption">当前范围</span>
              <span class="scope-line">
                <span class="scope-value">{{ scopeCommunity || '全区' }}</span>
                <DownOutlined class="scope-arrow" />
              </span>
            </button>

            <div v-if="scopeOpen" class="scope-backdrop" @click="closeScopePanel"></div>

            <div v-if="scopeOpen" class="scope-panel">
              <div class="scope-search">
                <SearchOutlined class="scope-search-icon" />
                <input
                  ref="scopeSearchRef"
                  v-model="scopeKeyword"
                  class="scope-input"
                  placeholder="搜索社区名称，支持上百个社区"
                  @keydown.esc="closeScopePanel"
                />
                <span class="scope-total">{{ filteredCommunities.length }} 个社区</span>
              </div>
              <div class="scope-list">
                <button
                  class="scope-option"
                  :class="{ active: scopeCommunity === '' }"
                  @click="pickScope('')"
                >
                  <div class="option-main">
                    <span class="option-name">全区</span>
                    <span class="option-meta">
                      {{ districtMetrics.communities }} 个社区 · {{ districtMetrics.grids }} 个网格 ·
                      {{ formatNumber(districtMetrics.elders) }} 位老人
                    </span>
                  </div>
                  <CheckOutlined v-if="scopeCommunity === ''" class="option-check" />
                </button>
                <button
                  v-for="community in filteredCommunities"
                  :key="community.name"
                  class="scope-option"
                  :class="{ active: scopeCommunity === community.name }"
                  @click="pickScope(community.name)"
                >
                  <div class="option-main">
                    <span class="option-name">{{ community.name }}</span>
                    <span class="option-meta">
                      {{ community.elders }} 位老人 · {{ community.grids.length }} 个网格 · 在线
                      {{ pct(community.onlineRate) }}%
                    </span>
                  </div>
                  <span v-if="community.l3Pending > 0" class="option-l3">L3 {{ community.l3Pending }}</span>
                  <CheckOutlined v-if="scopeCommunity === community.name" class="option-check" />
                </button>
                <div v-if="filteredCommunities.length === 0" class="scope-empty">未找到匹配的社区</div>
              </div>
              <div class="scope-footer">输入名称可快速筛选 · Esc 关闭</div>
            </div>
          </div>

          <div class="header-right">
            <div class="clock-block">
              <div class="clock-date">{{ dateText }}</div>
              <div class="clock-time">{{ clockText }}</div>
            </div>
            <div class="update-block" :class="{ active: refreshing }">
              <span class="update-label">更新于</span>
              <span class="update-time">{{ lastRefresh }}</span>
            </div>
            <a-button class="ghost-btn" @click="refresh">
              <template #icon><ReloadOutlined :spin="refreshing" /></template>
              刷新
            </a-button>
            <a-button class="ghost-btn" @click="toggleFullscreen">
              <template #icon>
                <FullscreenExitOutlined v-if="isFullscreen" />
                <FullscreenOutlined v-else />
              </template>
              {{ isFullscreen ? '退出全屏' : '全屏' }}
            </a-button>
            <a-button class="ghost-btn" @click="goMap">
              <template #icon><ArrowLeftOutlined /></template>
              返回管理端
            </a-button>
          </div>
        </header>

        <div v-if="!online" class="alert-bar offline">
          <span class="alert-dot"></span>
          <span class="alert-main">网络中断，显示上次数据</span>
          <span class="alert-sub">恢复后自动刷新，当前展示 {{ lastRefresh }} 的统计结果</span>
        </div>
        <div v-else-if="scopeInfo.l3 > 0" class="alert-bar danger">
          <span class="alert-dot"></span>
          <span class="alert-main">L3 紧急事件待处置 {{ scopeInfo.l3 }} 起</span>
          <span class="alert-sub">
            <template v-if="latestL3">
              最近：{{ latestL3.title }} · {{ latestL3.elderName }} · 已等待 {{ waitText(latestL3.occurredMinutesAgo) }}
            </template>
          </span>
          <button v-if="latestL3" class="alert-action" @click="router.push(`/events/${latestL3.id}`)">
            立即查看
          </button>
        </div>
        <div v-else class="alert-bar calm">
          <span class="alert-dot"></span>
          <span class="alert-main">当前无 L3 紧急事件</span>
          <span class="alert-sub">区域运行平稳 · 数据每 60 秒自动刷新</span>
        </div>

        <div class="kpi-grid">
          <div v-for="kpi in kpis" :key="kpi.key" class="kpi-card" :class="kpi.tone">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-value">
              {{ kpi.value }}<em>{{ kpi.unit }}</em>
            </div>
            <div class="kpi-hint">{{ kpi.hint }}</div>
          </div>
        </div>

        <div class="screen-main">
          <div class="side-col">
            <section class="panel risk-panel">
              <div class="panel-head">
                <div class="panel-title"><i></i>风险结构</div>
                <span class="panel-note">在册老人</span>
              </div>
              <div class="risk-body">
                <div class="donut" :style="donutStyle">
                  <div class="donut-hole">
                    <div class="donut-value">{{ formatNumber(riskTotal) }}</div>
                    <div class="donut-label">位老人</div>
                  </div>
                </div>
                <div class="risk-legend">
                  <div v-for="item in scopedRiskSlices" :key="item.label" class="risk-row">
                    <span class="risk-dot" :style="{ background: item.color }"></span>
                    <span class="risk-name">{{ item.label }}</span>
                    <span class="risk-count">{{ formatNumber(item.value) }}</span>
                    <span class="risk-percent">{{ pct(item.percent) }}%</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="panel device-panel">
              <div class="panel-head">
                <div class="panel-title"><i></i>设备在线态势</div>
                <span class="panel-note">按设备类型</span>
              </div>
              <div class="device-list">
                <div v-for="item in scopedDeviceStats" :key="item.type" class="device-row">
                  <span class="device-name">{{ item.type }}</span>
                  <div class="device-track">
                    <div
                      class="device-bar"
                      :class="{ warn: item.rate < 95 }"
                      :style="{ width: `${item.rate}%` }"
                    ></div>
                  </div>
                  <span class="device-meta">{{ item.online }}/{{ item.total }}</span>
                  <span class="device-rate" :class="{ warn: item.rate < 95 }">{{ pct(item.rate) }}%</span>
                </div>
                <div v-if="scopedDeviceStats.length === 0" class="panel-empty">该区域暂无设备</div>
              </div>
            </section>
          </div>

          <section class="panel map-panel">
            <div class="panel-head">
              <div class="panel-title"><i></i>区域网格态势</div>
              <div class="map-legend">
                <span><i class="dot high"></i>高风险</span>
                <span><i class="dot mid"></i>中风险</span>
                <span><i class="dot low"></i>低风险</span>
                <span><i class="dot pulse"></i>L3 未闭环</span>
              </div>
            </div>

            <div class="map-summary">
              <span class="map-chip">网格 <b>{{ mapSummary.grids }}</b> 个</span>
              <span class="map-chip warn">高风险网格 <b>{{ mapSummary.high }}</b> 个</span>
              <span class="map-chip">设备覆盖 <b>{{ formatNumber(mapSummary.households) }}</b> 户</span>
              <span class="map-chip muted">数据更新于 {{ lastRefresh }}</span>
            </div>

            <div
              class="map-grid"
              :class="{ 'has-detail': Boolean(selectedGrid) }"
              :style="{ gridTemplateColumns: `repeat(${mapColumns}, minmax(0, 1fr))` }"
            >
              <button
                v-for="grid in scopedGrids"
                :key="grid.id"
                class="map-tile"
                :class="[`risk-${riskTone(grid.riskScore)}`, { selected: grid.id === selectedGridId }]"
                :style="gridStyle(grid.riskScore)"
                @click="selectGrid(grid)"
              >
                <div class="tile-head">
                  <span class="tile-community">{{ grid.community }}</span>
                  <span v-if="grid.l3Pending > 0" class="tile-l3">L3 {{ grid.l3Pending }}</span>
                </div>
                <div class="tile-body">
                  <div class="tile-main">
                    <div class="tile-name">{{ grid.name }}</div>
                    <div class="tile-meta">
                      <span>{{ grid.elders }} 人</span>
                      <span :class="{ warn: grid.onlineRate < 95 }">在线 {{ pct(grid.onlineRate) }}%</span>
                    </div>
                  </div>
                  <div class="tile-score">
                    {{ grid.riskScore }}<em>风险分</em>
                  </div>
                </div>
              </button>
              <div v-if="scopedGrids.length === 0" class="panel-empty">暂无网格数据</div>
            </div>

            <div v-if="selectedGrid" class="map-detail">
              <div class="detail-head">
                <span class="detail-name">{{ selectedGrid.community }} · {{ selectedGrid.name }}</span>
                <span class="detail-risk" :class="`risk-${riskTone(selectedGrid.riskScore)}`">
                  {{ riskLevelText(selectedGrid.riskScore) }}
                </span>
              </div>
              <div class="detail-metrics">
                <div class="detail-metric"><b>{{ selectedGrid.riskScore }}</b><span>风险分</span></div>
                <div class="detail-metric"><b>{{ selectedGrid.elders }}</b><span>老人</span></div>
                <div class="detail-metric"><b>{{ selectedGrid.offlineDevices }}</b><span>离线设备</span></div>
                <div class="detail-metric"><b>{{ selectedGrid.l3Pending }}</b><span>L3 未闭环</span></div>
              </div>
              <button class="detail-link" @click="goMap">在管理端查看 →</button>
            </div>

            <div class="map-footer">网格示意图，不代表真实地理边界 · 点击网格查看摘要</div>
          </section>

          <section class="panel event-panel">
            <div class="panel-head">
              <div class="panel-title"><i></i>待处置事件</div>
              <span class="panel-note">最近 6 条未闭环 · L3 置顶</span>
            </div>
            <div class="feed">
              <div
                v-for="item in feed"
                :key="item.id"
                class="feed-item"
                :class="item.level.toLowerCase()"
                @click="router.push(`/events/${item.id}`)"
              >
                <span class="feed-rail"></span>
                <div class="feed-body">
                  <div class="feed-top">
                    <span class="level-badge" :class="item.level.toLowerCase()">{{ item.level }}</span>
                    <span class="feed-title">{{ item.title }}</span>
                    <span class="status-pill">{{ item.status }}</span>
                  </div>
                  <div class="feed-line">{{ item.elderName }} · {{ item.address }} {{ item.roomName }}</div>
                  <div class="feed-line muted">
                    {{ item.deviceName }} · {{ item.occurredAt }} · 置信度 {{ item.confidence }}%
                    <b class="wait">等待 {{ waitText(item.occurredMinutesAgo) }}</b>
                  </div>
                </div>
              </div>
              <div v-if="feed.length === 0" class="panel-empty feed-empty">当前无待处置事件</div>
            </div>
            <div class="panel-footer">驾驶舱只读，处置请进入事件中心</div>
          </section>
        </div>

        <div class="screen-bottom">
          <section class="panel trend-panel">
            <div class="panel-head">
              <div class="panel-title"><i></i>24 小时事件趋势</div>
              <div class="trend-meta">
                <span>峰值 <b>{{ trendPeak }}</b> 起</span>
                <span>累计 <b>{{ trendTotal }}</b> 起</span>
                <div class="trend-legend">
                  <span><i class="legend l1"></i>L1</span>
                  <span><i class="legend l2"></i>L2</span>
                  <span><i class="legend l3"></i>L3</span>
                </div>
              </div>
            </div>
            <div class="trend-chart">
              <div class="trend-lines"><i v-for="line in 4" :key="line"></i></div>
              <div class="trend-cols">
                <div v-for="(point, index) in trendBars" :key="point.hour" class="trend-col">
                  <div class="trend-stack" :title="`${point.hour} 共 ${point.total} 起（L3 ${point.l3} / L2 ${point.l2} / L1 ${point.l1}）`">
                    <span class="seg l3" :style="{ height: point.l3Height }"></span>
                    <span class="seg l2" :style="{ height: point.l2Height }"></span>
                    <span class="seg l1" :style="{ height: point.l1Height }"></span>
                  </div>
                  <div class="trend-hour">{{ index % 3 === 0 ? `${point.hour.slice(0, 2)}时` : '' }}</div>
                </div>
              </div>
              <div v-if="trendEmpty" class="panel-empty chart-empty">当前范围今日暂无事件</div>
            </div>
          </section>

          <section class="panel ranking-panel">
            <div class="panel-head">
              <div class="panel-title"><i></i>{{ scopeCommunity ? '网格风险排名' : '社区风险排名' }}</div>
              <span class="panel-note">按 L3 与待处置排序</span>
            </div>
            <div class="ranking">
              <div class="rank-list">
                <div v-for="(item, index) in ranking" :key="item.name" class="rank-item">
                  <span class="rank-index" :class="{ top: index < 2 }">{{ index + 1 }}</span>
                  <div class="rank-main">
                    <div class="rank-top">
                      <span class="rank-name">{{ item.name }}</span>
                      <span class="rank-value" :class="{ warn: item.warn }">{{ item.value }}</span>
                    </div>
                    <div class="rank-sub">{{ item.sub }}</div>
                    <div class="rank-track">
                      <div class="rank-bar" :class="{ warn: item.warn }" :style="{ width: `${item.percent}%` }"></div>
                    </div>
                  </div>
                </div>
                <div v-if="ranking.length === 0" class="panel-empty">暂无排名数据</div>
              </div>
              <div class="rank-footer">
                {{ scopeCommunity
                  ? `当前社区 ${ranking.length} 个网格进入排名`
                  : `覆盖 ${scopeInfo.communities} 个社区 · ${scopeInfo.grids} 个网格` }}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div v-if="!ready" class="loading-mask">
        <div class="loading-ring"></div>
        <div class="loading-text">正在加载驾驶舱…</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.12), transparent 55%),
    linear-gradient(180deg, #07192d 0%, #030b16 100%);
}

.stage {
  position: relative;
  flex-shrink: 0;
  transform-origin: center center;
  overflow: hidden;
  color: #e6f4ff;
  font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
  font-variant-numeric: tabular-nums;
}

.stage-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% -12%, rgba(56, 189, 248, 0.2), transparent 55%),
    radial-gradient(ellipse at 4% 100%, rgba(59, 130, 246, 0.12), transparent 45%),
    radial-gradient(ellipse at 96% 100%, rgba(52, 211, 153, 0.08), transparent 42%),
    linear-gradient(180deg, #07192d 0%, #051222 52%, #030b16 100%);
}

.stage-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 35%, #000 25%, transparent 82%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 35%, #000 25%, transparent 82%);
}

.screen {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 20px;
  transition: opacity 0.3s ease;
}

.screen.loading {
  opacity: 0.35;
}

/* ---------- header ---------- */
.screen-header {
  display: flex;
  align-items: center;
  gap: 24px;
  height: var(--h-header, 72px);
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.brand-mark {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: #03101f;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8 55%, #34d399);
  box-shadow: 0 0 28px rgba(56, 189, 248, 0.45);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.brand-text h1 {
  margin: 0;
  font-size: 30px;
  line-height: 40px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #ffffff 0%, #bae6fd 45%, #38bdf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 13px;
  color: #8fb3d9;
}

.brand-sub i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.6);
}

.scope-switcher {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scope-trigger {
  position: relative;
  z-index: 22;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 212px;
  height: 52px;
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.22);
  background: rgba(12, 30, 51, 0.72);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.scope-trigger:hover,
.scope-trigger.open {
  border-color: rgba(56, 189, 248, 0.7);
  background: rgba(56, 189, 248, 0.1);
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.16);
}

.scope-caption {
  font-size: 10px;
  letter-spacing: 1px;
  color: #7196bd;
}

.scope-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.scope-value {
  max-width: 168px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #e6f4ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scope-arrow {
  font-size: 10px;
  color: #7dd3fc;
  transition: transform 0.2s;
}

.scope-trigger.open .scope-arrow {
  transform: rotate(180deg);
}

.scope-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(2, 10, 21, 0.35);
}

.scope-panel {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  z-index: 21;
  width: 460px;
  max-height: 560px;
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(8, 24, 42, 0.98);
  box-shadow: 0 20px 50px rgba(2, 10, 21, 0.75), 0 0 26px rgba(56, 189, 248, 0.14);
  transform: translateX(-50%);
  backdrop-filter: blur(8px);
}

.scope-search {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.25);
  background: rgba(12, 30, 51, 0.9);
}

.scope-search-icon {
  font-size: 14px;
  color: #7196bd;
}

.scope-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e6f4ff;
  font-size: 14px;
  font-family: inherit;
}

.scope-input::placeholder {
  color: #5f83a8;
}

.scope-total {
  flex-shrink: 0;
  font-size: 11px;
  color: #7196bd;
  white-space: nowrap;
}

.scope-list {
  flex: 1;
  min-height: 0;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
}

.scope-list::-webkit-scrollbar {
  width: 4px;
}

.scope-list::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 2px;
}

.scope-option {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: rgba(143, 179, 217, 0.05);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}

.scope-option:hover {
  border-color: rgba(56, 189, 248, 0.3);
  background: rgba(56, 189, 248, 0.1);
}

.scope-option.active {
  border-color: rgba(56, 189, 248, 0.5);
  background: rgba(56, 189, 248, 0.14);
}

.option-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 14px;
  font-weight: 600;
  color: #e6f4ff;
}

.option-meta {
  font-size: 11px;
  color: #7196bd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-l3 {
  flex-shrink: 0;
  padding: 0 7px;
  border-radius: 9px;
  background: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
  font-size: 10px;
  line-height: 17px;
}

.option-check {
  flex-shrink: 0;
  font-size: 13px;
  color: #38bdf8;
}

.scope-empty {
  padding: 28px 0;
  text-align: center;
  font-size: 12px;
  color: #7196bd;
}

.scope-footer {
  flex-shrink: 0;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(56, 189, 248, 0.12);
  font-size: 10px;
  color: #5f83a8;
  text-align: right;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-shrink: 0;
}

.clock-block {
  text-align: right;
}

.clock-date {
  font-size: 12px;
  color: #7196bd;
  letter-spacing: 0.5px;
}

.clock-time {
  font-size: 24px;
  line-height: 30px;
  font-weight: 600;
  color: #e6f4ff;
  letter-spacing: 1px;
  text-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
}

.update-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 18px;
  border-left: 1px solid rgba(56, 189, 248, 0.18);
}

.update-label {
  font-size: 11px;
  color: #7196bd;
}

.update-time {
  font-size: 13px;
  color: #9dc0e3;
  letter-spacing: 0.5px;
}

.update-block.active .update-time {
  color: #38bdf8;
}

.ghost-btn {
  height: 38px !important;
  padding: 0 16px !important;
  font-size: 14px !important;
  color: #cfe8ff !important;
  background: rgba(12, 30, 51, 0.72) !important;
  border-color: rgba(56, 189, 248, 0.28) !important;
}

.ghost-btn:hover {
  color: #38bdf8 !important;
  border-color: #38bdf8 !important;
}

/* ---------- alert ---------- */
.alert-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 46px;
  flex-shrink: 0;
  padding: 0 20px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  background: rgba(10, 26, 45, 0.7);
  font-size: 14px;
  overflow: hidden;
}

.alert-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.8);
  flex-shrink: 0;
}

.alert-main {
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.alert-sub {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #8fb3d9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-action {
  height: 28px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(248, 113, 113, 0.7);
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
  font-size: 12px;
  cursor: pointer;
}

.alert-bar.calm {
  border-color: rgba(52, 211, 153, 0.2);
  background: rgba(52, 211, 153, 0.06);
}

.alert-bar.calm .alert-main {
  color: #a7f3d0;
}

.alert-bar.danger {
  border-color: rgba(248, 113, 113, 0.42);
  background: linear-gradient(90deg, rgba(248, 113, 113, 0.2), rgba(248, 113, 113, 0.06) 60%, transparent);
}

.alert-bar.danger .alert-dot {
  background: #f87171;
  box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.6);
  animation: pulseDot 1.6s infinite;
}

.alert-bar.danger .alert-main {
  color: #fecaca;
}

.alert-bar.offline {
  border-color: rgba(251, 191, 36, 0.42);
  background: rgba(251, 191, 36, 0.1);
}

.alert-bar.offline .alert-dot {
  background: #fbbf24;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
}

.alert-bar.offline .alert-main {
  color: #fde68a;
}

@keyframes pulseDot {
  0% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.6); }
  70% { box-shadow: 0 0 0 10px rgba(248, 113, 113, 0); }
  100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
}

/* ---------- kpi ---------- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  height: var(--h-kpi, 122px);
  flex-shrink: 0;
}

.kpi-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 14px 18px 12px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-left: 3px solid rgba(56, 189, 248, 0.55);
  background:
    linear-gradient(180deg, rgba(56, 189, 248, 0.07), transparent 70%),
    rgba(10, 26, 45, 0.82);
  overflow: hidden;
}

.kpi-card::after {
  content: '';
  position: absolute;
  right: -30px;
  top: -30px;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.16), transparent 70%);
}

.kpi-label {
  font-size: 13px;
  letter-spacing: 1px;
  color: #8fb3d9;
}

.kpi-value {
  margin-top: 4px;
  font-size: 42px;
  line-height: 46px;
  font-weight: 700;
  color: #f1f9ff;
  letter-spacing: 1px;
}

.kpi-value em {
  margin-left: 4px;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  color: #8fb3d9;
}

.kpi-hint {
  margin-top: 2px;
  font-size: 12px;
  color: #7196bd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-card.cyan { border-left-color: #38bdf8; }
.kpi-card.blue { border-left-color: #3b82f6; }
.kpi-card.green { border-left-color: #34d399; }
.kpi-card.amber { border-left-color: #fbbf24; }
.kpi-card.red { border-left-color: #f87171; }

.kpi-card.cyan .kpi-value { color: #7dd3fc; }
.kpi-card.blue .kpi-value { color: #93c5fd; }
.kpi-card.green .kpi-value { color: #6ee7b7; }
.kpi-card.amber .kpi-value { color: #fbbf24; }
.kpi-card.red .kpi-value { color: #fca5a5; }

.kpi-card.danger {
  border-color: rgba(248, 113, 113, 0.34);
  border-left-color: #f87171;
  background:
    linear-gradient(180deg, rgba(248, 113, 113, 0.16), transparent 72%),
    rgba(30, 16, 24, 0.7);
}

.kpi-card.danger .kpi-value {
  color: #f87171;
  animation: dangerGlow 2s infinite;
}

.kpi-card.danger .kpi-label {
  color: #fca5a5;
}

@keyframes dangerGlow {
  0%, 100% { text-shadow: 0 0 0 rgba(248, 113, 113, 0); }
  50% { text-shadow: 0 0 18px rgba(248, 113, 113, 0.75); }
}

/* ---------- panels ---------- */
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 14px 16px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  background: linear-gradient(180deg, rgba(11, 28, 48, 0.9), rgba(7, 19, 33, 0.86));
  box-shadow: inset 0 1px 0 rgba(56, 189, 248, 0.06);
}

.panel::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.65), transparent);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  margin-bottom: 10px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #e6f4ff;
}

.panel-title i {
  width: 3px;
  height: 15px;
  border-radius: 2px;
  background: linear-gradient(180deg, #7dd3fc, #38bdf8);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.7);
}

.panel-note {
  font-size: 12px;
  color: #7196bd;
}

.panel-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #7196bd;
}

.panel-footer {
  flex-shrink: 0;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(56, 189, 248, 0.12);
  font-size: 10px;
  line-height: 14px;
  color: #7196bd;
  text-align: right;
}

/* ---------- main ---------- */
.screen-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr) 420px;
  gap: 14px;
}

.side-col {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 14px;
  min-height: 0;
}

/* risk */
.risk-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 0;
}

.donut {
  position: relative;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  flex-shrink: 0;
  filter: drop-shadow(0 0 14px rgba(56, 189, 248, 0.18));
}

.donut-hole {
  position: absolute;
  inset: 26px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #08192b;
  border: 1px solid rgba(56, 189, 248, 0.16);
}

.donut-value {
  font-size: 30px;
  font-weight: 700;
  color: #e6f4ff;
  line-height: 34px;
}

.donut-label {
  font-size: 12px;
  color: #8fb3d9;
}

.risk-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.risk-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.risk-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.risk-name {
  color: #9dc0e3;
  width: 48px;
}

.risk-count {
  font-size: 20px;
  font-weight: 600;
  color: #e6f4ff;
  flex: 1;
}

.risk-percent {
  font-size: 13px;
  color: #7196bd;
}

/* devices */
.device-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 4px;
  min-height: 0;
}

.device-row {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) 52px 52px;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.device-name {
  color: #cfe8ff;
  white-space: nowrap;
}

.device-rate {
  font-size: 14px;
  font-weight: 600;
  color: #34d399;
  text-align: right;
}

.device-rate.warn {
  color: #fbbf24;
}

.device-track {
  height: 7px;
  border-radius: 4px;
  background: rgba(143, 179, 217, 0.14);
  overflow: hidden;
}

.device-bar {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.6), #38bdf8);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
}

.device-bar.warn {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.6), #fbbf24);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
}

.device-meta {
  font-size: 11px;
  color: #7196bd;
  text-align: right;
  white-space: nowrap;
}

/* map */
.map-panel {
  overflow: hidden;
}

.map-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: #8fb3d9;
}

.map-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}

.dot.high { background: #f87171; }
.dot.mid { background: #fbbf24; }
.dot.low { background: #34d399; }
.dot.pulse {
  border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.18);
  animation: pulseDot 1.8s infinite;
}

.map-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 10px;
}

.map-chip {
  height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border-radius: 3px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  background: rgba(56, 189, 248, 0.06);
  font-size: 12px;
  color: #9dc0e3;
}

.map-chip b {
  font-size: 15px;
  color: #7dd3fc;
}

.map-chip.warn {
  border-color: rgba(248, 113, 113, 0.28);
  background: rgba(248, 113, 113, 0.08);
}

.map-chip.warn b {
  color: #fca5a5;
}

.map-chip.muted {
  margin-left: auto;
  border-color: transparent;
  background: transparent;
  color: #7196bd;
}

.map-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-bottom: 30px;
}

.map-grid.has-detail {
  padding-bottom: 174px;
}

.map-grid::-webkit-scrollbar {
  width: 4px;
}

.map-grid::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 2px;
}

.map-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 12px;
  min-height: 0;
  padding: 12px 14px;
  border-radius: 3px;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  color: #e6f4ff;
  transition: transform 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.map-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 14px 14px;
  pointer-events: none;
  opacity: 0.5;
}

.map-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(2, 10, 21, 0.5);
}

.map-tile.selected {
  border-color: #38bdf8 !important;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.5), 0 0 20px rgba(56, 189, 248, 0.25);
}

.tile-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.tile-community {
  padding: 0 7px;
  border-radius: 9px;
  border: 1px solid rgba(230, 244, 255, 0.22);
  font-size: 10px;
  line-height: 17px;
  color: rgba(230, 244, 255, 0.75);
  white-space: nowrap;
}

.tile-l3 {
  padding: 0 7px;
  border-radius: 9px;
  font-size: 10px;
  line-height: 17px;
  color: #fee2e2;
  background: rgba(248, 113, 113, 0.55);
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.5);
  animation: dangerGlow 1.8s infinite;
  white-space: nowrap;
}

.tile-body {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.tile-main {
  min-width: 0;
}

.tile-name {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #ffffff;
  white-space: nowrap;
}

.tile-score {
  font-size: 40px;
  line-height: 40px;
  font-weight: 700;
  color: #ffffff;
  text-align: right;
  text-shadow: 0 0 16px rgba(2, 10, 21, 0.6);
  white-space: nowrap;
}

.tile-score em {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-style: normal;
  font-weight: 400;
  text-align: right;
  color: rgba(230, 244, 255, 0.6);
}

.tile-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
  font-size: 11px;
  color: rgba(230, 244, 255, 0.7);
  white-space: nowrap;
}

.tile-meta .warn {
  color: #fbbf24;
}

.map-detail {
  position: absolute;
  right: 16px;
  bottom: 40px;
  z-index: 2;
  width: 360px;
  padding: 14px 16px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(8, 24, 42, 0.96);
  box-shadow: 0 12px 32px rgba(2, 10, 21, 0.7), 0 0 22px rgba(56, 189, 248, 0.12);
  backdrop-filter: blur(6px);
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.detail-name {
  font-size: 15px;
  font-weight: 600;
  color: #e6f4ff;
}

.detail-risk {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
}

.detail-risk.risk-high {
  color: #fecaca;
  background: rgba(248, 113, 113, 0.2);
}

.detail-risk.risk-mid {
  color: #fde68a;
  background: rgba(251, 191, 36, 0.18);
}

.detail-risk.risk-low {
  color: #a7f3d0;
  background: rgba(52, 211, 153, 0.18);
}

.detail-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 12px 0;
}

.detail-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-metric b {
  font-size: 22px;
  line-height: 26px;
  color: #7dd3fc;
}

.detail-metric span {
  font-size: 11px;
  color: #7196bd;
}

.detail-link {
  width: 100%;
  height: 30px;
  border-radius: 3px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.1);
  color: #7dd3fc;
  font-size: 12px;
  cursor: pointer;
}

.detail-link:hover {
  background: rgba(56, 189, 248, 0.2);
}

.map-footer {
  flex-shrink: 0;
  margin-top: 6px;
  font-size: 11px;
  color: #5f83a8;
}

/* feed */
.event-panel {
  overflow: hidden;
}

.feed {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  overflow: auto;
}

.feed::-webkit-scrollbar {
  width: 4px;
}

.feed::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 2px;
}

.feed-item {
  position: relative;
  display: flex;
  gap: 9px;
  padding: 6px 10px 6px 8px;
  border-radius: 3px;
  border: 1px solid rgba(143, 179, 217, 0.12);
  background: rgba(143, 179, 217, 0.05);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.feed-item:hover {
  border-color: rgba(56, 189, 248, 0.45);
  background: rgba(56, 189, 248, 0.08);
}

.feed-item.l3 {
  border-color: rgba(248, 113, 113, 0.36);
  background: linear-gradient(90deg, rgba(248, 113, 113, 0.16), rgba(248, 113, 113, 0.04));
  box-shadow: inset 0 0 18px rgba(248, 113, 113, 0.06);
}

.feed-rail {
  width: 3px;
  border-radius: 2px;
  background: rgba(143, 179, 217, 0.3);
  flex-shrink: 0;
}

.feed-item.l3 .feed-rail {
  background: #f87171;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.8);
}

.feed-item.l2 .feed-rail {
  background: #fbbf24;
}

.feed-body {
  flex: 1;
  min-width: 0;
}

.feed-top {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 18px;
}

.level-badge {
  padding: 0 6px;
  border-radius: 2px;
  font-size: 10px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.level-badge.l3 {
  color: #fff1f2;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.55);
}

.level-badge.l2 {
  color: #3b2503;
  background: #fbbf24;
}

.level-badge.l1 {
  color: #061225;
  background: #60a5fa;
}

.feed-title {
  font-size: 14px;
  line-height: 18px;
  font-weight: 600;
  color: #e6f4ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-pill {
  margin-left: auto;
  padding: 0 8px;
  border-radius: 9px;
  border: 1px solid rgba(251, 191, 36, 0.4);
  font-size: 10px;
  line-height: 16px;
  color: #fbbf24;
  white-space: nowrap;
  flex-shrink: 0;
}

.feed-line {
  margin-top: 1px;
  font-size: 11px;
  line-height: 15px;
  color: #9dc0e3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-line.muted {
  color: #7196bd;
  font-size: 10px;
  line-height: 14px;
}

.feed-line .wait {
  margin-left: 6px;
  color: #fbbf24;
  font-weight: 500;
}

.feed-item.l3 .feed-line .wait {
  color: #fca5a5;
}

.feed-empty {
  min-height: 120px;
}

/* trend */
.trend-panel {
  min-height: 0;
}

.trend-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #7196bd;
}

.trend-meta b {
  font-size: 15px;
  color: #7dd3fc;
}

.trend-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 14px;
  border-left: 1px solid rgba(56, 189, 248, 0.18);
}

.trend-legend span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.legend.l1 { background: #60a5fa; }
.legend.l2 { background: #fbbf24; }
.legend.l3 { background: #f87171; }

.trend-chart {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 4px;
}

.trend-lines {
  position: absolute;
  inset: 4px 0 22px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.trend-lines i {
  height: 1px;
  background: rgba(56, 189, 248, 0.09);
}

.trend-cols {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 3px;
}

.trend-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.trend-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 2px 2px 0 0;
  overflow: hidden;
}

.trend-stack .seg {
  width: 100%;
  min-height: 0;
  transition: height 0.3s ease;
}

.seg.l1 { background: linear-gradient(180deg, #60a5fa, rgba(96, 165, 250, 0.55)); }
.seg.l2 { background: linear-gradient(180deg, #fbbf24, rgba(251, 191, 36, 0.55)); }
.seg.l3 { background: linear-gradient(180deg, #f87171, rgba(248, 113, 113, 0.55)); }

.trend-hour {
  height: 18px;
  line-height: 18px;
  font-size: 10px;
  color: #5f83a8;
  text-align: center;
  white-space: nowrap;
}

.chart-empty {
  position: absolute;
  inset: 0;
  font-size: 13px;
  color: #7196bd;
  pointer-events: none;
}

/* ranking */
.ranking {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.rank-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.rank-footer {
  flex-shrink: 0;
  padding-top: 6px;
  border-top: 1px solid rgba(56, 189, 248, 0.1);
  font-size: 10px;
  color: #5f83a8;
  text-align: right;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 0;
}

.rank-index {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 700;
  color: #8fb3d9;
  background: rgba(143, 179, 217, 0.14);
}

.rank-index.top {
  color: #04121f;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8);
}

.rank-main {
  flex: 1;
  min-width: 0;
}

.rank-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rank-name {
  font-size: 13px;
  line-height: 17px;
  color: #e6f4ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-value {
  font-size: 12px;
  color: #7dd3fc;
  white-space: nowrap;
}

.rank-value.warn {
  color: #fca5a5;
}

.rank-sub {
  font-size: 10px;
  line-height: 14px;
  color: #7196bd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-track {
  height: 5px;
  margin-top: 3px;
  border-radius: 3px;
  background: rgba(143, 179, 217, 0.14);
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.5), #38bdf8);
}

.rank-bar.warn {
  background: linear-gradient(90deg, rgba(248, 113, 113, 0.5), #f87171);
}

/* bottom */
.screen-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 460px;
  gap: 14px;
  height: var(--h-bottom, 250px);
  flex-shrink: 0;
}

/* loading */
.loading-mask {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: rgba(3, 11, 22, 0.55);
}

.loading-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(56, 189, 248, 0.18);
  border-top-color: #38bdf8;
  animation: spin 0.9s linear infinite;
}

.loading-text {
  font-size: 14px;
  letter-spacing: 2px;
  color: #8fb3d9;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
