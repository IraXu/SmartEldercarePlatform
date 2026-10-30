<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  MobileOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import TaskReassignModal from '@/components/tasks/TaskReassignModal.vue'
import TaskConfirmModal from '@/components/tasks/TaskConfirmModal.vue'
import TaskCancelModal from '@/components/tasks/TaskCancelModal.vue'
import ResponsibilityDrawer from '@/components/tasks/ResponsibilityDrawer.vue'
import { currentUser, hasPermission } from '@/composables/useAuth'
import {
  acceptMinutes,
  arriveMinutes,
  formatDuration,
  getTask,
  handleMinutes,
  isTaskOverdue,
  totalMinutes,
  type Task,
  type TaskStatus,
} from '@/composables/useTasks'

const route = useRoute()
const router = useRouter()

const task = computed(() => getTask(String(route.params.id)))

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

const reassignOpen = ref(false)
const confirmOpen = ref(false)
const cancelOpen = ref(false)
const responsibilityOpen = ref(false)

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

const slaNodes = computed(() => {
  const item = task.value
  if (!item) return []
  return [
    {
      label: '派发',
      time: item.createdAt,
      duration: '',
      done: true,
      tone: 'blue',
    },
    {
      label: '接单',
      time: item.acceptedAt ?? '等待接单',
      duration: acceptMinutes(item) !== undefined ? `用时 ${formatDuration(acceptMinutes(item))}` : `时限 ${item.acceptLimit} 分钟`,
      done: Boolean(item.acceptedAt),
      tone: isTaskOverdue(item) ? 'red' : 'blue',
    },
    {
      label: '到场',
      time: item.arrivedAt ?? '未到场',
      duration: arriveMinutes(item) !== undefined ? `用时 ${formatDuration(arriveMinutes(item))}` : `时限 ${item.arriveLimit} 分钟`,
      done: Boolean(item.arrivedAt),
      tone: 'orange',
    },
    {
      label: '提交',
      time: item.submittedAt ?? '未提交',
      duration: handleMinutes(item) !== undefined ? `处理 ${formatDuration(handleMinutes(item))}` : '待执行',
      done: Boolean(item.submittedAt),
      tone: 'blue',
    },
    {
      label: '完成',
      time: item.completedAt ?? '未完成',
      duration: totalMinutes(item) !== undefined ? `总时长 ${formatDuration(totalMinutes(item))}` : '待确认',
      done: Boolean(item.completedAt),
      tone: 'green',
    },
  ]
})

const entryText = computed(() => {
  const item = task.value
  if (!item) return []
  return [
    { label: '钥匙保管', value: item.entry.keyHolder },
    {
      label: '智能门锁',
      value: item.entry.smartLock ? `有，临时密码 ${item.entry.smartLockPassword}` : '无',
    },
    { label: '物业代开', value: item.entry.propertyOpen ? '可代开' : '不可代开' },
    { label: '进门备注', value: item.entry.note },
  ]
})

const checklistColumns = [
  { key: 'label', title: '检查项', width: 300 },
  { key: 'required', title: '必做', width: 80 },
  { key: 'photo', title: '拍照', width: 100 },
  { key: 'status', title: '状态', width: 110 },
]

const timelineColors: Record<string, string> = {
  blue: 'blue',
  green: 'green',
  red: 'red',
  gray: 'gray',
  orange: 'orange',
}

function goMobile() {
  if (!task.value) return
  router.push(`/m/task/${task.value.id}`)
}
</script>

<template>
  <AdminLayout>
    <div class="page task-detail-page">
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

      <template v-else-if="!task">
        <div class="card forbidden-card">
          <a-result status="404" title="任务不存在" sub-title="该任务可能已被删除或编号有误。">
            <template #extra>
              <a-button type="primary" @click="router.push('/tasks')">返回任务看板</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <div class="page-header detail-header">
          <div>
            <div class="detail-id">{{ task.id }}</div>
            <h1 class="page-title">
              {{ task.type }} · {{ task.elderName }}
              <a-tag :color="statusColors[task.status]" class="status-tag">{{ task.status }}</a-tag>
              <a-tag v-if="isTaskOverdue(task)" color="error">接单超时</a-tag>
            </h1>
            <p class="page-subtitle">
              {{ task.source }} · {{ task.community }} {{ task.address }} · 执行人 {{ task.executorName }}
            </p>
          </div>
          <div class="page-actions">
            <a-button
              v-if="['待接单', '已退回'].includes(task.status) && canDispatch"
              @click="reassignOpen = true"
            >
              <template #icon><SwapOutlined /></template>
              改派
            </a-button>
            <a-button
              v-if="['待接单', '已接单', '执行中', '待确认', '已完成'].includes(task.status)"
              @click="goMobile"
            >
              <template #icon><MobileOutlined /></template>
              打开物业端
            </a-button>
            <a-button v-if="task.status === '待确认'" type="primary" @click="confirmOpen = true">
              <template #icon><CheckCircleOutlined /></template>
              确认完成
            </a-button>
            <a-button
              v-if="['待接单', '已退回'].includes(task.status) && canDispatch"
              danger
              ghost
              @click="cancelOpen = true"
            >
              取消任务
            </a-button>
          </div>
        </div>

        <a-alert
          v-if="isTaskOverdue(task)"
          type="error"
          show-icon
          message="该任务已超过接单时限"
          description="正式环境将自动退回社区，请及时改派或转社区兜底。"
        />
        <a-alert
          v-else-if="task.status === '已退回'"
          type="error"
          show-icon
          message="任务已退回社区"
          :description="task.returnReason || '超时未接单，请改派新执行人。'"
        />
        <a-alert
          v-else-if="task.status === '已取消'"
          type="warning"
          show-icon
          message="任务已取消"
          :description="task.cancelReason || '任务已取消，如需服务请重新派发。'"
        />

        <div class="card sla-bar">
          <div v-for="node in slaNodes" :key="node.label" class="sla-node">
            <span class="sla-dot" :class="`dot-${node.tone}`" />
            <div class="sla-content">
              <div class="sla-label">{{ node.label }}</div>
              <div class="sla-time" :class="{ 'text-weak': !node.done }">{{ node.time }}</div>
              <div class="sla-duration">{{ node.duration }}</div>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-left">
            <div class="card info-card">
              <h3 class="section-title">任务要素</h3>
              <a-descriptions :column="2" size="small" class="info-desc">
                <a-descriptions-item label="任务编号">{{ task.id }}</a-descriptions-item>
                <a-descriptions-item label="任务来源">{{ task.source }}</a-descriptions-item>
                <a-descriptions-item label="任务类型">{{ task.type }}</a-descriptions-item>
                <a-descriptions-item label="时间窗">{{ task.windowStart }}–{{ task.windowEnd }}</a-descriptions-item>
                <a-descriptions-item label="接单时限">{{ task.acceptLimit }} 分钟</a-descriptions-item>
                <a-descriptions-item label="到场时限">{{ task.arriveLimit }} 分钟</a-descriptions-item>
                <a-descriptions-item label="报酬方式">
                  <a-tag :color="task.rewardType === '公益' ? 'green' : 'blue'">{{ task.rewardType }}</a-tag>
                  <span v-if="task.fee" class="fee">¥ {{ task.fee }}</span>
                </a-descriptions-item>
                <a-descriptions-item label="派发人">{{ task.publisher }}</a-descriptions-item>
                <a-descriptions-item v-if="task.eventId" label="关联事件">
                  {{ task.eventId }}
                </a-descriptions-item>
                <a-descriptions-item label="执行人">
                  {{ task.executorName }}（{{ task.executorOrg }}）
                </a-descriptions-item>
              </a-descriptions>
            </div>

            <div class="card info-card">
              <h3 class="section-title">
                <UserOutlined /> 老人与进门信息
              </h3>
              <a-descriptions :column="1" size="small" class="info-desc">
                <a-descriptions-item label="老人">
                  {{ task.elderName }} · {{ task.community }} {{ task.grid }}
                </a-descriptions-item>
                <a-descriptions-item label="服务地址">
                  <EnvironmentOutlined class="inline-icon" />
                  {{ task.community }} {{ task.address }}
                </a-descriptions-item>
                <a-descriptions-item label="紧急联系人">
                  {{ task.contactName }} · {{ maskPhone(task.contactPhone) }}
                </a-descriptions-item>
                <a-descriptions-item v-for="item in entryText" :key="item.label" :label="item.label">
                  {{ item.value }}
                </a-descriptions-item>
              </a-descriptions>
              <div class="entry-tip">
                <KeyOutlined />
                <span>上门前请先电话联系；物业代开仅限本任务时间窗内有效。</span>
              </div>
            </div>

            <div class="card info-card">
              <div class="card-head">
                <h3 class="section-title">检查清单</h3>
                <span class="text-weak checklist-count">
                  {{ task.checklist.filter((item) => item.done).length }} / {{ task.checklist.length }} 项
                </span>
              </div>
              <a-table
                :data-source="task.checklist"
                :columns="checklistColumns"
                row-key="id"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'label'">
                    <span>{{ record.label }}</span>
                  </template>
                  <template v-else-if="column.key === 'required'">
                    <a-tag v-if="record.required" color="blue">必做</a-tag>
                    <span v-else class="text-weak">—</span>
                  </template>
                  <template v-else-if="column.key === 'photo'">
                    <a-tag v-if="record.photoRequired" color="orange">
                      <PictureOutlined /> {{ record.photoCount || 0 }} 张
                    </a-tag>
                    <span v-else class="text-weak">—</span>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="record.done ? 'success' : 'default'">
                      {{ record.done ? '已完成' : '未完成' }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </div>

            <div class="card info-card responsibility-card">
              <div class="card-head">
                <h3 class="section-title">
                  <SafetyCertificateOutlined /> 责任告知
                </h3>
                <a-tag :color="task.rewardType === '公益' ? 'green' : 'blue'">
                  {{ task.rewardType === '公益' ? '公益协助' : '计费服务' }}
                </a-tag>
              </div>
              <p class="responsibility-text">{{ task.responsibility.text }}</p>
              <div class="responsibility-meta">
                告知人 {{ task.responsibility.agreedBy }} · {{ task.responsibility.agreedAt }} · 版本
                {{ task.responsibility.version }}
              </div>
              <a-button type="link" size="small" @click="responsibilityOpen = true">查看完整告知</a-button>
            </div>
          </div>

          <div class="detail-right">
            <div class="card info-card">
              <h3 class="section-title">执行时间轴</h3>
              <a-timeline class="task-timeline">
                <a-timeline-item
                  v-for="item in task.timeline"
                  :key="item.time + item.action"
                  :color="timelineColors[item.tone ?? 'blue']"
                >
                  <div class="timeline-title">{{ item.action }}</div>
                  <div class="timeline-meta">{{ item.time }} · {{ item.operator }}</div>
                  <div v-if="item.note" class="timeline-note">{{ item.note }}</div>
                </a-timeline-item>
              </a-timeline>
            </div>

            <div class="card info-card">
              <div class="card-head">
                <h3 class="section-title">执行回执</h3>
                <a-tag :color="task.submittedAt ? 'success' : 'default'">
                  {{ task.submittedAt ? '已提交' : '未提交' }}
                </a-tag>
              </div>
              <div v-if="task.submittedAt" class="receipt-block">
                <div class="receipt-row">
                  <span>提交时间</span>
                  <span>{{ task.submittedAt }}</span>
                </div>
                <div class="receipt-row">
                  <span>回执照片</span>
                  <span><PictureOutlined /> {{ task.photos }} 张</span>
                </div>
                <div class="photo-grid">
                  <div v-for="index in Math.min(task.photos, 4)" :key="index" class="photo-item">
                    <PictureOutlined />
                    <span>照片 {{ index }}</span>
                  </div>
                  <div v-if="task.photos === 0" class="photo-empty">暂无照片</div>
                </div>
                <div class="receipt-note">
                  <span class="receipt-label">执行说明</span>
                  <p>{{ task.execNote || '执行人未填写说明' }}</p>
                </div>
              </div>
              <div v-else class="empty-block">
                <ClockCircleOutlined />
                <span>执行人尚未提交回执</span>
              </div>
            </div>

            <div v-if="task.status === '已完成'" class="card info-card">
              <h3 class="section-title">服务评价</h3>
              <div class="rating-row">
                <a-rate :value="task.rating ?? 0" disabled />
                <span class="rating-text">{{ task.rating ?? 0 }} 星</span>
              </div>
              <p class="review-text">{{ task.review || '未填写评价' }}</p>
              <div class="confirm-meta">确认时间 {{ task.completedAt }}</div>
            </div>

            <div v-if="task.status === '已退回' || task.status === '已取消'" class="card info-card">
              <h3 class="section-title">
                <ExclamationCircleOutlined class="text-danger" /> 异常说明
              </h3>
              <p class="exception-text">
                {{ task.returnReason || task.cancelReason || '任务未正常完成' }}
              </p>
              <div class="confirm-meta">
                {{ task.returnedAt || task.cancelledAt }}
              </div>
            </div>

            <div v-if="task.status === '待确认'" class="confirm-cta">
              <a-button type="primary" block @click="confirmOpen = true">
                <template #icon><CheckCircleOutlined /></template>
                确认完成并评价
              </a-button>
              <div class="cta-hint">
                <CloseCircleOutlined />
                <span>如执行不完整，可在确认弹窗中退回重做。</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <TaskReassignModal v-model:open="reassignOpen" :task="task" />
      <TaskConfirmModal v-model:open="confirmOpen" :task="task" />
      <TaskCancelModal v-model:open="cancelOpen" :task="task" />
      <ResponsibilityDrawer
        v-model:open="responsibilityOpen"
        :reward-type="task?.rewardType"
        :agreed-by="task?.responsibility.agreedBy"
        :agreed-at="task?.responsibility.agreedAt"
      />
    </div>
  </AdminLayout>
</template>

<style scoped>
.task-detail-page {
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

.detail-header {
  align-items: flex-start;
}

.detail-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #8a96a8;
}

.status-tag {
  margin-left: 8px;
  vertical-align: middle;
}

.sla-bar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  padding: 16px 20px;
}

.sla-node {
  display: flex;
  gap: 10px;
  position: relative;
}

.sla-node:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 5px;
  left: 12px;
  right: -8px;
  height: 1px;
  background: #e3e8ef;
}

.sla-dot {
  position: relative;
  z-index: 1;
  width: 11px;
  height: 11px;
  margin-top: 2px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #c9d2df;
}

.dot-blue {
  background: #1f6feb;
}

.dot-green {
  background: #2e9e5b;
}

.dot-orange {
  background: #d97706;
}

.dot-red {
  background: #d64545;
}

.sla-label {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.sla-time {
  margin-top: 2px;
  font-size: 12px;
  color: #5b6779;
}

.sla-duration {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.detail-left,
.detail-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  padding: 18px 20px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.info-desc {
  margin-top: 10px;
}

.inline-icon {
  margin-right: 4px;
  color: #1f6feb;
}

.fee {
  margin-left: 6px;
  color: #1f2937;
}

.entry-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff8ec;
  font-size: 12px;
  color: #8a6d3b;
}

.checklist-count {
  font-size: 12px;
}

.responsibility-text {
  margin: 10px 0 6px;
  font-size: 12px;
  line-height: 20px;
  color: #5b6779;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.responsibility-meta {
  font-size: 11px;
  color: #8a96a8;
}

.task-timeline {
  margin-top: 14px;
}

.timeline-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.timeline-meta {
  font-size: 11px;
  color: #8a96a8;
}

.timeline-note {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #5b6779;
}

.receipt-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.receipt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #5b6779;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.photo-item {
  height: 68px;
  border-radius: 8px;
  border: 1px dashed #d6dfeb;
  background: #f7f9fc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  color: #8a96a8;
}

.photo-empty {
  grid-column: span 4;
  padding: 18px 0;
  text-align: center;
  font-size: 12px;
  color: #8a96a8;
}

.receipt-note p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 19px;
  color: #1f2937;
}

.receipt-label {
  font-size: 12px;
  color: #8a96a8;
}

.empty-block {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 0;
  color: #8a96a8;
  font-size: 12px;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.rating-text {
  font-size: 12px;
  color: #8a96a8;
}

.review-text {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 19px;
  color: #1f2937;
}

.confirm-meta {
  margin-top: 8px;
  font-size: 11px;
  color: #8a96a8;
}

.exception-text {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 19px;
  color: #d64545;
}

.confirm-cta {
  padding: 14px 16px;
  border-radius: 10px;
  background: #f0f7ff;
  border: 1px solid #d6e6ff;
}

.cta-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  color: #8a96a8;
}

@media (max-width: 1400px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .sla-bar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 14px;
  }
}
</style>
