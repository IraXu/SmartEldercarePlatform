<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { handleLead, type AuditLead } from '@/composables/useEvidence'

const props = defineProps<{
  open: boolean
  lead: AuditLead | null
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
  action: '' as '' | '转人工复核' | '标记已处理' | '标记不成立',
  note: '',
  notify: false,
})
const submitting = ref(false)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.action = ''
    form.note = ''
    form.notify = false
    submitting.value = false
  },
)

async function handleOk() {
  if (!props.lead) return
  if (!form.action) {
    message.warning('请选择处置方式')
    return
  }
  if (form.note.trim().length < 10) {
    message.warning('处置意见至少 10 个字')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 240))
  const result = handleLead(props.lead.id, {
    action: form.action,
    note: form.note,
    notify: form.notify,
  })
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
    title="处理稽核线索"
    :width="560"
    ok-text="提交处置"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div v-if="lead" class="lead-body">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="线索编号">{{ lead.id }}</a-descriptions-item>
        <a-descriptions-item label="线索类型">{{ lead.type }}</a-descriptions-item>
        <a-descriptions-item label="涉及对象">{{ lead.target }}</a-descriptions-item>
        <a-descriptions-item label="关联工单">
          {{ lead.related.length > 0 ? lead.related.join('、') : '无' }}
        </a-descriptions-item>
      </a-descriptions>

      <a-form layout="vertical">
        <a-form-item label="处置方式" required>
          <a-radio-group v-model:value="form.action">
            <a-radio value="转人工复核">转人工复核</a-radio>
            <a-radio value="标记已处理">标记已处理</a-radio>
            <a-radio value="标记不成立">标记不成立</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="处置意见" required>
          <a-textarea
            v-model:value="form.note"
            :rows="3"
            :maxlength="200"
            show-count
            placeholder="说明核查过程与处置结论，至少 10 个字"
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="form.notify">通知涉及机构</a-checkbox>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.lead-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
