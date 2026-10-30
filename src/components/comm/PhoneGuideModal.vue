<script setup lang="ts">
import { computed } from 'vue'
import { App } from 'antdv-next'
import { PhoneOutlined, CopyOutlined } from '@antdv-next/icons'

const props = defineProps<{
  open: boolean
  name?: string
  phone?: string
  /** 场景说明，例如「事件处置」「老人档案」 */
  scene?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const { message } = App.useApp()

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const targetName = computed(() => props.name || '老人 / 紧急联系人')
const targetPhone = computed(() => props.phone || '')

/** 养老服务热线，作为联系不上本人时的兜底号码 */
const hotline = '12349'

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    message.success(`${label}已复制：${text}`)
  } catch {
    message.warning(`复制失败，请手动记录：${text}`)
  }
}
</script>

<template>
  <a-modal v-model:open="visible" title="拨打电话联系" :width="480" :footer="null">
    <a-alert
      type="info"
      show-icon
      class="phone-tip"
      message="平台不提供线上通话能力"
      description="请使用工作手机直接拨打下方号码，通话结束后回到本页记录沟通结果。"
    />

    <div class="phone-card">
      <div class="phone-head">
        <span class="phone-name">{{ targetName }}</span>
        <a-tag v-if="scene" color="blue">{{ scene }}</a-tag>
      </div>
      <div class="phone-number">{{ targetPhone || '暂无登记号码' }}</div>
      <div class="phone-actions">
        <a-button
          type="primary"
          :disabled="!targetPhone"
          :href="targetPhone ? `tel:${targetPhone}` : undefined"
        >
          <template #icon><PhoneOutlined /></template>
          用本机拨号
        </a-button>
        <a-button :disabled="!targetPhone" @click="copy(targetPhone, '号码')">
          <template #icon><CopyOutlined /></template>
          复制号码
        </a-button>
      </div>
    </div>

    <div class="hotline-row">
      <div>
        <div class="hotline-label">联系不上时拨打养老服务热线</div>
        <div class="hotline-number">{{ hotline }}</div>
      </div>
      <a-button size="small" @click="copy(hotline, '热线号码')">复制</a-button>
    </div>

    <a-alert
      class="phone-tip"
      type="warning"
      show-icon
      message="通话结果需人工回填"
      description="确认老人安全后，请在事件处置中选择「确认事件」并把联系方式记为「电话」，平台不保存通话录音。"
    />
  </a-modal>
</template>

<style scoped>
.phone-tip {
  margin-bottom: 14px;
}

.phone-card {
  padding: 18px;
  border-radius: 10px;
  border: 1px solid #e3e8ef;
  background: #f8fbff;
}

.phone-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.phone-number {
  margin: 8px 0 14px;
  font-size: 26px;
  line-height: 34px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #1f6feb;
}

.phone-actions {
  display: flex;
  gap: 10px;
}

.hotline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f4f7fb;
}

.hotline-label {
  font-size: 12px;
  color: #8a96a8;
}

.hotline-number {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}
</style>
