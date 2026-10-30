<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import {
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import ResponsibilityDrawer from './ResponsibilityDrawer.vue'
import {
  checklistTemplates,
  createTask,
  executors,
  taskTypeOptions,
  type Task,
  type TaskSource,
  type TaskType,
} from '@/composables/useTasks'
import { elders } from '@/mock/elders'

const props = defineProps<{
  open: boolean
  eventId?: string
  elderId?: string
  initialType?: TaskType
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created', task: Task): void
}>()

const { message } = App.useApp()

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const elderOptions = elders
  .filter((item) => item.status !== '已归档')
  .slice(0, 80)
  .map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.building} ${item.unit} ${item.room}`,
  }))

const executorOptions = executors.map((item) => ({
  value: item.name,
  label: `${item.name} · ${item.org}`,
}))

const form = reactive({
  type: '上门探视' as TaskType,
  elderId: '',
  executorName: '陈志强',
  windowStart: '10:00',
  windowEnd: '12:00',
  acceptLimit: 5,
  arriveLimit: 30,
  rewardType: '公益' as '公益' | '计费',
  fee: 30,
  payNote: '',
  agreed: false,
})

const errorText = ref('')
const submitting = ref(false)
const responsibilityOpen = ref(false)

const source = computed<TaskSource>(() => (props.eventId ? '事件转派' : '社区创建'))

const activeElder = computed(() => elders.find((item) => item.id === form.elderId) ?? null)

const address = computed(() =>
  activeElder.value
    ? `${activeElder.value.community} ${activeElder.value.building} ${activeElder.value.unit} ${activeElder.value.room}`
    : '',
)

const template = computed(
  () =>
    checklistTemplates[form.type] ?? [
      { label: '到场确认老人情况', required: true, photoRequired: false },
      { label: '按任务要求完成处理', required: true, photoRequired: false },
      { label: '拍照留证并反馈结果', required: true, photoRequired: true },
    ],
)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.type = props.initialType ?? (props.eventId ? '应急到场' : '上门探视')
    form.elderId = props.elderId ?? ''
    form.executorName = '陈志强'
    form.windowStart = '10:00'
    form.windowEnd = '12:00'
    form.acceptLimit = props.eventId ? 5 : 10
    form.arriveLimit = props.eventId ? 30 : 60
    form.rewardType = '公益'
    form.fee = 30
    form.payNote = ''
    form.agreed = false
    errorText.value = ''
    submitting.value = false
  },
  { immediate: true },
)

async function handleSubmit() {
  errorText.value = ''
  if (!form.elderId) {
    errorText.value = '请选择老人'
    return
  }
  if (!form.windowStart || !form.windowEnd) {
    errorText.value = '请填写时间窗'
    return
  }
  if (form.rewardType === '计费' && !form.fee) {
    errorText.value = '请填写服务金额'
    return
  }
  if (!form.agreed) {
    errorText.value = '请阅读并确认责任告知'
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = createTask({
    type: form.type,
    source: source.value,
    elderId: form.elderId,
    executorName: form.executorName,
    windowStart: form.windowStart,
    windowEnd: form.windowEnd,
    acceptLimit: form.acceptLimit,
    arriveLimit: form.arriveLimit,
    rewardType: form.rewardType,
    fee: form.rewardType === '计费' ? form.fee : undefined,
    payNote: form.rewardType === '计费' ? form.payNote : undefined,
    eventId: props.eventId,
    checklist: template.value.map((item) => ({
      label: item.label,
      required: item.required,
      photoRequired: item.photoRequired,
    })),
  })
  submitting.value = false
  if (!result.ok || !result.task) {
    errorText.value = result.message
    return
  }
  message.success(result.message)
  visible.value = false
  emit('created', result.task)
}
</script>

<template>
  <a-drawer v-model:open="visible" title="派发任务" :width="720" destroy-on-hidden>
    <div class="dispatch-body">
      <a-alert
        v-if="eventId"
        type="warning"
        show-icon
        :message="`来自事件转派：${eventId}`"
        description="已自动带入老人、地址与应急到场类型，请补充执行人与时限。"
      />
      <a-alert v-else type="info" show-icon message="社区创建任务，请完整填写任务要素与责任告知。" />

      <div class="form-section">
        <div class="section-label">基本信息</div>
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="任务类型" required>
                <a-select
                  v-model:value="form.type"
                  :options="taskTypeOptions.map((item) => ({ value: item, label: item }))"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="任务来源">
                <a-input :value="source" disabled />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="老人" required>
            <a-select
              v-model:value="form.elderId"
              :options="elderOptions"
              show-search
              option-filter-prop="label"
              placeholder="搜索老人姓名或地址"
            >
              <template #suffixIcon><UserOutlined /></template>
            </a-select>
          </a-form-item>

          <a-form-item v-if="address" label="服务地址">
            <div class="address-box">
              <EnvironmentOutlined />
              <span>{{ address }}</span>
            </div>
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="时间窗开始" required>
                <a-input v-model:value="form.windowStart" placeholder="例如 10:00" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="时间窗结束" required>
                <a-input v-model:value="form.windowEnd" placeholder="例如 12:00" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="执行人" required>
                <a-select v-model:value="form.executorName" :options="executorOptions" />
                <div class="field-hint">执行人取自物业与网格员，由组织节点维护，不是服务机构护理员。</div>
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="接单时限">
                <a-input-number v-model:value="form.acceptLimit" :min="1" :max="120" addon-after="分钟" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="到场时限">
                <a-input-number v-model:value="form.arriveLimit" :min="5" :max="240" addon-after="分钟" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="form-section">
        <div class="section-label">检查清单</div>
        <div class="checklist-preview">
          <div v-for="(item, index) in template" :key="item.label" class="checklist-row">
            <span class="checklist-index">{{ index + 1 }}</span>
            <span class="checklist-label">{{ item.label }}</span>
            <a-tag v-if="item.required" color="blue">必做</a-tag>
            <a-tag v-if="item.photoRequired" color="orange">必拍</a-tag>
          </div>
        </div>
        <div class="field-hint">清单按任务类型自动带出，执行人需逐项完成并上传必拍项照片。</div>
      </div>

      <div class="form-section">
        <div class="section-label">责任与报酬</div>
        <a-form layout="vertical">
          <a-form-item label="报酬方式" required>
            <a-radio-group v-model:value="form.rewardType" button-style="solid">
              <a-radio-button value="公益">公益协助</a-radio-button>
              <a-radio-button value="计费">计费服务</a-radio-button>
            </a-radio-group>
          </a-form-item>
          <a-row v-if="form.rewardType === '计费'" :gutter="16">
            <a-col :span="10">
              <a-form-item label="服务金额" required>
                <a-input-number v-model:value="form.fee" :min="1" addon-after="元" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="14">
              <a-form-item label="支付说明">
                <a-input v-model:value="form.payNote" placeholder="例如 家属线上支付，平台仅登记" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item>
            <a-checkbox v-model:checked="form.agreed">
              我已阅读并确认
              <a class="link" @click.prevent="responsibilityOpen = true">《责任告知》</a>
              ，并已向委托人与执行人说明服务边界。
            </a-checkbox>
          </a-form-item>
        </a-form>
      </div>

      <a-alert v-if="errorText" type="error" show-icon :message="errorText" />

      <div class="dispatch-foot">
        <a-button @click="visible = false">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">
          <template #icon><SafetyCertificateOutlined /></template>
          {{ submitting ? '派发中…' : '确认派发' }}
        </a-button>
      </div>
    </div>

    <ResponsibilityDrawer v-model:open="responsibilityOpen" :reward-type="form.rewardType" />
  </a-drawer>
</template>

<style scoped>
.dispatch-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-section {
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #eef2f7;
  background: #fbfcfe;
}

.section-label {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.address-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f0f7ff;
  font-size: 13px;
  color: #1f6feb;
}

.checklist-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eef2f7;
}

.checklist-index {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #5b6779;
  background: #f0f3f7;
}

.checklist-label {
  flex: 1;
  font-size: 13px;
  color: #1f2937;
}

.field-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #8a96a8;
}

.link {
  font-size: 13px;
}

.dispatch-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px dashed #eef2f7;
}
</style>
