<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { CloseOutlined, PlusOutlined } from '@antdv-next/icons'
import { modeOptions, type Device } from '@/mock/devices'

const props = defineProps<{ device: Device; readonly?: boolean }>()
const emit = defineEmits<{ (event: 'saved'): void }>()

const { message, modal } = App.useApp()
const maskInput = ref('')
const maskError = ref('')
const saving = ref(false)
const baseline = ref('')

const form = reactive({
  maskAreas: [] as string[],
  mode: '在家模式' as (typeof modeOptions)[number],
  rawVideoLocalOnly: true,
  locationScope: '子女可见，社区告警时可见',
})

const isCamera = computed(() => props.device.type === '摄像头')
const isTracker = computed(() => props.device.type === '定位器')
const isOther = computed(() => !isCamera.value && !isTracker.value)

const dirty = computed(() => Boolean(baseline.value) && JSON.stringify(form) !== baseline.value)

function resetForm() {
  form.maskAreas = [...props.device.privacy.maskAreas]
  form.mode = props.device.privacy.mode
  form.rawVideoLocalOnly = props.device.privacy.rawVideoLocalOnly
  form.locationScope = props.device.privacy.locationScope
  baseline.value = JSON.stringify(form)
  maskInput.value = ''
  maskError.value = ''
}

watch(
  () => props.device.id,
  () => resetForm(),
  { immediate: true },
)

function addMask() {
  const value = maskInput.value.trim()
  if (!value) {
    maskError.value = '请输入遮蔽区名称'
    return
  }
  if (form.maskAreas.includes(value)) {
    maskError.value = '该遮蔽区已存在'
    return
  }
  if (value.length > 20) {
    maskError.value = '遮蔽区名称最多 20 个字符'
    return
  }
  form.maskAreas.push(value)
  maskInput.value = ''
  maskError.value = ''
}

function removeMask(index: number) {
  if (form.maskAreas.length <= 1) {
    message.error('摄像头至少保留一个遮蔽区')
    return
  }
  form.maskAreas.splice(index, 1)
}

function handleRawVideoChange(checked: boolean) {
  if (checked) return
  modal.confirm({
    title: '关闭原始视频不出户',
    content: '关闭后原始视频可能上传云端，存在合规风险。建议保持开启，仅上传结构化事件与关键帧。',
    okText: '确认关闭',
    cancelText: '保持开启',
    okButtonProps: { danger: true },
    onOk: () => {
      form.rawVideoLocalOnly = false
      message.warning('已关闭原始视频不出户，请注意合规风险')
    },
    onCancel: () => {
      form.rawVideoLocalOnly = true
    },
  })
}

function handleSave() {
  if (props.readonly) return
  if (isCamera.value && form.maskAreas.length === 0) {
    message.error('摄像头至少保留一个遮蔽区')
    return
  }
  saving.value = true
  window.setTimeout(() => {
    props.device.privacy.maskAreas = [...form.maskAreas]
    props.device.privacy.mode = form.mode
    props.device.privacy.rawVideoLocalOnly = form.rawVideoLocalOnly
    props.device.privacy.locationScope = form.locationScope
    props.device.changes.unshift({
      id: `DC-PRIVACY-${Date.now()}`,
      time: '2026-10-27 10:55',
      operator: '吕建成',
      action: '隐私配置',
      detail: isCamera.value
        ? `更新遮蔽区（${form.maskAreas.join('、')}），工作模式：${form.mode}，原始视频不出户：${form.rawVideoLocalOnly ? '开启' : '关闭'}`
        : `更新定位可见范围：${form.locationScope}`,
    })
    baseline.value = JSON.stringify(form)
    saving.value = false
    message.success('隐私配置已保存')
    emit('saved')
  }, 650)
}
</script>

<template>
  <div class="privacy-panel">
    <a-alert
      v-if="readonly"
      type="info"
      show-icon
      class="mb-16"
      message="当前为只读视角"
      description="民政视角或已拆除设备不可修改隐私配置。"
    />

    <template v-if="isCamera">
      <div class="privacy-card">
        <div class="privacy-title">画面遮蔽区</div>
        <div class="privacy-desc">遮蔽区在边缘侧即被马赛克，不落盘、不上传；至少保留一个遮蔽区。</div>
        <div class="mask-add">
          <a-input
            v-model:value="maskInput"
            placeholder="如 卫生间门、卧室门口"
            :maxlength="20"
            :disabled="readonly"
            :status="maskError ? 'error' : undefined"
            @press-enter="addMask"
          />
          <a-button v-if="!readonly" type="primary" @click="addMask">
            <template #icon><PlusOutlined /></template>
            添加
          </a-button>
        </div>
        <div v-if="maskError" class="mask-error">{{ maskError }}</div>
        <div class="mask-list">
          <a-tag
            v-for="(area, index) in form.maskAreas"
            :key="area"
            :closable="!readonly"
            color="blue"
            @close="removeMask(index)"
          >
            {{ area }}
          </a-tag>
          <span v-if="form.maskAreas.length === 0" class="text-weak">尚未配置遮蔽区</span>
        </div>
      </div>

      <div class="privacy-card">
        <div class="privacy-title">工作模式</div>
        <div class="privacy-desc">睡眠与离家模式下只做跌倒与入侵检测，不做活动统计。</div>
        <a-radio-group v-model:value="form.mode" :disabled="readonly">
          <a-radio-button v-for="mode in modeOptions" :key="mode" :value="mode">{{ mode }}</a-radio-button>
        </a-radio-group>
      </div>

      <div class="privacy-card">
        <div class="privacy-title">视频存储</div>
        <div class="privacy-switch-row">
          <div>
            <div class="switch-label">原始视频不出户</div>
            <div class="privacy-desc">原始视频仅存本地网关或存储卡，云端只接收结构化事件与关键帧。</div>
          </div>
          <a-switch
            v-model:checked="form.rawVideoLocalOnly"
            :disabled="readonly"
            checked-children="开启"
            un-checked-children="关闭"
            @change="handleRawVideoChange"
          />
        </div>
      </div>
    </template>

    <template v-else-if="isTracker">
      <div class="privacy-card">
        <div class="privacy-title">定位可见范围</div>
        <div class="privacy-desc">位置信息属敏感个人信息，按最小必要开放；社区仅在告警时可见。</div>
        <a-radio-group v-model:value="form.locationScope" :disabled="readonly" class="location-group">
          <a-radio value="子女可见，社区告警时可见">子女可见，社区告警时可见</a-radio>
          <a-radio value="子女与社区均可见">子女与社区均可见</a-radio>
          <a-radio value="仅本人可见">仅本人可见</a-radio>
        </a-radio-group>
      </div>
    </template>

    <template v-else>
      <div class="privacy-card">
        <a-empty description="该设备不涉及影像或定位隐私" />
      </div>
    </template>

    <div v-if="!isOther" class="privacy-card">
      <div class="privacy-title">授权状态</div>
      <div class="consent-row">
        <a-tag
          :color="
            device.privacy.consentStatus === '已授权'
              ? 'green'
              : device.privacy.consentStatus === '已过期'
                ? 'orange'
                : 'default'
          "
        >
          {{ device.privacy.consentStatus }}
        </a-tag>
        <span class="text-weak">家属授权由 M8 合规模块统一管理，本期只读展示。</span>
      </div>
    </div>

    <div v-if="!readonly && !isOther" class="privacy-actions">
      <a-button type="primary" :loading="saving" @click="handleSave">保存隐私配置</a-button>
    </div>
  </div>
</template>

<style scoped>
.privacy-panel {
  padding-bottom: 8px;
}

.privacy-card {
  padding: 16px 18px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  margin-bottom: 16px;
  background: #fff;
}

.privacy-title {
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
}

.privacy-desc {
  margin-top: 4px;
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.mask-add {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.mask-error {
  margin-top: 4px;
  font-size: 11px;
  color: var(--elder-danger);
}

.mask-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.mask-list :deep(.ant-tag) {
  margin-inline-end: 0;
}

.privacy-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 8px;
}

.switch-label {
  font-size: 13px;
  font-weight: 500;
}

.location-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.consent-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 12px;
}

.privacy-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.mb-16 {
  margin-bottom: 16px;
}
</style>
