<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { activeCommunities } from '@/composables/useOrg'
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  FireOutlined,
  SearchOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import EventDisposeDrawer from '@/components/EventDisposeDrawer.vue'
import { demoState, isCivil } from '@/composables/useAppState'
import {
  eventLevelOptions,
  eventStatusOptions,
  eventTypeOptions,
  getEventSla,
  levelColor,
  safetyEvents,
  statusColor,
  type EventLevel,
  type EventStatus,
  type EventType,
  type SafetyEvent,
} from '@/mock/events'

const route = useRoute()
const router = useRouter()
const { message, modal } = App.useApp()

type ViewMode = 'pending' | 'all' | 'archived'
const pendingStatuses: EventStatus[] = ['待确认', '处置中', '已到场']
const archivedStatuses: EventStatus[] = ['已关闭', '已归档', '误报']

const viewMode = ref<ViewMode>('pending')
const initialLoading = ref(true)
const queryLoading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const disposeOpen = ref(false)
const selectedEvent = ref<SafetyEvent | null>(null)
const boundElderId = ref(String(route.query.elderId ?? ''))
const boundDeviceId = ref(String(route.query.deviceId ?? ''))

const filters = reactive({
  keyword: '',
  level: undefined as EventLevel | undefined,
  type: undefined as EventType | undefined,
  status: undefined as EventStatus | undefined,
  community: '',
  timeRange: '30d',
})
const applied = ref({ ...filters })

onMounted(() => {
  const community = String(route.query.community ?? '')
  if (community) {
    filters.community = community
    applied.value = { ...filters }
  }
  window.setTimeout(() => {
    initialLoading.value = false
  }, 520)
})

watch(
  () => route.query.community,
  (community) => {
    filters.community = String(community ?? '')
    applied.value = { ...filters }
    page.value = 1
  },
)

watch(
  () => route.query.elderId,
  (value) => {
    boundElderId.value = String(value ?? '')
    page.value = 1
  },
)

watch(
  () => route.query.deviceId,
  (value) => {
    boundDeviceId.value = String(value ?? '')
    page.value = 1
  },
)

const pendingEvents = computed(() => safetyEvents.filter((item) => pendingStatuses.includes(item.status)))
const resolvedEvents = computed(() =>
  safetyEvents.filter((item) => item.status === '已关闭' || item.status === '已归档'),
)

const stats = computed(() => {
  if (demoState.value === 'empty') {
    return { today: 0, pending: 0, l3: 0, closureRate: '0.0' }
  }
  const today = safetyEvents.filter((item) => !item.occurredAt.includes('-')).length
  const l3 = pendingEvents.value.filter((item) => item.level === 'L3').length
  const base = resolvedEvents.value.length + pendingEvents.value.length
  const closureRate = base > 0 ? ((resolvedEvents.value.length / base) * 100).toFixed(1) : '0.0'
  return { today, pending: pendingEvents.value.length, l3, closureRate }
})

const filtered = computed(() => {
  if (demoState.value === 'empty') return []
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  const list = safetyEvents.filter((item) => {
    if (viewMode.value === 'pending' && !pendingStatuses.includes(item.status)) return false
    if (viewMode.value === 'archived' && !archivedStatuses.includes(item.status)) return false
    if (boundElderId.value && item.elderId !== boundElderId.value) return false
    if (boundDeviceId.value && item.deviceId !== boundDeviceId.value) return false
    if (condition.level && item.level !== condition.level) return false
    if (condition.type && item.type !== condition.type) return false
    if (condition.status && item.status !== condition.status) return false
    if (condition.community && !item.address.includes(condition.community)) return false
    if (condition.timeRange === 'today' && item.occurredAt.includes('-')) return false
    if (!keyword) return true
    return (
      item.id.toLowerCase().includes(keyword) ||
      item.title.toLowerCase().includes(keyword) ||
      item.elderName.toLowerCase().includes(keyword) ||
      item.address.toLowerCase().includes(keyword) ||
      item.deviceName.toLowerCase().includes(keyword)
    )
  })
  const levelOrder: Record<EventLevel, number> = { L3: 0, L2: 1, L1: 2 }
  return list.sort((a, b) => {
    const levelDiff = levelOrder[a.level] - levelOrder[b.level]
    if (levelDiff !== 0) return levelDiff
    const aPending = pendingStatuses.includes(a.status) ? 0 : 1
    const bPending = pendingStatuses.includes(b.status) ? 0 : 1
    if (aPending !== bPending) return aPending - bPending
    if (aPending === 0) {
      const aLeft = a.responseDueMinutes - a.occurredMinutesAgo
      const bLeft = b.responseDueMinutes - b.occurredMinutesAgo
      return aLeft - bLeft
    }
    return b.occurredAt.localeCompare(a.occurredAt)
  })
})

const effectiveLoading = computed(
  () => initialLoading.value || queryLoading.value || demoState.value === 'loading',
)
const hasResult = computed(() => filtered.value.length > 0)

const columns = [
  { key: 'event', title: '事件', width: 280, fixed: 'left' as const },
  { key: 'elder', title: '老人 / 地址', width: 260 },
  { key: 'device', title: '触发设备', width: 220 },
  { key: 'status', title: '状态', width: 130 },
  { key: 'sla', title: '响应时限', width: 160 },
  { key: 'assignee', title: '处置人', width: 110 },
  { key: 'actions', title: '操作', width: 150, fixed: 'right' as const },
]

const levelLabel: Record<EventLevel, string> = {
  L3: 'L3 紧急',
  L2: 'L2 预警',
  L1: 'L1 关注',
}

function maskName(name: string) {
  return isCivil.value ? `${name.slice(0, 1)}**` : name
}

function goDetail(record: SafetyEvent) {
  router.push(`/events/${record.id}`)
}

function rowClick(record: SafetyEvent) {
  return { onClick: () => goDetail(record) }
}

function openDispose(record: SafetyEvent) {
  selectedEvent.value = record
  disposeOpen.value = true
}

function handleUpdated() {
  disposeOpen.value = false
}

function applyFilters() {
  applied.value = { ...filters }
  page.value = 1
  queryLoading.value = true
  window.setTimeout(() => {
    queryLoading.value = false
  }, 300)
}

function resetFilters() {
  filters.keyword = ''
  filters.level = undefined
  filters.type = undefined
  filters.status = undefined
  filters.community = ''
  filters.timeRange = '30d'
  applied.value = { ...filters }
  viewMode.value = 'pending'
  boundElderId.value = ''
  boundDeviceId.value = ''
  if (route.query.elderId || route.query.deviceId || route.query.community) router.replace({ path: '/events' })
  page.value = 1
}

function clearBound() {
  boundElderId.value = ''
  boundDeviceId.value = ''
  if (route.query.elderId || route.query.deviceId) router.replace({ path: '/events' })
}

function handleExport() {
  modal.confirm({
    title: '导出事件台账',
    content: '将按当前筛选条件导出事件台账，民政视角隐藏联系电话、进门方式与设备隐私字段，操作会记录审计日志。',
    okText: '确认导出',
    cancelText: '取消',
    onOk: () => message.success('导出任务已创建，文件生成后可在导出记录中下载'),
  })
}

function handleTableChange(pagination: { current?: number; pageSize?: number }) {
  page.value = pagination.current ?? 1
  pageSize.value = pagination.pageSize ?? 10
}
</script>

<template>
  <AdminLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">事件中心</h1>
          <p class="page-subtitle">
            今日 {{ stats.today }} 起 · 待处置 {{ stats.pending }} 起 · L3 紧急 {{ stats.l3 }} 起
          </p>
        </div>
        <div class="page-actions">
          <a-button @click="router.push('/events/misreports')">误报分析</a-button>
          <a-button @click="handleExport">
            <template #icon><ExportOutlined /></template>
            导出
          </a-button>
        </div>
      </div>

      <a-alert
        v-if="isCivil"
        type="info"
        show-icon
        class="readonly-alert"
        message="民政只读视角"
        description="当前视角仅支持查询、查看与脱敏导出；处置、误报与联系电话入口已隐藏。"
      />

      <div class="stat-grid">
        <div class="stat-card card">
          <div class="stat-icon blue"><AlertOutlined /></div>
          <div>
            <div class="stat-label">今日事件</div>
            <div class="stat-value">{{ stats.today }}</div>
            <div class="stat-hint">含 L1/L2/L3</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon orange"><ClockCircleOutlined /></div>
          <div>
            <div class="stat-label">待处置</div>
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-hint">待确认 + 处置中 + 已到场</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon red"><FireOutlined /></div>
          <div>
            <div class="stat-label">L3 紧急</div>
            <div class="stat-value">{{ stats.l3 }}</div>
            <div class="stat-hint">5 分钟内响应</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon green"><CheckCircleOutlined /></div>
          <div>
            <div class="stat-label">24h 闭环率</div>
            <div class="stat-value">{{ stats.closureRate }}%</div>
            <div class="stat-hint">近 7 天 L2/L3</div>
          </div>
        </div>
      </div>

      <div class="filter-card card">
        <a-tabs v-model:activeKey="viewMode" class="filter-tabs" @change="page = 1">
          <a-tab-pane key="pending" tab="待处置" />
          <a-tab-pane key="all" tab="全部事件" />
          <a-tab-pane key="archived" tab="已归档" />
        </a-tabs>

        <div class="filter-row">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            class="filter-keyword"
            placeholder="老人 / 地址 / 事件编号 / 设备"
            @press-enter="applyFilters"
          >
            <template #prefix><SearchOutlined class="text-weak" /></template>
          </a-input>
          <a-select
            v-model:value="filters.level"
            :options="eventLevelOptions.map((item) => ({ value: item, label: item === 'L3' ? 'L3 紧急' : item === 'L2' ? 'L2 预警' : 'L1 关注' }))"
            placeholder="事件级别"
            class="filter-small"
            allow-clear
          />
          <a-select
            v-model:value="filters.type"
            :options="eventTypeOptions.map((item) => ({ value: item, label: item }))"
            placeholder="事件类型"
            class="filter-medium"
            allow-clear
          />
          <a-select
            v-model:value="filters.status"
            :options="eventStatusOptions.map((item) => ({ value: item, label: item }))"
            placeholder="事件状态"
            class="filter-small"
            allow-clear
          />
          <a-select
            v-model:value="filters.community"
            :options="activeCommunities.map((item) => ({ value: item.name, label: item.name }))"
            placeholder="所属社区"
            class="filter-small"
            allow-clear
          />
          <a-select
            v-model:value="filters.timeRange"
            :options="[
              { value: 'today', label: '今天' },
              { value: '7d', label: '近 7 天' },
              { value: '30d', label: '近 30 天' },
            ]"
            class="filter-small"
          />
          <div class="filter-actions">
            <a-button type="primary" :loading="queryLoading" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">重置</a-button>
          </div>
        </div>

        <div v-if="boundElderId || boundDeviceId" class="bound-filter">
          <a-tag closable color="blue" @close="clearBound">
            仅看 {{ boundElderId ? '当前老人' : '当前设备' }} 的事件
          </a-tag>
        </div>
      </div>

      <div class="list-card card">
        <div class="list-toolbar">
          <div class="list-summary">
            共 <strong>{{ safetyEvents.length }}</strong> 起，当前筛选
            <strong>{{ filtered.length }}</strong> 起
          </div>
          <div class="toolbar-actions">
            <span v-if="stats.l3 > 0" class="urgent-hint">L3 待处置 {{ stats.l3 }} 起，请优先响应</span>
            <a-button size="small" @click="applyFilters">刷新</a-button>
          </div>
        </div>

        <div v-if="demoState === 'forbidden'" class="state-block">
          <a-result status="403" title="当前账号无权查看该辖区事件" sub-title="请切换辖区，或联系项目管理员申请数据权限。">
            <template #extra>
              <a-button type="primary" @click="demoState = 'normal'">返回正常数据</a-button>
            </template>
          </a-result>
        </div>

        <div v-else-if="demoState === 'error'" class="state-block">
          <a-result status="warning" title="事件加载失败" sub-title="请检查网络后重试，已保留当前筛选条件。">
            <template #extra>
              <a-button type="primary" @click="demoState = 'normal'">重试</a-button>
            </template>
          </a-result>
        </div>

        <div v-else-if="effectiveLoading" class="state-block loading-block">
          <a-skeleton active :paragraph="{ rows: 8 }" />
        </div>

        <div v-else-if="demoState === 'empty' || !hasResult" class="state-block">
          <a-empty>
            <template #description>
              <div class="empty-title">
                {{ demoState === 'empty' ? '辖区还没有事件' : '没有找到符合条件的事件' }}
              </div>
              <div class="empty-desc">
                {{ demoState === 'empty' ? '设备与人工上报触发后会在这里出现' : '调整筛选条件或时间范围后再试' }}
              </div>
            </template>
            <div class="empty-actions">
              <a-button @click="resetFilters">清空筛选条件</a-button>
            </div>
          </a-empty>
        </div>

        <a-table
          v-else
          :data-source="filtered"
          :columns="columns"
          :row-key="(record: SafetyEvent) => record.id"
          :scroll="{ x: 1380 }"
          :on-row="rowClick"
          :pagination="{
            current: page,
            pageSize,
            total: filtered.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total: number) => `共 ${total} 起`,
            size: 'small',
          }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'event'">
              <div class="event-line">
                <a-tag :color="levelColor[record.level as EventLevel]" class="level-tag">
                  {{ levelLabel[record.level as EventLevel] }}
                </a-tag>
                <span class="event-type">{{ record.title }}</span>
              </div>
              <div class="event-meta">{{ record.id }} · {{ record.occurredAt }}</div>
            </template>

            <template v-else-if="column.key === 'elder'">
              <div class="elder-name">{{ maskName(record.elderName) }} · {{ record.age }}岁</div>
              <div class="elder-meta">{{ record.address }} {{ record.roomName }}</div>
            </template>

            <template v-else-if="column.key === 'device'">
              <div class="device-name">{{ record.deviceName }}</div>
              <div class="device-meta">置信度 {{ record.confidence }}% · {{ record.signals.length }} 个信号</div>
            </template>

            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor[record.status as EventStatus]">{{ record.status }}</a-tag>
              <div v-if="record.status === '误报'" class="status-sub">{{ record.misreportReason }}</div>
            </template>

            <template v-else-if="column.key === 'sla'">
              <span class="sla-text" :class="{ overdue: getEventSla(record as SafetyEvent).overdue }">
                {{ getEventSla(record as SafetyEvent).text }}
              </span>
              <div class="status-sub">
                {{ record.level === 'L1' ? '不强制响应' : `响应时限 ${record.responseDueMinutes} 分钟` }}
              </div>
            </template>

            <template v-else-if="column.key === 'assignee'">
              <span :class="{ 'text-weak': record.assignee === '未分配' }">{{ record.assignee }}</span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <div class="row-actions" @click.stop>
                <a-button type="link" size="small" @click="goDetail(record)">查看</a-button>
                <a-button
                  v-if="!isCivil && pendingStatuses.includes(record.status)"
                  type="link"
                  size="small"
                  @click="openDispose(record)"
                >
                  处置
                </a-button>
              </div>
            </template>
          </template>
        </a-table>
      </div>

      <EventDisposeDrawer
        :open="disposeOpen"
        :event="selectedEvent"
        @update:open="disposeOpen = $event"
        @updated="handleUpdated"
      />
    </div>
  </AdminLayout>
</template>

<style scoped>
.readonly-alert {
  margin-top: 16px;
  border-radius: 8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  padding: 20px;
}

.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-icon.blue {
  background: #eaf1fe;
  color: #1f6feb;
}

.stat-icon.orange {
  background: #fff4e5;
  color: #d97706;
}

.stat-icon.red {
  background: #fdecec;
  color: #d64545;
}

.stat-icon.green {
  background: #eaf7ef;
  color: #2e9e5b;
}

.stat-label {
  font-size: 12px;
  color: var(--elder-text-secondary);
  line-height: 18px;
}

.stat-value {
  font-size: 26px;
  line-height: 34px;
  font-weight: 600;
}

.stat-hint {
  font-size: 11px;
  line-height: 16px;
  color: var(--elder-text-weak);
}

.filter-card {
  margin-top: 16px;
  padding: 16px 20px 20px;
}

.filter-tabs {
  margin-bottom: 4px;
}

.filter-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}

.filter-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 8px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-keyword {
  width: 300px;
}

.filter-small {
  width: 132px;
}

.filter-medium {
  width: 150px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.bound-filter {
  margin-top: 10px;
}

.list-card {
  margin-top: 16px;
  overflow: hidden;
}

.list-toolbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--elder-divider);
}

.list-summary {
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.list-summary strong {
  color: var(--elder-text);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.urgent-hint {
  font-size: 11px;
  color: var(--elder-danger);
}

.state-block {
  padding: 32px 24px 40px;
}

.loading-block {
  padding: 28px 24px 40px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--elder-text);
  line-height: 24px;
}

.empty-desc {
  font-size: 13px;
  color: var(--elder-text-weak);
  line-height: 22px;
  margin-top: 4px;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 4px;
}

.event-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-tag {
  margin-inline-end: 0;
  font-weight: 600;
}

.event-type {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
}

.event-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.elder-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.elder-meta {
  margin-top: 1px;
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-name {
  font-size: 12px;
  line-height: 19px;
}

.device-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.status-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.sla-text {
  font-size: 12px;
  font-weight: 600;
  line-height: 19px;
}

.sla-text.overdue {
  color: var(--elder-danger);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.row-actions :deep(.ant-btn-link) {
  padding-inline: 4px;
}
</style>
