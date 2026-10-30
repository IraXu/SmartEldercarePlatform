<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { ExclamationCircleOutlined } from '@antdv-next/icons'
import { cancelWorkOrder, type WorkOrder } from '@/composables/useWorkOrders'

const props = defineProps<{
  open: boolean
  order: WorkOrder | null
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
const errorText = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (value) => {
    if (value) {
      reason.value = ''
      errorText.value = ''
      submitting.value = false
    }
  },
)

watch(reason, () => {
  if (errorText.value) errorText.value = ''
})

async function handleOk() {
  if (!props.order) return
  if (!reason.value.trim()) {
    errorText.value = '请填写取消原因'
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  const result = cancelWorkOrder(props.order.id, reason.value)
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
    title="取消工单"
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
        message="取消后不可恢复"
        description="如需继续服务，需要重新派单并通知服务人员。"
      />
      <div v-if="order" class="order-box">
        <div class="order-name">{{ order.elderName }} · {{ order.level }}</div>
        <div class="order-meta">{{ order.id }} · {{ order.staffName }} · {{ order.scheduledDate }} {{ order.scheduledStart }}</div>
      </div>
      <div class="reason-label">取消原因 <span class="required">*</span></div>
      <a-textarea
        v-model:value="reason"
        :rows="3"
        :maxlength="100"
        :status="errorText ? 'error' : undefined"
        show-count
        placeholder="例如 老人临时住院、家属要求取消"
      />
      <div v-if="errorText" class="field-error">{{ errorText }}</div>
      <div class="cancel-tip">
        <ExclamationCircleOutlined />
        <span>取消记录写入审计日志，可在工单时间轴查看。</span>
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

.order-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fbfd;
  border: 1px solid #eef2f7;
}

.order-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.order-meta {
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

.field-error {
  font-size: 12px;
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
