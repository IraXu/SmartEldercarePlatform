<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  AccountBookOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  FileDoneOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import SettlementBatchModal from '@/components/audit/SettlementBatchModal.vue'
import { addAudit, hasPermission } from '@/composables/useAuth'
import {
  auditRecords,
  auditStatusColor,
  payBatch,
  poolRecords,
  revokeBatch,
  settlementBatches,
  settlementStats,
  type AuditRecord,
  type SettlementBatch,
} from '@/composables/useEvidence'

const router = useRouter()
const { message, modal } = App.useApp()

const canView = computed(() => hasPermission('audit'))

const batchOpen = ref(false)
const detailOpen = ref(false)
const activeBatch = ref<SettlementBatch | null>(null)

const statCards = computed(() => [
  {
    key: 'pending',
    label: '待结算单数',
    value: settlementStats.value.pendingCount,
    icon: FileDoneOutlined,
    tone: 'primary',
  },
  {
    key: 'amount',
    label: '待结算金额',
    value: `¥${settlementStats.value.pendingAmount.toFixed(2)}`,
    icon: AccountBookOutlined,
    tone: 'purple',
  },
  {
    key: 'settled',
    label: '本月已结算',
    value: `¥${settlementStats.value.settledAmount.toFixed(2)}`,
    icon: CheckCircleOutlined,
    tone: 'success',
  },
  {
    key: 'deduct',
    label: '异常扣减',
    value: `¥${settlementStats.value.deducted.toFixed(2)}`,
    icon: MinusCircleOutlined,
    tone: 'danger',
  },
])

const batchColumns = [
  { key: 'id', title: '批次号', width: 150 },
  { key: 'org', title: '机构', width: 200 },
  { key: 'period', title: '结算周期', width: 140 },
  { key: 'count', title: '单数', width: 80 },
  { key: 'amount', title: '金额', width: 110 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'paidAt', title: '拨付时间', width: 160 },
  { key: 'actions', title: '操作', width: 220 },
]

const poolColumns = [
  { key: 'id', title: '审核单', width: 160 },
  { key: 'elder', title: '老人', width: 110 },
  { key: 'staff', title: '机构与人员', width: 200 },
  { key: 'level', title: '待遇等级', width: 100 },
  { key: 'amount', title: '金额', width: 100 },
  { key: 'status', title: '结论', width: 110 },
  { key: 'passedAt', title: '通过时间', width: 160 },
  { key: 'actions', title: '操作', width: 80 },
]

const paymentColumns = [
  { key: 'payNo', title: '拨付单号', width: 150 },
  { key: 'batch', title: '结算批次', width: 150 },
  { key: 'org', title: '机构', width: 220 },
  { key: 'amount', title: '金额', width: 110 },
  { key: 'paidAt', title: '拨付时间', width: 160 },
  { key: 'status', title: '状态', width: 100 },
]

const payments = computed(() =>
  settlementBatches
    .filter((item) => item.status === '已拨付' && item.payNo)
    .map((item) => ({
      payNo: item.payNo as string,
      batch: item.id,
      org: item.org,
      amount: item.amount,
      paidAt: item.paidAt,
      status: '已到账',
    })),
)

const batchRecords = computed(() => {
  if (!activeBatch.value) return []
  return auditRecords.filter((item) => item.settlementBatch === activeBatch.value?.id)
})

function passedAt(record: AuditRecord) {
  return record.review?.time ?? record.auditedAt ?? '-'
}

function handleGenerate() {
  batchOpen.value = true
}

function handleBatchDone(id: string) {
  message.success(`结算批次 ${id} 已生成，等待拨付`)
}

function handlePay(batch: SettlementBatch) {
  modal.confirm({
    title: '确认拨付',
    content: `将向「${batch.org}」拨付 ${batch.count} 单，合计 ¥${batch.amount.toFixed(2)}，确认后不可撤回。`,
    okText: '确认拨付',
    cancelText: '取消',
    onOk() {
      const result = payBatch(batch.id)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      message.success(result.message)
    },
  })
}

function handleRevoke(batch: SettlementBatch) {
  modal.confirm({
    title: '撤回结算批次',
    content: `撤回后 ${batch.count} 条工单将返回待结算，是否继续？`,
    okText: '撤回批次',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const result = revokeBatch(batch.id)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      message.success(result.message)
    },
  })
}

function openBatchDetail(batch: SettlementBatch) {
  activeBatch.value = batch
  detailOpen.value = true
}

function handleExport() {
  addAudit('导出结算台账', '结算池', '成功', `待结算 ${poolRecords.value.length} 单`)
  message.success('结算台账导出任务已创建（模拟）')
}
</script>

<template>
  <AdminLayout>
    <div class="page settlement-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">结算池</h1>
          <p class="page-subtitle">
            仅机审通过或复核通过的工单可进入结算；按机构与周期生成批次，拨付后工单锁定。
          </p>
        </div>
        <div v-if="canView" class="page-actions">
          <a-button @click="handleExport">
            <template #icon><ExportOutlined /></template>
            导出结算台账
          </a-button>
          <a-button type="primary" @click="handleGenerate">
            <template #icon><PlusOutlined /></template>
            生成结算批次
          </a-button>
        </div>
      </div>

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无结算管理权限"
            sub-title="结算池面向医保审核员与平台运营开放。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
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
              <h3 class="section-title">结算批次</h3>
              <p class="section-desc">待拨付批次可撤回；已拨付批次保留拨付单号与记录。</p>
            </div>
            <a-tag color="blue">共 {{ settlementBatches.length }} 个批次</a-tag>
          </div>

          <a-table
            :data-source="settlementBatches"
            :columns="batchColumns"
            :row-key="(record: SettlementBatch) => record.id"
            size="middle"
            :pagination="false"
            :locale="{ emptyText: '暂无结算批次' }"
            :scroll="{ x: 1120 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'id'">
                <span class="mono">{{ record.id }}</span>
              </template>
              <template v-else-if="column.key === 'org'">{{ record.org }}</template>
              <template v-else-if="column.key === 'period'">{{ record.period }}</template>
              <template v-else-if="column.key === 'count'">{{ record.count }}</template>
              <template v-else-if="column.key === 'amount'">
                ¥{{ record.amount.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag
                  :color="record.status === '已拨付' ? 'success' : record.status === '待拨付' ? 'gold' : 'default'"
                >
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'paidAt'">
                {{ record.paidAt ?? '-' }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="4">
                  <a-button type="link" size="small" @click="openBatchDetail(record as SettlementBatch)">
                    查看明细
                  </a-button>
                  <a-button
                    v-if="record.status === '待拨付'"
                    type="link"
                    size="small"
                    @click="handlePay(record as SettlementBatch)"
                  >
                    确认拨付
                  </a-button>
                  <a-button
                    v-if="record.status === '待拨付'"
                    type="link"
                    size="small"
                    danger
                    @click="handleRevoke(record as SettlementBatch)"
                  >
                    撤回
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">待结算明细</h3>
              <p class="section-desc">
                口径：重度 ¥180 / 中度 ¥140 / 轻度 ¥100（示例口径）；复核不通过、申诉中的工单不入池。
              </p>
            </div>
            <a-tag color="cyan">共 {{ poolRecords.length }} 单 · ¥{{ settlementStats.pendingAmount.toFixed(2) }}</a-tag>
          </div>

          <a-table
            :data-source="poolRecords"
            :columns="poolColumns"
            :row-key="(record: AuditRecord) => record.id"
            size="middle"
            :pagination="false"
            :locale="{ emptyText: '暂无待结算工单' }"
            :scroll="{ x: 1060 }"
            :on-row="(record: AuditRecord) => ({ onClick: () => router.push(`/audit/workorders/${record.id}`), style: 'cursor: pointer' })"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'id'">
                <span class="mono">{{ record.id }}</span>
              </template>
              <template v-else-if="column.key === 'elder'">{{ record.elderName }}</template>
              <template v-else-if="column.key === 'staff'">
                <div class="staff-name">{{ record.staffName }}</div>
                <div class="staff-org">{{ record.staffOrg }}</div>
              </template>
              <template v-else-if="column.key === 'level'">{{ record.level }}</template>
              <template v-else-if="column.key === 'amount'">
                ¥{{ record.amount.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="auditStatusColor(record.status)">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'passedAt'">
                {{ passedAt(record as AuditRecord) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button
                  type="link"
                  size="small"
                  @click.stop="router.push(`/audit/workorders/${(record as AuditRecord).id}`)"
                >
                  取证
                </a-button>
              </template>
            </template>
          </a-table>
        </div>

        <div class="card table-card">
          <div class="table-head">
            <div>
              <h3 class="section-title">拨付记录</h3>
              <p class="section-desc">拨付完成后生成拨付单号，用于财务对账与稽核追溯。</p>
            </div>
            <a-tag color="success">共 {{ payments.length }} 条</a-tag>
          </div>

          <a-table
            :data-source="payments"
            :columns="paymentColumns"
            row-key="payNo"
            size="middle"
            :pagination="false"
            :locale="{ emptyText: '暂无拨付记录' }"
            :scroll="{ x: 900 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'payNo'">
                <span class="mono">{{ record.payNo }}</span>
              </template>
              <template v-else-if="column.key === 'batch'">
                <span class="mono">{{ record.batch }}</span>
              </template>
              <template v-else-if="column.key === 'org'">{{ record.org }}</template>
              <template v-else-if="column.key === 'paidAt'">{{ record.paidAt }}</template>
              <template v-else-if="column.key === 'amount'">
                ¥{{ record.amount.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag color="success">{{ record.status }}</a-tag>
              </template>
            </template>
          </a-table>
        </div>
      </template>

      <SettlementBatchModal v-model:open="batchOpen" :records="poolRecords" @done="handleBatchDone" />

      <a-modal v-model:open="detailOpen" title="批次明细" :width="680" :footer="null">
        <div v-if="activeBatch" class="detail-body">
          <a-descriptions :column="2" size="small" bordered>
            <a-descriptions-item label="批次号">{{ activeBatch.id }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ activeBatch.status }}</a-descriptions-item>
            <a-descriptions-item label="机构">{{ activeBatch.org }}</a-descriptions-item>
            <a-descriptions-item label="结算周期">{{ activeBatch.period }}</a-descriptions-item>
            <a-descriptions-item label="拨付单号">{{ activeBatch.payNo ?? '-' }}</a-descriptions-item>
            <a-descriptions-item label="拨付时间">{{ activeBatch.paidAt ?? '-' }}</a-descriptions-item>
          </a-descriptions>

          <div class="detail-list">
            <div v-for="item in batchRecords" :key="item.id" class="detail-row">
              <span class="mono">{{ item.id }}</span>
              <span>{{ item.elderName }}</span>
              <span class="detail-org">{{ item.staffName }} · {{ item.staffOrg }}</span>
              <span>{{ item.status }}</span>
              <span class="detail-amount">¥{{ item.amount.toFixed(2) }}</span>
            </div>
          </div>

          <div class="detail-total">
            合计 {{ activeBatch.count }} 单 · ¥{{ activeBatch.amount.toFixed(2) }}
          </div>
        </div>
      </a-modal>
    </div>
  </AdminLayout>
</template>

<style scoped>
.settlement-page {
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

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-purple {
  color: #7c3aed;
  background: #f1ebff;
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

.staff-name {
  font-size: 13px;
  color: #1f2937;
}

.staff-org {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-list {
  border: 1px solid var(--elder-divider);
  border-radius: 8px;
  overflow: hidden;
}

.detail-row {
  display: grid;
  grid-template-columns: 150px 90px 1fr 90px 90px;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--elder-text-secondary);
  border-bottom: 1px solid var(--elder-divider);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-org {
  color: var(--elder-text-weak);
}

.detail-amount {
  text-align: right;
  color: var(--elder-text);
}

.detail-total {
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-primary);
}
</style>
