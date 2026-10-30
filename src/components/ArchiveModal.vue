<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import type { Elder } from '@/mock/elders'

const props = defineProps<{ open: boolean; elder: Elder | null }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'archived'): void
}>()

const { message, modal } = App.useApp()
const saving = ref(false)
const form = reactive({ reason: '迁出辖区', note: '' })

const reasons = ['迁出辖区', '死亡', '重复建档', '其他']

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.reason = '迁出辖区'
      form.note = ''
      saving.value = false
    }
  },
)

function close() {
  emit('update:open', false)
}

function doArchive() {
  if (!props.elder) return
  if (props.elder.hasOpenEvent) {
    message.error('该老人有 1 条在办事件，暂不能归档')
    return
  }
  saving.value = true
  window.setTimeout(() => {
    props.elder!.status = '已归档'
    props.elder!.updatedAt = '2026-10-27 11:00'
    saving.value = false
    message.success('档案已归档')
    emit('archived')
    emit('update:open', false)
  }, 600)
}

function handleOk() {
  if (!form.reason) {
    message.warning('请选择归档原因')
    return
  }
  if (form.reason === '死亡') {
    modal.confirm({
      title: '确认按死亡归档？',
      content: '该操作会将档案转为已归档并隐藏于默认列表，历史事件与快照仍保留。',
      okText: '确认归档',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: doArchive,
    })
    return
  }
  doArchive()
}
</script>

<template>
  <a-modal
    :open="open"
    title="归档档案"
    :width="480"
    ok-text="确认归档"
    cancel-text="取消"
    :confirm-loading="saving"
    :ok-button-props="{ danger: true }"
    @ok="handleOk"
    @cancel="close"
  >
    <div class="archive-body">
      <a-alert
        type="warning"
        show-icon
        message="归档后档案将从默认列表隐藏"
        description="历史事件、工单与档案快照仍保留，可在“已归档”筛选中查看并恢复。"
      />
      <div class="archive-field">
        <div class="archive-label">归档原因 <span class="text-danger">*</span></div>
        <a-select v-model:value="form.reason" :options="reasons.map((item) => ({ value: item, label: item }))" style="width: 100%" />
      </div>
      <div class="archive-field">
        <div class="archive-label">补充说明</div>
        <a-textarea v-model:value="form.note" :rows="3" :maxlength="200" placeholder="选填，如迁往地址、重复档案编号等" />
      </div>
      <div v-if="elder?.status === '已归档'" class="archive-warning">该档案已归档，请勿重复操作。</div>
    </div>
  </a-modal>
</template>

<style scoped>
.archive-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
}

.archive-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.archive-label {
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.archive-warning {
  font-size: 12px;
  color: var(--elder-danger);
}
</style>
