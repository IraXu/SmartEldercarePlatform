<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  AuditOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  MobileOutlined,
  SolutionOutlined,
  TagsOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import WorkOrderDispatchDrawer from '@/components/workorders/WorkOrderDispatchDrawer.vue'
import WorkOrderCancelModal from '@/components/workorders/WorkOrderCancelModal.vue'
import { currentUser, hasPermission } from '@/composables/useAuth'
import {
  staffMembers,
  workOrders,
  type WorkOrder,
  type WorkOrderStatus,
} from '@/composables/useWorkOrders'

const router = useRouter()
const { message } = App.useApp()

const canView = computed(() => hasPermission('workorders'))

const statusColors: Record<WorkOrderStatus, string> = {
  待派单: 'default',
  待接单: 'warning',
  待上门: 'blue',
  服务中: 'cyan',
  待签认: 'purple',
  待审核: 'gold',
  已完成: 'success',
  已取消: 'default',
  异常: 'error',
}

const statusOptions = (
  ['待派单', '待接单', '待上门', '服务中', '待签认', '待审核', '已完成', '已取消', '异常'] as WorkOrderStatus[]
).map((item) => ({ value: item, label: item }))

const staffOptions = staffMembers.map((item) => ({ value: item.name, label: `${item.name} · ${item.org}` }))
const rangeOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '近 7 天' },
]

const filters = reactive({
  keyword: '',
  status: undefined as WorkOrderStatus | undefined,
  staff: undefined as string | undefined,
  range: 'all',
})
const applied = ref({ ...filters })

const stats = computed(() => ({
  pending: workOrders.filter((item) => item.status === '待派单').length,
  waiting: workOrders.filter((item) => item.status === '待接单' || item.status === '待上门').length,
  serving: workOrders.filter((item) => item.status === '服务中').length,
  signing: workOrders.filter((item) => item.status === '待签认').length,
  reviewing: workOrders.filter((item) => item.status === '待审核').length,
  exceptions: workOrders.filter((item) => item.status === '异常').length,
}))

/** 演示数据的「今天」取工单中最晚的计划日期，避免写死日期导致筛选失真 */
const demoToday = computed(() => {
  const dates = workOrders.map((item) => item.scheduledDate).sort()
  return dates[dates.length - 1] ?? ''
})

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  const weekStart = (() => {
    if (!demoToday.value) return ''
    const date = new Date(`${demoToday.value}T00:00:00`)
    date.setDate(date.getDate() - 6)
    return date.toISOString().slice(0, 10)
  })()
  const priority = (status: WorkOrderStatus) => (status === '待派单' || status === '异常' ? 0 : 1)
  return workOrders
    .filter((item) => {
      if (condition.status && item.status !== condition.status) return false
      if (condition.staff && item.staffName !== condition.staff) return false
      if (condition.range === 'today' && item.scheduledDate !== demoToday.value) return false
      if (condition.range === 'week' && item.scheduledDate < weekStart) return false
      if (
        keyword &&
        !`${item.id}${item.elderName}${item.staffName}${item.address}`.toLowerCase().includes(keyword)
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const gap = priority(a.status) - priority(b.status)
      if (gap !== 0) return gap
      return `${b.scheduledDate} ${b.scheduledStart}`.localeCompare(`${a.scheduledDate} ${a.scheduledStart}`)
    })
})

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = undefined
  filters.staff = undefined
  filters.range = 'all'
  applied.value = { ...filters }
}

const columns = [
  { key: 'order', title: '工单', width: 170 },
  { key: 'elder', title: '老人与地址', width: 230 },
  { key: 'plan', title: '服务计划', width: 180 },
  { key: 'staff', title: '服务人员', width: 160 },
  { key: 'schedule', title: '计划时间', width: 160 },
  { key: 'status', title: '状态', width: 110 },
  { key: 'evidence', title: '签到/照片', width: 120 },
  { key: 'actions', title: '操作', width: 190 },
]

function goDetail(order: WorkOrder) {
  router.push(`/workorders/${order.id}`)
}

const customRow = (record: WorkOrder) => ({
  onClick: () => goDetail(record),
  style: 'cursor: pointer',
})

const dispatchOpen = ref(false)
const dispatchMode = ref<'dispatch' | 'reassign'>('dispatch')
const dispatchOrder = ref<WorkOrder | null>(null)

function openDispatch(order?: WorkOrder) {
  dispatchMode.value = 'dispatch'
  dispatchOrder.value = order ?? null
  dispatchOpen.value = true
}

function openReassign(order: WorkOrder) {
  dispatchMode.value = 'reassign'
  dispatchOrder.value = order
  dispatchOpen.value = true
}

const cancelOpen = ref(false)
const cancelOrder = ref<WorkOrder | null>(null)

function openCancel(order: WorkOrder) {
  cancelOrder.value = order
  cancelOpen.value = true
}

function handleDispatchDone(orderId?: string) {
  if (orderId) router.push(`/workorders/${orderId}`)
}

const statCards = computed(() => [
  { key: 'pending', label: '待派单', value: stats.value.pending, icon: FileTextOutlined, tone: 'muted' },
  { key: 'waiting', label: '待接单/待上门', value: stats.value.waiting, icon: ClockCircleOutlined, tone: 'warning' },
  { key: 'serving', label: '服务中', value: stats.value.serving, icon: PlayCircleOutlined, tone: 'primary' },
  { key: 'signing', label: '待签认', value: stats.value.signing, icon: SolutionOutlined, tone: 'purple' },
  { key: 'reviewing', label: '待审核', value: stats.value.reviewing, icon: AuditOutlined, tone: 'gold' },
  { key: 'exceptions', label: '异常', value: stats.value.exceptions, icon: ExclamationCircleOutlined, tone: 'danger' },
])

function handleExport() {
  message.success('导出任务已创建（模拟）')
}
</script>

<template>
  <AdminLayout>
    <div class="page workorder-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">服务工单</h1>
          <p class="page-subtitle">
            覆盖服务计划、派单、上门签到、服务记录、签认与机构审核，为 M6 机审与结算提供依据。
          </p>
        </div>
        <div v-if="canView" class="page-actions">
          <a-button @click="router.push('/workorders/plans')">
            <template #icon><SolutionOutlined /></template>
            服务计划
          </a-button>
          <a-button @click="router.push('/settings?tab=dict')">
            <template #icon><TagsOutlined /></template>
            业务字典
          </a-button>
          <a-button @click="router.push('/m/workorders')">
            <template #icon><MobileOutlined /></template>
            服务人员移动端
          </a-button>
          <a-button v-if="canView" type="primary" @click="openDispatch">
            <template #icon><PlusOutlined /></template>
            派单
          </a-button>
        </div>
      </div>

      <a-alert
        v-if="canView"
        class="source-tip"
        type="info"
        show-icon
        message="工单数据来源"
        description="工单由服务计划定时生成或人工临时加单；服务项目与频次取自「服务计划」（候选值来自业务字典 · 服务项目），服务人员来自「业务字典 · 服务机构人员」，签到、记录仪与照片由服务人员端采集。"
      />

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无服务工单权限"
            sub-title="服务工单面向项目管理员、项目成员与平台运营开放。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <a-alert
          v-if="stats.exceptions > 0"
          type="error"
          show-icon
          :message="`有 ${stats.exceptions} 个工单处于异常状态，请及时处理`"
          description="异常工单需机构确认继续、改派或取消后才能进入审核与结算。"
        />

        <div class="stat-grid">
          <div v-for="card in statCards" :key="card.key" class="card stat-card">
            <span class="stat-icon" :class="`tone-${card.tone}`">
              <component :is="card.icon" />
            </span>
            <div>
              <div class="stat-label">{{ card.label }}</div>
              <div class="stat-value">{{ card.value }}</div>
            </div>
          </div>
        </div>

        <div class="card filter-card">
          <div class="filter-row">
            <a-input
              v-model:value="filters.keyword"
              class="filter-keyword"
              placeholder="搜索工单号 / 老人 / 人员"
              allow-clear
              @press-enter="applyFilters"
            >
              <template #prefix><SearchOutlined class="text-weak" /></template>
            </a-input>
            <a-select
              v-model:value="filters.status"
              class="filter-select"
              :options="statusOptions"
              placeholder="全部状态"
              allow-clear
            />
            <a-select
              v-model:value="filters.staff"
              class="filter-select"
              :options="staffOptions"
              placeholder="全部服务人员"
              allow-clear
            />
            <a-select v-model:value="filters.range" class="filter-select" :options="rangeOptions" />
            <a-button type="primary" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">
              <template #icon><ReloadOutlined /></template>
              重置
            </a-button>
            <div class="filter-spacer" />
            <a-button type="primary" ghost @click="handleExport">
              <template #icon><FileTextOutlined /></template>
              导出
            </a-button>
          </div>
        </div>

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">工单台账</h3>
              <p class="section-desc">待派单与异常工单优先展示；点击工单行查看签到、记录与签认详情。</p>
            </div>
            <a-tag color="blue">共 {{ filtered.length }} 条</a-tag>
          </div>

          <a-table
            :data-source="filtered"
            :columns="columns"
            :row-key="(record: WorkOrder) => record.id"
            :scroll="{ x: 1320 }"
            :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
            :locale="{ emptyText: '暂无符合条件的工单' }"
            :on-row="customRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'order'">
                <div class="mono">{{ record.id }}</div>
                <div class="order-source">{{ record.source }} · {{ record.level }}</div>
              </template>
              <template v-else-if="column.key === 'elder'">
                <div class="elder-name">{{ record.elderName }}</div>
                <div class="elder-address">{{ record.community }} {{ record.address }}</div>
              </template>
              <template v-else-if="column.key === 'plan'">
                <div class="plan-level">{{ record.level }}</div>
                <div class="plan-meta">{{ record.frequency }} · {{ record.duration }} 分钟</div>
              </template>
              <template v-else-if="column.key === 'staff'">
                <div class="staff-name">{{ record.staffName || '—' }}</div>
                <div v-if="record.staffOrg" class="staff-org">{{ record.staffOrg }}</div>
              </template>
              <template v-else-if="column.key === 'schedule'">
                <div>{{ record.scheduledDate }}</div>
                <div class="schedule-time">{{ record.scheduledStart }} 开始</div>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="statusColors[record.status as WorkOrderStatus]">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'evidence'">
                <div v-if="record.checkin" class="evidence-line">
                  偏差 {{ record.checkin.deviation }} 米
                </div>
                <div class="evidence-line">照片 {{ record.photos }} 张</div>
                <span v-if="!record.checkin" class="text-weak">未签到</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="4" @click.stop>
                  <a-button type="link" size="small" @click.stop="goDetail(record as WorkOrder)">查看</a-button>
                  <a-button
                    v-if="record.status === '待派单'"
                    type="link"
                    size="small"
                    @click.stop="openDispatch(record as WorkOrder)"
                  >
                    派单
                  </a-button>
                  <a-button
                    v-if="['待接单', '待上门'].includes(record.status)"
                    type="link"
                    size="small"
                    @click.stop="openReassign(record as WorkOrder)"
                  >
                    改派
                  </a-button>
                  <a-button
                    v-if="['待派单', '待接单', '待上门'].includes(record.status)"
                    type="link"
                    size="small"
                    danger
                    @click.stop="openCancel(record as WorkOrder)"
                  >
                    取消
                  </a-button>
                  <a-button
                    v-if="record.status === '待审核'"
                    type="link"
                    size="small"
                    @click.stop="goDetail(record as WorkOrder)"
                  >
                    审核
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </template>

      <WorkOrderDispatchDrawer
        v-model:open="dispatchOpen"
        :mode="dispatchMode"
        :order="dispatchOrder"
        @done="handleDispatchDone"
      />
      <WorkOrderCancelModal v-model:open="cancelOpen" :order="cancelOrder" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.workorder-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.forbidden-card {
  padding: 48px 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.tone-muted {
  color: #5b6779;
  background: #f0f3f7;
}

.tone-warning {
  color: #d97706;
  background: #fff4e5;
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-purple {
  color: #7c3aed;
  background: #f1ebff;
}

.tone-gold {
  color: #b45309;
  background: #fef3c7;
}

.tone-danger {
  color: #d64545;
  background: #fdecec;
}

.stat-label {
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.stat-value {
  font-size: 21px;
  line-height: 26px;
  font-weight: 600;
  color: #1f2937;
}

.filter-card {
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-keyword {
  width: 240px;
}

.filter-select {
  width: 145px;
}

.filter-spacer {
  flex: 1;
}

.table-card {
  padding: 18px 20px 12px;
}

.table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #1f2937;
}

.order-source {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.elder-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.elder-address {
  margin-top: 2px;
  font-size: 11px;
  line-height: 16px;
  color: #8a96a8;
}

.plan-level {
  font-size: 13px;
  color: #1f2937;
}

.plan-meta,
.staff-org,
.schedule-time {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.staff-name {
  font-size: 13px;
  color: #1f2937;
}

.evidence-line {
  font-size: 11px;
  line-height: 17px;
  color: #5b6779;
}

@media (max-width: 1400px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
