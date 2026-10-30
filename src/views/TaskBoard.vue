<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  ExclamationCircleOutlined,
  MobileOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  TagsOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import TaskDispatchDrawer from '@/components/tasks/TaskDispatchDrawer.vue'
import TaskReassignModal from '@/components/tasks/TaskReassignModal.vue'
import TaskConfirmModal from '@/components/tasks/TaskConfirmModal.vue'
import { currentUser, hasPermission } from '@/composables/useAuth'
import {
  acceptMinutes,
  arriveMinutes,
  executors,
  formatDuration,
  isTaskOverdue,
  remindTask,
  taskTypeOptions,
  tasks,
  type Task,
  type TaskStatus,
  type TaskType,
} from '@/composables/useTasks'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const canViewTasks = computed(() => hasPermission('tasks'))
const canDispatch = computed(() => hasPermission('tasks', 'approve'))

const statusColors: Record<TaskStatus, string> = {
  待接单: 'warning',
  已接单: 'processing',
  执行中: 'blue',
  待确认: 'orange',
  已完成: 'success',
  已退回: 'error',
  已取消: 'default',
}

const typeColors: Record<TaskType, string> = {
  应急到场: 'red',
  上门探视: 'blue',
  代购: 'cyan',
  陪同就医: 'purple',
  检查水电: 'gold',
  开门配合: 'default',
}

const statusOptions = (['待接单', '已接单', '执行中', '待确认', '已完成', '已退回', '已取消'] as TaskStatus[]).map(
  (item) => ({ value: item, label: item }),
)
const typeOptions = taskTypeOptions.map((item) => ({ value: item, label: item }))
const executorOptions = executors.map((item) => ({ value: item.name, label: `${item.name} · ${item.org}` }))

const filters = reactive({
  keyword: '',
  status: undefined as TaskStatus | undefined,
  type: undefined as TaskType | undefined,
  executor: undefined as string | undefined,
})
const applied = ref({ ...filters })

const scopedTasks = computed(() => {
  if (currentUser.value?.role === 'project_staff') {
    return tasks.filter((item) => item.executorName === currentUser.value?.name)
  }
  return tasks
})

const stats = computed(() => ({
  pending: scopedTasks.value.filter((item) => item.status === '待接单').length,
  running: scopedTasks.value.filter((item) => item.status === '已接单' || item.status === '执行中').length,
  confirming: scopedTasks.value.filter((item) => item.status === '待确认').length,
  completed: scopedTasks.value.filter((item) => item.status === '已完成').length,
  returned: scopedTasks.value.filter((item) => item.status === '已退回').length,
}))

const overdueCount = computed(() => scopedTasks.value.filter((item) => isTaskOverdue(item)).length)

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  return scopedTasks.value.filter((item) => {
    if (condition.status && item.status !== condition.status) return false
    if (condition.type && item.type !== condition.type) return false
    if (condition.executor && item.executorName !== condition.executor) return false
    if (
      keyword &&
      !`${item.id}${item.elderName}${item.address}${item.executorName}`.toLowerCase().includes(keyword)
    ) {
      return false
    }
    return true
  })
})

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = undefined
  filters.type = undefined
  filters.executor = undefined
  applied.value = { ...filters }
}

const columns = [
  { key: 'task', title: '任务', width: 180 },
  { key: 'elder', title: '老人与地址', width: 240 },
  { key: 'type', title: '类型', width: 110 },
  { key: 'executor', title: '执行人', width: 170 },
  { key: 'window', title: '时间窗', width: 160 },
  { key: 'status', title: '状态', width: 110 },
  { key: 'sla', title: '接单/到场', width: 150 },
  { key: 'actions', title: '操作', width: 200 },
]

function goDetail(task: Task) {
  router.push(`/tasks/${task.id}`)
}

const customRow = (record: Task) => ({
  onClick: () => goDetail(record),
  style: 'cursor: pointer',
})

function goMobile(task: Task) {
  router.push(`/m/task/${task.id}`)
}

const dispatchOpen = ref(false)
const dispatchEventId = ref<string | undefined>()
const dispatchElderId = ref<string | undefined>()
const dispatchType = ref<TaskType | undefined>()

const reassignOpen = ref(false)
const reassignTarget = ref<Task | null>(null)

const confirmOpen = ref(false)
const confirmTarget = ref<Task | null>(null)

function openReassign(task: Task) {
  reassignTarget.value = task
  reassignOpen.value = true
}

function openConfirm(task: Task) {
  confirmTarget.value = task
  confirmOpen.value = true
}

function handleRemind(task: Task) {
  const result = remindTask(task.id)
  if (result.ok) message.success(result.message)
  else message.error(result.message)
}

function handleCreated(task: Task) {
  router.push(`/tasks/${task.id}`)
}

if (route.query.dispatch === '1') {
  dispatchEventId.value = route.query.event ? String(route.query.event) : undefined
  dispatchElderId.value = route.query.elder ? String(route.query.elder) : undefined
  dispatchType.value = route.query.type ? (String(route.query.type) as TaskType) : undefined
  dispatchOpen.value = true
}

const statCards = computed(() => [
  { key: 'pending', label: '待接单', value: stats.value.pending, icon: ClockCircleOutlined, tone: 'warning' },
  { key: 'running', label: '进行中', value: stats.value.running, icon: SyncOutlined, tone: 'primary' },
  { key: 'confirming', label: '待确认', value: stats.value.confirming, icon: CheckSquareOutlined, tone: 'orange' },
  { key: 'completed', label: '已完成', value: stats.value.completed, icon: CheckCircleOutlined, tone: 'success' },
  { key: 'returned', label: '超时退回', value: stats.value.returned, icon: ExclamationCircleOutlined, tone: 'danger' },
])
</script>

<template>
  <AdminLayout>
    <div class="page task-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">任务协同</h1>
          <p class="page-subtitle">
            承接 L3 事件转派与日常看管任务，覆盖派发、接单、到场、清单执行、回执确认与 SLA 考核。
          </p>
        </div>
        <div class="page-actions">
          <a-button @click="router.push('/tasks/sla')">
            <template #icon><DashboardOutlined /></template>
            SLA 台账
          </a-button>
          <a-button @click="router.push('/settings?tab=dict')">
            <template #icon><TagsOutlined /></template>
            业务字典
          </a-button>
          <a-button v-if="canDispatch" type="primary" @click="dispatchOpen = true">
            <template #icon><PlusOutlined /></template>
            派发任务
          </a-button>
        </div>
      </div>

      <template v-if="!canViewTasks">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无任务协同权限"
            sub-title="任务协同面向项目管理员、项目成员与平台运营开放。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <a-alert
          v-if="overdueCount > 0"
          type="error"
          show-icon
          :message="`有 ${overdueCount} 个任务超时未接单，请及时改派或转社区兜底`"
          description="超过接单时限的任务将自动退回社区，超时记录计入 SLA 台账。"
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
              placeholder="搜索任务编号 / 老人 / 地址"
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
              v-model:value="filters.type"
              class="filter-select"
              :options="typeOptions"
              placeholder="全部类型"
              allow-clear
            />
            <a-select
              v-model:value="filters.executor"
              class="filter-select"
              :options="executorOptions"
              placeholder="全部执行人"
              allow-clear
            />
            <a-button type="primary" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">
              <template #icon><ReloadOutlined /></template>
              重置
            </a-button>
            <div class="filter-spacer" />
            <a-tag color="blue"><AppstoreOutlined /> 共 {{ filtered.length }} 个任务</a-tag>
          </div>
        </div>

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">任务列表</h3>
              <p class="section-desc">应急任务优先展示；点击任务行查看详情与执行时间轴。</p>
            </div>
            <a-tag v-if="currentUser?.role === 'project_staff'" color="green">仅显示指派给我的任务</a-tag>
          </div>

          <a-table
            :data-source="filtered"
            :columns="columns"
            :row-key="(record: Task) => record.id"
            :scroll="{ x: 1320 }"
            :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
            :locale="{ emptyText: '暂无符合条件的任务' }"
            :on-row="customRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'task'">
                <div class="mono">{{ record.id }}</div>
                <div class="task-source">
                  {{ record.source }}
                  <span v-if="isTaskOverdue(record as Task)" class="overdue-dot">超时</span>
                </div>
              </template>
              <template v-else-if="column.key === 'elder'">
                <div class="elder-name">{{ record.elderName }}</div>
                <div class="elder-address">{{ record.community }} {{ record.address }}</div>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag :color="typeColors[record.type as TaskType]">{{ record.type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'executor'">
                <div class="executor">{{ record.executorName }}</div>
                <div class="executor-org">{{ record.executorOrg }}</div>
              </template>
              <template v-else-if="column.key === 'window'">
                <div>{{ record.windowStart }}–{{ record.windowEnd }}</div>
                <div class="window-created">派发 {{ record.createdAt.slice(11) }}</div>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="statusColors[record.status as TaskStatus]">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'sla'">
                <div v-if="record.acceptedAt" class="sla-line">
                  接单 {{ formatDuration(acceptMinutes(record as Task)) }}
                </div>
                <div v-if="record.arrivedAt" class="sla-line">
                  到场 {{ formatDuration(arriveMinutes(record as Task)) }}
                </div>
                <div
                  v-if="isTaskOverdue(record as Task)"
                  class="sla-line overdue"
                >
                  接单超时
                </div>
                <span v-if="!record.acceptedAt && !isTaskOverdue(record as Task)" class="text-weak">—</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="4" @click.stop>
                  <a-button type="link" size="small" @click.stop="goDetail(record as Task)">查看</a-button>
                  <a-button
                    v-if="record.status === '待接单' && canDispatch"
                    type="link"
                    size="small"
                    @click.stop="handleRemind(record as Task)"
                  >
                    催办
                  </a-button>
                  <a-button
                    v-if="['待接单', '已退回'].includes(record.status) && canDispatch"
                    type="link"
                    size="small"
                    @click.stop="openReassign(record as Task)"
                  >
                    改派
                  </a-button>
                  <a-button
                    v-if="record.status === '待确认'"
                    type="link"
                    size="small"
                    @click.stop="openConfirm(record as Task)"
                  >
                    确认
                  </a-button>
                  <a-button
                    v-if="['待接单', '已接单', '执行中', '待确认', '已完成'].includes(record.status)"
                    type="link"
                    size="small"
                    @click.stop="goMobile(record as Task)"
                  >
                    <template #icon><MobileOutlined /></template>
                    物业端
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </template>

      <TaskDispatchDrawer
        v-model:open="dispatchOpen"
        :event-id="dispatchEventId"
        :elder-id="dispatchElderId"
        :initial-type="dispatchType"
        @created="handleCreated"
      />
      <TaskReassignModal v-model:open="reassignOpen" :task="reassignTarget" />
      <TaskConfirmModal v-model:open="confirmOpen" :task="confirmTarget" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.task-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.forbidden-card {
  padding: 48px 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
}

.stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}

.tone-warning {
  color: #d97706;
  background: #fff4e5;
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-orange {
  color: #c2410c;
  background: #ffedd5;
}

.tone-success {
  color: #0e9384;
  background: #e6f6f4;
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
  width: 250px;
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

.task-source {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.overdue-dot {
  padding: 0 4px;
  border-radius: 4px;
  color: #d64545;
  background: #fdecec;
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

.executor {
  font-size: 13px;
  color: #1f2937;
}

.executor-org {
  font-size: 11px;
  color: #8a96a8;
}

.window-created {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.sla-line {
  font-size: 11px;
  line-height: 17px;
  color: #5b6779;
}

.sla-line.overdue {
  color: #d64545;
}

@media (max-width: 1400px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
