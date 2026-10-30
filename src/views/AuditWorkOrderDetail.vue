<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ArrowLeftOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  LockOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AuditReviewModal from '@/components/audit/AuditReviewModal.vue'
import AppealModal from '@/components/audit/AppealModal.vue'
import EvidenceAccessModal from '@/components/audit/EvidenceAccessModal.vue'
import { addAudit, hasPermission } from '@/composables/useAuth'
import {
  auditStatusColor,
  elementColor,
  getAudit,
  riskColor,
  runAudit,
  type AuditElement,
  type AuditRecord,
  type ElementStatus,
  type EvidenceItem,
} from '@/composables/useEvidence'

const route = useRoute()
const evidenceRowKey = (item: EvidenceItem) => item.id
const router = useRouter()
const { message } = App.useApp()

const record = computed(() => getAudit(String(route.params.id)))

const canView = computed(() => hasPermission('audit'))
const canViewEvidence = computed(() => hasPermission('audit'))
const canReview = computed(
  () =>
    hasPermission('audit', 'approve') &&
    Boolean(record.value) &&
    ['机审异常', '申诉中'].includes(record.value!.status),
)
const canAppeal = computed(
  () =>
    hasPermission('audit', 'approve') &&
    record.value?.status === '复核不通过' &&
    !record.value?.appeal,
)

const reviewOpen = ref(false)
const appealOpen = ref(false)
const accessOpen = ref(false)

const sortedElements = computed<AuditElement[]>(() => {
  if (!record.value) return []
  const weight: Record<ElementStatus, number> = { 异常: 0, 待核: 1, 通过: 2 }
  return [...record.value.elements].sort((a, b) => weight[a.status] - weight[b.status])
})

function elementDisplayStatus(element: AuditElement): ElementStatus {
  if (record.value?.machineStatus === '待机审') return '待核'
  return element.status
}

const abnormalElements = computed(
  () => record.value?.elements.filter((item) => item.status === '异常') ?? [],
)

const evidenceStats = computed(() => {
  const list = record.value?.evidence ?? []
  return {
    exclusive: list.filter((item) => item.scope === '医保专属').length,
    internal: list.filter((item) => item.scope === '机构可见').length,
    masked: list.filter((item) => item.scope === '脱敏公开').length,
  }
})

const evidenceColumns = [
  { key: 'id', title: '证据编号', width: 110 },
  { key: 'type', title: '类型', width: 110 },
  { key: 'content', title: '内容', width: 240 },
  { key: 'time', title: '时间', width: 150 },
  { key: 'hash', title: '哈希（前 12 位）', width: 150 },
  { key: 'retention', title: '留存到期', width: 110 },
  { key: 'scope', title: '访问范围', width: 110 },
]

function timestamp(time: string) {
  return time.length > 10 ? time.slice(11) : time
}

function handleAudit() {
  if (!record.value) return
  const result = runAudit(record.value.id)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
}

function handlePlay() {
  if (!canViewEvidence.value) {
    message.warning('影像证据仅医保审核可见')
    return
  }
  message.info('原型不接入真实视频流，仅展示片段元数据')
}

function handleBack() {
  router.push('/audit/workorders')
}

function handleExport() {
  if (!record.value) return
  addAudit('导出证据包', record.value.id, '成功', `${record.value.evidence.length} 条证据索引`)
  message.success('证据包导出任务已创建（模拟）')
}
</script>

<template>
  <AdminLayout>
    <div class="page detail-page">
      <template v-if="!record || !canView">
        <div class="card forbidden-card">
          <a-result
            status="403"
            title="当前账号无服务监管权限"
            sub-title="证据中心与服务监管仅面向医保审核员与平台运营开放。"
          >
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <a class="back-link" @click="handleBack">
          <ArrowLeftOutlined />
          返回待审工单
        </a>

        <div class="page-header detail-header">
          <div>
            <div class="title-line">
              <h1 class="page-title">{{ record.id }}</h1>
              <a-tag :color="auditStatusColor(record.status)">{{ record.status }}</a-tag>
              <a-tag :color="riskColor(record.risk)">{{ record.risk }}风险</a-tag>
            </div>
            <p class="page-subtitle">
              {{ record.elderName }} · {{ record.staffOrg }} · {{ record.serviceDate }} ·
              {{ record.level }}
            </p>
          </div>
          <div class="page-actions">
            <a-button v-if="record.machineStatus === '待机审'" type="primary" ghost @click="handleAudit">
              <template #icon><ExperimentOutlined /></template>
              执行机审
            </a-button>
            <a-button @click="accessOpen = true">
              <template #icon><FileProtectOutlined /></template>
              申请调阅
            </a-button>
            <a-button @click="handleExport">导出证据包</a-button>
            <a-button v-if="canAppeal" @click="appealOpen = true">机构申诉</a-button>
            <a-button v-if="canReview" type="primary" @click="reviewOpen = true">复核结论</a-button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-main">
            <div class="card block-card">
              <div class="block-head">
                <h3 class="section-title">工单与老人</h3>
                <span class="block-meta">关联工单 {{ record.orderId }}</span>
              </div>
              <a-descriptions :column="3" size="small">
                <a-descriptions-item label="老人">{{ record.elderName }}</a-descriptions-item>
                <a-descriptions-item label="社区 / 网格">
                  {{ record.community }} · {{ record.grid }}
                </a-descriptions-item>
                <a-descriptions-item label="地址">{{ record.address }}</a-descriptions-item>
                <a-descriptions-item label="服务人员">
                  {{ record.staffName }}（{{ record.staffTitle }}）
                </a-descriptions-item>
                <a-descriptions-item label="所属机构">{{ record.staffOrg }}</a-descriptions-item>
                <a-descriptions-item label="待遇等级">{{ record.level }}</a-descriptions-item>
                <a-descriptions-item label="服务时间">
                  {{ record.serviceDate }} {{ timestamp(record.checkinAt) }} -
                  {{ timestamp(record.checkoutAt) }}
                </a-descriptions-item>
                <a-descriptions-item label="计划 / 实际时长">
                  {{ record.planDuration }} / {{ record.duration }} 分钟
                </a-descriptions-item>
                <a-descriptions-item label="签认方式">{{ record.signType }}</a-descriptions-item>
                <a-descriptions-item label="签认人">{{ record.signer }}</a-descriptions-item>
                <a-descriptions-item label="记录仪">
                  <span v-if="record.recorderOnline" class="text-success">在线</span>
                  <span v-else class="text-danger">
                    离线{{ record.recorderNote ? `（${record.recorderNote}）` : '' }}
                  </span>
                </a-descriptions-item>
                <a-descriptions-item label="服务项目">{{ record.items.length }} 项</a-descriptions-item>
              </a-descriptions>
            </div>

            <div class="card block-card">
              <div class="block-head">
                <h3 class="section-title">五要素机审结果</h3>
                <span class="block-meta">
                  机审时间 {{ record.auditedAt ?? '未执行' }} · 规则版本 R2026.10
                </span>
              </div>
              <div class="element-list">
                <div
                  v-for="element in sortedElements"
                  :key="element.key"
                  class="element-item"
                  :class="{ 'element-abnormal': elementDisplayStatus(element) === '异常' }"
                >
                  <div class="element-side">
                    <span class="element-badge">{{ element.label }}</span>
                    <a-tag :color="elementColor(elementDisplayStatus(element))">
                      {{ elementDisplayStatus(element) }}
                    </a-tag>
                  </div>
                  <div class="element-body">
                    <div class="element-summary">{{ element.summary }}</div>
                    <ul class="element-facts">
                      <li v-for="fact in element.facts" :key="fact">{{ fact }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div class="card block-card">
              <div class="block-head">
                <h3 class="section-title">证据时间轴</h3>
                <span class="block-meta">共 {{ record.timeline.length }} 个节点</span>
              </div>
              <a-timeline>
                <a-timeline-item
                  v-for="item in record.timeline"
                  :key="`${item.time}-${item.action}`"
                  :color="item.tone ?? 'blue'"
                >
                  <div class="timeline-title">
                    {{ item.action }}
                    <span class="timeline-operator">{{ item.operator }}</span>
                  </div>
                  <div class="timeline-meta">{{ item.time }}</div>
                  <div v-if="item.note" class="timeline-note">{{ item.note }}</div>
                </a-timeline-item>
              </a-timeline>
            </div>

            <div class="card block-card">
              <div class="block-head">
                <h3 class="section-title">证据清单</h3>
                <span class="block-meta">全部证据已哈希存证</span>
              </div>

              <div class="clip-box" :class="{ 'clip-locked': !canViewEvidence }" @click="handlePlay">
                <div class="clip-overlay">
                  <LockOutlined v-if="!canViewEvidence" class="clip-icon" />
                  <PlayCircleOutlined v-else class="clip-icon" />
                  <div class="clip-title">
                    {{ canViewEvidence ? '记录仪片段 · 已打码' : '影像证据已遮蔽' }}
                  </div>
                  <div class="clip-desc">
                    {{
                      canViewEvidence
                        ? `${record.clips} 段 · 关键节点已截取 · 点击播放（原型占位）`
                        : '影像证据仅医保审核可见，可提交调阅申请'
                    }}
                  </div>
                </div>
              </div>

              <a-table
                :data-source="record.evidence"
                :columns="evidenceColumns"
                :row-key="evidenceRowKey"
                size="small"
                :pagination="false"
                :scroll="{ x: 980 }"
              >
                <template #bodyCell="{ column, record: evidence }">
                  <template v-if="column.key === 'id'">
                    <span class="mono">{{ evidence.id }}</span>
                  </template>
                  <template v-else-if="column.key === 'type'">
                    {{ evidence.type }}
                  </template>
                  <template v-else-if="column.key === 'time'">
                    {{ evidence.time }}
                  </template>
                  <template v-else-if="column.key === 'retention'">
                    {{ evidence.retention }}
                  </template>
                  <template v-else-if="column.key === 'content'">
                    <span v-if="evidence.scope === '医保专属' && !canViewEvidence" class="text-weak">
                      已遮蔽，需医保审核授权
                    </span>
                    <span v-else>{{ evidence.content }}</span>
                  </template>
                  <template v-else-if="column.key === 'hash'">
                    <span class="mono">{{ evidence.hash }}</span>
                  </template>
                  <template v-else-if="column.key === 'scope'">
                    <a-tag :color="evidence.scope === '医保专属' ? 'purple' : evidence.scope === '机构可见' ? 'blue' : 'default'">
                      {{ evidence.scope }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </div>
          </div>

          <div class="detail-side">
            <div class="card block-card">
              <div class="block-head">
                <h3 class="section-title">机审结论</h3>
              </div>
              <div class="verdict" :class="`verdict-${record.status === '机审通过' || record.status === '复核通过' ? 'pass' : record.status === '待机审' ? 'wait' : 'fail'}`">
                {{
                  record.machineStatus === '待机审'
                    ? '待机审'
                    : record.machineStatus === '通过'
                      ? '机审通过'
                      : '机审异常'
                }}
              </div>
              <div class="verdict-sub">
                风险等级 {{ record.risk }} ·
                {{ record.machineStatus === '待机审' ? '尚未执行机审' : '已执行 R2026.10 规则' }}
              </div>

              <div class="verdict-block">
                <div class="verdict-label">命中异常要素</div>
                <div v-if="abnormalElements.length > 0" class="chip-row">
                  <a-tag v-for="item in abnormalElements" :key="item.key" color="error">
                    {{ item.label }}
                  </a-tag>
                </div>
                <div v-else class="text-weak">无异常要素</div>
              </div>

              <div class="verdict-block">
                <div class="verdict-label">结算金额</div>
                <div
                  class="verdict-amount"
                  :class="{ 'amount-disabled': record.status === '复核不通过' || record.status === '申诉中' }"
                >
                  ¥{{ record.amount.toFixed(2) }}
                </div>
                <div class="text-weak">
                  {{
                    record.status === '复核不通过'
                      ? '复核不通过，不进入结算'
                      : record.status === '申诉中'
                        ? '申诉中，暂缓结算'
                        : record.settlementBatch
                          ? `已进入批次 ${record.settlementBatch}`
                          : '可进入结算池'
                  }}
                </div>
              </div>
            </div>

            <div class="card block-card">
              <div class="block-head">
                <h3 class="section-title">证据访问控制</h3>
                <SafetyCertificateOutlined class="side-icon" />
              </div>
              <div class="access-row">
                <span>医保专属</span>
                <strong>{{ evidenceStats.exclusive }} 条</strong>
              </div>
              <div class="access-row">
                <span>机构可见</span>
                <strong>{{ evidenceStats.internal }} 条</strong>
              </div>
              <div class="access-row">
                <span>脱敏公开</span>
                <strong>{{ evidenceStats.masked }} 条</strong>
              </div>
              <div class="access-row">
                <span>人脸打码</span>
                <a-tag color="success">已启用</a-tag>
              </div>
              <a-alert
                v-if="!canViewEvidence"
                class="access-alert"
                type="warning"
                show-icon
                message="影像证据仅医保审核可见"
                description="当前账号仅可查看结构化结论，查看原始影像需提交调阅申请。"
              />
            </div>

            <div class="card block-card">
              <div class="block-head">
                <h3 class="section-title">复核与申诉</h3>
              </div>
              <template v-if="record.review">
                <div class="review-result">
                  <a-tag :color="record.review.result === '通过' ? 'cyan' : 'gold'">
                    复核{{ record.review.result }}
                  </a-tag>
                  <span class="text-weak">{{ record.review.time }}</span>
                </div>
                <div v-if="record.review.reason" class="review-line">
                  退回原因：{{ record.review.reason }}
                </div>
                <div class="review-line">复核意见：{{ record.review.note }}</div>
                <div class="review-line text-weak">复核人：{{ record.review.reviewer }}</div>
              </template>
              <div v-else class="text-weak">暂无复核记录</div>

              <template v-if="record.appeal">
                <a-divider class="side-divider" />
                <div class="review-result">
                  <a-tag color="blue">申诉中</a-tag>
                  <span class="text-weak">{{ record.appeal.time }}</span>
                </div>
                <div class="review-line">申诉说明：{{ record.appeal.note }}</div>
                <div class="review-line text-weak">提交人：{{ record.appeal.applicant }}</div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <AuditReviewModal v-model:open="reviewOpen" :record="record" />
      <AppealModal v-model:open="appealOpen" :record="record" />
      <EvidenceAccessModal v-model:open="accessOpen" :record="record" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: 12px;
  color: var(--elder-text-secondary);
  cursor: pointer;
}

.back-link:hover {
  color: var(--elder-primary);
}

.detail-header {
  align-items: flex-start;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}

.detail-main,
.detail-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block-card {
  padding: 18px 20px;
}

.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.block-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.element-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.element-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--elder-divider);
  border-radius: 8px;
  background: #fafcff;
}

.element-abnormal {
  border-color: #f3c9c9;
  background: #fdf5f5;
}

.element-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 52px;
  flex: none;
}

.element-badge {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #eaf1fe;
  color: var(--elder-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 26px;
  text-align: center;
}

.element-summary {
  font-size: 13px;
  font-weight: 500;
  color: var(--elder-text);
}

.element-facts {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-secondary);
}

.timeline-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--elder-text);
}

.timeline-operator {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 400;
  color: var(--elder-text-weak);
}

.timeline-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.timeline-note {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.clip-box {
  position: relative;
  height: 168px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1f2937, #0e2a47);
  cursor: pointer;
  overflow: hidden;
}

.clip-locked {
  background: linear-gradient(135deg, #3f4859, #1f2937);
}

.clip-overlay {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.86);
  text-align: center;
}

.clip-icon {
  font-size: 26px;
  margin-bottom: 2px;
}

.clip-title {
  font-size: 13px;
  font-weight: 600;
}

.clip-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.verdict {
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.verdict-pass {
  color: var(--elder-success);
}

.verdict-fail {
  color: var(--elder-danger);
}

.verdict-wait {
  color: var(--elder-text-weak);
}

.verdict-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-weak);
}

.verdict-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--elder-divider);
}

.verdict-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--elder-text-weak);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.verdict-amount {
  font-size: 22px;
  font-weight: 600;
  color: var(--elder-primary);
}

.amount-disabled {
  color: var(--elder-text-weak);
}

.side-icon {
  color: var(--elder-text-weak);
}

.access-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  font-size: 12px;
  color: var(--elder-text-secondary);
  border-bottom: 1px dashed var(--elder-divider);
}

.access-row:last-of-type {
  border-bottom: none;
}

.access-row strong {
  color: var(--elder-text);
}

.access-alert {
  margin-top: 10px;
}

.review-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.review-line {
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-secondary);
}

.side-divider {
  margin: 12px 0;
}

.text-success {
  color: var(--elder-success);
}
</style>
