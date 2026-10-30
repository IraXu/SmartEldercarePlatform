<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { App } from 'antdv-next'
import {
  AuditOutlined,
  DeleteOutlined,
  EditOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  VideoCameraOutlined,
} from '@antdv-next/icons'
import {
  destructionRecords,
  isComplianceAdmin,
  retentionPolicies,
  updateRetentionPolicy,
  type DestructionRecord,
  type RetentionPolicy,
} from '@/composables/useCompliance'

const { message } = App.useApp()

const policyIcons: Record<string, typeof VideoCameraOutlined> = {
  localVideo: VideoCameraOutlined,
  eventClip: FileTextOutlined,
  serviceEvidence: FileProtectOutlined,
  auditLog: AuditOutlined,
  consentRecord: SafetyCertificateOutlined,
}

const methodOptions = ['到期自动覆盖', '不可恢复删除', '归档后物理销毁', '到期归档'].map((item) => ({
  value: item,
  label: item,
}))

const editOpen = ref(false)
const activePolicy = ref<RetentionPolicy | null>(null)
const submitting = ref(false)
const errorText = ref('')
const form = reactive({ days: 0, method: '', note: '' })

function openEdit(policy: RetentionPolicy) {
  activePolicy.value = policy
  form.days = policy.days
  form.method = policy.method
  form.note = ''
  errorText.value = ''
  editOpen.value = true
}

async function handleSave() {
  if (!activePolicy.value) return
  const policy = activePolicy.value
  if (!Number.isFinite(form.days) || form.days < policy.min || form.days > policy.max) {
    errorText.value = `留存天数需在 ${policy.min}–${policy.max} 之间`
    return
  }
  errorText.value = ''
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = updateRetentionPolicy(policy.key, {
    days: form.days,
    method: form.method,
    note: form.note,
  })
  submitting.value = false
  if (!result.ok) {
    errorText.value = result.message
    return
  }
  message.success(result.message)
  editOpen.value = false
}

function retryDestroy(record: DestructionRecord) {
  message.success(`批次 ${record.id} 已加入重试队列（模拟）`)
}

const columns = [
  { key: 'id', title: '批次号', width: 160 },
  { key: 'date', title: '执行时间', width: 160 },
  { key: 'type', title: '数据类型', width: 120 },
  { key: 'count', title: '数量', width: 180 },
  { key: 'size', title: '大小', width: 110 },
  { key: 'method', title: '销毁方式', width: 150 },
  { key: 'operator', title: '执行人', width: 110 },
  { key: 'witness', title: '见证人', width: 110 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'actions', title: '操作', width: 100 },
]

const failedCount = computed(() => destructionRecords.filter((item) => item.status === '失败').length)
</script>

<template>
  <div class="retention-panel">
    <a-alert
      type="info"
      show-icon
      message="到期销毁任务每日 03:00 自动执行，销毁后不可恢复"
      :description="`销毁需双人确认（执行人 + 见证人），失败将生成安全告警。当前有 ${failedCount} 个失败批次待重试。`"
    />

    <div class="policy-grid">
      <div v-for="policy in retentionPolicies" :key="policy.key" class="card policy-card">
        <div class="policy-head">
          <span class="policy-icon"><component :is="policyIcons[policy.key]" /></span>
          <a-button
            size="small"
            :disabled="!isComplianceAdmin"
            @click="openEdit(policy)"
          >
            <template #icon><EditOutlined /></template>
            编辑策略
          </a-button>
        </div>
        <div class="policy-name">{{ policy.name }}</div>
        <div class="policy-scope">{{ policy.dataScope }}</div>
        <div class="policy-days">
          <span class="days-value">{{ policy.days }}</span>
          <span class="days-unit">{{ policy.unit }}</span>
          <a-tag class="days-range">{{ policy.min }}–{{ policy.max }}{{ policy.unit }}</a-tag>
        </div>
        <div class="policy-meta">
          <div><span class="meta-label">存储位置</span>{{ policy.storage }}</div>
          <div><span class="meta-label">销毁方式</span>{{ policy.method }}</div>
          <div><span class="meta-label">责任角色</span>{{ policy.owner }}</div>
          <div><span class="meta-label">最近更新</span>{{ policy.updatedAt }}</div>
        </div>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-head">
        <div>
          <h3 class="section-title">销毁记录</h3>
          <p class="section-desc">记录每次到期销毁的批次、数量、方式与见证人，作为数据已删除的凭证。</p>
        </div>
        <a-tag color="blue">共 {{ destructionRecords.length }} 个批次</a-tag>
      </div>

      <a-table
        :data-source="destructionRecords"
        :columns="columns"
        :row-key="(record: DestructionRecord) => record.id"
        :scroll="{ x: 1300 }"
        :pagination="{ pageSize: 8, showSizeChanger: false }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'id'">
            <span class="mono">{{ record.id }}</span>
          </template>
          <template v-else-if="column.key === 'date'">
            <span class="mono">{{ record.date }}</span>
          </template>
          <template v-else-if="column.key === 'type'">
            <span>{{ record.type }}</span>
          </template>
          <template v-else-if="column.key === 'count'">
            <span>{{ record.count }}</span>
          </template>
          <template v-else-if="column.key === 'size'">
            <span>{{ record.size }}</span>
          </template>
          <template v-else-if="column.key === 'method'">
            <span>{{ record.method }}</span>
          </template>
          <template v-else-if="column.key === 'operator'">
            <span>{{ record.operator }}</span>
          </template>
          <template v-else-if="column.key === 'witness'">
            <span>{{ record.witness }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tooltip :title="record.note">
              <a-tag :color="record.status === '已完成' ? 'success' : 'error'">{{ record.status }}</a-tag>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button v-if="record.status === '失败'" type="link" size="small" @click="retryDestroy(record)">
              重试
            </a-button>
            <span v-else class="text-weak">—</span>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="editOpen"
      title="编辑留存策略"
      :width="480"
      ok-text="保存"
      :confirm-loading="submitting"
      destroy-on-hidden
      @ok="handleSave"
    >
      <div v-if="activePolicy" class="edit-body">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="数据类型">{{ activePolicy.name }}</a-descriptions-item>
          <a-descriptions-item label="数据范围">{{ activePolicy.dataScope }}</a-descriptions-item>
          <a-descriptions-item label="当前期限">
            {{ activePolicy.days }} {{ activePolicy.unit }}
          </a-descriptions-item>
        </a-descriptions>

        <a-form layout="vertical">
          <a-form-item
            label="留存天数/年数"
            required
            :validate-status="errorText ? 'error' : undefined"
            :help="errorText || `允许范围 ${activePolicy.min}–${activePolicy.max} ${activePolicy.unit}`"
          >
            <a-input-number
              v-model:value="form.days"
              :min="1"
              :max="999"
              style="width: 200px"
              :addon-after="activePolicy.unit"
            />
          </a-form-item>
          <a-form-item label="销毁方式" required>
            <a-select v-model:value="form.method" :options="methodOptions" />
          </a-form-item>
          <a-form-item label="变更说明">
            <a-textarea
              v-model:value="form.note"
              :rows="3"
              :maxlength="120"
              show-count
              placeholder="请说明调整原因，便于审计追溯"
            />
          </a-form-item>
        </a-form>

        <a-alert
          type="warning"
          show-icon
          message="策略调整次日 03:00 生效"
          description="缩短留存期限不会立即删除历史数据，需等待下一批次执行。"
        />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.retention-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.policy-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.policy-card {
  padding: 18px 20px;
}

.policy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.policy-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #1f6feb;
  background: #eaf1fe;
}

.policy-name {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.policy-scope {
  margin-top: 4px;
  min-height: 38px;
  font-size: 12px;
  line-height: 19px;
  color: #8a96a8;
}

.policy-days {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 8px;
}

.days-value {
  font-size: 30px;
  line-height: 36px;
  font-weight: 600;
  color: #0e9384;
}

.days-unit {
  font-size: 13px;
  color: #5b6779;
}

.days-range {
  margin-left: auto;
  font-size: 10px;
  line-height: 18px;
}

.policy-meta {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #5b6779;
}

.meta-label {
  display: inline-block;
  width: 68px;
  color: #8a96a8;
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

.edit-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
