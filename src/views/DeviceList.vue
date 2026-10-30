<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { activeCommunities } from '@/composables/useOrg'
import {
  AlertOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  WifiOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import DeviceFormDrawer from '@/components/DeviceFormDrawer.vue'
import RemoveDeviceModal from '@/components/RemoveDeviceModal.vue'
import { demoState, isCivil } from '@/composables/useAppState'
import {
  devices,
  deviceStatusOptions,
  deviceTypeOptions,
  type Device,
  type DeviceStatus,
  type DeviceType,
} from '@/mock/devices'
import { getElderById } from '@/mock/elders'

const route = useRoute()
const router = useRouter()
const { message, modal } = App.useApp()

type ViewMode = 'all' | 'offline' | 'low'

const viewMode = ref<ViewMode>('all')
const initialLoading = ref(true)
const queryLoading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const formOpen = ref(false)
const editingDevice = ref<Device | null>(null)
const removeOpen = ref(false)
const removingDevice = ref<Device | null>(null)
const highlightId = ref('')
const boundElderId = ref(String(route.query.elderId ?? ''))

const filters = reactive({
  keyword: '',
  type: undefined as DeviceType | undefined,
  community: '',
  status: undefined as DeviceStatus | undefined,
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
  }, 550)
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
  (elderId) => {
    boundElderId.value = String(elderId ?? '')
    page.value = 1
  },
)

const boundElderName = computed(() => {
  if (!boundElderId.value) return ''
  return getElderById(boundElderId.value)?.name ?? ''
})

const enabledDevices = computed(() => devices.filter((item) => item.enabled))

const stats = computed(() => {
  if (demoState.value === 'empty') {
    return { total: 0, onlineRate: '0.0', offline: 0, low: 0, fault: 0, coverage: 0 }
  }
  const total = enabledDevices.value.length
  const online = enabledDevices.value.filter((item) => item.status === '在线').length
  const offline = enabledDevices.value.filter((item) => item.status === '离线').length
  const fault = enabledDevices.value.filter((item) => item.status === '故障').length
  const low = enabledDevices.value.filter((item) => item.battery !== undefined && item.battery < 20).length
  const coverage = new Set(enabledDevices.value.map((item) => item.houseId)).size
  return {
    total,
    onlineRate: total > 0 ? ((online / total) * 100).toFixed(1) : '0.0',
    offline,
    low,
    fault,
    coverage,
  }
})

const filtered = computed(() => {
  if (demoState.value === 'empty') return []
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  const list = devices.filter((item) => {
    if (condition.status) {
      if (item.status !== condition.status) return false
    } else if (!item.enabled) {
      return false
    }
    if (boundElderId.value && item.elderId !== boundElderId.value) return false
    if (viewMode.value === 'offline' && item.status !== '离线') return false
    if (viewMode.value === 'low' && !(item.battery !== undefined && item.battery < 20)) return false
    if (condition.type && item.type !== condition.type) return false
    if (condition.community && !item.address.includes(condition.community)) return false
    if (!keyword) return true
    return (
      item.name.toLowerCase().includes(keyword) ||
      item.sn.toLowerCase().includes(keyword) ||
      item.elderName.toLowerCase().includes(keyword) ||
      item.roomName.toLowerCase().includes(keyword) ||
      item.address.toLowerCase().includes(keyword)
    )
  })
  const statusOrder: Record<string, number> = { 离线: 0, 故障: 1, 在线: 2, 已拆除: 3 }
  return list.sort((a, b) => {
    if (a.id === highlightId.value) return -1
    if (b.id === highlightId.value) return 1
    const diff = statusOrder[a.status] - statusOrder[b.status]
    if (diff !== 0) return diff
    if (viewMode.value === 'low') return (a.battery ?? 100) - (b.battery ?? 100)
    return a.lastReport.localeCompare(b.lastReport)
  })
})

const effectiveLoading = computed(
  () => initialLoading.value || queryLoading.value || demoState.value === 'loading',
)

const hasResult = computed(() => filtered.value.length > 0)

const typeColors: Record<DeviceType, { color: string; bg: string }> = {
  摄像头: { color: '#1F6FEB', bg: '#EAF1FE' },
  烟感: { color: '#D97706', bg: '#FFF4E5' },
  燃气: { color: '#D64545', bg: '#FDECEC' },
  一氧化碳: { color: '#B45309', bg: '#FEF3C7' },
  毫米波雷达: { color: '#7C5CE0', bg: '#F1ECFD' },
  定位器: { color: '#13A8A8', bg: '#E6F7F7' },
}

const statusColor: Record<DeviceStatus, string> = {
  在线: 'green',
  离线: 'orange',
  故障: 'red',
  已拆除: 'default',
}

const columns = [
  { key: 'device', title: '设备', width: 230, fixed: 'left' as const },
  { key: 'type', title: '类型', width: 120 },
  { key: 'location', title: '安装位置', width: 280 },
  { key: 'elder', title: '绑定老人', width: 170 },
  { key: 'status', title: '状态', width: 180 },
  { key: 'lastReport', title: '最近上报', width: 160 },
  { key: 'actions', title: '操作', width: 170, fixed: 'right' as const },
]

function goDetail(record: Device) {
  router.push(`/devices/${record.id}`)
}

function rowClick(record: Device) {
  return { onClick: () => goDetail(record) }
}

function applyFilters() {
  highlightId.value = ''
  applied.value = { ...filters }
  page.value = 1
  queryLoading.value = true
  window.setTimeout(() => {
    queryLoading.value = false
  }, 320)
}

function resetFilters() {
  highlightId.value = ''
  filters.keyword = ''
  filters.type = undefined
  filters.community = ''
  filters.status = undefined
  applied.value = { ...filters }
  viewMode.value = 'all'
  boundElderId.value = ''
  if (route.query.elderId || route.query.community) router.replace({ path: '/devices' })
  page.value = 1
}

function clearElderFilter() {
  boundElderId.value = ''
  if (route.query.elderId) router.replace({ path: '/devices' })
}

function openCreate() {
  editingDevice.value = null
  formOpen.value = true
}

function openEdit(record: Device) {
  editingDevice.value = record
  formOpen.value = true
}

function handleSaved(saved: Device) {
  const isCreate = !editingDevice.value
  formOpen.value = false
  if (isCreate) {
    viewMode.value = 'all'
    resetFilters()
    highlightId.value = saved.id
    document.querySelector('.app-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  message.success(isCreate ? `设备已保存，编号 ${saved.id}` : '设备已保存')
}

function openRemove(record: Device) {
  removingDevice.value = record
  removeOpen.value = true
}

function handleRemoved() {
  removeOpen.value = false
  removingDevice.value = null
}

function rowClassName(record: Device) {
  return record.id === highlightId.value ? 'row-highlight' : ''
}

function handleTableChange(pagination: { current?: number; pageSize?: number }) {
  page.value = pagination.current ?? 1
  pageSize.value = pagination.pageSize ?? 10
}

function handleExport() {
  modal.confirm({
    title: '导出设备台账',
    content: '将按当前筛选条件导出设备台账，民政视角隐藏视频、定位与隐私配置字段，操作会记录审计日志。',
    okText: '确认导出',
    cancelText: '取消',
    onOk: () => message.success('导出任务已创建，文件生成后可在导出记录中下载'),
  })
}
</script>

<template>
  <AdminLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">设备与感知</h1>
          <p class="page-subtitle">
            统一物模型 · 在线率 {{ stats.onlineRate }}% · 覆盖 {{ stats.coverage.toLocaleString() }} 户
          </p>
        </div>
        <div class="page-actions">
          <a-button @click="handleExport">
            <template #icon><ExportOutlined /></template>
            导出
          </a-button>
          <a-button v-if="!isCivil" type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增设备
          </a-button>
        </div>
      </div>

      <a-alert
        v-if="isCivil"
        type="info"
        show-icon
        class="readonly-alert"
        message="民政只读视角"
        description="当前视角仅支持查询、查看与脱敏导出；新增、编辑、拆除与隐私配置入口已隐藏。"
      />

      <div class="stat-grid">
        <div class="stat-card card">
          <div class="stat-icon blue"><WifiOutlined /></div>
          <div>
            <div class="stat-label">设备总数</div>
            <div class="stat-value">{{ stats.total.toLocaleString() }}</div>
            <div class="stat-hint">启用设备，不含已拆除</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon green"><CheckCircleOutlined /></div>
          <div>
            <div class="stat-label">在线率</div>
            <div class="stat-value">{{ stats.onlineRate }}%</div>
            <div class="stat-hint">目标 ≥ 98%</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon orange"><AlertOutlined /></div>
          <div>
            <div class="stat-label">离线设备</div>
            <div class="stat-value">{{ stats.offline }}</div>
            <div class="stat-hint">超 2 小时无上报</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon red"><ThunderboltOutlined /></div>
          <div>
            <div class="stat-label">低电提醒</div>
            <div class="stat-value">{{ stats.low }}</div>
            <div class="stat-hint">设备电量 &lt; 20%</div>
          </div>
        </div>
      </div>

      <div class="filter-card card">
        <a-tabs v-model:activeKey="viewMode" class="filter-tabs" @change="page = 1">
          <a-tab-pane key="all" tab="全部设备" />
          <a-tab-pane key="offline" tab="离线清单" />
          <a-tab-pane key="low" tab="低电提醒" />
        </a-tabs>

        <div class="filter-row">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            class="filter-keyword"
            placeholder="设备名称 / SN / 老人姓名 / 门牌"
            @press-enter="applyFilters"
          >
            <template #prefix><SearchOutlined class="text-weak" /></template>
          </a-input>
          <a-select
            v-model:value="filters.type"
            :options="deviceTypeOptions.map((item) => ({ value: item, label: item }))"
            placeholder="设备类型"
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
            v-model:value="filters.status"
            :options="deviceStatusOptions.map((item) => ({ value: item, label: item }))"
            placeholder="设备状态"
            class="filter-small"
            allow-clear
          />
          <div class="filter-actions">
            <a-button type="primary" :loading="queryLoading" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">重置</a-button>
          </div>
        </div>

        <div v-if="boundElderId" class="bound-filter">
          <a-tag closable color="blue" @close="clearElderFilter">
            仅看 {{ boundElderName || '当前老人' }} 的设备
          </a-tag>
        </div>
      </div>

      <div class="list-card card">
        <div class="list-toolbar">
          <div class="list-summary">
            共 <strong>{{ stats.total.toLocaleString() }}</strong> 台，当前筛选
            <strong>{{ filtered.length.toLocaleString() }}</strong> 台
          </div>
          <div class="toolbar-actions">
            <span v-if="stats.fault > 0" class="fault-hint">故障 {{ stats.fault }} 台</span>
            <a-button size="small" @click="applyFilters">刷新状态</a-button>
          </div>
        </div>

        <div v-if="demoState === 'forbidden'" class="state-block">
          <a-result status="403" title="当前账号无权查看该辖区设备" sub-title="请切换辖区，或联系项目管理员申请数据权限。">
            <template #extra>
              <a-button type="primary" @click="demoState = 'normal'">返回正常数据</a-button>
            </template>
          </a-result>
        </div>

        <div v-else-if="demoState === 'error'" class="state-block">
          <a-result status="warning" title="设备加载失败" sub-title="请检查网络后重试，已保留当前筛选条件。">
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
                {{ demoState === 'empty' ? '辖区还没有设备' : '没有找到符合条件的设备' }}
              </div>
              <div class="empty-desc">
                {{ demoState === 'empty' ? '新增设备，建立第一份设备台账' : '调整筛选条件后再试' }}
              </div>
            </template>
            <div class="empty-actions">
              <template v-if="demoState === 'empty'">
                <a-button v-if="!isCivil" type="primary" @click="openCreate">新增设备</a-button>
              </template>
              <a-button v-else @click="resetFilters">清空筛选条件</a-button>
            </div>
          </a-empty>
        </div>

        <a-table
          v-else
          :data-source="filtered"
          :columns="columns"
          :row-key="(record: Device) => record.id"
          :scroll="{ x: 1380 }"
          :on-row="rowClick"
          :row-class-name="rowClassName"
          :pagination="{
            current: page,
            pageSize,
            total: filtered.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total: number) => `共 ${total} 台`,
            size: 'small',
          }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'device'">
              <div class="device-cell">
                <div class="device-type-icon" :style="{ background: typeColors[record.type as DeviceType].bg, color: typeColors[record.type as DeviceType].color }">
                  {{ record.type.slice(0, 1) }}
                </div>
                <div class="device-main">
                  <div class="device-name">{{ record.name }}</div>
                  <div class="device-sn">{{ record.sn }}</div>
                </div>
              </div>
            </template>

            <template v-else-if="column.key === 'type'">
              <a-tag :color="typeColors[record.type as DeviceType].color" class="type-tag">
                {{ record.type }}
              </a-tag>
            </template>

            <template v-else-if="column.key === 'location'">
              <div class="address-main">{{ record.address }}</div>
              <div class="address-sub">{{ record.roomName }} · {{ record.installNote }}</div>
            </template>

            <template v-else-if="column.key === 'elder'">
              <div class="elder-name">{{ record.elderName }}</div>
              <div class="elder-meta">{{ record.roomType }} · {{ record.protocol }}</div>
            </template>

            <template v-else-if="column.key === 'status'">
              <div class="status-line">
                <a-tag :color="statusColor[record.status as DeviceStatus]">{{ record.status }}</a-tag>
                <a-tag v-if="record.battery !== undefined && record.battery < 20" color="red">
                  低电 {{ record.battery }}%
                </a-tag>
              </div>
              <div v-if="record.status === '离线'" class="status-sub">离线 {{ record.lastReport }}</div>
              <div v-else-if="record.battery !== undefined" class="status-sub">电量 {{ record.battery }}%</div>
              <div v-else class="status-sub">信号 {{ record.signal }} dBm</div>
            </template>

            <template v-else-if="column.key === 'lastReport'">
              <div class="report-main">{{ record.lastReport }}</div>
              <div class="report-sub">{{ record.lastReportAt }}</div>
            </template>

            <template v-else-if="column.key === 'actions'">
              <div class="row-actions" @click.stop>
                <a-button type="link" size="small" @click="goDetail(record)">查看</a-button>
                <template v-if="!isCivil && record.enabled">
                  <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" danger @click="openRemove(record)">拆除</a-button>
                </template>
              </div>
            </template>
          </template>
        </a-table>
      </div>

      <DeviceFormDrawer
        :open="formOpen"
        :device="editingDevice"
        :preset-elder-id="boundElderId"
        @update:open="formOpen = $event"
        @saved="handleSaved"
      />
      <RemoveDeviceModal
        :open="removeOpen"
        :device="removingDevice"
        @update:open="removeOpen = $event"
        @removed="handleRemoved"
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

.stat-icon.green {
  background: #eaf7ef;
  color: #2e9e5b;
}

.stat-icon.orange {
  background: #fff4e5;
  color: #d97706;
}

.stat-icon.red {
  background: #fdecec;
  color: #d64545;
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
  width: 320px;
}

.filter-small {
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
  gap: 10px;
}

.fault-hint {
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

.device-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-type-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.device-main {
  min-width: 0;
}

.device-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-sn {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 16px;
}

.type-tag {
  border-radius: 4px;
}

.address-main {
  font-size: 12px;
  line-height: 19px;
}

.address-sub {
  font-size: 11px;
  line-height: 17px;
  color: var(--elder-text-weak);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.elder-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.elder-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.status-sub {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
  margin-top: 2px;
}

.report-main {
  font-size: 12px;
  line-height: 19px;
}

.report-sub {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 16px;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.row-actions :deep(.ant-btn-link) {
  padding-inline: 4px;
}

:deep(.row-highlight > td) {
  background: #fff9e6 !important;
}
</style>
