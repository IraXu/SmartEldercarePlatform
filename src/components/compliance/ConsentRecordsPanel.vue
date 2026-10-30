<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { activeCommunities } from '@/composables/useOrg'
import {
  CloseCircleOutlined,
  FileProtectOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@antdv-next/icons'
import {
  consentTypeOptions,
  consents,
  revokeConsent,
  type ConsentRecord,
  type ConsentStatus,
  type ConsentType,
} from '@/composables/useCompliance'

const props = defineProps<{ initialType?: ConsentType | '' }>()

const { message } = App.useApp()

const statusColors: Record<ConsentStatus, string> = {
  已授权: 'success',
  待确认: 'warning',
  已撤回: 'default',
  已过期: 'error',
}

const statusOptions = (['已授权', '待确认', '已撤回', '已过期'] as ConsentStatus[]).map((item) => ({
  value: item,
  label: item,
}))
const typeOptions = consentTypeOptions.map((item) => ({ value: item, label: item }))
const communityOptions = computed(() =>
  activeCommunities.value.map((item) => ({ value: item.name, label: item.name })),
)

const filters = reactive({
  keyword: '',
  type: (props.initialType || undefined) as ConsentType | undefined,
  status: undefined as ConsentStatus | undefined,
  community: undefined as string | undefined,
})
const applied = ref({ ...filters })

watch(
  () => props.initialType,
  (value) => {
    filters.type = value || undefined
    applied.value = { ...filters }
  },
)

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  return consents.filter((item) => {
    if (condition.type && item.type !== condition.type) return false
    if (condition.status && item.status !== condition.status) return false
    if (condition.community && item.community !== condition.community) return false
    if (
      keyword &&
      !`${item.elderName}${item.id}${item.signer}${item.scope}`.toLowerCase().includes(keyword)
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
  filters.type = undefined
  filters.status = undefined
  filters.community = undefined
  applied.value = { ...filters }
}

const columns = [
  { key: 'record', title: '授权编号', width: 160 },
  { key: 'elder', title: '老人', width: 180 },
  { key: 'type', title: '类型', width: 110 },
  { key: 'scope', title: '授权范围', width: 280 },
  { key: 'signer', title: '签署人', width: 150 },
  { key: 'expire', title: '有效期', width: 180 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'actions', title: '操作', width: 150 },
]

function isExpiringSoon(expireAt: string) {
  const target = new Date(`${expireAt}T23:59:59`).getTime()
  const diff = target - Date.now()
  return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000
}

const detailOpen = ref(false)
const activeRecord = ref<ConsentRecord | null>(null)

function openDetail(record: ConsentRecord) {
  activeRecord.value = record
  detailOpen.value = true
}

const revokeOpen = ref(false)
const revokeTarget = ref<ConsentRecord | null>(null)
const revokeReason = ref('')
const revokeSubmitting = ref(false)

function openRevoke(record: ConsentRecord) {
  revokeTarget.value = record
  revokeReason.value = ''
  revokeOpen.value = true
}

async function confirmRevoke() {
  if (!revokeTarget.value) return
  if (!revokeReason.value.trim()) {
    message.warning('请填写撤回原因')
    return
  }
  revokeSubmitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = revokeConsent(revokeTarget.value.id, revokeReason.value)
  revokeSubmitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  revokeOpen.value = false
  detailOpen.value = false
}

function previewAttachment() {
  message.info('原型不提供真实文件预览，正式环境将打开授权书 PDF')
}

const activeTimeline = computed(() => {
  const record = activeRecord.value
  if (!record) return []
  const items = [
    {
      time: record.signedAt,
      title: `签署授权（${record.channel}）`,
      desc: `${record.signer}（${record.relation}）确认授权范围：${record.scope}`,
      tone: 'green',
    },
  ]
  if (record.withdrawnAt) {
    items.push({
      time: record.withdrawnAt,
      title: '撤回授权',
      desc: record.withdrawReason || '老人或家属要求撤回',
      tone: 'red',
    })
  }
  items.push({
    time: record.expireAt,
    title: '授权到期',
    desc: '到期后需重新签署，历史记录保留并按留存策略处理',
    tone: 'gray',
  })
  return items
})
</script>

<template>
  <div class="records-panel">
    <div class="card filter-card">
      <div class="filter-row">
        <a-input
          v-model:value="filters.keyword"
          class="filter-keyword"
          placeholder="搜索老人 / 授权编号 / 签署人"
          allow-clear
          @press-enter="applyFilters"
        >
          <template #prefix><SearchOutlined class="text-weak" /></template>
        </a-input>
        <a-select
          v-model:value="filters.type"
          class="filter-select"
          :options="typeOptions"
          placeholder="全部类型"
          allow-clear
        />
        <a-select
          v-model:value="filters.status"
          class="filter-select"
          :options="statusOptions"
          placeholder="全部状态"
          allow-clear
        />
        <a-select
          v-model:value="filters.community"
          class="filter-select"
          :options="communityOptions"
          placeholder="全部社区"
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
          <h3 class="section-title">同意记录</h3>
          <p class="section-desc">每次授权单独登记，撤回不删除历史记录；手机号等敏感信息按角色脱敏。</p>
        </div>
        <a-tag color="blue">共 {{ filtered.length }} 条</a-tag>
      </div>

      <a-table
        :data-source="filtered"
        :columns="columns"
        :row-key="(record: ConsentRecord) => record.id"
        :scroll="{ x: 1310 }"
        :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
        :locale="{ emptyText: '暂无符合条件的授权记录' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'record'">
            <span class="mono">{{ record.id }}</span>
          </template>
          <template v-else-if="column.key === 'elder'">
            <div class="elder-name">{{ record.elderName }}</div>
            <div class="elder-meta">{{ record.community }} {{ record.grid }}</div>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag color="cyan">{{ record.type }}</a-tag>
          </template>
          <template v-else-if="column.key === 'scope'">
            <div class="scope">{{ record.scope }}</div>
          </template>
          <template v-else-if="column.key === 'signer'">
            <div class="signer">{{ record.signer }}</div>
            <div class="elder-meta">{{ record.relation }} · {{ record.channel }}</div>
          </template>
          <template v-else-if="column.key === 'expire'">
            <div>{{ record.expireAt }}</div>
            <div v-if="record.status !== '已撤回' && isExpiringSoon(record.expireAt)" class="expire-hint">
              <WarningOutlined /> 30 天内到期
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status as ConsentStatus]">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="4">
              <a-button type="link" size="small" @click="openDetail(record)">查看授权书</a-button>
              <a-button
                v-if="record.status === '已授权' || record.status === '待确认'"
                type="link"
                size="small"
                danger
                @click="openRevoke(record)"
              >
                撤回
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" title="授权书详情" :width="560" destroy-on-hidden>
      <div v-if="activeRecord" class="detail-body">
        <div class="detail-head">
          <div>
            <div class="detail-id">{{ activeRecord.id }}</div>
            <div class="detail-elder">
              {{ activeRecord.elderName }} · {{ activeRecord.community }} {{ activeRecord.grid }}
            </div>
          </div>
          <a-tag :color="statusColors[activeRecord.status as ConsentStatus]">{{ activeRecord.status }}</a-tag>
        </div>

        <a-descriptions :column="1" size="small" bordered class="detail-info">
          <a-descriptions-item label="授权类型">{{ activeRecord.type }}</a-descriptions-item>
          <a-descriptions-item label="授权范围">{{ activeRecord.scope }}</a-descriptions-item>
          <a-descriptions-item label="签署人">
            {{ activeRecord.signer }}（{{ activeRecord.relation }}）
          </a-descriptions-item>
          <a-descriptions-item label="授权渠道">{{ activeRecord.channel }}</a-descriptions-item>
          <a-descriptions-item label="签署时间">{{ activeRecord.signedAt }}</a-descriptions-item>
          <a-descriptions-item label="有效期">{{ activeRecord.signedAt.slice(0, 10) }} 至 {{ activeRecord.expireAt }}</a-descriptions-item>
          <a-descriptions-item v-if="activeRecord.withdrawnAt" label="撤回时间">
            {{ activeRecord.withdrawnAt }}
          </a-descriptions-item>
          <a-descriptions-item v-if="activeRecord.withdrawReason" label="撤回原因">
            {{ activeRecord.withdrawReason }}
          </a-descriptions-item>
          <a-descriptions-item v-if="activeRecord.note" label="备注">
            {{ activeRecord.note }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="attachment">
          <FileProtectOutlined class="attachment-icon" />
          <div class="attachment-body">
            <div class="attachment-name">{{ activeRecord.attachment }}</div>
            <div class="attachment-desc">授权书扫描件 · 仅授权人员可见</div>
          </div>
          <a-button size="small" @click="previewAttachment">预览</a-button>
        </div>

        <div class="timeline-block">
          <div class="block-title">授权变更记录</div>
          <a-timeline class="consent-timeline">
            <a-timeline-item v-for="item in activeTimeline" :key="item.title + item.time" :color="item.tone">
              <div class="timeline-title">{{ item.title }}</div>
              <div class="timeline-time">{{ item.time }}</div>
              <div class="timeline-desc">{{ item.desc }}</div>
            </a-timeline-item>
          </a-timeline>
        </div>

        <div class="detail-foot">
          <a-button @click="detailOpen = false">关闭</a-button>
          <a-button
            v-if="activeRecord.status === '已授权' || activeRecord.status === '待确认'"
            danger
            type="primary"
            @click="openRevoke(activeRecord)"
          >
            撤回授权
          </a-button>
        </div>
      </div>
    </a-drawer>

    <a-modal
      v-model:open="revokeOpen"
      title="撤回授权"
      :width="480"
      ok-text="确认撤回"
      :ok-button-props="{ danger: true }"
      :confirm-loading="revokeSubmitting"
      @ok="confirmRevoke"
    >
      <div class="revoke-body">
        <a-alert
          type="warning"
          show-icon
          message="撤回后立即生效"
          description="关联设备将停止采集，已产生的历史数据不删除，按留存策略到期销毁。"
        />
        <div v-if="revokeTarget" class="revoke-target">
          <span class="revoke-name">{{ revokeTarget.elderName }}</span>
          <a-tag>{{ revokeTarget.type }}</a-tag>
          <span class="revoke-scope">{{ revokeTarget.scope }}</span>
        </div>
        <div class="reason-label">撤回原因 <span class="required">*</span></div>
        <a-textarea
          v-model:value="revokeReason"
          :rows="3"
          :maxlength="100"
          show-count
          placeholder="请记录老人或家属的撤回诉求"
        />
        <div class="revoke-tip">
          <CloseCircleOutlined />
          <span>撤回操作将写入审计日志，可在审计日志中追溯。</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.records-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.elder-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.elder-meta {
  font-size: 11px;
  line-height: 16px;
  color: #8a96a8;
}

.scope {
  font-size: 12px;
  line-height: 18px;
  color: #5b6779;
}

.signer {
  font-size: 13px;
  color: #1f2937;
}

.expire-hint {
  font-size: 11px;
  color: #d97706;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.detail-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: #5b6779;
}

.detail-elder {
  margin-top: 2px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.detail-info {
  margin-top: 2px;
}

.attachment {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e3e8ef;
  background: #f9fbfd;
}

.attachment-icon {
  font-size: 22px;
  color: #1f6feb;
}

.attachment-body {
  flex: 1;
}

.attachment-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.attachment-desc {
  font-size: 11px;
  color: #8a96a8;
}

.block-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.timeline-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.timeline-time {
  font-size: 11px;
  color: #8a96a8;
}

.timeline-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #5b6779;
}

.detail-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px dashed #eef2f7;
}

.revoke-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.revoke-target {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fbfd;
  border: 1px solid #eef2f7;
}

.revoke-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.revoke-scope {
  font-size: 12px;
  color: #5b6779;
}

.reason-label {
  font-size: 13px;
  color: #5b6779;
}

.required {
  color: #d64545;
}

.revoke-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8a96a8;
}
</style>
