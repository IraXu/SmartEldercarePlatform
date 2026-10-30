<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { CloseOutlined } from '@antdv-next/icons'
import {
  createDevice,
  defaultRules,
  deviceTypeOptions,
  devices,
  protocolOptions,
  type Device,
  type DeviceType,
} from '@/mock/devices'
import { elders, getElderById, getHouseByElder } from '@/mock/elders'

const props = defineProps<{ open: boolean; device?: Device | null; presetElderId?: string }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'saved', device: Device): void
}>()

const { message, modal } = App.useApp()
const formRef = ref()
const saving = ref(false)
const baseline = ref('')
const previousType = ref<DeviceType>('摄像头')
const initializing = ref(false)

const brandMap: Record<DeviceType, { brand: string; model: string }> = {
  摄像头: { brand: '海康威视', model: 'DS-2CD3T' },
  烟感: { brand: '海湾', model: 'JTY-GD-G3' },
  燃气: { brand: '汉威科技', model: 'GT-901' },
  一氧化碳: { brand: '汉威科技', model: 'CO-500' },
  毫米波雷达: { brand: '华为海思', model: 'HiRadar-60' },
  定位器: { brand: '中兴物联', model: 'MeTracker-4G' },
}

const form = reactive({
  type: '摄像头' as DeviceType,
  brand: '',
  model: '',
  sn: '',
  protocol: 'GB28181',
  elderId: '',
  roomId: '',
  roomName: '',
  roomType: '',
  installNote: '',
  coverage: '',
  enabled: true,
})

const isEdit = computed(() => Boolean(props.device))
const title = computed(() => (isEdit.value ? '编辑设备' : '新增设备'))

const elderOptions = computed(() =>
  elders.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.community} · ${item.building} ${item.room}`,
  })),
)

const selectedElder = computed(() => (form.elderId ? getElderById(form.elderId) : null))
const house = computed(() => (selectedElder.value ? getHouseByElder(selectedElder.value) : null))
const roomOptions = computed(() =>
  (house.value?.rooms ?? []).map((room) => ({
    value: room.id,
    label: `${room.name}（${room.type}）`,
    type: room.type,
  })),
)
const isTracker = computed(() => form.type === '定位器')
const cameraPrivate = computed(
  () => form.type === '摄像头' && (form.roomType === '卧室' || form.roomType === '卫生间'),
)
const isDirty = computed(() => Boolean(baseline.value) && JSON.stringify(form) !== baseline.value)

const rules: Record<string, any[]> = {
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  brand: [{ required: true, message: '请输入品牌', trigger: 'blur' }],
  model: [{ required: true, message: '请输入型号', trigger: 'blur' }],
  sn: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  protocol: [{ required: true, message: '请选择通信协议', trigger: 'change' }],
  elderId: [{ required: true, message: '请选择绑定老人', trigger: 'change' }],
}

function initForm() {
  initializing.value = true
  const device = props.device
  if (device) {
    form.type = device.type
    form.brand = device.brand
    form.model = device.model
    form.sn = device.sn
    form.protocol = device.protocol
    form.elderId = device.elderId
    form.roomId = device.roomId
    form.roomName = device.roomName
    form.roomType = device.roomType
    form.installNote = device.installNote
    form.coverage = device.coverage
    form.enabled = device.enabled
    previousType.value = device.type
  } else {
    const preset = props.presetElderId || ''
    form.type = '摄像头'
    form.brand = brandMap['摄像头'].brand
    form.model = brandMap['摄像头'].model
    form.sn = `SN20261027${String(devices.length + 1).padStart(3, '0')}`
    form.protocol = 'GB28181'
    form.elderId = preset
    form.roomId = ''
    form.roomName = ''
    form.roomType = ''
    form.installNote = ''
    form.coverage = ''
    form.enabled = true
    previousType.value = '摄像头'
    if (preset) {
      const elder = getElderById(preset)
      const presetHouse = elder ? getHouseByElder(elder) : null
      const firstRoom = presetHouse?.rooms[0]
      if (firstRoom) {
        form.roomId = firstRoom.id
        form.roomName = firstRoom.name
        form.roomType = firstRoom.type
      }
    }
  }
  nextTick(() => {
    baseline.value = JSON.stringify(form)
    formRef.value?.clearValidate()
    initializing.value = false
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) initForm()
  },
)

watch(
  () => form.elderId,
  () => {
    if (initializing.value) return
    if (isTracker.value) {
      form.roomId = 'TRACKER'
      form.roomName = '随身佩戴'
      form.roomType = '其他'
      return
    }
    const firstRoom = house.value?.rooms[0]
    if (firstRoom) {
      form.roomId = firstRoom.id
      form.roomName = firstRoom.name
      form.roomType = firstRoom.type
    } else {
      form.roomId = ''
      form.roomName = ''
      form.roomType = ''
    }
  },
)

function filterElder(input: string, option: any) {
  return String(option.label).toLowerCase().includes(input.toLowerCase())
}

function handleTypeChange(type: DeviceType) {
  const oldType = previousType.value
  const apply = () => {
    previousType.value = type
    form.type = type
    const meta = brandMap[type]
    form.brand = meta.brand
    form.model = meta.model
    form.protocol = type === '摄像头' ? 'GB28181' : 'MQTT'
    if (type === '定位器') {
      form.roomId = 'TRACKER'
      form.roomName = '随身佩戴'
      form.roomType = '其他'
    } else if (form.roomId === 'TRACKER') {
      const firstRoom = house.value?.rooms[0]
      form.roomId = firstRoom?.id ?? ''
      form.roomName = firstRoom?.name ?? ''
      form.roomType = firstRoom?.type ?? ''
    }
  }
  if (isEdit.value && type !== oldType) {
    modal.confirm({
      title: '切换设备类型',
      content: '切换类型会重置感知规则模板，是否继续？',
      okText: '继续切换',
      cancelText: '取消',
      onOk: apply,
      onCancel: () => {
        form.type = oldType
      },
    })
    return
  }
  apply()
}

function handleRoomChange(roomId: string) {
  const room = house.value?.rooms.find((item) => item.id === roomId)
  form.roomName = room?.name ?? ''
  form.roomType = room?.type ?? ''
}

function requestClose() {
  if (!isDirty.value) {
    emit('update:open', false)
    return
  }
  modal.confirm({
    title: '有未保存的修改',
    content: '离开后，本次设备信息修改将丢失。',
    okText: '确认离开',
    cancelText: '继续编辑',
    okButtonProps: { danger: true },
    onOk: () => emit('update:open', false),
  })
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    message.error('请检查标红的字段')
    return
  }
  if (!form.elderId) {
    message.error('请选择绑定老人')
    return
  }
  if (!house.value) {
    message.error('该老人尚未完成房屋建模，请先到老人档案完成建模')
    return
  }
  if (!isTracker.value && !form.roomId) {
    message.error('请选择安装房间')
    return
  }
  if (cameraPrivate.value) {
    message.error('卧室和卫生间不允许安装摄像头，请改用毫米波雷达')
    return
  }
  const duplicate = devices.find((item) => item.sn === form.sn && item.id !== props.device?.id)
  if (duplicate) {
    message.error(`该设备编号已登记：${duplicate.name}`)
    return
  }

  saving.value = true
  window.setTimeout(() => {
    if (props.device) {
      const device = props.device
      const typeChanged = device.type !== form.type
      device.type = form.type
      device.name = `${form.type} ${selectedElder.value?.room ?? ''}-${form.roomName}`
      device.brand = form.brand
      device.model = form.model
      device.sn = form.sn
      device.protocol = form.protocol
      device.elderId = form.elderId
      device.elderName = selectedElder.value?.name ?? ''
      device.houseId = selectedElder.value?.houseId ?? device.houseId
      device.address = selectedElder.value
        ? `${selectedElder.value.community} ${selectedElder.value.building} ${selectedElder.value.unit} ${selectedElder.value.room}`
        : device.address
      device.roomId = form.roomId
      device.roomName = form.roomName
      device.roomType = form.roomType
      device.installNote = form.installNote
      device.coverage = form.coverage
      device.enabled = form.enabled
      if (typeChanged) device.rules = defaultRules(form.type)
      device.changes.unshift({
        id: `DC-EDIT-${Date.now()}`,
        time: '2026-10-27 10:45',
        operator: '吕建成',
        action: '设备信息修改',
        detail: `更新设备信息，绑定老人：${device.elderName}，房间：${device.roomName}`,
      })
      saving.value = false
      baseline.value = JSON.stringify(form)
      emit('saved', device)
    } else {
      const newDevice = createDevice({
        type: form.type,
        brand: form.brand,
        model: form.model,
        sn: form.sn,
        protocol: form.protocol,
        elderId: form.elderId,
        roomId: form.roomId,
        roomName: form.roomName,
        roomType: form.roomType,
        installNote: form.installNote,
        coverage: form.coverage,
      })
      devices.unshift(newDevice)
      saving.value = false
      baseline.value = JSON.stringify(form)
      emit('saved', newDevice)
    }
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
    <div class="device-form-shell">
      <div class="device-form-header">
        <div>
          <div class="device-form-title">{{ title }}</div>
          <div class="device-form-subtitle">设备必须绑定老人、房屋与房间，保存后自动套用感知规则模板</div>
        </div>
        <a-button type="text" shape="circle" @click="requestClose">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <div class="device-form-body">
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" required-mark>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="设备类型" name="type">
                <a-select
                  v-model:value="form.type"
                  :options="deviceTypeOptions.map((item) => ({ value: item, label: item }))"
                  @change="handleTypeChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="通信协议" name="protocol">
                <a-select v-model:value="form.protocol" :options="protocolOptions.map((item) => ({ value: item, label: item }))" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="品牌" name="brand">
                <a-input v-model:value="form.brand" placeholder="如 海康威视" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="型号" name="model">
                <a-input v-model:value="form.model" placeholder="如 DS-2CD3T" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="设备编号" name="sn">
                <a-input v-model:value="form.sn" placeholder="全局唯一" :maxlength="40" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="启用状态">
                <a-switch v-model:checked="form.enabled" checked-children="启用" un-checked-children="停用" />
              </a-form-item>
            </a-col>
          </a-row>

          <div class="form-divider">绑定关系</div>

          <a-row :gutter="16">
            <a-col :span="24">
              <a-form-item label="绑定老人" name="elderId">
                <a-select
                  v-model:value="form.elderId"
                  show-search
                  :filter-option="filterElder"
                  :options="elderOptions"
                  placeholder="输入姓名、社区或房号搜索"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="!isTracker" :span="24">
              <a-form-item label="安装房间" :validate-status="cameraPrivate ? 'error' : undefined">
                <a-select
                  v-model:value="form.roomId"
                  :options="roomOptions"
                  placeholder="请选择安装房间"
                  :disabled="!house"
                  @change="handleRoomChange"
                />
              </a-form-item>
            </a-col>
            <a-col v-else :span="24">
              <a-form-item label="佩戴方式">
                <a-input value="随身佩戴，不绑定具体房间" disabled />
              </a-form-item>
            </a-col>
          </a-row>

          <a-alert
            v-if="selectedElder && !house"
            type="warning"
            show-icon
            class="form-alert"
            message="该老人尚未完成房屋建模"
            description="请先到老人档案的“居住与空间”完成房屋与房间建模，再新增设备。"
          />

          <a-alert
            v-if="cameraPrivate"
            type="error"
            show-icon
            class="form-alert"
            message="卧室和卫生间不允许安装摄像头"
            description="请改用毫米波雷达，或选择客厅、厨房等非隐私区域。"
          />

          <a-alert
            v-if="form.type === '毫米波雷达'"
            type="info"
            show-icon
            class="form-alert"
            message="雷达适合卧室与卫生间"
            description="毫米波雷达不产生图像，可用于跌倒、呼吸与在床/离床监测。"
          />

          <a-alert
            v-if="isTracker"
            type="info"
            show-icon
            class="form-alert"
            message="定位器为随身设备"
            description="安装位置记为随身佩戴，重点配置电子围栏、SOS 长按与低电提醒。"
          />

          <div class="form-divider">安装说明</div>

          <a-row :gutter="16">
            <a-col :span="24">
              <a-form-item label="安装位置说明">
                <a-input v-model:value="form.installNote" placeholder="如 床头墙面，距地 1.2 米" :maxlength="50" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="覆盖范围">
                <a-input v-model:value="form.coverage" placeholder="如 覆盖主卧与卫生间门口" :maxlength="50" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="device-form-footer">
        <a-button @click="requestClose">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">保存设备</a-button>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.device-form-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.device-form-header {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--elder-divider);
  flex-shrink: 0;
}

.device-form-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}

.device-form-subtitle {
  font-size: 11px;
  line-height: 17px;
  color: var(--elder-text-weak);
  margin-top: 2px;
}

.device-form-body {
  flex: 1;
  overflow: auto;
  padding: 20px 24px 32px;
}

.form-divider {
  margin: 8px 0 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 14px;
  font-weight: 600;
  color: var(--elder-text);
}

.form-alert {
  margin-bottom: 12px;
}

.device-form-footer {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--elder-divider);
  flex-shrink: 0;
}
</style>
