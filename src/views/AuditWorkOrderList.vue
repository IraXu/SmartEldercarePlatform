<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  AccountBookOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { addAudit, hasPermission } from '@/composables/useAuth'
import {
  auditRecords,
  auditStats,
  auditStatusColor,
  elementColor,
  riskColor,
  runAllAudit,
  type AuditRecord,
  type AuditStatus,
  type ElementKey,
  type ElementStatus,
  type RiskLevel,
} from '@/composables/useEvidence'

const router = useRouter()
const { message } = App.useApp()

const canView = computed(() => hasPermission('audit'))
const canOperate = computed(() => canView.value)

const statusOptions = (
  [
    '待机审',
    '机审通过',
    '机审异常',
    '复核通过',
    '复核不通过',
    '申诉中',
    '已结算',
  ] as AuditStatus[]
).map((item) => ({ value: item, label: item }))

const riskOptions = (['高', '中', '低'] as RiskLevel[]).map((item) => ({
  value: item,
  label: `${item}风险`,
}))
const orgOptions = ['安康居家护理站', '康乐颐养服务中心'].map((item) => ({
  value: item,
  label: item,
}))
const rangeOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '近 7 天' },
]

const filters = reactive({
  keyword: '',
  status: undefined as AuditStatus | undefined,
  risk: undefined as RiskLevel | undefined,
  org: undefined as string | undefined,
  range: 'all',
})
const applied = ref({ ...filters })

/** 演示数据的「今天」取所有审核单中最晚的服务日期，避免固定日期导致筛选失真 */
const demoToday = computed(() => {
  const dates = auditRecords.map((item) => item.serviceDate).sort()
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
  const priority = (status: AuditStatus) =>
    status === '待机审' ? 0 : status === '机审异常' ? 1 : status === '申诉中' ? 2 : 3
  return auditRecords
    .filter((item) => {
      if (condition.status && item.status !== condition.status) return false
      if (condition.risk && item.risk !== condition.risk) return false
      if (condition.org && item.staffOrg !== condition.org) return false
      if (condition.range === 'today' && item.serviceDate !== demoToday.value) return false
      if (condition.range === 'week' && item.serviceDate < weekStart) return false
      if (
        keyword &&
        !`${item.id}${item.orderId}${item.elderName}${item.staffName}${item.staffOrg}${item.address}`
          .toLowerCase()
          .includes(keyword)
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const gap = priority(a.status) - priority(b.status)
      if (gap !== 0) return gap
      return b.serviceDate.localeCompare(a.serviceDate)
    })
})

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = undefined
  filters.risk = undefined
  filters.org = undefined
  filters.range = 'all'
  applied.value = { ...filters }
}

const columns = [
  { key: 'order', title: '审核单', width: 170 },
  { key: 'elder', title: '老人与地址', width: 230 },
  { key: 'staff', title: '服务人员与机构', width: 200 },
  { key: 'service', title: '服务时间', width: 160 },
  { key: 'elements', title: '五要素', width: 160 },
  { key: 'status', title: '机审结论', width: 110 },
  { key: 'risk', title: '风险', width: 90 },
  { key: 'actions', title: '操作', width: 160 },
]

function goDetail(record: AuditRecord) {
  router.push(`/audit/workorders/${record.id}`)
}

const customRow = (record: AuditRecord) => ({
  onClick: () => goDetail(record),
  style: 'cursor: pointer',
})

const elementOrder: ElementKey[] = ['person', 'time', 'place', 'item', 'media']

function displayElements(record: AuditRecord) {
  return elementOrder.map((key) => {
    const element = record.elements.find((item) => item.key === key)
    const status: ElementStatus =
      record.machineStatus === '待机审' ? '待核' : (element?.status ?? '待核')
    return {
      key,
      label: element?.label ?? key,
      status,
      color: elementColor(status),
    }
  })
}

const statCards = computed(() => [
  {
    key: 'pending',
    label: '待机审',
    value: auditStats.value.pending,
    icon: FileSearchOutlined,
    tone: 'muted',
    path: '',
  },
  {
    key: 'passed',
    label: '机审通过',
    value: auditStats.value.passed,
    icon: CheckCircleOutlined,
    tone: 'success',
    path: '',
  },
  {
    key: 'abnormal',
    label: '机审异常',
    value: auditStats.value.abnormal,
    icon: ExclamationCircleOutlined,
    tone: 'danger',
    path: '',
  },
  {
    key: 'review',
    label: '待复核',
    value: auditStats.value.reviewing,
    icon: AuditOutlined,
    tone: 'purple',
    path: '/audit/reviews',
  },
  {
    key: 'amount',
    label: '待结算金额',
    value: `¥${auditStats.value.settlementAmount.toFixed(2)}`,
    icon: AccountBookOutlined,
    tone: 'primary',
    path: '/audit/settlement',
  },
])

function handleStatClick(path: string) {
  if (!path) return
  router.push(path)
}

function handleAuditAll() {
  const result = runAllAudit()
  if (!result.ok) {
    message.warning(result.message)
    return
  }
  message.success(result.message)
}

function handleExport() {
  addAudit('导出证据包', '待审工单', '成功', `导出 ${filtered.value.length} 条审核单证据索引`)
  message.success('导出任务已创建（模拟）')
}
</script>

<template>
  <AdminLayout>
    <div class="page audit-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">证据与监管</h1>
          <p class="page-subtitle">
            以人、时、地、项、影像五要素归集服务证据，全量机审后进入人工复核与结算。
          </p>
        </div>
        <div v-if="canView" class="page-actions">
          <a-button @click="router.push('/audit/settlement')">
            <template #icon><AccountBookOutlined /></template>
            结算池
          </a-button>
          <a-button @click="router.push('/audit/orgs')">
            <template #icon><SafetyCertificateOutlined /></template>
            机构与人员
          </a-button>
          <a-button @click="router.push('/audit/leads')">
            <template #icon><AuditOutlined /></template>
            稽核线索
          </a-button>
          <a-button @click="handleExport">导出证据包</a-button>
          <a-button v-if="canOperate" type="primary" @click="handleAuditAll">
            <template #icon><ExperimentOutlined /></template>
            全量机审
          </a-button>
        </div>
      </div>

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无服务监管权限"
            sub-title="证据中心与服务监管仅面向医保审核员与平台运营开放，影像证据不对项目成员与民政查看透出。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <a-alert
          v-if="auditStats.abnormal > 0"
          type="error"
          show-icon
          :message="`有 ${auditStats.abnormal} 条工单机审异常，需人工复核`"
          description="高风险工单需逐项确认异常要素后方可通过；复核不通过的工单不进入结算池。"
        />

        <div class="stat-grid">
          <div
            v-for="card in statCards"
            :key="card.key"
            class="card stat-card"
            :class="{ 'stat-clickable': card.path }"
            @click="handleStatClick(card.path)"
          >
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
              placeholder="搜索审核单 / 工单号 / 老人 / 人员 / 机构"
              allow-clear
              @press-enter="applyFilters"
            >
              <template #prefix><SearchOutlined class="text-weak" /></template>
            </a-input>
            <a-select
              v-model:value="filters.status"
              class="filter-select"
              :options="statusOptions"
              placeholder="全部机审结论"
              allow-clear
            />
            <a-select
              v-model:value="filters.risk"
              class="filter-select-sm"
              :options="riskOptions"
              placeholder="全部风险"
              allow-clear
            />
            <a-select
              v-model:value="filters.org"
              class="filter-select"
              :options="orgOptions"
              placeholder="全部机构"
              allow-clear
            />
            <a-select v-model:value="filters.range" class="filter-select-sm" :options="rangeOptions" />
            <a-button type="primary" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">
              <template #icon><ReloadOutlined /></template>
              重置
            </a-button>
          </div>
        </div>

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">待审工单</h3>
              <p class="section-desc">
                待机审与机审异常优先展示；点击行查看五要素、证据清单与复核记录。
              </p>
            </div>
            <a-tag color="blue">共 {{ filtered.length }} 条</a-tag>
          </div>

          <a-table
            :data-source="filtered"
            :columns="columns"
            :row-key="(record: AuditRecord) => record.id"
            :scroll="{ x: 1330 }"
            :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
            :locale="{ emptyText: '暂无符合条件的待审工单' }"
            :on-row="customRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'order'">
                <div class="mono">{{ record.id }}</div>
                <div class="order-source">{{ record.orderId }} · {{ record.level }}</div>
              </template>
              <template v-else-if="column.key === 'elder'">
                <div class="elder-name">{{ record.elderName }}</div>
                <div class="elder-address">{{ record.community }} {{ record.address }}</div>
              </template>
              <template v-else-if="column.key === 'staff'">
                <div class="staff-name">{{ record.staffName }} · {{ record.staffTitle }}</div>
                <div class="staff-org">{{ record.staffOrg }}</div>
              </template>
              <template v-else-if="column.key === 'service'">
                <div>{{ record.serviceDate }}</div>
                <div class="service-meta">
                  {{ record.checkinAt.slice(11) }}-{{ record.checkoutAt.slice(11) }} ·
                  {{ record.duration }} 分钟
                </div>
              </template>
              <template v-else-if="column.key === 'elements'">
                <div class="element-row">
                  <span
                    v-for="item in displayElements(record as AuditRecord)"
                    :key="item.key"
                    class="element-chip"
                    :class="`el-${item.status === '通过' ? 'pass' : item.status === '异常' ? 'fail' : 'wait'}`"
                    :title="`${item.label}：${item.status}`"
                  >
                    {{ item.label }}
                  </span>
                </div>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="auditStatusColor(record.status as AuditStatus)">
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'risk'">
                <a-tag :color="riskColor(record.risk as RiskLevel)">{{ record.risk }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="4" @click.stop>
                  <a-button type="link" size="small" @click.stop="goDetail(record as AuditRecord)">
                    取证
                  </a-button>
                  <a-button
                    v-if="record.status === '机审异常' || record.status === '申诉中'"
                    type="link"
                    size="small"
                    @click.stop="router.push({ path: '/audit/reviews', query: { focus: (record as AuditRecord).id } })"
                  >
                    复核
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.audit-page {
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

.stat-clickable {
  cursor: pointer;
  transition: border-color 0.18s ease;
}

.stat-clickable:hover {
  border-color: var(--elder-primary);
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

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
}

.tone-danger {
  color: #d64545;
  background: #fdecec;
}

.tone-purple {
  color: #7c3aed;
  background: #f1ebff;
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
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
  width: 150px;
}

.filter-select-sm {
  width: 120px;
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

.elder-address,
.staff-org,
.service-meta {
  margin-top: 2px;
  font-size: 11px;
  line-height: 16px;
  color: #8a96a8;
}

.staff-name {
  font-size: 13px;
  color: #1f2937;
}

.element-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.element-chip {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 22px;
  text-align: center;
}

.el-pass {
  color: #2e9e5b;
  background: #eaf7ef;
}

.el-fail {
  color: #d64545;
  background: #fdecec;
}

.el-wait {
  color: #8a96a8;
  background: #f0f3f7;
}

@media (max-width: 1440px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
