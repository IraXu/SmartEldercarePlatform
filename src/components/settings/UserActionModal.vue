<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { ExclamationCircleOutlined } from '@antdv-next/icons'
import type { PlatformUser } from '@/composables/useAuth'

type Mode = 'approve' | 'reject' | 'disable'

const props = defineProps<{
  open: boolean
  mode: Mode
  user: PlatformUser | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'confirm', payload: { mode: Mode; reason?: string }): void
}>()

const { message } = App.useApp()
const reason = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (value) => {
    if (value) {
      reason.value = ''
      submitting.value = false
    }
  },
)

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const title = computed(() => {
  if (props.mode === 'approve') return '审核通过'
  if (props.mode === 'reject') return '审核驳回'
  return '停用账号'
})

const confirmText = computed(() => {
  if (props.mode === 'approve') return '确认通过'
  if (props.mode === 'reject') return '确认驳回'
  return '确认停用'
})

async function handleOk() {
  if (props.mode === 'reject' && !reason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 260))
  submitting.value = false
  emit('confirm', { mode: props.mode, reason: reason.value.trim() })
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    :title="title"
    :width="480"
    :ok-text="confirmText"
    :ok-type="mode === 'approve' ? 'primary' : 'danger'"
    :confirm-loading="submitting"
    :ok-button-props="{ danger: mode !== 'approve' }"
    @ok="handleOk"
  >
    <div v-if="user" class="review-body">
      <div class="review-user">
        <div class="review-avatar">{{ user.name.slice(0, 1) }}</div>
        <div>
          <div class="review-name">{{ user.name }} · {{ user.roleLabel }}</div>
          <div class="review-phone">{{ user.phone }} · {{ user.org }}</div>
        </div>
      </div>

      <a-descriptions :column="1" size="small" bordered class="review-info">
        <a-descriptions-item label="申请编号">{{ user.applicationNo || '-' }}</a-descriptions-item>
        <a-descriptions-item label="申请来源">{{ user.source }}</a-descriptions-item>
        <a-descriptions-item label="提交时间">{{ user.createdAt }}</a-descriptions-item>
      </a-descriptions>

      <template v-if="mode === 'approve'">
        <a-alert
          type="success"
          show-icon
          message="通过后账号立即生效"
          description="申请人可使用注册手机号与密码登录，数据范围按所属社区与网格生效。"
        />
      </template>

      <template v-else-if="mode === 'reject'">
        <div class="reason-label">驳回原因 <span class="required">*</span></div>
        <a-textarea
          v-model:value="reason"
          :rows="3"
          :maxlength="120"
          show-count
          placeholder="请说明驳回原因，申请人可在结果页查看"
        />
      </template>

      <template v-else>
        <a-alert
          type="warning"
          show-icon
          message="停用后该账号将立即退出登录"
          description="停用不会删除历史操作记录，可随时在用户管理中重新启用。"
        />
        <div class="disable-tip"><ExclamationCircleOutlined /> 请确认该账号当前无进行中的事件处置。</div>
      </template>
    </div>
  </a-modal>
</template>

<style scoped>
.review-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #1f6feb;
  background: #eaf1fe;
}

.review-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.review-phone {
  font-size: 12px;
  color: #8a96a8;
}

.review-info {
  margin-top: 2px;
}

.reason-label {
  font-size: 13px;
  color: #5b6779;
}

.required {
  color: #d64545;
}

.disable-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8a96a8;
}
</style>
