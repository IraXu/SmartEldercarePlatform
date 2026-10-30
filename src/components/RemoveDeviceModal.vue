<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { removeReasonOptions, type Device } from '@/mock/devices'

const props = defineProps<{ open: boolean; device: Device | null }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'removed'): void
}>()

const { message } = App.useApp()
const saving = ref(false)
const form = reactive({ reason: '设备更换', note: '' })

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.reason = '设备更换'
      form.note = ''
      saving.value = false
    }
  },
)

function close() {
  emit('update:open', false)
}

function handleOk() {
  if (!props.device) return
  if (props.device.hasOpenEvent) {
    message.error('该设备有 1 条在办事件，暂不能拆除')
    return
  }
  if (props.device.status === '已拆除') {
    message.warning('设备已拆除')
    return
  }
  saving.value = true
  window.setTimeout(() => {
    const device = props.device!
    device.enabled = false
    device.status = '已拆除'
    device.changes.unshift({
      id: `DC-REMOVE-${Date.now()}`,
      time: '2026-10-27 11:10',
      operator: '吕建成',
      action: '拆除设备',
      detail: `拆除原因：${form.reason}${form.note ? `；${form.note}` : ''}`,
    })
    saving.value = false
    message.success('设备已拆除')
    emit('removed')
    emit('update:open', false)
  }, 600)
}
</script>

<template>
  <a-modal
    :open="open"
    title="拆除设备"
    :width="480"
    ok-text="确认拆除"
    cancel-text="取消"
    :confirm-loading="saving"
    :ok-button-props="{ danger: true }"
    @ok="handleOk"
    @cancel="close"
  >
    <div class="remove-body">
      <a-alert
        type="warning"
        show-icon
        message="拆除后设备不再计入在线率"
        description="设备与老人、房屋、房间的历史关系保留，历史事件与记录可继续追溯；拆除后不可恢复。"
      />
      <div class="remove-device">
        <div class="remove-device-name">{{ device?.name }}</div>
        <div class="text-weak">{{ device?.sn }} · {{ device?.address }} {{ device?.roomName }}</div>
      </div>
      <div class="remove-field">
        <div class="remove-label">拆除原因 <span class="text-danger">*</span></div>
        <a-select v-model:value="form.reason" :options="removeReasonOptions.map((item) => ({ value: item, label: item }))" style="width: 100%" />
      </div>
      <div class="remove-field">
        <div class="remove-label">补充说明</div>
        <a-textarea v-model:value="form.note" :rows="3" :maxlength="200" placeholder="选填，如更换型号、老人迁出地址等" />
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.remove-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
}

.remove-device {
  padding: 10px 14px;
  background: #f7f9fc;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
}

.remove-device-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.remove-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.remove-label {
  font-size: 13px;
  color: var(--elder-text-secondary);
}
</style>
