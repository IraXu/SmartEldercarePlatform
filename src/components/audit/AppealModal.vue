<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { submitAppeal, type AuditRecord } from '@/composables/useEvidence'

const props = defineProps<{
  open: boolean
  record: AuditRecord | null
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

const note = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    note.value = ''
    submitting.value = false
  },
)

async function handleOk() {
  if (!props.record) return
  if (note.value.trim().length < 20) {
    message.warning('申诉说明至少 20 个字')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 260))
  const result = submitAppeal(props.record.id, note.value)
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
    title="提交申诉"
    :width="560"
    ok-text="提交申诉"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div v-if="record" class="appeal-body">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="审核单">{{ record.id }}</a-descriptions-item>
        <a-descriptions-item label="复核结论">不通过</a-descriptions-item>
        <a-descriptions-item label="退回原因">
          {{ record.review?.reason ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="复核意见">
          {{ record.review?.note ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="复核时间">
          {{ record.review?.time ?? '-' }}
        </a-descriptions-item>
      </a-descriptions>

      <a-form layout="vertical">
        <a-form-item label="申诉说明" required>
          <a-textarea
            v-model:value="note"
            :rows="4"
            :maxlength="300"
            show-count
            placeholder="说明服务实际情况、补充证据或备案信息，至少 20 个字"
          />
        </a-form-item>
        <a-form-item label="补充材料">
          <a-button disabled>选择文件（原型占位）</a-button>
        </a-form-item>
      </a-form>

      <a-alert
        type="info"
        show-icon
        message="退回后 7 天内可申诉 1 次，复审结论为最终结论"
        description="申诉期间该工单不进入结算池，复审通过后自动恢复可结算状态。"
      />
    </div>
  </a-modal>
</template>

<style scoped>
.appeal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
