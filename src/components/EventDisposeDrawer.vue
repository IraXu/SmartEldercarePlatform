<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { CloseOutlined } from '@antdv-next/icons'
import {
  misreportReasonOptions,
  type EventStatus,
  type MisreportReason,
  type SafetyEvent,
} from '@/mock/events'

type DisposeAction = '确认事件' | '已到场' | '关闭归档' | '标记误报'

const props = defineProps<{ open: boolean; event: SafetyEvent | null }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'updated', payload: SafetyEvent): void
}>()

const { message, modal } = App.useApp()
const saving = ref(false)
const misreportConfirmOpen = ref(false)
const methodOptions = ['电话', '视频与对讲', '上门']

function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const form = reactive({
  action: '确认事件' as DisposeAction,
  method: '电话',
  conclusion: '',
  note: '',
  misreportReason: '设备误报' as MisreportReason,
  misreportNote: '',
})

interface ActionOption {
  value: DisposeAction
  label: string
  desc: string
  disabled: boolean
}

const actionOptions = computed<ActionOption[]>(() => {
  if (!props.event) return []
  const status = props.event.status
  return [
    {
      value: '确认事件' as DisposeAction,
      label: '确认事件',
      desc: '已通过电话或视频与对讲确认老人情况',
      disabled: status !== '待确认',
    },
    {
      value: '已到场',
      label: '已到场',
      desc: '社区网格员已到达老人家中',
      disabled: !['待确认', '处置中'].includes(status),
    },
    {
      value: '关闭归档',
      label: '关闭归档',
      desc: '风险解除，填写结论后关闭事件',
      disabled: !['处置中', '已到场'].includes(status),
    },
    {
      value: '标记误报',
      label: '标记误报',
      desc: '经确认不构成真实风险，退出响应统计',
      disabled: !['待确认', '处置中', '已到场'].includes(status),
    },
  ]
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const status = props.event?.status
    form.action = status === '已到场' ? '关闭归档' : status === '处置中' ? '已到场' : '确认事件'
    form.method = form.action === '已到场' ? '上门' : '电话'
    form.conclusion = ''
    form.note = ''
    form.misreportReason = '设备误报'
    form.misreportNote = ''
    saving.value = false
    misreportConfirmOpen.value = false
  },
)

const isMisreport = computed(() => form.action === '标记误报')
const needConclusion = computed(() => !isMisreport.value)
const needMethod = computed(() => form.action === '确认事件' || form.action === '已到场')

function selectAction(action: DisposeAction, disabled: boolean) {
  if (disabled) return
  form.action = action
  form.method = action === '已到场' ? '上门' : '电话'
}

function requestClose() {
  if (form.conclusion || form.note || form.misreportNote) {
    modal.confirm({
      title: '放弃本次处置？',
      content: '已填写的处置内容将丢失。',
      okText: '确认离开',
      cancelText: '继续编辑',
      okButtonProps: { danger: true },
      onOk: () => emit('update:open', false),
    })
    return
  }
  emit('update:open', false)
}

function validate() {
  if (!props.event) return false
  if (isMisreport.value) {
    if (!form.misreportReason) {
      message.error('请选择误报原因')
      return false
    }
    if (form.misreportReason === '其他' && !form.misreportNote.trim()) {
      message.error('请填写误报说明')
      return false
    }
    return true
  }
  if (!form.conclusion.trim()) {
    message.error('请填写处置结论')
    return false
  }
  if (form.conclusion.trim().length < 10) {
    message.error('处置结论至少 10 个字')
    return false
  }
  if (form.action === '关闭归档') {
    const confirmed = props.event.dispositions.some(
      (item) => item.action === '确认事件' || item.action === '已到场',
    )
    if (props.event.level === 'L3' && !confirmed) {
      message.error('请先完成电话/对讲/视频或到场确认')
      return false
    }
  }
  return true
}

function handleSubmit() {
  if (!props.event || !validate()) return
  if (isMisreport.value && props.event.level === 'L3') {
    misreportConfirmOpen.value = true
    return
  }
  submit()
}

function submit() {
  if (!props.event) return
  saving.value = true
  window.setTimeout(() => {
    const event = props.event!
    const now = currentTime()
    if (event.assignee === '未分配') event.assignee = '吕建成'
    if (form.action === '标记误报') {
      event.status = '误报'
      event.misreportReason = form.misreportReason
      event.misreportNote = form.misreportNote || '经现场/电话核实不构成真实风险'
      event.dispositions.push({
        id: `DP-MIS-${Date.now()}`,
        time: now,
        operator: '吕建成',
        action: '标记误报',
        note: `${form.misreportReason}${form.misreportNote ? `：${form.misreportNote}` : ''}`,
      })
      message.success('已标记误报')
    } else {
      let status: EventStatus = event.status
      if (form.action === '确认事件') {
        status = '处置中'
        event.responseElapsedMinutes = 3
      }
      if (form.action === '已到场') {
        status = '已到场'
        event.arrivalElapsedMinutes = 18
        if (!event.responseElapsedMinutes) event.responseElapsedMinutes = 3
      }
      if (form.action === '关闭归档') {
        status = '已关闭'
      }
      event.status = status
      event.dispositions.push({
        id: `DP-NEW-${Date.now()}`,
        time: now,
        operator: '吕建成',
        action: form.action,
        method: needMethod.value ? form.method : undefined,
        note: `${form.conclusion}${form.note ? `；${form.note}` : ''}`,
      })
      const successMap: Record<DisposeAction, string> = {
        确认事件: '事件已确认',
        已到场: '已记录到场',
        关闭归档: '事件已关闭并归档',
        标记误报: '已标记误报',
      }
      message.success(successMap[form.action])
    }
    saving.value = false
    misreportConfirmOpen.value = false
    emit('updated', event)
    emit('update:open', false)
  }, 650)
}
</script>

<template>
  <a-drawer
    :open="open"
    :size="720"
    placement="right"
    :closable="false"
    :mask-closable="false"
    :styles="{ body: { padding: '0' } }"
  >
    <div class="dispose-shell">
      <div class="dispose-header">
        <div>
          <div class="dispose-title">处置事件</div>
          <div class="dispose-subtitle">
            {{ event?.level }} {{ event?.title }} · {{ event?.elderName }} · {{ event?.occurredAt }}
          </div>
        </div>
        <a-button type="text" shape="circle" @click="requestClose">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <div class="dispose-body">
        <div class="event-summary">
          <div class="summary-row">
            <span class="summary-key">当前状态</span>
            <a-tag :color="event?.status === '待确认' ? 'red' : event?.status === '处置中' ? 'blue' : 'cyan'">
              {{ event?.status }}
            </a-tag>
          </div>
          <div class="summary-row">
            <span class="summary-key">发生时间</span>
            <span>{{ event?.occurredAt }} · 已持续 {{ event?.duration }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-key">老人 / 地址</span>
            <span>{{ event?.elderName }} · {{ event?.address }} {{ event?.roomName }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-key">置信度</span>
            <span>{{ event?.confidence }}% · {{ event?.signals.length }} 个信号</span>
          </div>
        </div>

        <div class="section-title">选择处置动作</div>
        <div class="action-grid">
          <div
            v-for="item in actionOptions"
            :key="item.value"
            class="action-card"
            :class="{ active: form.action === item.value, disabled: item.disabled }"
            @click="selectAction(item.value, item.disabled)"
          >
            <div class="action-name">{{ item.label }}</div>
            <div class="action-desc">{{ item.desc }}</div>
          </div>
        </div>

        <template v-if="needMethod">
          <div class="section-title">处置方式</div>
          <a-select
            v-model:value="form.method"
            :options="methodOptions.map((item) => ({ value: item, label: item }))"
            style="width: 100%"
          />
        </template>

        <template v-if="needConclusion">
          <div class="section-title">处置结论 <span class="required">*</span></div>
          <a-textarea
            v-model:value="form.conclusion"
            :rows="3"
            :maxlength="200"
            show-count
            placeholder="如：已电话联系老人，意识清醒，社区正在上门；或：到场查看，老人状态稳定，已通知家属"
          />
        </template>

        <template v-if="isMisreport">
          <div class="section-title">误报原因 <span class="required">*</span></div>
          <a-select
            v-model:value="form.misreportReason"
            :options="misreportReasonOptions.map((item) => ({ value: item, label: item }))"
            style="width: 100%"
          />
          <div class="section-title">误报说明</div>
          <a-textarea
            v-model:value="form.misreportNote"
            :rows="3"
            :maxlength="200"
            placeholder="选填；选择“其他”时必填"
          />
        </template>

        <div class="section-title">备注</div>
        <a-textarea v-model:value="form.note" :rows="2" :maxlength="200" placeholder="选填，补充现场情况、家属沟通等" />

        <a-alert
          v-if="event?.level === 'L3' && form.action === '关闭归档'"
          type="warning"
          show-icon
          class="dispose-alert"
          message="L3 事件关闭要求"
          description="关闭前需已完成电话、对讲、视频或到场确认；处置记录会作为考核与复盘依据。"
        />
        <a-alert
          v-if="isMisreport && event?.level === 'L3'"
          type="warning"
          show-icon
          class="dispose-alert"
          message="L3 事件标记误报需二次确认"
          description="标记后将退出紧急事件响应与闭环统计，但仍保留信号、通知与处置记录。"
        />
      </div>

      <div class="dispose-footer">
        <a-button @click="requestClose">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSubmit">提交处置</a-button>
      </div>
    </div>

    <a-modal
      v-model:open="misreportConfirmOpen"
      title="确认标记 L3 事件为误报？"
      :width="480"
      ok-text="确认误报"
      cancel-text="取消"
      :ok-button-props="{ danger: true }"
      :confirm-loading="saving"
      @ok="submit"
    >
      <div class="confirm-body">
        <p>标记后该事件将退出紧急事件响应与闭环统计，但仍保留信号、通知与处置记录，可在误报分析中复盘。</p>
        <p class="text-weak">误报原因：{{ form.misreportReason }}{{ form.misreportNote ? ` · ${form.misreportNote}` : '' }}</p>
      </div>
    </a-modal>
  </a-drawer>
</template>

<style scoped>
.dispose-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.dispose-header {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--elder-divider);
  flex-shrink: 0;
}

.dispose-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}

.dispose-subtitle {
  font-size: 11px;
  line-height: 17px;
  color: var(--elder-text-weak);
  margin-top: 2px;
}

.dispose-body {
  flex: 1;
  overflow: auto;
  padding: 20px 24px 28px;
}

.event-summary {
  padding: 12px 14px;
  background: #f7f9fc;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  margin-bottom: 18px;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 12px;
  line-height: 24px;
}

.summary-key {
  width: 86px;
  flex-shrink: 0;
  color: var(--elder-text-secondary);
}

.section-title {
  margin: 18px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-text);
}

.required {
  color: var(--elder-danger);
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.action-card {
  padding: 12px 14px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-card:hover {
  border-color: var(--elder-primary);
}

.action-card.active {
  border-color: var(--elder-primary);
  background: #eaf1fe;
}

.action-card.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
}

.action-desc {
  margin-top: 2px;
  font-size: 11px;
  line-height: 17px;
  color: var(--elder-text-weak);
}

.dispose-alert {
  margin-top: 16px;
}

.dispose-footer {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--elder-divider);
  flex-shrink: 0;
}

.confirm-body {
  font-size: 13px;
  line-height: 22px;
}
</style>
