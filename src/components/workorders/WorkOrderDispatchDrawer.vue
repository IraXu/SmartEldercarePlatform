<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { CalendarOutlined, SafetyCertificateOutlined, UserOutlined } from '@antdv-next/icons'
import {
  createWorkOrder,
  dispatchWorkOrder,
  planQualified,
  reassignWorkOrder,
  servicePlans,
  staffMembers,
  type WorkOrder,
} from '@/composables/useWorkOrders'
import { elders } from '@/mock/elders'

const props = defineProps<{
  open: boolean
  mode: 'dispatch' | 'reassign'
  order?: WorkOrder | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'done', orderId?: string): void
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

const planOptions = servicePlans.map((item) => ({
  value: item.id,
  label: `${item.level} · ${item.frequency} · ${item.duration} 分钟`,
}))

const form = reactive({
  elderId: '',
  planId: 'PLAN-MEDIUM',
  staffName: '陈晓',
  scheduledDate: '2026-10-29',
  scheduledStart: '09:00',
  note: '',
  reason: '',
})

const errorText = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    errorText.value = ''
    submitting.value = false
    if (props.mode === 'reassign' && props.order) {
      form.staffName = props.order.staffName
      form.scheduledDate = props.order.scheduledDate
      form.scheduledStart = props.order.scheduledStart
      form.reason = ''
      form.note = ''
    } else {
      form.elderId = props.order?.elderId ?? ''
      form.planId = props.order?.planId ?? 'PLAN-MEDIUM'
      form.staffName = props.order?.staffName || '陈晓'
      form.scheduledDate = props.order?.scheduledDate ?? '2026-10-29'
      form.scheduledStart = props.order?.scheduledStart ?? '09:00'
      form.note = ''
      form.reason = ''
    }
  },
  { immediate: true },
)

const activePlanId = computed(() => (props.mode === 'reassign' ? props.order?.planId ?? form.planId : form.planId))
const activePlan = computed(() => servicePlans.find((item) => item.id === activePlanId.value) ?? servicePlans[0])

const elderAddress = computed(() => {
  if (props.mode === 'reassign') return props.order ? `${props.order.community} ${props.order.address}` : ''
  const elder = elders.find((item) => item.id === form.elderId)
  return elder ? `${elder.community} ${elder.building} ${elder.unit} ${elder.room}` : ''
})

const staffOptions = computed(() =>
  staffMembers.map((item) => {
    const qualified = planQualified(item.name, activePlanId.value)
    return {
      value: item.name,
      label: `${item.name} · ${item.org}${qualified ? '' : '（资质不符）'}`,
      disabled: !qualified,
    }
  }),
)

const selectedStaff = computed(() => staffMembers.find((item) => item.name === form.staffName) ?? null)
const qualified = computed(() => planQualified(form.staffName, activePlanId.value))

function handleElderChange() {
  if (props.mode === 'reassign') return
  const elder = elders.find((item) => item.id === form.elderId)
  if (!elder) return
  if (elder.disability === '重度失能') form.planId = 'PLAN-HEAVY'
  else if (elder.disability === '轻度失能' || elder.disability === '能力完好') form.planId = 'PLAN-LIGHT'
  else form.planId = 'PLAN-MEDIUM'
}

async function handleSubmit() {
  errorText.value = ''
  if (props.mode === 'dispatch' && !form.elderId) {
    errorText.value = '请选择老人'
    return
  }
  if (!qualified.value) {
    errorText.value = '该人员资质不覆盖所选项目'
    return
  }
  if (props.mode === 'reassign' && !form.reason.trim()) {
    errorText.value = '请填写改派原因'
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  let result: { ok: boolean; message: string; order?: WorkOrder }
  if (props.mode === 'reassign' && props.order) {
    result = reassignWorkOrder(props.order.id, {
      staffName: form.staffName,
      scheduledDate: form.scheduledDate,
      scheduledStart: form.scheduledStart,
      reason: form.reason,
    })
  } else if (props.mode === 'dispatch' && props.order) {
    result = dispatchWorkOrder(props.order.id, {
      staffName: form.staffName,
      scheduledDate: form.scheduledDate,
      scheduledStart: form.scheduledStart,
      note: form.note,
    })
  } else {
    result = createWorkOrder({
      elderId: form.elderId,
      planId: form.planId,
      staffName: form.staffName,
      scheduledDate: form.scheduledDate,
      scheduledStart: form.scheduledStart,
      note: form.note,
    })
  }
  submitting.value = false
  if (!result.ok) {
    errorText.value = result.message
    return
  }
  message.success(result.message)
  visible.value = false
  emit('done', result.order?.id ?? props.order?.id)
}
</script>

<template>
  <a-drawer
    v-model:open="visible"
    :title="mode === 'dispatch' ? '派单' : '改派工单'"
    :size="680"
    destroy-on-hidden
  >
    <div class="dispatch-body">
      <a-alert
        v-if="mode === 'reassign' && order"
        type="info"
        show-icon
        :message="`改派工单 ${order.id}`"
        :description="`${order.elderName} · ${order.level} · 原服务人员 ${order.staffName}`"
      />
      <a-alert
        v-else
        type="info"
        show-icon
        message="工单将按老人待遇等级生成，项目、时长与必拍项来自服务计划。"
      />

      <div class="form-section">
        <div class="section-label">工单信息</div>
        <a-form layout="vertical">
          <a-form-item v-if="mode === 'dispatch'" label="老人" required>
            <a-select
              v-model:value="form.elderId"
              :options="elderOptions"
              show-search
              option-filter-prop="label"
              placeholder="搜索老人姓名或地址"
              :disabled="Boolean(order)"
              @change="handleElderChange"
            >
              <template #suffixIcon><UserOutlined /></template>
            </a-select>
          </a-form-item>
          <a-form-item v-else-if="order" label="老人">
            <a-input :value="`${order.elderName} · ${order.community} ${order.address}`" disabled />
          </a-form-item>

          <a-form-item label="服务计划">
            <a-input :value="`${activePlan.level} · ${activePlan.frequency} · ${activePlan.duration} 分钟`" disabled />
            <div class="field-hint">
              {{ activePlan.items.map((item) => item.name).join('、') }}
            </div>
          </a-form-item>

          <a-form-item v-if="elderAddress" label="服务地址">
            <a-input :value="elderAddress" disabled />
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="服务日期" required>
                <a-input v-model:value="form.scheduledDate" placeholder="YYYY-MM-DD">
                  <template #prefix><CalendarOutlined /></template>
                </a-input>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="开始时间" required>
                <a-input v-model:value="form.scheduledStart" placeholder="例如 09:00" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="服务人员" required>
            <a-select v-model:value="form.staffName" :options="staffOptions">
              <template #suffixIcon><SafetyCertificateOutlined /></template>
            </a-select>
            <div class="field-hint">
              <template v-if="selectedStaff">
                {{ selectedStaff.title }} · 评级 {{ selectedStaff.rating }} · 资质：
                {{ selectedStaff.qualifications.join('、') }}
              </template>
            </div>
          </a-form-item>

          <a-form-item v-if="mode === 'dispatch'" label="派单备注">
            <a-textarea
              v-model:value="form.note"
              :rows="2"
              :maxlength="100"
              show-count
              placeholder="例如 家属要求上午上门、需带防滑垫"
            />
          </a-form-item>

          <a-form-item v-else label="改派原因" required>
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

      <div class="form-section">
        <div class="section-label">项目预览</div>
        <div class="item-list">
          <div v-for="(item, index) in activePlan.items" :key="item.name" class="item-row">
            <span class="item-index">{{ index + 1 }}</span>
            <span class="item-name">{{ item.name }}</span>
            <a-tag v-if="item.required" color="blue">必做</a-tag>
            <a-tag v-if="item.photoRequired" color="orange">必拍</a-tag>
          </div>
        </div>
        <div class="field-hint">
          计划时长 {{ activePlan.duration }} 分钟，服务人员需完成全部必做项与必拍项。
        </div>
      </div>

      <a-alert v-if="!qualified" type="warning" show-icon message="所选人员资质不覆盖该计划项目，请更换人员。" />
      <a-alert v-if="errorText" type="error" show-icon :message="errorText" />

      <div class="dispatch-foot">
        <a-button @click="visible = false">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ submitting ? '提交中…' : mode === 'dispatch' ? '确认派单' : '确认改派' }}
        </a-button>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.dispatch-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eef2f7;
}

.item-index {
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

.item-name {
  flex: 1;
  font-size: 13px;
  color: #1f2937;
}

.dispatch-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px dashed #eef2f7;
}
</style>
