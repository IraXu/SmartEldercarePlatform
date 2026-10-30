<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import {
  defaultRules,
  notifyTargetOptions,
  type Device,
  type DeviceRules,
  type DeviceType,
} from '@/mock/devices'

const props = defineProps<{ device: Device; readonly?: boolean }>()
const emit = defineEmits<{ (event: 'saved'): void }>()

const { message } = App.useApp()
const formRef = ref()
const templateOpen = ref(false)
const saving = ref(false)
const baseline = ref('')

const form = reactive<DeviceRules>({ ...defaultRules('摄像头'), notifyTargets: [], linkage: [] })

const linkageMap: Record<DeviceType, string[]> = {
  摄像头: ['双向对讲', '电话通知', '通知社区'],
  烟感: ['声光报警', '电话通知', '短信'],
  燃气: ['关闭燃气阀', '开启排风扇', '声光报警', '电话通知'],
  一氧化碳: ['声光报警', '开启排风扇', '电话通知'],
  毫米波雷达: ['通知社区', '电话通知', '双向对讲'],
  定位器: ['电话通知', '短信', '通知社区'],
}

const linkageOptions = computed(() => linkageMap[props.device.type])

const dirty = computed(() => Boolean(baseline.value) && JSON.stringify(form) !== baseline.value)

const lastRuleTime = computed(
  () => props.device.changes.find((item) => item.action === '规则调整')?.time ?? '2026-10-08 15:40',
)

const isCamera = computed(() => props.device.type === '摄像头')
const isSmoke = computed(() => props.device.type === '烟感')
const isGas = computed(() => props.device.type === '燃气')
const isCo = computed(() => props.device.type === '一氧化碳')
const isRadar = computed(() => props.device.type === '毫米波雷达')
const isTracker = computed(() => props.device.type === '定位器')

function resetForm() {
  Object.assign(form, JSON.parse(JSON.stringify(props.device.rules)))
  form.notifyTargets = [...props.device.rules.notifyTargets]
  form.linkage = [...props.device.rules.linkage]
  baseline.value = JSON.stringify(form)
  formRef.value?.clearValidate()
}

watch(
  () => props.device.id,
  () => resetForm(),
  { immediate: true },
)

const rules = {
  silentStart: [
    { required: true, message: '请输入静默开始时间', trigger: 'blur' },
    { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: '时间格式为 HH:mm', trigger: 'blur' },
  ],
  silentEnd: [
    { required: true, message: '请输入静默结束时间', trigger: 'blur' },
    { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: '时间格式为 HH:mm', trigger: 'blur' },
    {
      validator: () =>
        form.silentStart === form.silentEnd
          ? Promise.reject('静默开始与结束时间不能相同')
          : Promise.resolve(),
      trigger: 'blur',
    },
  ],
  notifyTargets: [
    {
      validator: () =>
        form.notifyTargets.length > 0
          ? Promise.resolve()
          : Promise.reject('请至少选择一个通知对象'),
      trigger: 'change',
    },
  ],
  gasHigh: [
    {
      validator: () =>
        form.gasHigh > form.gasLow
          ? Promise.resolve()
          : Promise.reject('高浓度阈值必须大于低浓度阈值'),
      trigger: 'change',
    },
  ],
}

async function handleSave() {
  if (props.readonly) return
  try {
    await formRef.value?.validate()
  } catch {
    message.error('请检查标红的规则字段')
    return
  }
  saving.value = true
  window.setTimeout(() => {
    props.device.rules = {
      ...form,
      notifyTargets: [...form.notifyTargets],
      linkage: [...form.linkage],
    }
    props.device.changes.unshift({
      id: `DC-RULE-${Date.now()}`,
      time: '2026-10-27 10:50',
      operator: '吕建成',
      action: '规则调整',
      detail: '更新感知阈值、静默时段、通知对象或联动动作',
    })
    baseline.value = JSON.stringify(form)
    saving.value = false
    message.success('规则已保存')
    emit('saved')
  }, 650)
}

function applyTemplate() {
  Object.assign(form, defaultRules(props.device.type))
  form.notifyTargets = [...defaultRules(props.device.type).notifyTargets]
  form.linkage = [...defaultRules(props.device.type).linkage]
  templateOpen.value = false
  message.success('已应用默认模板，请保存规则')
}

const templateSummary = computed(() => {
  const type = props.device.type
  if (type === '摄像头') {
    return [
      ['跌倒静止时长', '60 秒'],
      ['生活习惯基线', '14 天'],
      ['通知对象', '子女、社区'],
      ['联动动作', '双向对讲、电话通知'],
    ]
  }
  if (type === '烟感') {
    return [
      ['烟雾阈值', '0.65'],
      ['延迟确认', '30 秒'],
      ['通知对象', '子女、社区'],
      ['联动动作', '声光报警、电话通知'],
    ]
  }
  if (type === '燃气') {
    return [
      ['低浓度阈值', '10 %LEL'],
      ['高浓度阈值', '25 %LEL'],
      ['通知对象', '子女、社区'],
      ['联动动作', '关阀、排风、声光'],
    ]
  }
  if (type === '一氧化碳') {
    return [
      ['浓度阈值', '50 ppm'],
      ['通知对象', '子女、社区'],
      ['联动动作', '声光报警、排风扇'],
    ]
  }
  if (type === '毫米波雷达') {
    return [
      ['跌倒静止时长', '60 秒'],
      ['离床未归时长', '30 分钟'],
      ['通知对象', '子女、社区'],
      ['联动动作', '通知社区、电话通知'],
    ]
  }
  if (type === '定位器') {
    return [
      ['电子围栏半径', '500 米'],
      ['SOS 长按时长', '3 秒'],
      ['低电阈值', '20%'],
      ['离线升级', '2 小时'],
    ]
  }
  return [
    ['SOS 长按时长', '3 秒'],
    ['上报位置', '开启'],
    ['通知对象', '子女、社区'],
    ['联动动作', '电话通知、上报 120'],
  ]
})
</script>

<template>
  <div class="rules-panel">
    <div class="rules-bar">
      <div class="rules-status">
        <a-tag :color="dirty ? 'orange' : 'green'">{{ dirty ? '有未保存修改' : '规则已生效' }}</a-tag>
        <span class="text-weak">更新于 {{ lastRuleTime }}</span>
      </div>
      <a-button v-if="!readonly" type="link" size="small" @click="templateOpen = true">恢复默认模板</a-button>
    </div>

    <a-alert v-if="readonly" type="info" show-icon class="mb-16" message="当前为只读视角" description="民政视角或已拆除设备不可修改感知规则。" />

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" required-mark :disabled="readonly">
      <div class="rule-card">
        <div class="rule-title">{{ device.type }}参数</div>
        <a-row :gutter="16">
          <template v-if="isCamera">
            <a-col :span="12">
              <a-form-item label="跌倒静止时长（秒）">
                <a-input-number v-model:value="form.fallStillSeconds" :min="10" :max="300" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="生活习惯基线（天）">
                <a-input-number v-model:value="form.baselineDays" :min="7" :max="30" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="陌生人检测">
                <a-switch v-model:checked="form.strangerDetect" checked-children="开启" un-checked-children="关闭" />
              </a-form-item>
            </a-col>
          </template>

          <template v-else-if="isSmoke">
            <a-col :span="12">
              <a-form-item label="烟雾阈值">
                <a-input-number v-model:value="form.smokeThreshold" :min="0.1" :max="2" :step="0.05" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="延迟确认（秒）">
                <a-input-number v-model:value="form.smokeDelaySeconds" :min="10" :max="120" style="width: 100%" />
              </a-form-item>
            </a-col>
          </template>

          <template v-else-if="isGas">
            <a-col :span="12">
              <a-form-item label="低浓度阈值（%LEL）">
                <a-input-number v-model:value="form.gasLow" :min="1" :max="20" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="高浓度阈值（%LEL）" name="gasHigh">
                <a-input-number v-model:value="form.gasHigh" :min="2" :max="50" style="width: 100%" />
              </a-form-item>
            </a-col>
          </template>

          <template v-else-if="isCo">
            <a-col :span="12">
              <a-form-item label="浓度阈值（ppm）">
                <a-input-number v-model:value="form.coThreshold" :min="10" :max="500" style="width: 100%" />
              </a-form-item>
            </a-col>
          </template>

          <template v-else-if="isRadar">
            <a-col :span="12">
              <a-form-item label="跌倒静止时长（秒）">
                <a-input-number v-model:value="form.fallStillSeconds" :min="10" :max="300" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="离床未归时长（分钟）">
                <a-input-number v-model:value="form.awayMinutes" :min="5" :max="120" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="呼吸异常检测">
                <a-switch v-model:checked="form.breathDetect" checked-children="开启" un-checked-children="关闭" />
              </a-form-item>
            </a-col>
          </template>

          <template v-else-if="isTracker">
            <a-col :span="12">
              <a-form-item label="电子围栏半径（米）">
                <a-input-number v-model:value="form.fenceRadius" :min="100" :max="5000" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="SOS 长按时长（秒）">
                <a-input-number v-model:value="form.sosSeconds" :min="1" :max="10" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="低电阈值（%）">
                <a-input-number v-model:value="form.lowBattery" :min="5" :max="50" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="离线升级（小时）">
                <a-input-number v-model:value="form.offlineHours" :min="1" :max="24" style="width: 100%" />
              </a-form-item>
            </a-col>
          </template>
        </a-row>
      </div>

      <div class="rule-card">
        <div class="rule-title">静默与通知</div>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="静默开始" name="silentStart">
              <a-input v-model:value="form.silentStart" placeholder="22:00" :maxlength="5" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="静默结束" name="silentEnd">
              <a-input v-model:value="form.silentEnd" placeholder="07:00" :maxlength="5" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="升级时限（分钟）">
              <a-input-number v-model:value="form.escalationMinutes" :min="5" :max="60" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="通知对象" name="notifyTargets">
              <a-checkbox-group v-model:value="form.notifyTargets" :options="notifyTargetOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="rule-hint">静默时段仅压制 L1/L2 通知，SOS、明火、高浓度燃气等 L3 硬信号不受限制。</div>
      </div>

      <div class="rule-card">
        <div class="rule-title">联动动作</div>
        <a-form-item>
          <a-checkbox-group v-model:value="form.linkage" :options="linkageOptions" />
        </a-form-item>
        <div class="rule-hint">联动动作需对应硬件支持，未接入的执行项会在 M3 事件处置中提示。</div>
      </div>
    </a-form>

    <div class="rules-actions">
      <a-button v-if="!readonly" type="primary" :loading="saving" @click="handleSave">保存规则</a-button>
    </div>

    <a-modal
      v-model:open="templateOpen"
      title="恢复默认模板"
      :width="560"
      ok-text="应用模板"
      cancel-text="取消"
      @ok="applyTemplate"
    >
      <div class="template-body">
        <div class="text-secondary">将按“{{ device.type }}”恢复以下默认参数，应用后需保存才会生效。</div>
        <a-descriptions bordered :column="2" size="small" class="mt-12">
          <a-descriptions-item v-for="item in templateSummary" :key="item[0]" :label="item[0]">
            {{ item[1] }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.rules-panel {
  padding-bottom: 8px;
}

.rules-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--elder-divider);
}

.rules-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.rule-card {
  padding: 16px 18px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  margin-bottom: 16px;
  background: #fff;
}

.rule-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  margin-bottom: 14px;
}

.rule-hint {
  margin-top: 4px;
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.rules-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mt-12 {
  margin-top: 12px;
}

.template-body {
  padding-top: 4px;
  font-size: 13px;
}
</style>
