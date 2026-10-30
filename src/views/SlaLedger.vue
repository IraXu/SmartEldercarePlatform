<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  acceptMinutes,
  arriveMinutes,
  exportSla,
  formatDuration,
  handleMinutes,
  tasks,
  totalMinutes,
  type Task,
  type TaskStatus,
} from '@/composables/useTasks'
import { currentUser, hasPermission } from '@/composables/useAuth'

const router = useRouter()
const { message, modal } = App.useApp()

const canViewTasks = computed(() => hasPermission('tasks'))

const period = ref('month')
const executor = ref<string | undefined>()

const periodOptions = [
  { value: 'week', label: '近 7 天' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '全部时间' },
]

const executorOptions = computed(() => {
  const map = new Map<string, string>()
  tasks.forEach((item) => {
    if (item.executorName) map.set(item.executorName, item.executorOrg)
  })
  return [...map.entries()].map(([name, org]) => ({
    value: name,
    label: org ? `${name} · ${org}` : name,
  }))
})

/** 演示数据的「今天」取任务中最晚的创建日期，避免写死日期导致时间筛选失真 */
const demoToday = computed(() => {
  const dates = tasks.map((item) => item.createdAt.slice(0, 10)).sort()
  return dates[dates.length - 1] ?? ''
})

const statusColors: Record<TaskStatus, string> = {
  待接单: 'warning',
  已接单: 'processing',
  执行中: 'blue',
  待确认: 'orange',
  已完成: 'success',
  已退回: 'error',
  已取消: 'default',
}

const filtered = computed(() => {
  const list = executor.value
    ? tasks.filter((item) => item.executorName === executor.value)
    : [...tasks]
  if (period.value === 'all') return list
  if (!demoToday.value) return list
  const base = new Date(`${demoToday.value}T00:00:00`)
  const threshold = new Date(base)
  threshold.setDate(base.getDate() - (period.value === 'week' ? 6 : 29))
  return list.filter((item) => new Date(item.createdAt.replace(' ', 'T')).getTime() >= threshold.getTime())
})

const summary = computed(() => {
  const completed = filtered.value.filter((item) => item.status === '已完成')
  const acceptList = completed
    .map((item) => acceptMinutes(item))
    .filter((value): value is number => value !== undefined)
  const arriveList = completed
    .map((item) => arriveMinutes(item))
    .filter((value): value is number => value !== undefined)
  const ended = filtered.value.filter((item) =>
    ['已完成', '已退回', '已取消'].includes(item.status),
  ).length
  const returned = filtered.value.filter((item) => item.status === '已退回').length
  return {
    avgAccept: acceptList.length
      ? Math.round(acceptList.reduce((sum, value) => sum + value, 0) / acceptList.length)
      : 0,
    avgArrive: arriveList.length
      ? Math.round(arriveList.reduce((sum, value) => sum + value, 0) / arriveList.length)
      : 0,
    completionRate: ended === 0 ? 0 : Math.round((completed.length / ended) * 100),
    overdue: returned,
  }
})

const columns = [
  { key: 'id', title: '任务编号', width: 160 },
  { key: 'type', title: '类型', width: 110 },
  { key: 'executor', title: '执行人', width: 150 },
  { key: 'accept', title: '派发→接单', width: 120 },
  { key: 'arrive', title: '接单→到场', width: 120 },
  { key: 'handle', title: '到场→提交', width: 120 },
  { key: 'total', title: '总时长', width: 120 },
  { key: 'status', title: '结果', width: 100 },
  { key: 'actions', title: '操作', width: 80 },
]

function openTask(task: Task) {
  router.push(`/tasks/${task.id}`)
}

function handleExport() {
  modal.confirm({
    title: '导出 SLA 台账',
    content: `将导出当前筛选结果 ${filtered.value.length} 条任务，导出行为写入审计，是否继续？`,
    okText: '确认导出',
    cancelText: '取消',
    onOk() {
      const result = exportSla()
      if (result.ok) message.success(result.message)
      else message.error('导出失败，请重试')
    },
  })
}

const statCards = computed(() => [
  { key: 'accept', label: '平均接单', value: `${summary.value.avgAccept} 分钟`, icon: ClockCircleOutlined, tone: 'primary' },
  { key: 'arrive', label: '平均到场', value: `${summary.value.avgArrive} 分钟`, icon: FieldTimeOutlined, tone: 'orange' },
  { key: 'rate', label: '完成率', value: `${summary.value.completionRate}%`, icon: CheckCircleOutlined, tone: 'success' },
  { key: 'overdue', label: '超时任务', value: `${summary.value.overdue} 个`, icon: ExclamationCircleOutlined, tone: 'danger' },
])
</script>

<template>
  <AdminLayout>
    <div class="page sla-page">
      <div class="back-line">
        <a-button type="link" size="small" @click="router.push('/tasks')">
          <template #icon><ArrowLeftOutlined /></template>
          返回任务看板
        </a-button>
      </div>

      <template v-if="!canViewTasks">
        <div class="card forbidden-card">
          <a-result status="403" title="当前账号无任务协同权限" sub-title="请联系管理员调整角色。">
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <div class="page-header">
          <div>
            <h1 class="page-title">SLA 台账</h1>
            <p class="page-subtitle">
              统一查看接单、到场、提交与完成时长，支撑物业与网格员考核；统计口径见页面底部说明。
            </p>
          </div>
          <div class="page-actions">
            <a-select v-model:value="period" :options="periodOptions" style="width: 140px" />
            <a-select
              v-model:value="executor"
              :options="executorOptions"
              placeholder="全部执行人"
              allow-clear
              style="width: 190px"
            />
            <a-button type="primary" ghost @click="handleExport">
              <template #icon><DownloadOutlined /></template>
              导出
            </a-button>
          </div>
        </div>

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

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">任务时长明细</h3>
              <p class="section-desc">仅已完成任务参与平均时长计算；超时与退回任务单独计数。</p>
            </div>
            <a-tag color="blue">共 {{ filtered.length }} 条</a-tag>
          </div>

          <a-table
            :data-source="filtered"
            :columns="columns"
            :row-key="(record: Task) => record.id"
            :scroll="{ x: 1080 }"
            :pagination="{ pageSize: 10, showSizeChanger: false }"
            :locale="{ emptyText: '该周期暂无任务' }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'id'">
                <span class="mono">{{ record.id }}</span>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag>{{ record.type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'executor'">
                <div>{{ record.executorName }}</div>
                <div class="executor-org">{{ record.executorOrg }}</div>
              </template>
              <template v-else-if="column.key === 'accept'">
                <span :class="{ 'text-weak': !record.acceptedAt }">
                  {{ record.acceptedAt ? formatDuration(acceptMinutes(record)) : '—' }}
                </span>
              </template>
              <template v-else-if="column.key === 'arrive'">
                <span :class="{ 'text-weak': !record.arrivedAt }">
                  {{ record.arrivedAt ? formatDuration(arriveMinutes(record)) : '—' }}
                </span>
              </template>
              <template v-else-if="column.key === 'handle'">
                <span :class="{ 'text-weak': !record.submittedAt }">
                  {{ record.submittedAt ? formatDuration(handleMinutes(record)) : '—' }}
                </span>
              </template>
              <template v-else-if="column.key === 'total'">
                <span :class="{ 'text-weak': !record.completedAt }">
                  {{ record.completedAt ? formatDuration(totalMinutes(record)) : '—' }}
                </span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="statusColors[record.status as TaskStatus]">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button type="link" size="small" @click="openTask(record as Task)">查看</a-button>
              </template>
            </template>
          </a-table>

          <div class="sla-foot">
            <div class="foot-title">统计口径</div>
            <div class="foot-list">
              <span>平均接单：已完成任务的接单时间 - 派发时间</span>
              <span>平均到场：到场时间 - 派发时间</span>
              <span>完成率：已完成 / （已完成 + 已退回 + 已取消）</span>
              <span>超时任务：已退回任务数</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.sla-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-line {
  margin-bottom: -8px;
}

.forbidden-card {
  padding: 48px 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
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
  font-size: 22px;
  line-height: 28px;
  font-weight: 600;
  color: #1f2937;
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
}

.executor-org {
  font-size: 11px;
  color: #8a96a8;
}

.sla-foot {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
}

.foot-title {
  font-size: 12px;
  font-weight: 600;
  color: #5b6779;
}

.foot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 6px;
  font-size: 11px;
  color: #8a96a8;
}

@media (max-width: 1400px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
