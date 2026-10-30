<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import {
  auditOrgs,
  createBatch,
  type AuditRecord,
} from '@/composables/useEvidence'

const props = defineProps<{
  open: boolean
  records: AuditRecord[]
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'done', id: string): void
}>()

const { message } = App.useApp()
const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const form = reactive({
  org: auditOrgs[0]?.name ?? '',
  period: '2026-10 下半月',
})
const selectedKeys = ref<string[]>([])
const submitting = ref(false)

const orgOptions = auditOrgs.map((item) => ({ value: item.name, label: item.name }))
const periodOptions = ['2026-10 上半月', '2026-10 下半月'].map((item) => ({
  value: item,
  label: item,
}))

const sourceRecords = computed(() =>
  props.records.filter((item) => item.staffOrg === form.org),
)
const selectedRecords = computed(() =>
  sourceRecords.value.filter((item) => selectedKeys.value.includes(item.id)),
)
const totalAmount = computed(() =>
  selectedRecords.value.reduce((sum, item) => sum + item.amount, 0),
)

const columns = [
  { key: 'id', title: '审核单', width: 150 },
  { key: 'elder', title: '老人', width: 100 },
  { key: 'level', title: '待遇等级', width: 100 },
  { key: 'amount', title: '金额', width: 90, align: 'right' },
  { key: 'status', title: '结论', width: 100 },
]

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.org = auditOrgs[0]?.name ?? ''
    form.period = '2026-10 下半月'
    selectedKeys.value = []
    submitting.value = false
  },
)

watch(
  () => form.org,
  () => {
    selectedKeys.value = []
  },
)

function handleSelectChange(keys: Array<string | number>) {
  selectedKeys.value = keys.map((item) => String(item))
}

async function handleOk() {
  if (selectedKeys.value.length === 0) {
    message.warning('请至少选择 1 条待结算工单')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  const result = createBatch({
    org: form.org,
    period: form.period,
    ids: selectedKeys.value,
  })
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  visible.value = false
  if (result.batch) emit('done', result.batch.id)
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="生成结算批次"
    :width="720"
    ok-text="生成批次"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div class="batch-body">
      <a-form layout="vertical">
        <div class="form-row">
          <a-form-item label="结算机构" required>
            <a-select v-model:value="form.org" :options="orgOptions" />
          </a-form-item>
          <a-form-item label="结算周期" required>
            <a-select v-model:value="form.period" :options="periodOptions" />
          </a-form-item>
        </div>
      </a-form>

      <div class="batch-table-head">
        <span class="batch-table-title">待结算明细</span>
        <span class="batch-table-hint">
          仅显示所选机构的待结算工单；口径：重度 ¥180 / 中度 ¥140 / 轻度 ¥100（示例口径）
        </span>
      </div>

      <a-table
        :data-source="sourceRecords"
        :columns="columns"
        :row-key="(record: AuditRecord) => record.id"
        size="small"
        :pagination="false"
        :row-selection="{
          selectedRowKeys: selectedKeys,
          onChange: handleSelectChange,
        }"
        :locale="{ emptyText: '该机构暂无待结算工单' }"
        :scroll="{ y: 260 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'id'">
            <span class="mono">{{ record.id }}</span>
          </template>
          <template v-else-if="column.key === 'elder'">{{ record.elderName }}</template>
          <template v-else-if="column.key === 'level'">{{ record.level }}</template>
          <template v-else-if="column.key === 'amount'">¥{{ record.amount.toFixed(2) }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag color="cyan">{{ record.status }}</a-tag>
          </template>
        </template>
      </a-table>

      <div class="batch-total">
        <span>已选 {{ selectedRecords.length }} 单</span>
        <span class="batch-amount">合计 ¥{{ totalAmount.toFixed(2) }}</span>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.batch-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.batch-table-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.batch-table-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-text);
}

.batch-table-hint {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.batch-total {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 10px 4px 0;
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.batch-amount {
  font-size: 16px;
  font-weight: 600;
  color: var(--elder-primary);
}
</style>
