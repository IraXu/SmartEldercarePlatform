<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { executors, reassignTask, type Task } from '@/composables/useTasks'

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

const executorOptions = executors.map((item) => ({
  value: item.name,
  label: `${item.name} · ${item.org}`,
}))

const form = reactive({
  executorName: '陈志强',
  acceptLimit: 5,
  arriveLimit: 30,
  reason: '',
})

const submitting = ref(false)

watch(
  () => props.open,
  (value) => {
    if (!value || !props.task) return
    form.executorName = props.task.executorName
    form.acceptLimit = props.task.acceptLimit
    form.arriveLimit = props.task.arriveLimit
    form.reason = ''
    submitting.value = false
  },
)

async function handleOk() {
  if (!props.task) return
  if (!form.reason.trim()) {
    message.warning('请填写改派原因')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  const result = reassignTask(props.task.id, {
    executorName: form.executorName,
    acceptLimit: form.acceptLimit,
    arriveLimit: form.arriveLimit,
    reason: form.reason,
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
    title="改派任务"
    :width="560"
    ok-text="确认改派"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div v-if="task" class="reassign-body">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="任务编号">{{ task.id }}</a-descriptions-item>
        <a-descriptions-item label="任务类型">{{ task.type }}</a-descriptions-item>
        <a-descriptions-item label="老人">{{ task.elderName }} · {{ task.address }}</a-descriptions-item>
        <a-descriptions-item label="原执行人">
          {{ task.executorName }}（{{ task.executorOrg }}）
        </a-descriptions-item>
        <a-descriptions-item label="当前状态">{{ task.status }}</a-descriptions-item>
      </a-descriptions>

      <a-form layout="vertical">
        <a-form-item label="新执行人" required>
          <a-select v-model:value="form.executorName" :options="executorOptions" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="接单时限">
              <a-input-number v-model:value="form.acceptLimit" :min="1" :max="120" addon-after="分钟" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="到场时限">
              <a-input-number v-model:value="form.arriveLimit" :min="5" :max="240" addon-after="分钟" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="改派原因" required>
          <a-textarea
            v-model:value="form.reason"
            :rows="3"
            :maxlength="100"
            show-count
            placeholder="请说明改派原因，便于审计追溯"
          />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.reassign-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
