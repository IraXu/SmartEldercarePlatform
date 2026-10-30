<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { PictureOutlined } from '@antdv-next/icons'
import { confirmTask, returnTask, type Task } from '@/composables/useTasks'

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

const form = reactive({ rating: 5, review: '' })
const returnMode = ref(false)
const returnReason = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.rating = 5
    form.review = ''
    returnMode.value = false
    returnReason.value = ''
    submitting.value = false
  },
)

const doneCount = computed(() => props.task?.checklist.filter((item) => item.done).length ?? 0)
const totalCount = computed(() => props.task?.checklist.length ?? 0)

async function handleConfirm() {
  if (!props.task) return
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  const result = confirmTask(props.task.id, { rating: form.rating, review: form.review })
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  visible.value = false
  emit('done')
}

async function handleReturn() {
  if (!props.task) return
  if (!returnReason.value.trim()) {
    message.warning('请填写退回原因')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  const result = returnTask(props.task.id, returnReason.value)
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
  <a-modal v-model:open="visible" title="确认任务完成" :width="520" :footer="null" destroy-on-hidden>
    <div v-if="task" class="confirm-body">
      <div class="task-brief">
        <div>
          <div class="task-id">{{ task.id }}</div>
          <div class="task-name">{{ task.type }} · {{ task.elderName }}</div>
        </div>
        <a-tag color="warning">待确认</a-tag>
      </div>

      <div class="receipt">
        <div class="receipt-item">
          <span class="receipt-label">清单完成</span>
          <span class="receipt-value">{{ doneCount }} / {{ totalCount }} 项</span>
        </div>
        <div class="receipt-item">
          <span class="receipt-label">回执照片</span>
          <span class="receipt-value"><PictureOutlined /> {{ task.photos }} 张</span>
        </div>
        <div class="receipt-item">
          <span class="receipt-label">提交时间</span>
          <span class="receipt-value">{{ task.submittedAt || '-' }}</span>
        </div>
        <div class="receipt-note">
          <span class="receipt-label">执行说明</span>
          <p>{{ task.execNote || '执行人未填写说明' }}</p>
        </div>
      </div>

      <template v-if="!returnMode">
        <a-form layout="vertical">
          <a-form-item label="服务评价">
            <a-rate v-model:value="form.rating" />
          </a-form-item>
          <a-form-item label="评价内容（可选）">
            <a-textarea
              v-model:value="form.review"
              :rows="2"
              :maxlength="120"
              show-count
              placeholder="可填写服务感受或建议"
            />
          </a-form-item>
        </a-form>
      </template>

      <div v-else class="return-block">
        <div class="return-label">退回原因 <span class="required">*</span></div>
        <a-textarea
          v-model:value="returnReason"
          :rows="3"
          :maxlength="120"
          show-count
          placeholder="请说明哪里未完成，任务将退回执行人重做"
        />
      </div>

      <div class="confirm-foot">
        <a-button @click="visible = false">取消</a-button>
        <template v-if="returnMode">
          <a-button @click="returnMode = false">取消退回</a-button>
          <a-button danger type="primary" :loading="submitting" @click="handleReturn">确认退回</a-button>
        </template>
        <template v-else>
          <a-button danger ghost @click="returnMode = true">退回重做</a-button>
          <a-button type="primary" :loading="submitting" @click="handleConfirm">确认完成</a-button>
        </template>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-brief {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #8a96a8;
}

.task-name {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.receipt {
  padding: 14px 16px;
  border-radius: 10px;
  background: #f9fbfd;
  border: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.receipt-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.receipt-label {
  color: #8a96a8;
  font-size: 12px;
}

.receipt-value {
  color: #1f2937;
  font-weight: 500;
}

.receipt-note p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 19px;
  color: #5b6779;
}

.return-block {
  padding: 12px 14px;
  border-radius: 8px;
  background: #fdf5f5;
  border: 1px solid #f6dcdc;
}

.return-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #5b6779;
}

.required {
  color: #d64545;
}

.confirm-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px dashed #eef2f7;
}
</style>
