<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { addAudit } from '@/composables/useAuth'
import type { AuditRecord } from '@/composables/useEvidence'

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

const form = reactive({
  reason: '',
  scopes: ['记录仪片段'] as string[],
  duration: '3',
})
const submitting = ref(false)

const scopeOptions = ['签到记录', '服务照片', '记录仪片段', '签认记录']
const durationOptions = [
  { value: '1', label: '1 天' },
  { value: '3', label: '3 天' },
  { value: '7', label: '7 天' },
]

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.reason = ''
    form.scopes = ['记录仪片段']
    form.duration = '3'
    submitting.value = false
  },
)

async function handleOk() {
  if (!props.record) return
  if (form.reason.trim().length < 10) {
    message.warning('请填写调阅事由（至少 10 个字）')
    return
  }
  if (form.scopes.length === 0) {
    message.warning('请至少选择 1 项调阅范围')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 240))
  addAudit(
    '申请调阅证据',
    props.record.id,
    '成功',
    `${form.scopes.join('、')} · ${form.duration} 天 · ${form.reason.trim()}`,
  )
  submitting.value = false
  message.success(`调阅申请已提交，有效期 ${form.duration} 天`)
  visible.value = false
  emit('done')
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="申请调阅证据"
    :width="560"
    ok-text="提交申请"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div v-if="record" class="access-body">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="审核单">{{ record.id }}</a-descriptions-item>
        <a-descriptions-item label="老人">{{ record.elderName }}</a-descriptions-item>
        <a-descriptions-item label="证据范围">
          {{ record.evidence.length }} 条，含记录仪片段 {{ record.clips }} 段
        </a-descriptions-item>
        <a-descriptions-item label="脱敏状态">人脸已自动打码，原始影像不可下载</a-descriptions-item>
      </a-descriptions>

      <a-form layout="vertical">
        <a-form-item label="调阅事由" required>
          <a-textarea
            v-model:value="form.reason"
            :rows="3"
            :maxlength="200"
            show-count
            placeholder="说明本次调阅的业务事由，至少 10 个字"
          />
        </a-form-item>
        <a-form-item label="调阅范围" required>
          <a-checkbox-group v-model:value="form.scopes" :options="scopeOptions" />
        </a-form-item>
        <a-form-item label="授权期限">
          <a-radio-group v-model:value="form.duration">
            <a-radio-button v-for="item in durationOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-radio-button>
          </a-radio-group>
        </a-form-item>
      </a-form>

      <a-alert
        type="warning"
        show-icon
        message="调阅行为将写入审计日志，超期自动失效"
        description="影像证据仅用于本次业务核查，不得截屏、转存或对外提供。"
      />
    </div>
  </a-modal>
</template>

<style scoped>
.access-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
