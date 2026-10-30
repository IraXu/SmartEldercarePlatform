<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { ExclamationCircleOutlined } from '@antdv-next/icons'
import { cancelTask, type Task } from '@/composables/useTasks'

const props = defineProps<{
  open: boolean
  task: Task | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'done'): void
}>()

const { message } = App.useApp()

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

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

async function handleOk() {
  if (!props.task) return
  if (!reason.value.trim()) {
    message.warning('请填写取消原因')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  const result = cancelTask(props.task.id, reason.value)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  visible.value = false
  emit('done')
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="取消任务"
    :width="480"
    ok-text="确认取消"
    :ok-button-props="{ danger: true }"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div class="cancel-body">
      <a-alert
        type="warning"
        show-icon
        message="取消后任务不可恢复"
        description="如需继续服务，需要重新派发任务并再次通知执行人。"
      />
      <div v-if="task" class="cancel-task">
        <div class="cancel-name">{{ task.type }} · {{ task.elderName }}</div>
        <div class="cancel-meta">{{ task.id }} · {{ task.executorName }}</div>
      </div>
      <div class="reason-label">取消原因 <span class="required">*</span></div>
      <a-textarea
        v-model:value="reason"
        :rows="3"
        :maxlength="100"
        show-count
        placeholder="例如 老人临时住院、家属取消委托"
      />
      <div class="cancel-tip">
        <ExclamationCircleOutlined />
        <span>取消记录将写入审计日志，可在任务时间轴中查看。</span>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.cancel-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cancel-task {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fbfd;
  border: 1px solid #eef2f7;
}

.cancel-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.cancel-meta {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.reason-label {
  font-size: 13px;
  color: #5b6779;
}

.required {
  color: #d64545;
}

.cancel-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8a96a8;
}
</style>
