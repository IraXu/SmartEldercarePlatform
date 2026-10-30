<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { submitReview, type AuditRecord } from '@/composables/useEvidence'

const props = defineProps<{
  open: boolean
  record: AuditRecord | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'done', id: string): void
}>()

const { message } = App.useApp()
const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const form = reactive({
  result: '' as '' | '通过' | '不通过',
  reason: undefined as string | undefined,
  note: '',
  notify: true,
  confirmed: false,
})
const submitting = ref(false)

const reasonOptions = [
  '服务时长不足',
  '影像缺失或与项目不符',
  '服务地点不符',
  '超出服务范围或频次',
  '人员资质不符',
  '其他',
].map((item) => ({ value: item, label: item }))

const abnormalElements = computed(
  () => props.record?.elements.filter((item) => item.status === '异常') ?? [],
)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.result = ''
    form.reason = undefined
    form.note = ''
    form.notify = true
    form.confirmed = false
    submitting.value = false
  },
)

async function handleOk() {
  if (!props.record) return
  if (!form.result) {
    message.warning('请选择复核结论')
    return
  }
  if (form.result === '通过' && props.record.risk === '高' && !form.confirmed) {
    message.warning('高风险工单需逐项确认异常要素')
    return
  }
  if (form.result === '不通过' && !form.reason) {
    message.warning('请选择退回原因')
    return
  }
  if (form.note.trim().length < 10) {
    message.warning('复核意见至少 10 个字')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 260))
  const result = submitReview(props.record.id, {
    result: form.result,
    reason: form.reason,
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
  emit('done', props.record.id)
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="复核结论"
    :width="620"
    ok-text="提交复核"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div v-if="record" class="review-body">
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="审核单">{{ record.id }}</a-descriptions-item>
        <a-descriptions-item label="老人">{{ record.elderName }}</a-descriptions-item>
        <a-descriptions-item label="机构与人员">
          {{ record.staffName }} · {{ record.staffOrg }}
        </a-descriptions-item>
        <a-descriptions-item label="服务时间">
          {{ record.checkinAt }} - {{ record.checkoutAt.slice(11) }}
        </a-descriptions-item>
        <a-descriptions-item label="机审结论">
          <a-tag color="error">{{ record.machineStatus === '异常' ? '机审异常' : '机审通过' }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="风险等级">
          <a-tag :color="record.risk === '高' ? 'error' : 'warning'">{{ record.risk }}风险</a-tag>
        </a-descriptions-item>
      </a-descriptions>

      <div class="abnormal-box">
        <div class="abnormal-title">命中异常要素（{{ abnormalElements.length }} 项）</div>
        <ul class="abnormal-list">
          <li v-for="item in abnormalElements" :key="item.key">
            <strong>{{ item.label }}</strong>
            <span>{{ item.summary }}</span>
            <span v-if="item.facts[2]" class="abnormal-fact">{{ item.facts[2] }}</span>
          </li>
        </ul>
      </div>

      <a-form layout="vertical">
        <a-form-item label="复核结论" required>
          <a-radio-group v-model:value="form.result">
            <a-radio value="通过">通过</a-radio>
            <a-radio value="不通过">不通过</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          v-if="form.result === '通过' && record.risk === '高'"
          class="confirm-item"
        >
          <a-checkbox v-model:checked="form.confirmed">
            我已逐项查看高风险异常要素与证据，确认异常不成立
          </a-checkbox>
        </a-form-item>

        <a-form-item v-if="form.result === '不通过'" label="退回原因" required>
          <a-select
            v-model:value="form.reason"
            :options="reasonOptions"
            placeholder="请选择退回原因"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="复核意见" required>
          <a-textarea
            v-model:value="form.note"
            :rows="4"
            :maxlength="200"
            show-count
            placeholder="说明复核依据、证据判断与结论，至少 10 个字"
          />
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="form.notify">
            结果通知机构管理员（站内消息）
          </a-checkbox>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.review-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.abnormal-box {
  padding: 12px 14px;
  border: 1px solid #f3c9c9;
  border-radius: 8px;
  background: #fdf3f3;
}

.abnormal-title {
  font-size: 12px;
  font-weight: 600;
  color: #b23b3b;
}

.abnormal-list {
  margin: 8px 0 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 20px;
  color: #5b6779;
}

.abnormal-list strong {
  margin-right: 6px;
  color: #b23b3b;
}

.abnormal-fact {
  display: block;
  color: #8a96a8;
}

.confirm-item {
  margin-top: -6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fff7ed;
}
</style>
