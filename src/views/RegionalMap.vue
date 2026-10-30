<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  AlertOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  DownloadOutlined,
  HomeOutlined,
  ReloadOutlined,
  TeamOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import GridDetailDrawer from '@/components/GridDetailDrawer.vue'
import { demoState } from '@/composables/useAppState'
import {
  allGrids,
  communityStats,
  deviceOnlineStats,
  districtMetrics,
  eventTrend,
  formatNumber,
  getCommunity,
  getGrid,
  recentEvents,
  riskSlices,
  scopeSummary,
  tagStats,
  type CommunityStat,
  type GridStat,
} from '@/mock/analytics'
import { elders } from '@/mock/elders'
import { devices } from '@/mock/devices'
import { levelColor, statusColor, type EventLevel, type EventStatus } from '@/mock/events'

const router = useRouter()
const { message, modal } = App.useApp()

const scopeCommunity = ref('')
const rankingType = ref<'event' | 'risk' | 'online'>('event')
const selectedGridId = ref('')
const drawerOpen = ref(false)
const refreshing = ref(false)
const updatedAt = ref(formatTime(new Date()))

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

onMounted(() => {
  updatedAt.value = formatTime(new Date())
})

const currentCommunity = computed(() =>
  scopeCommunity.value ? getCommunity(scopeCommunity.value) : null,
)

const metrics = computed(() => {
  if (demoState.value === 'empty') {
    return {
      elders: 0,
      highRisk: 0,
      onlineRate: 0,
      eventsToday: 0,
      closureRate: 0,
      households: 0,
      devices: 0,
      grids: 0,
    }
  }
  const community = currentCommunity.value
  if (community) {
    return {
      elders: community.elders,
      highRisk: community.highRisk,
      onlineRate: community.onlineRate,
      eventsToday: community.eventsToday,
      closureRate: community.closureRate,
      households: community.households,
      devices: community.devices,
      grids: community.grids.length,
    }
  }
  return {
    elders: districtMetrics.elders,
    highRisk: districtMetrics.highRisk,
    onlineRate: districtMetrics.onlineRate,
    eventsToday: districtMetrics.eventsToday,
    closureRate: districtMetrics.closureRate,
    households: districtMetrics.households,
    devices: districtMetrics.devices,
    grids: districtMetrics.grids,
  }
})

const visibleCommunities = computed<CommunityStat[]>(() => {
  if (scopeCommunity.value) {
    const community = getCommunity(scopeCommunity.value)
    return community ? [community] : []
  }
  return communityStats
})

const selectedGrid = computed<GridStat | null>(() => getGrid(selectedGridId.value) ?? null)

const scopeGrids = computed(() =>
  scopeCommunity.value ? currentCommunity.value?.grids ?? [] : allGrids,
)

const rankingItems = computed(() => {
  if (scopeCommunity.value) {
    return currentCommunity.value?.grids.map((grid) => ({
      id: grid.id,
      name: grid.name,
      sub: `${grid.elders} 位老人 · 在线 ${grid.onlineRate}%`,
      event: grid.l3Pending * 100 + grid.pendingEvents,
      risk: grid.highRisk,
      online: grid.onlineRate,
      type: 'grid' as const,
      grid,
    })) ?? []
  }
  return communityStats.map((community) => ({
    id: community.name,
    name: community.name,
    sub: `${community.elders} 位老人 · ${community.grids.length} 个网格`,
    event: community.l3Pending * 100 + community.pendingEvents,
    risk: community.highRisk,
    online: community.onlineRate,
    type: 'community' as const,
    grid: null,
  }))
})

const sortedRanking = computed(() => {
  const list = [...rankingItems.value]
  if (rankingType.value === 'online') return list.sort((a, b) => a.online - b.online)
  if (rankingType.value === 'risk') return list.sort((a, b) => b.risk - a.risk)
  return list.sort((a, b) => b.event - a.event)
})

const maxRanking = computed(() => {
  const values = sortedRanking.value.map((item) =>
    rankingType.value === 'online' ? 100 : rankingType.value === 'risk' ? item.risk : item.event,
  )
  return Math.max(1, ...values)
})

function rankingValue(item: (typeof rankingItems.value)[number]) {
  if (rankingType.value === 'online') return `${item.online}%`
  if (rankingType.value === 'risk') return `${item.risk} 人`
  return `${item.event % 100} 起`
}

function rankingPercent(item: (typeof rankingItems.value)[number]) {
  if (rankingType.value === 'online') return item.online
  const value = rankingType.value === 'risk' ? item.risk : item.event
  return Math.round((value / maxRanking.value) * 100)
}

const scopedTrend = computed(() => {
  if (scopeCommunity.value && (currentCommunity.value?.eventsToday ?? 0) === 0) {
    return eventTrend.map((item) => ({ ...item, l1: 0, l2: 0, l3: 0 }))
  }
  return eventTrend
})

const trendMax = computed(() => Math.max(1, ...scopedTrend.value.map((item) => item.l1 + item.l2 + item.l3)))

const trendBars = computed(() =>
  scopedTrend.value.map((item) => {
    const total = item.l1 + item.l2 + item.l3
    const scale = (value: number) => Math.round((value / trendMax.value) * 100)
    return {
      ...item,
      total,
      l1Height: scale(item.l1),
      l2Height: scale(item.l2),
      l3Height: scale(item.l3),
    }
  }),
)

const topTags = computed(() => tagStats.slice(0, 5))

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
  const toPercent = (value: number) => (total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0)
  return [
    { label: '高风险', value: high, percent: toPercent(high), color: '#D64545' },
    { label: '中风险', value: medium, percent: toPercent(medium), color: '#D97706' },
    { label: '低风险', value: low, percent: toPercent(low), color: '#2E9E5B' },
  ]
})

const scopedTagStats = computed(() => {
  const map = new Map<string, number>()
  scopedElders.value.forEach((elder) => {
    elder.riskTags.forEach((tag) => map.set(tag, (map.get(tag) ?? 0) + 1))
  })
  return [...map.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / Math.max(1, scopedElders.value.length)) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const scopedTags = computed(() => (scopeCommunity.value ? scopedTagStats.value : topTags.value))

const scopedDevices = computed(() => {
  if (!scopeCommunity.value) return devices.filter((item) => item.enabled)
  const ids = new Set(scopedElders.value.map((item) => item.id))
  return devices.filter((item) => item.enabled && ids.has(item.elderId))
})

const scopedDeviceStats = computed(() => {
  const types = [...new Set(scopedDevices.value.map((item) => item.type))]
  return types
    .map((type) => {
      const list = scopedDevices.value.filter((item) => item.type === type)
      const online = list.filter((item) => item.status === '在线').length
      return {
        type,
        total: list.length,
        online,
        rate: list.length > 0 ? Number(((online / list.length) * 100).toFixed(1)) : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
})

function selectCommunity(name: string) {
  scopeCommunity.value = name
  selectedGridId.value = ''
}

function resetScope() {
  scopeCommunity.value = ''
  selectedGridId.value = ''
}

function openGrid(grid: GridStat) {
  selectedGridId.value = grid.id
  drawerOpen.value = true
}

function handleRankingClick(item: (typeof rankingItems.value)[number]) {
  if (item.type === 'grid' && item.grid) {
    openGrid(item.grid)
    return
  }
  selectCommunity(item.name)
}

function refresh() {
  refreshing.value = true
  window.setTimeout(() => {
    updatedAt.value = formatTime(new Date())
    refreshing.value = false
    message.success('区域数据已刷新')
  }, 520)
}

function goMetric(path: string) {
  const query: Record<string, string> = {}
  if (scopeCommunity.value) query.community = scopeCommunity.value
  router.push({ path, query })
}

function goDashboard() {
  router.push('/dashboard')
}

function handleExport() {
  modal.confirm({
    title: '导出区域指标',
    content: '将导出当前区域指标、社区/网格排名与指标口径，民政视角自动脱敏，操作会记录审计日志。',
    okText: '确认导出',
    cancelText: '取消',
    onOk: () => message.success('导出任务已创建，文件生成后可在导出记录中下载'),
  })
}

const recent = computed(() =>
  recentEvents
    .filter((item) => !scopeCommunity.value || item.address.includes(scopeCommunity.value))
    .slice(0, 5),
)
const deviceTop = computed(() =>
  scopeCommunity.value ? scopedDeviceStats.value : deviceOnlineStats.slice(0, 5),
)
const riskTotal = computed(() => scopedRiskSlices.value.reduce((sum, item) => sum + item.value, 0))
</script>

<template>
  <AdminLayout>
    <div class="page map-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">区域治理一张图</h1>
          <p class="page-subtitle">
            {{ scopeSummary.district }} · {{ scopeSummary.street }} ·
            {{ scopeCommunity || `${scopeSummary.communityCount} 个社区 · ${scopeSummary.gridCount} 个网格` }}
          </p>
        </div>
        <div class="page-actions">
          <a-button @click="handleExport">
            <template #icon><DownloadOutlined /></template>
            导出
          </a-button>
          <a-button type="primary" @click="goDashboard">
            <template #icon><DashboardOutlined /></template>
            进入驾驶舱大屏
          </a-button>
        </div>
      </div>

      <div class="scope-bar card">
        <div class="scope-crumb">
          <a @click="resetScope">{{ scopeSummary.district }}</a>
          <span class="crumb-sep">/</span>
          <a @click="resetScope">{{ scopeSummary.street }}</a>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ scopeCommunity || '全部社区' }}</span>
        </div>
        <div class="level-tags">
          <a-tag :class="{ active: !scopeCommunity }" @click="resetScope">街道</a-tag>
          <a-tag :class="{ active: Boolean(scopeCommunity) }" @click="scopeCommunity || selectCommunity(communityStats[0]?.name ?? '')">社区</a-tag>
          <a-tag>网格</a-tag>
          <a-tag>楼栋</a-tag>
        </div>
        <a-select
          v-model:value="scopeCommunity"
          class="scope-select"
          allow-clear
          placeholder="全部社区"
          :options="[
            { value: '', label: '全部社区' },
            ...communityStats.map((item) => ({ value: item.name, label: item.name })),
          ]"
        />
        <span class="updated">更新于 {{ updatedAt }}</span>
        <a-button size="small" :loading="refreshing" @click="refresh">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>

      <div v-if="demoState === 'forbidden'" class="state-card card">
        <a-result status="403" title="当前账号无权查看该区域" sub-title="请切换授权区域，或联系项目管理员申请数据权限。">
          <template #extra>
            <a-button type="primary" @click="demoState = 'normal'">返回正常数据</a-button>
          </template>
        </a-result>
      </div>

      <div v-else-if="demoState === 'error'" class="state-card card">
        <a-result status="warning" title="区域数据加载失败" sub-title="请检查网络后重试，当前区域范围已保留。">
          <template #extra>
            <a-button type="primary" @click="demoState = 'normal'">重试</a-button>
          </template>
        </a-result>
      </div>

      <div v-else-if="demoState === 'loading'" class="state-card card">
        <a-skeleton active :paragraph="{ rows: 8 }" />
      </div>

      <template v-else>
        <div class="metric-grid">
          <div class="metric-card card" @click="goMetric('/elders')">
            <div class="metric-icon blue"><TeamOutlined /></div>
            <div>
              <div class="metric-label">服务老人</div>
              <div class="metric-value">{{ formatNumber(metrics.elders) }}</div>
              <div class="metric-hint">在册未归档</div>
            </div>
          </div>
          <div class="metric-card card" @click="goMetric('/elders')">
            <div class="metric-icon red"><WarningOutlined /></div>
            <div>
              <div class="metric-label">高风险老人</div>
              <div class="metric-value">{{ formatNumber(metrics.highRisk) }}</div>
              <div class="metric-hint">风险等级高风险</div>
            </div>
          </div>
          <div class="metric-card card" @click="goMetric('/devices')">
            <div class="metric-icon cyan"><WifiOutlined /></div>
            <div>
              <div class="metric-label">设备在线率</div>
              <div class="metric-value">{{ metrics.onlineRate }}%</div>
              <div class="metric-hint">在线 / 启用设备</div>
            </div>
          </div>
          <div class="metric-card card" @click="goMetric('/events')">
            <div class="metric-icon orange"><AlertOutlined /></div>
            <div>
              <div class="metric-label">今日事件</div>
              <div class="metric-value">{{ metrics.eventsToday }}</div>
              <div class="metric-hint">自然日</div>
            </div>
          </div>
          <div class="metric-card card" @click="goMetric('/events')">
            <div class="metric-icon green"><CheckCircleOutlined /></div>
            <div>
              <div class="metric-label">24h 闭环率</div>
              <div class="metric-value">{{ metrics.closureRate }}%</div>
              <div class="metric-hint">近 7 天 L2/L3</div>
            </div>
          </div>
          <div class="metric-card card" @click="goMetric('/devices')">
            <div class="metric-icon purple"><HomeOutlined /></div>
            <div>
              <div class="metric-label">设备覆盖户数</div>
              <div class="metric-value">{{ metrics.households }}</div>
              <div class="metric-hint">有启用设备的家庭</div>
            </div>
          </div>
        </div>

        <div class="main-grid">
          <div class="map-card card">
            <div class="card-head">
              <div>
                <div class="card-title">网格态势图</div>
                <div class="card-desc">颜色表示风险分，L3 未闭环网格带脉冲标记；点击网格查看详情</div>
              </div>
              <div class="map-legend">
                <span class="legend-item"><i class="dot high"></i>高风险</span>
                <span class="legend-item"><i class="dot mid"></i>中风险</span>
                <span class="legend-item"><i class="dot low"></i>低风险</span>
                <span class="legend-item"><i class="dot l3"></i>L3</span>
              </div>
            </div>

            <div v-if="scopeGrids.length === 0" class="empty-map">
              <a-empty description="该区域暂无网格数据" />
            </div>
            <div v-else class="community-groups">
              <div v-for="community in visibleCommunities" :key="community.name" class="community-group">
                <div class="community-head">
                  <span class="community-name">{{ community.name }}</span>
                  <span class="community-meta">{{ community.grids.length }} 个网格 · {{ community.elders }} 位老人</span>
                  <a class="community-link" @click="selectCommunity(community.name)">查看社区</a>
                </div>
                <div class="grid-cells">
                  <div
                    v-for="grid in community.grids"
                    :key="grid.id"
                    class="grid-cell"
                    :class="{
                      'risk-high': grid.riskScore >= 70,
                      'risk-mid': grid.riskScore >= 40 && grid.riskScore < 70,
                      'risk-low': grid.riskScore < 40,
                    }"
                    @click="openGrid(grid)"
                  >
                    <div class="grid-top">
                      <span class="grid-name">{{ grid.name }}</span>
                      <span v-if="grid.l3Pending > 0" class="l3-badge">L3 {{ grid.l3Pending }}</span>
                    </div>
                    <div class="grid-score">{{ grid.riskScore }}<span>分</span></div>
                    <div class="grid-meta">{{ grid.elders }} 人 · 离线 {{ grid.offlineDevices }}</div>
                    <div class="grid-bar">
                      <div :style="{ width: `${Math.min(100, grid.riskScore)}%` }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="map-footer">
              网格示意图，不代表真实地理边界；风险分 = 高风险占比 × 60 + L3 × 20 + 设备离线率 × 20。
            </div>
          </div>

          <aside class="side-panel">
            <div class="side-card card">
              <div class="card-head compact">
                <div class="card-title">{{ scopeCommunity ? '网格排名' : '社区排名' }}</div>
              </div>
              <a-tabs v-model:activeKey="rankingType" size="small" class="ranking-tabs">
                <a-tab-pane key="event" tab="事件" />
                <a-tab-pane key="risk" tab="高风险" />
                <a-tab-pane key="online" tab="在线率" />
              </a-tabs>
              <div class="ranking-list">
                <div
                  v-for="(item, index) in sortedRanking.slice(0, 5)"
                  :key="item.id"
                  class="ranking-item"
                  @click="handleRankingClick(item)"
                >
                  <div class="rank-index" :class="{ top: index < 3 }">{{ index + 1 }}</div>
                  <div class="rank-main">
                    <div class="rank-name">{{ item.name }}</div>
                    <div class="rank-sub">{{ item.sub }}</div>
                    <div class="rank-track">
                      <div class="rank-bar" :class="{ warn: rankingType === 'online' && item.online < 95 }" :style="{ width: `${rankingPercent(item)}%` }"></div>
                    </div>
                  </div>
                  <div class="rank-value">{{ rankingValue(item) }}</div>
                </div>
              </div>
            </div>

            <div class="side-card card">
              <div class="card-head compact">
                <div class="card-title">风险结构</div>
                <span class="text-weak">{{ formatNumber(riskTotal) }} 人</span>
              </div>
              <div class="risk-list">
                <div v-for="item in scopedRiskSlices" :key="item.label" class="risk-row">
                  <span class="risk-label"><i :style="{ background: item.color }"></i>{{ item.label }}</span>
                  <div class="risk-track">
                    <div class="risk-bar" :style="{ width: `${item.percent}%`, background: item.color }"></div>
                  </div>
                  <span class="risk-value">{{ item.percent }}%</span>
                </div>
              </div>
              <div class="tag-title">高频风险标签</div>
              <div class="tag-list">
                <a-tag v-for="tag in scopedTags" :key="tag.label" color="blue">{{ tag.label }} {{ tag.count }}</a-tag>
              </div>
            </div>
          </aside>
        </div>

        <div class="bottom-grid">
          <div class="bottom-card card">
            <div class="card-head compact">
              <div class="card-title">24 小时事件趋势</div>
              <span class="text-weak">L1 + L2 + L3</span>
            </div>
            <div class="trend-chart">
              <div v-for="(point, index) in trendBars" :key="point.hour" class="trend-col">
                <div class="trend-stack">
                  <div class="trend-seg l3" :style="{ height: `${point.l3Height}%` }"></div>
                  <div class="trend-seg l2" :style="{ height: `${point.l2Height}%` }"></div>
                  <div class="trend-seg l1" :style="{ height: `${point.l1Height}%` }"></div>
                </div>
                <div class="trend-hour">{{ index % 4 === 0 ? point.hour.slice(0, 2) : '' }}</div>
              </div>
            </div>
            <div class="trend-legend">
              <span><i class="legend l1"></i>L1</span>
              <span><i class="legend l2"></i>L2</span>
              <span><i class="legend l3"></i>L3</span>
            </div>
          </div>

          <div class="bottom-card card">
            <div class="card-head compact">
              <div class="card-title">设备在线态势</div>
              <a class="card-link" @click="goMetric('/devices')">离线清单</a>
            </div>
            <div class="device-list">
              <div v-for="item in deviceTop" :key="item.type" class="device-row">
                <div class="device-label">{{ item.type }}</div>
                <div class="device-track">
                  <div class="device-bar" :class="{ warn: item.rate < 95 }" :style="{ width: `${item.rate}%` }"></div>
                </div>
                <div class="device-value">{{ item.online }}/{{ item.total }}</div>
              </div>
            </div>
          </div>

          <div class="bottom-card card">
            <div class="card-head compact">
              <div class="card-title">最近事件</div>
              <a class="card-link" @click="router.push('/events')">查看全部</a>
            </div>
            <div class="event-list">
              <div
                v-for="item in recent"
                :key="item.id"
                class="event-row"
                @click="router.push(`/events/${item.id}`)"
              >
                <a-tag :color="levelColor[item.level as EventLevel]">{{ item.level }}</a-tag>
                <div class="event-main">
                  <div class="event-title">{{ item.title }}</div>
                  <div class="event-meta">{{ item.elderName }} · {{ item.occurredAt }} · {{ item.deviceName }}</div>
                </div>
                <a-tag :color="statusColor[item.status as EventStatus]">{{ item.status }}</a-tag>
              </div>
              <div v-if="recent.length === 0" class="empty-inline">当前范围暂无待处置事件</div>
            </div>
          </div>
        </div>
      </template>

      <GridDetailDrawer
        :open="drawerOpen"
        :grid="selectedGrid"
        @update:open="drawerOpen = $event"
      />
    </div>
  </AdminLayout>
</template>

<style scoped>
.map-page {
  padding-bottom: 32px;
}

.scope-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 10px 18px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.scope-crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.scope-crumb a {
  color: var(--elder-primary);
}

.crumb-sep {
  color: var(--elder-text-weak);
}

.crumb-current {
  font-weight: 600;
  color: var(--elder-text);
}

.level-tags {
  display: flex;
  align-items: center;
  gap: 4px;
}

.level-tags :deep(.ant-tag) {
  cursor: pointer;
  margin-inline-end: 0;
}

.level-tags :deep(.ant-tag.active) {
  border-color: var(--elder-primary);
  color: var(--elder-primary);
  background: #eaf1fe;
}

.scope-select {
  width: 150px;
}

.updated {
  margin-left: auto;
  font-size: 11px;
  color: var(--elder-text-weak);
}

.state-card {
  padding: 32px;
  margin-top: 16px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 104px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.metric-card:hover {
  border-color: var(--elder-primary);
}

.metric-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.metric-icon.blue {
  background: #eaf1fe;
  color: #1f6feb;
}

.metric-icon.red {
  background: #fdecec;
  color: #d64545;
}

.metric-icon.cyan {
  background: #e6f7f7;
  color: #13a8a8;
}

.metric-icon.orange {
  background: #fff4e5;
  color: #d97706;
}

.metric-icon.green {
  background: #eaf7ef;
  color: #2e9e5b;
}

.metric-icon.purple {
  background: #f1ecfd;
  color: #7c5ce0;
}

.metric-label {
  font-size: 11px;
  color: var(--elder-text-secondary);
  line-height: 17px;
}

.metric-value {
  font-size: 23px;
  line-height: 31px;
  font-weight: 600;
}

.metric-hint {
  font-size: 10px;
  color: var(--elder-text-weak);
  line-height: 15px;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.map-card {
  padding: 18px 20px 14px;
  min-height: 500px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.card-head.compact {
  align-items: center;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  line-height: 23px;
  font-weight: 600;
}

.card-desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.card-link {
  font-size: 12px;
  color: var(--elder-primary);
}

.map-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--elder-text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.high {
  background: #d64545;
}

.dot.mid {
  background: #d97706;
}

.dot.low {
  background: #2e9e5b;
}

.dot.l3 {
  background: #d64545;
  box-shadow: 0 0 0 3px rgba(214, 69, 69, 0.18);
}

.community-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.community-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.community-name {
  font-size: 13px;
  font-weight: 600;
}

.community-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.community-link {
  margin-left: auto;
  font-size: 11px;
  color: var(--elder-primary);
}

.grid-cells {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.grid-cell {
  position: relative;
  padding: 12px 12px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.grid-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(31, 111, 235, 0.12);
}

.grid-cell.risk-high {
  background: #fdf0ef;
  border-color: #f3c6c3;
}

.grid-cell.risk-mid {
  background: #fff8ec;
  border-color: #f5dfb8;
}

.grid-cell.risk-low {
  background: #eef8f2;
  border-color: #c9e8d6;
}

.grid-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.grid-name {
  font-size: 13px;
  font-weight: 600;
}

.l3-badge {
  font-size: 10px;
  font-weight: 600;
  color: #d64545;
  background: #fdecec;
  border-radius: 10px;
  padding: 1px 6px;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(214, 69, 69, 0.25); }
  50% { box-shadow: 0 0 0 4px rgba(214, 69, 69, 0.06); }
}

.grid-score {
  margin-top: 8px;
  font-size: 26px;
  line-height: 32px;
  font-weight: 700;
}

.grid-score span {
  font-size: 11px;
  font-weight: 400;
  color: var(--elder-text-weak);
  margin-left: 2px;
}

.grid-meta {
  font-size: 10px;
  color: var(--elder-text-secondary);
}

.grid-bar {
  height: 4px;
  margin-top: 8px;
  border-radius: 2px;
  background: rgba(31, 41, 55, 0.08);
  overflow: hidden;
}

.grid-bar > div {
  height: 100%;
  border-radius: 2px;
  background: rgba(31, 41, 55, 0.28);
}

.map-footer {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 10px;
  line-height: 16px;
  color: var(--elder-text-weak);
}

.empty-map {
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  padding: 16px 18px;
}

.ranking-tabs {
  margin-bottom: 2px;
}

.ranking-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 6px;
}

.ranking-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.rank-index {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: #f1f4f8;
  color: var(--elder-text-secondary);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rank-index.top {
  background: #eaf1fe;
  color: #1f6feb;
}

.rank-main {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 12px;
  font-weight: 500;
  line-height: 19px;
}

.rank-sub {
  font-size: 10px;
  color: var(--elder-text-weak);
  line-height: 15px;
}

.rank-track {
  height: 4px;
  background: #f1f4f8;
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  background: #1f6feb;
  border-radius: 2px;
}

.rank-bar.warn {
  background: #d97706;
}

.rank-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--elder-text-secondary);
  flex-shrink: 0;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.risk-label {
  width: 60px;
  font-size: 11px;
  color: var(--elder-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.risk-label i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.risk-track {
  flex: 1;
  height: 8px;
  background: #f1f4f8;
  border-radius: 4px;
  overflow: hidden;
}

.risk-bar {
  height: 100%;
  border-radius: 4px;
}

.risk-value {
  width: 38px;
  text-align: right;
  font-size: 11px;
  font-weight: 600;
}

.tag-title {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 11px;
  color: var(--elder-text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tag-list :deep(.ant-tag) {
  margin-inline-end: 0;
  font-size: 10px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.bottom-card {
  padding: 16px 18px;
  min-height: 250px;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 160px;
  padding-top: 10px;
}

.trend-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.trend-stack {
  width: 100%;
  height: 140px;
  display: flex;
  flex-direction: column-reverse;
  gap: 1px;
}

.trend-seg {
  width: 100%;
  border-radius: 1px;
  min-height: 1px;
}

.trend-seg.l1 {
  background: #93c5fd;
}

.trend-seg.l2 {
  background: #fbbf24;
}

.trend-seg.l3 {
  background: #ef4444;
}

.trend-hour {
  font-size: 9px;
  color: var(--elder-text-weak);
  height: 12px;
}

.trend-legend {
  display: flex;
  gap: 14px;
  justify-content: flex-end;
  margin-top: 6px;
  font-size: 10px;
  color: var(--elder-text-secondary);
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
  display: inline-block;
}

.legend.l1 {
  background: #93c5fd;
}

.legend.l2 {
  background: #fbbf24;
}

.legend.l3 {
  background: #ef4444;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.device-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-label {
  width: 72px;
  font-size: 11px;
  color: var(--elder-text-secondary);
  flex-shrink: 0;
}

.device-track {
  flex: 1;
  height: 8px;
  background: #f1f4f8;
  border-radius: 4px;
  overflow: hidden;
}

.device-bar {
  height: 100%;
  background: #13a8a8;
  border-radius: 4px;
}

.device-bar.warn {
  background: #d97706;
}

.device-value {
  width: 48px;
  text-align: right;
  font-size: 10px;
  color: var(--elder-text-weak);
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--elder-divider);
}

.event-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.event-main {
  flex: 1;
  min-width: 0;
}

.event-title {
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}

.empty-inline {
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: var(--elder-text-weak);
}

.event-meta {
  font-size: 10px;
  color: var(--elder-text-weak);
  line-height: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1439px) {
  .metric-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .main-grid {
    grid-template-columns: 1fr;
  }

  .side-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .bottom-grid {
    grid-template-columns: 1fr;
  }
}
</style>
