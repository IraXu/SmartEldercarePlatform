<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  KeyOutlined,
  MobileOutlined,
  PhoneOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  WarningOutlined,
} from '@antdv-next/icons'
import {
  acceptTask,
  addChecklistPhoto,
  arriveTask,
  getTask,
  submitTask,
  toggleChecklist,
  type TaskStatus,
} from '@/composables/useTasks'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const task = computed(() => getTask(String(route.params.id)))

const loading = ref(false)
const execNote = ref('')

watch(
  () => task.value?.id,
  () => {
    execNote.value = task.value?.execNote ?? ''
  },
  { immediate: true },
)

const statusColors: Record<TaskStatus, string> = {
  待接单: 'warning',
  已接单: 'processing',
  执行中: 'blue',
  待确认: 'orange',
  已完成: 'success',
  已退回: 'error',
  已取消: 'default',
}

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

const deadlineText = computed(() => {
  const item = task.value
  if (!item) return ''
  const created = new Date(item.createdAt.replace(' ', 'T')).getTime()
  if (item.status === '待接单') {
    const deadline = created + item.acceptLimit * 60000
    const remain = Math.round((deadline - Date.now()) / 60000)
    return remain >= 0 ? `接单剩余 ${remain} 分钟` : `接单已超时 ${Math.abs(remain)} 分钟`
  }
  if (item.status === '已接单') {
    const deadline = created + item.arriveLimit * 60000
    const remain = Math.round((deadline - Date.now()) / 60000)
    return remain >= 0 ? `到场剩余 ${remain} 分钟` : `到场已超时 ${Math.abs(remain)} 分钟`
  }
  return `时间窗 ${item.windowStart}–${item.windowEnd}`
})

const doneCount = computed(() => task.value?.checklist.filter((item) => item.done).length ?? 0)
const editable = computed(() => task.value?.status === '执行中')

const actionText = computed(() => {
  const status = task.value?.status
  if (status === '待接单') return '接单'
  if (status === '已接单') return '确认到场'
  if (status === '执行中') return '提交回执'
  if (status === '待确认') return '等待委托人确认'
  if (status === '已完成') return '任务已完成'
  return '任务已关闭'
})

const actionDisabled = computed(() =>
  ['待确认', '已完成', '已退回', '已取消'].includes(task.value?.status ?? ''),
)

async function handlePrimary() {
  const item = task.value
  if (!item) return
  loading.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  let result: { ok: boolean; message: string }
  if (item.status === '待接单') {
    result = acceptTask(item.id)
  } else if (item.status === '已接单') {
    result = arriveTask(item.id)
  } else if (item.status === '执行中') {
    result = submitTask(item.id, execNote.value)
  } else {
    result = { ok: false, message: '当前状态不可操作' }
  }
  loading.value = false
  if (result.ok) message.success(result.message)
  else message.error(result.message)
}

function handleCheck(itemId: string, event: unknown) {
  if (!task.value) return
  const target = (event as { target?: { checked?: boolean } })?.target
  const checked = Boolean(target?.checked)
  const result = toggleChecklist(task.value.id, itemId, checked)
  if (!result.ok) message.warning(result.message)
}

function takePhoto(itemId: string) {
  if (!task.value) return
  const result = addChecklistPhoto(task.value.id, itemId)
  if (result.ok) message.success(result.message)
  else message.warning(result.message)
}

function goBack() {
  if (task.value) router.push(`/tasks/${task.value.id}`)
  else router.push('/tasks')
}
</script>

<template>
  <div class="mobile-page">
    <div class="phone">
      <div class="phone-status">
        <span>9:41</span>
        <span class="phone-status-right">物业执行端 · 原型演示</span>
      </div>

      <div class="mobile-header">
        <a-button type="text" size="small" @click="goBack">
          <template #icon><ArrowLeftOutlined /></template>
        </a-button>
        <div class="mobile-title">
          <div class="mobile-app">物业执行端</div>
          <div class="mobile-user">{{ task?.executorName }} · {{ task?.executorOrg }}</div>
        </div>
        <a-tag :color="task ? statusColors[task.status] : 'default'">{{ task?.status ?? '-' }}</a-tag>
      </div>

      <div v-if="!task" class="mobile-empty">
        <WarningOutlined />
        <span>任务不存在或已被删除</span>
        <a-button type="primary" size="small" @click="router.push('/tasks')">返回任务看板</a-button>
      </div>

      <div v-else class="mobile-body">
        <div class="task-hero">
          <div class="hero-top">
            <span class="hero-type">{{ task.type }}</span>
            <span class="hero-id">{{ task.id }}</span>
          </div>
          <div class="hero-elder">{{ task.elderName }}</div>
          <div class="hero-address">
            <EnvironmentOutlined />
            <span>{{ task.community }} {{ task.address }}</span>
          </div>
          <div class="hero-deadline" :class="{ 'deadline-over': deadlineText.includes('超时') }">
            <ClockCircleOutlined />
            <span>{{ deadlineText }}</span>
          </div>
        </div>

        <a-alert
          v-if="task.status === '已退回' || task.status === '已取消'"
          type="error"
          show-icon
          :message="task.status === '已退回' ? '任务已退回社区' : '任务已取消'"
          :description="task.returnReason || task.cancelReason || '请联系社区管理员'"
        />

        <div class="mobile-card">
          <div class="card-title">
            <KeyOutlined />
            <span>进门方式</span>
          </div>
          <div class="entry-line">钥匙保管：{{ task.entry.keyHolder }}</div>
          <div class="entry-line">
            智能门锁：{{ task.entry.smartLock ? `临时密码 ${task.entry.smartLockPassword}` : '无' }}
          </div>
          <div class="entry-line">物业代开：{{ task.entry.propertyOpen ? '可代开' : '不可代开' }}</div>
          <div class="entry-note">{{ task.entry.note }}</div>
        </div>

        <div class="mobile-card">
          <div class="card-title">
            <UserOutlined />
            <span>联系人与委托人</span>
          </div>
          <div class="contact-row">
            <div>
              <div class="contact-name">{{ task.contactName }}（紧急联系人）</div>
              <div class="contact-phone">{{ maskPhone(task.contactPhone) }}</div>
            </div>
            <a-button size="small" :href="`tel:${task.contactPhone}`">
              <template #icon><PhoneOutlined /></template>
              拨号
            </a-button>
          </div>
          <div class="contact-row">
            <div>
              <div class="contact-name">{{ task.publisher }}（{{ task.publisherRole }}）</div>
              <div class="contact-phone">任务派发人</div>
            </div>
          </div>
        </div>

        <div class="mobile-card">
          <div class="card-title">
            <CheckCircleOutlined />
            <span>检查清单</span>
            <span class="card-count">{{ doneCount }} / {{ task.checklist.length }}</span>
          </div>
          <div class="check-list">
            <div v-for="item in task.checklist" :key="item.id" class="check-item">
              <a-checkbox
                :checked="item.done"
                :disabled="!editable"
                @change="handleCheck(item.id, $event)"
              />
              <div class="check-body">
                <div class="check-label">
                  {{ item.label }}
                  <a-tag v-if="item.required" color="blue" class="check-tag">必做</a-tag>
                </div>
                <div v-if="item.photoRequired" class="photo-row">
                  <a-button size="small" :disabled="!editable" @click="takePhoto(item.id)">
                    <template #icon><PictureOutlined /></template>
                    拍照
                  </a-button>
                  <span class="photo-count">{{ item.photoCount }} 张</span>
                </div>
              </div>
            </div>
          </div>
          <div class="privacy-tip">
            <SafetyCertificateOutlined />
            <span>请勿拍摄老人面部特写，仅拍摄环境与关键部位。</span>
          </div>
        </div>

        <div class="mobile-card">
          <div class="card-title">
            <MobileOutlined />
            <span>执行说明</span>
          </div>
          <a-textarea
            v-model:value="execNote"
            :rows="3"
            :maxlength="200"
            show-count
            :disabled="!editable"
            placeholder="可填写现场情况、异常或需要家属注意的事项"
          />
        </div>

        <div class="mobile-card receipt-card">
          <div class="card-title">
            <PictureOutlined />
            <span>回执信息</span>
          </div>
          <div class="receipt-line">照片合计：{{ task.photos }} 张</div>
          <div v-if="task.submittedAt" class="receipt-line">提交时间：{{ task.submittedAt }}</div>
          <div v-if="task.status === '已完成'" class="receipt-line success">
            委托人已确认完成，评价 {{ task.rating ?? 0 }} 星
          </div>
        </div>

        <div class="bottom-space" />
      </div>

      <div v-if="task" class="mobile-foot">
        <a-button
          type="primary"
          block
          size="large"
          :loading="loading"
          :disabled="actionDisabled"
          @click="handlePrimary"
        >
          {{ actionText }}
        </a-button>
        <div class="foot-hint">
          <template v-if="task.status === '待接单'">接单后请在 {{ task.arriveLimit }} 分钟内到场</template>
          <template v-else-if="task.status === '执行中'">完成必做项与必拍项后方可提交</template>
          <template v-else-if="task.status === '待确认'">等待委托人或社区确认完成</template>
          <template v-else>{{ task.executorOrg }} · {{ task.executorName }}</template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  min-height: 100vh;
  padding: 24px;
  background: #e9eef5;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.phone {
  position: relative;
  width: 390px;
  min-height: 844px;
  background: #f3f6fa;
  border: 1px solid #d6dfeb;
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(15, 42, 71, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.phone-status {
  height: 28px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #5b6779;
  background: #fff;
}

.phone-status-right {
  color: #8a96a8;
}

.mobile-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 10px;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
}

.mobile-title {
  flex: 1;
}

.mobile-app {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.mobile-user {
  font-size: 11px;
  color: #8a96a8;
}

.mobile-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #8a96a8;
  font-size: 13px;
}

.task-hero {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1f6feb, #13a8a8);
  color: #fff;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
}

.hero-type {
  font-weight: 600;
  color: #fff;
}

.hero-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.hero-elder {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 600;
}

.hero-address {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.86);
}

.hero-deadline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 11px;
}

.hero-deadline.deadline-over {
  background: rgba(214, 69, 69, 0.9);
}

.mobile-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef2f7;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.card-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 400;
  color: #8a96a8;
}

.entry-line {
  font-size: 12px;
  line-height: 21px;
  color: #5b6779;
}

.entry-note {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff8ec;
  font-size: 11px;
  line-height: 18px;
  color: #8a6d3b;
}

.contact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #eef2f7;
}

.contact-row:last-child {
  border-bottom: none;
}

.contact-name {
  font-size: 12px;
  font-weight: 500;
  color: #1f2937;
}

.contact-phone {
  font-size: 11px;
  color: #8a96a8;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.check-body {
  flex: 1;
}

.check-label {
  font-size: 12px;
  line-height: 20px;
  color: #1f2937;
}

.check-tag {
  margin-left: 4px;
  font-size: 10px;
  line-height: 16px;
}

.photo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.photo-count {
  font-size: 11px;
  color: #8a96a8;
}

.privacy-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f9fc;
  font-size: 11px;
  line-height: 18px;
  color: #8a96a8;
}

.receipt-line {
  font-size: 12px;
  line-height: 21px;
  color: #5b6779;
}

.receipt-line.success {
  color: #0e9384;
}

.bottom-space {
  height: 12px;
}

.mobile-foot {
  position: sticky;
  bottom: 0;
  padding: 12px 14px 14px;
  background: #fff;
  border-top: 1px solid #eef2f7;
}

.foot-hint {
  margin-top: 6px;
  text-align: center;
  font-size: 10px;
  color: #8a96a8;
}
</style>
