<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { App } from 'antdv-next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from '@antdv-next/icons'
import {
  accessDataTypeOptions,
  accessRequests,
  approveAccess,
  rejectAccess,
  type AccessRequest,
  type AccessStatus,
  type AccessDataType,
} from '@/composables/useCompliance'

const props = defineProps<{ initialStatus?: AccessStatus | '' }>()

const { message } = App.useApp()

const statusColors: Record<AccessStatus, string> = {
  待审批: 'warning',
  一级通过: 'orange',
  已通过: 'success',
  已驳回: 'error',
  已过期: 'default',
}

const statusOptions = (['待审批', '一级通过', '已通过', '已驳回', '已过期'] as AccessStatus[]).map(
  (item) => ({ value: item, label: item }),
)
const dataTypeOptions = accessDataTypeOptions.map((item) => ({ value: item, label: item }))

const filters = reactive({
  keyword: '',
  status: (props.initialStatus || undefined) as AccessStatus | undefined,
  dataType: undefined as AccessDataType | undefined,
})
const applied = ref({ ...filters })

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  return accessRequests.filter((item) => {
    if (condition.status && item.status !== condition.status) return false
    if (condition.dataType && item.dataType !== condition.dataType) return false
    if (
      keyword &&
      !`${item.applicant}${item.targetName}${item.reason}${item.id}`.toLowerCase().includes(keyword)
    ) {
      return false
    }
    return true
  })
})

const stats = computed(() => ({
  pending: accessRequests.filter((item) => item.status === '待审批').length,
  firstLevel: accessRequests.filter((item) => item.status === '一级通过').length,
  approved: accessRequests.filter((item) => item.status === '已通过').length,
  rejected: accessRequests.filter((item) => item.status === '已驳回').length,
}))

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = undefined
  filters.dataType = undefined
  applied.value = { ...filters }
}

const columns = [
  { key: 'request', title: '申请编号', width: 160 },
  { key: 'applicant', title: '申请人', width: 140 },
  { key: 'target', title: '调阅对象', width: 220 },
  { key: 'dataType', title: '数据类型', width: 110 },
  { key: 'reason', title: '调阅事由', width: 260 },
  { key: 'cross', title: '跨域', width: 90 },
  { key: 'status', title: '状态', width: 110 },
  { key: 'createdAt', title: '申请时间', width: 160 },
  { key: 'actions', title: '操作', width: 130 },
]

const approvalOpen = ref(false)
const activeRequest = ref<AccessRequest | null>(null)
const rejectMode = ref(false)
const rejectReason = ref('')
const submitting = ref(false)

function openApproval(request: AccessRequest) {
  activeRequest.value = request
  rejectMode.value = false
  rejectReason.value = ''
  approvalOpen.value = true
}

const readonly = computed(() => {
  const status = activeRequest.value?.status
  return status === '已通过' || status === '已驳回' || status === '已过期'
})

const canApprove = computed(() => {
  const request = activeRequest.value
  if (!request) return false
  if (request.status === '待审批') return true
  if (request.status === '一级通过') return true
  return false
})

async function handleApprove() {
  if (!activeRequest.value) return
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = approveAccess(activeRequest.value.id)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  if (result.level === 'first') {
    message.success(result.message)
  } else {
    message.success(result.message)
  }
  approvalOpen.value = false
}

async function handleReject() {
  if (!activeRequest.value) return
  if (!rejectReason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = rejectAccess(activeRequest.value.id, rejectReason.value)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  approvalOpen.value = false
}

const chain = computed(() => {
  const request = activeRequest.value
  if (!request) return []
  const items = request.logs.map((log) => ({
    title: `${log.level === 1 ? '一级审批' : '二级审批'} · ${log.result}`,
    time: log.time,
    desc: `${log.approver}（${log.role}）：${log.opinion}`,
    color: log.result === '通过' ? 'green' : 'red',
  }))
  if (request.status === '待审批') {
    items.push({ title: '一级审批 · 待处理', time: '', desc: '等待审批人处理', color: 'gray' })
  }
  if (request.status === '一级通过') {
    items.push({ title: '二级审批 · 待处理', time: '', desc: '需平台管理员进行二级审批', color: 'orange' })
  }
  return items
})

const statCards = computed(() => [
  { key: 'pending', label: '待审批', value: stats.value.pending, icon: ClockCircleOutlined, tone: 'warning' },
  { key: 'first', label: '一级通过 / 待二级', value: stats.value.firstLevel, icon: SafetyCertificateOutlined, tone: 'orange' },
  { key: 'approved', label: '已通过', value: stats.value.approved, icon: CheckCircleOutlined, tone: 'success' },
  { key: 'rejected', label: '已驳回', value: stats.value.rejected, icon: CloseCircleOutlined, tone: 'danger' },
])
</script>

<template>
  <div class="access-panel">
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
          placeholder="搜索申请人 / 对象 / 事由"
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
          v-model:value="filters.dataType"
          class="filter-select"
          :options="dataTypeOptions"
          placeholder="全部数据类型"
          allow-clear
        />
        <a-button type="primary" @click="applyFilters">查询</a-button>
        <a-button @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
        <div class="filter-spacer" />
        <a-tag color="orange">跨域调阅需两级审批</a-tag>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-head">
        <div>
          <h3 class="section-title">调阅申请</h3>
          <p class="section-desc">敏感数据调阅必须填写事由与时段，审批通过后方可查看；所有审批动作写入审计日志。</p>
        </div>
        <a-tag color="blue">共 {{ filtered.length }} 条</a-tag>
      </div>

      <a-table
        :data-source="filtered"
        :columns="columns"
        :row-key="(record: AccessRequest) => record.id"
        :scroll="{ x: 1380 }"
        :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
        :locale="{ emptyText: '暂无待审批申请' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'request'">
            <span class="mono">{{ record.id }}</span>
          </template>
          <template v-else-if="column.key === 'applicant'">
            <div class="applicant">{{ record.applicant }}</div>
            <div class="applicant-meta">{{ record.applicantRole }}</div>
          </template>
          <template v-else-if="column.key === 'target'">
            <div class="target">{{ record.targetName }}</div>
            <div class="applicant-meta">{{ record.timeRange }}</div>
          </template>
          <template v-else-if="column.key === 'dataType'">
            <a-tag color="purple">{{ record.dataType }}</a-tag>
          </template>
          <template v-else-if="column.key === 'reason'">
            <div class="reason">{{ record.reason }}</div>
          </template>
          <template v-else-if="column.key === 'cross'">
            <a-tag :color="record.crossDomain ? 'orange' : 'default'">
              {{ record.crossDomain ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status as AccessStatus]">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            <span class="mono">{{ record.createdAt }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              v-if="record.status === '待审批' || record.status === '一级通过'"
              type="link"
              size="small"
              @click="openApproval(record)"
            >
              审批
            </a-button>
            <a-button v-else type="link" size="small" @click="openApproval(record)">查看</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="approvalOpen"
      :title="readonly ? '调阅详情' : '调阅审批'"
      :width="560"
      :confirm-loading="submitting"
      :footer="null"
      destroy-on-hidden
    >
      <div v-if="activeRequest" class="approval-body">
        <div class="approval-head">
          <div>
            <div class="mono text-weak">{{ activeRequest.id }}</div>
            <div class="approval-target">{{ activeRequest.targetName }}</div>
            <div class="applicant-meta">
              {{ activeRequest.applicant }}（{{ activeRequest.applicantRole }} / {{ activeRequest.applicantOrg }}）
            </div>
          </div>
          <a-tag :color="statusColors[activeRequest.status as AccessStatus]">{{ activeRequest.status }}</a-tag>
        </div>

        <a-alert
          v-if="activeRequest.crossDomain && activeRequest.status === '一级通过'"
          type="warning"
          show-icon
          message="该申请为跨域调阅，已完成一级审批"
          description="需平台管理员进行二级审批后方可生效。"
        />

        <a-alert
          v-if="activeRequest.status === '已驳回' && activeRequest.rejectReason"
          type="error"
          show-icon
          message="申请已驳回"
          :description="activeRequest.rejectReason"
        />

        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="数据类型">{{ activeRequest.dataType }}</a-descriptions-item>
          <a-descriptions-item label="调阅范围">{{ activeRequest.scope }}</a-descriptions-item>
          <a-descriptions-item label="调阅时段">{{ activeRequest.timeRange }}</a-descriptions-item>
          <a-descriptions-item label="是否跨域">
            {{ activeRequest.crossDomain ? '是，需两级审批' : '否，一级审批即生效' }}
          </a-descriptions-item>
          <a-descriptions-item label="调阅事由">{{ activeRequest.reason }}</a-descriptions-item>
          <a-descriptions-item label="申请时间">{{ activeRequest.createdAt }}</a-descriptions-item>
        </a-descriptions>

        <div class="chain-block">
          <div class="block-title">审批链</div>
          <a-timeline class="approval-chain">
            <a-timeline-item v-for="item in chain" :key="item.title + item.time" :color="item.color">
              <div class="chain-title">{{ item.title }}</div>
              <div v-if="item.time" class="chain-time">{{ item.time }}</div>
              <div class="chain-desc">{{ item.desc }}</div>
            </a-timeline-item>
          </a-timeline>
        </div>

        <template v-if="!readonly && canApprove">
          <div v-if="rejectMode" class="reject-block">
            <div class="reason-label">驳回原因 <span class="required">*</span></div>
            <a-textarea
              v-model:value="rejectReason"
              :rows="3"
              :maxlength="120"
              show-count
              placeholder="请说明驳回原因，申请人可查看"
            />
          </div>

          <div class="approval-foot">
            <a-button @click="approvalOpen = false">关闭</a-button>
            <template v-if="rejectMode">
              <a-button @click="rejectMode = false">取消驳回</a-button>
              <a-button danger type="primary" :loading="submitting" @click="handleReject">确认驳回</a-button>
            </template>
            <template v-else>
              <a-button danger ghost @click="rejectMode = true">驳回</a-button>
              <a-button type="primary" :loading="submitting" @click="handleApprove">
                {{ activeRequest.status === '一级通过' ? '二级通过' : '通过' }}
              </a-button>
            </template>
          </div>
        </template>

        <div v-else class="approval-foot">
          <a-button @click="approvalOpen = false">关闭</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.access-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.tone-warning {
  color: #d97706;
  background: #fff4e5;
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
  width: 260px;
}

.filter-select {
  width: 150px;
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
}

.applicant {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.applicant-meta {
  font-size: 11px;
  line-height: 16px;
  color: #8a96a8;
}

.target {
  font-size: 13px;
  color: #1f2937;
}

.reason {
  font-size: 12px;
  line-height: 18px;
  color: #5b6779;
}

.approval-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.approval-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.approval-target {
  margin-top: 2px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.block-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.chain-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.chain-time {
  font-size: 11px;
  color: #8a96a8;
}

.chain-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #5b6779;
}

.reject-block {
  padding: 12px 14px;
  border-radius: 8px;
  background: #fdf5f5;
  border: 1px solid #f6dcdc;
}

.reason-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #5b6779;
}

.required {
  color: #d64545;
}

.approval-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px dashed #eef2f7;
}
</style>
