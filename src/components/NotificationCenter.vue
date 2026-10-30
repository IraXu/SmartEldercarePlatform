<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  AlertOutlined,
  BellOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import { canManageSettings, hasPermission, platformUsers } from '@/composables/useAuth'
import { currentProjectId } from '@/composables/useOrg'
import { overdueTasks } from '@/composables/useTasks'
import { auditPendingCount } from '@/composables/useEvidence'
import { canViewCompliance, pendingAccessCount } from '@/composables/useCompliance'

interface NoticeItem {
  id: string
  title: string
  desc: string
  count: number
  tone: 'warning' | 'danger' | 'primary' | 'success'
  icon: unknown
  route: string
}

const READ_KEY = 'se_platform_notice_read_v1'

const router = useRouter()
const { message } = App.useApp()
const open = ref(false)

const readSignatures = ref<Record<string, string>>(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(READ_KEY) ?? '{}') as Record<string, string>
    } catch {
      return {}
    }
  })(),
)

const pendingAccounts = computed(
  () =>
    platformUsers.filter(
      (item) => item.status === '待审核' && item.projectId === currentProjectId.value,
    ).length,
)

const items = computed<NoticeItem[]>(() => {
  const list: NoticeItem[] = []
  // 仅展示当前角色有权限进入的待办，避免点进去是 403
  if (hasPermission('audit') && auditPendingCount.value > 0) {
    list.push({
      id: 'audit-pending',
      title: `${auditPendingCount.value} 单待人工复核`,
      desc: '证据工单机审已完成，等待复核后进入结算',
      count: auditPendingCount.value,
      tone: 'primary',
      icon: SafetyCertificateOutlined,
      route: '/audit/reviews',
    })
  }
  if (hasPermission('tasks') && overdueTasks.value.length > 0) {
    list.push({
      id: 'task-overdue',
      title: `${overdueTasks.value.length} 条任务已超时`,
      desc: '请及时改派或联系执行人处理',
      count: overdueTasks.value.length,
      tone: 'danger',
      icon: AlertOutlined,
      route: '/tasks',
    })
  }
  if (canViewCompliance.value && pendingAccessCount.value > 0) {
    list.push({
      id: 'access-pending',
      title: `${pendingAccessCount.value} 条调阅申请待审批`,
      desc: '影像与档案调阅需审批后访问，并写入审计日志',
      count: pendingAccessCount.value,
      tone: 'warning',
      icon: FileProtectOutlined,
      route: '/compliance?tab=access',
    })
  }
  if (canManageSettings.value && pendingAccounts.value > 0) {
    list.push({
      id: 'user-pending',
      title: `${pendingAccounts.value} 个账号待审核`,
      desc: '当前项目有新的成员注册申请',
      count: pendingAccounts.value,
      tone: 'warning',
      icon: UserOutlined,
      route: '/settings?tab=users',
    })
  }
  if (list.length === 0) {
    list.push({
      id: 'empty',
      title: '暂无待处理事项',
      desc: '当前项目的待办已处理完毕',
      count: 0,
      tone: 'success',
      icon: CheckCircleOutlined,
      route: '/elders',
    })
  }
  return list
})

const totalCount = computed(() =>
  items.value.reduce((sum, item) => (item.id === 'empty' ? sum : sum + item.count), 0),
)

/** 已读按项目记录，用待办数量签名判断是否有新事项 */
const signature = computed(() =>
  items.value
    .filter((item) => item.id !== 'empty')
    .map((item) => `${item.id}:${item.count}`)
    .join('|'),
)

const readSignature = computed(() => readSignatures.value[currentProjectId.value] ?? '')

const unread = computed(() => (signature.value && signature.value === readSignature.value ? 0 : totalCount.value))

function go(item: NoticeItem) {
  if (item.id === 'empty') return
  open.value = false
  router.push(item.route)
}

function markAllRead() {
  readSignatures.value = { ...readSignatures.value, [currentProjectId.value]: signature.value }
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(readSignatures.value))
  } catch {
    // 原型存储失败不阻断交互
  }
  message.success('已全部标记为已读')
}
</script>

<template>
  <a-popover
    v-model:open="open"
    placement="bottomRight"
    trigger="click"
    :arrow="false"
    overlay-class-name="notice-popover"
  >
    <template #title>
      <div class="notice-head">
        <span>待办通知</span>
        <a-button type="link" size="small" @click="markAllRead">全部已读</a-button>
      </div>
    </template>
    <template #content>
      <div class="notice-list">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="notice-item"
          :disabled="item.id === 'empty'"
          @click="go(item)"
        >
          <span class="notice-icon" :class="`tone-${item.tone}`">
            <component :is="item.icon" />
          </span>
          <span class="notice-body">
            <span class="notice-title">{{ item.title }}</span>
            <span class="notice-desc">{{ item.desc }}</span>
          </span>
        </button>
      </div>
    </template>
    <a-badge :count="unread" :offset="[-2, 2]">
      <a-button type="text" shape="circle">
        <BellOutlined />
      </a-button>
    </a-badge>
  </a-popover>
</template>

<style scoped>
.notice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  font-size: 13px;
  font-weight: 600;
}

.notice-list {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.notice-item:hover:not(:disabled) {
  background: #f4f7fb;
}

.notice-item:disabled {
  cursor: default;
}

.notice-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.notice-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notice-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-text);
}

.notice-desc {
  font-size: 12px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-danger {
  color: #d64545;
  background: #fdecec;
}

.tone-warning {
  color: #d97706;
  background: #fff4e5;
}

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
}
</style>
