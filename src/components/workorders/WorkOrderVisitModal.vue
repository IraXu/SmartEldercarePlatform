<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { addVisit, type WorkOrder } from '@/composables/useWorkOrders'

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

const form = reactive({
  satisfaction: '满意',
  note: '',
  complaint: '无',
})
const submitting = ref(false)

const satisfactionOptions = ['满意', '基本满意', '不满意'].map((item) => ({ value: item, label: item }))
const complaintOptions = ['无', '服务态度', '服务时长不足', '服务项目缺失', '收费争议', '其他'].map(
  (item) => ({ value: item, label: item }),
)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.satisfaction = '满意'
    form.note = ''
    form.complaint = '无'
    submitting.value = false
  },
)

async function handleOk() {
  if (!props.order) return
  if (!form.satisfaction) {
    message.warning('请选择满意度')
    return
  }
  if (!form.note.trim()) {
    message.warning('请填写回访记录')
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  const result = addVisit(props.order.id, { ...form })
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
    title="新增回访"
    :width="520"
    ok-text="保存回访"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div v-if="order" class="visit-body">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="工单">{{ order.id }}</a-descriptions-item>
        <a-descriptions-item label="老人">{{ order.elderName }}</a-descriptions-item>
        <a-descriptions-item label="服务人员">
          {{ order.staffName }} · {{ order.staffOrg }}
        </a-descriptions-item>
      </a-descriptions>

      <a-form layout="vertical">
        <a-form-item label="满意度" required>
          <a-radio-group v-model:value="form.satisfaction" button-style="solid">
            <a-radio-button v-for="item in satisfactionOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="回访记录" required>
          <a-textarea
            v-model:value="form.note"
            :rows="3"
            :maxlength="200"
            show-count
            placeholder="记录家属反馈、服务质量与需跟进事项"
          />
        </a-form-item>
        <a-form-item label="是否投诉">
          <a-select v-model:value="form.complaint" :options="complaintOptions" />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.visit-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
