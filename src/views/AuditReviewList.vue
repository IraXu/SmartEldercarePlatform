<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SolutionOutlined,
  TrophyOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AuditReviewModal from '@/components/audit/AuditReviewModal.vue'
import { hasPermission } from '@/composables/useAuth'
import {
  auditRecords,
  auditStatusColor,
  getAudit,
  reviewQueue,
  riskColor,
  type AuditRecord,
  type RiskLevel,
} from '@/composables/useEvidence'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const canView = computed(() => hasPermission('audit'))

const filters = reactive({
  keyword: '',
  risk: undefined as RiskLevel | undefined,
  org: undefined as string | undefined,
  element: undefined as string | undefined,
})
const applied = ref({ ...filters })

const orgOptions = ['安康居家护理站', '康乐颐养服务中心'].map((item) => ({
  value: item,
  label: item,
}))
const riskOptions = (['高', '中', '低'] as RiskLevel[]).map((item) => ({
  value: item,
  label: `${item}风险`,
}))
const elementOptions = ['人', '时', '地', '项', '影像'].map((item) => ({
  value: item,
  label: item,
}))

const reviewedRecords = computed(() =>
  auditRecords.filter((item) => Boolean(item.review)),
)
const reviewedToday = computed(() =>
  reviewedRecords.value.filter((item) => item.review?.time.startsWith('2026-10-28')).length,
)
const passRate = computed(() => {
  if (reviewedRecords.value.length === 0) return '-'
  const passed = reviewedRecords.value.filter((item) => item.review?.result === '通过').length
  return `${((passed / reviewedRecords.value.length) * 100).toFixed(1)}%`
})

const stats = computed(() => [
  {
    key: 'queue',
    label: '待复核',
    value: reviewQueue.value.length,
    icon: SolutionOutlined,
    tone: 'purple',
  },
  {
    key: 'today',
    label: '今日已复核',
    value: reviewedToday.value,
    icon: ClockCircleOutlined,
    tone: 'primary',
  },
  {
    key: 'rate',
    label: '复核通过率',
    value: passRate.value,
    icon: TrophyOutlined,
    tone: 'success',
  },
  {
    key: 'high',
    label: '高风险待复核',
    value: reviewQueue.value.filter((item) => item.risk === '高').length,
    icon: ExclamationCircleOutlined,
    tone: 'danger',
  },
])

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  return reviewQueue.value.filter((item) => {
    if (condition.risk && item.risk !== condition.risk) return false
    if (condition.org && item.staffOrg !== condition.org) return false
    if (
      condition.element &&
      !item.elements.some((element) => element.label === condition.element && element.status === '异常')
    ) {
      return false
    }
    if (
      keyword &&
      !`${item.id}${item.elderName}${item.staffName}${item.staffOrg}`.toLowerCase().includes(keyword)
    ) {
      return false
    }
    return true
  })
})

const columns = [
  { key: 'order', title: '审核单', width: 160 },
  { key: 'elder', title: '老人', width: 120 },
  { key: 'staff', title: '机构与人员', width: 200 },
  { key: 'elements', title: '异常要素', width: 170 },
  { key: 'risk', title: '风险', width: 90 },
  { key: 'wait', title: '等待时长', width: 120 },
  { key: 'status', title: '状态', width: 110 },
  { key: 'actions', title: '操作', width: 150 },
]

function waitHours(record: AuditRecord) {
  if (!record.auditedAt) return 0
  const start = new Date(record.auditedAt.replace(/-/g, '/')).getTime()
  const now = new Date('2026/10/28 10:00').getTime()
  return Math.max(0, Math.round((now - start) / 3600000))
}

function waitText(record: AuditRecord) {
  const hours = waitHours(record)
  return hours >= 24 ? `${Math.floor(hours / 24)} 天 ${hours % 24} 小时` : `${hours} 小时`
}

function abnormalLabel(record: AuditRecord) {
  return record.elements.filter((item) => item.status === '异常').map((item) => item.label)
}

const reviewOpen = ref(false)
const activeRecord = ref<AuditRecord | null>(null)

function openReview(record: AuditRecord) {
  activeRecord.value = record
  reviewOpen.value = true
}

function handleReviewed(id: string) {
  message.success(`审核单 ${id} 已提交复核结论`)
}

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.risk = undefined
  filters.org = undefined
  filters.element = undefined
  applied.value = { ...filters }
}

function focusRecord() {
  const focus = String(route.query.focus ?? '')
  if (!focus) return
  const record = getAudit(focus)
  if (record && ['机审异常', '申诉中'].includes(record.status)) {
    openReview(record)
  }
}

onMounted(focusRecord)
watch(() => route.query.focus, focusRecord)
</script>

<template>
  <AdminLayout>
    <div class="page review-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">人工复核</h1>
          <p class="page-subtitle">
            集中处理机审异常与申诉工单，高风险与超时工单优先，复核结论直接决定是否结算。
          </p>
        </div>
        <div v-if="canView" class="page-actions">
          <a-button @click="router.push('/audit/workorders')">返回待审工单</a-button>
        </div>
      </div>

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无服务监管权限"
            sub-title="人工复核面向医保审核员与平台运营开放。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <div class="stat-grid">
          <div v-for="card in stats" :key="card.key" class="card stat-card">
            <span class="stat-icon" :class="`tone-${card.tone}`">
              <component :is="card.icon" />
            </span>
            <div>
              <div class="stat-label">{{ card.label }}</div>
              <div class="stat-value">{{ card.value }}</div>
            </div>
          </div>
        </div>

        <a-alert
          class="rule-alert"
          type="info"
          show-icon
          message="复核规范"
          description="机审异常需在 24 小时内完成复核；高风险工单须逐项确认异常要素；复核意见不少于 10 个字，结论与机审不一致时需说明理由。"
        />

        <div class="card filter-card">
          <div class="filter-row">
            <a-input
              v-model:value="filters.keyword"
              class="filter-keyword"
              placeholder="搜索审核单 / 老人 / 人员"
              allow-clear
              @press-enter="applyFilters"
            >
              <template #prefix><SearchOutlined class="text-weak" /></template>
            </a-input>
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
            <a-select
              v-model:value="filters.element"
              class="filter-select-sm"
              :options="elementOptions"
              placeholder="全部异常要素"
              allow-clear
            />
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
              <h3 class="section-title">复核队列</h3>
              <p class="section-desc">按风险等级与等待时长排序，超 24 小时的等待时长标红。</p>
            </div>
            <a-tag color="purple">共 {{ filtered.length }} 条</a-tag>
          </div>

          <a-table
            :data-source="filtered"
            :columns="columns"
            :row-key="(record: AuditRecord) => record.id"
            :scroll="{ x: 1120 }"
            :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
            :locale="{ emptyText: '暂无待复核工单' }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'order'">
                <div class="mono">{{ record.id }}</div>
                <div class="order-source">{{ record.level }} · {{ record.serviceDate }}</div>
              </template>
              <template v-else-if="column.key === 'elder'">
                <div class="elder-name">{{ record.elderName }}</div>
                <div class="elder-address">{{ record.community }}</div>
              </template>
              <template v-else-if="column.key === 'staff'">
                <div class="staff-name">{{ record.staffName }} · {{ record.staffTitle }}</div>
                <div class="staff-org">{{ record.staffOrg }}</div>
              </template>
              <template v-else-if="column.key === 'elements'">
                <div class="chip-row">
                  <a-tag
                    v-for="item in abnormalLabel(record as AuditRecord)"
                    :key="item"
                    color="error"
                  >
                    {{ item }}
                  </a-tag>
                </div>
              </template>
              <template v-else-if="column.key === 'risk'">
                <a-tag :color="riskColor(record.risk as RiskLevel)">{{ record.risk }}</a-tag>
              </template>
              <template v-else-if="column.key === 'wait'">
                <span :class="{ 'wait-timeout': waitHours(record as AuditRecord) >= 24 }">
                  {{ waitText(record as AuditRecord) }}
                </span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="auditStatusColor(record.status)">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="4">
                  <a-button
                    type="link"
                    size="small"
                    @click="router.push(`/audit/workorders/${(record as AuditRecord).id}`)"
                  >
                    取证
                  </a-button>
                  <a-button type="primary" size="small" @click="openReview(record as AuditRecord)">
                    复核
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </template>

      <AuditReviewModal v-model:open="reviewOpen" :record="activeRecord" @done="handleReviewed" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.forbidden-card {
  padding: 48px 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.tone-purple {
  color: #7c3aed;
  background: #f1ebff;
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
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

.rule-alert {
  border-radius: 10px;
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
  width: 180px;
}

.filter-select-sm {
  width: 130px;
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

.order-source,
.elder-address,
.staff-org {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.elder-name,
.staff-name {
  font-size: 13px;
  color: #1f2937;
}

.elder-name {
  font-weight: 600;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.wait-timeout {
  color: var(--elder-danger);
  font-weight: 600;
}
</style>
