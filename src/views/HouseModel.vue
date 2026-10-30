<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { activeCommunities } from '@/composables/useOrg'
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  LockOutlined,
  PlusOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import QrModal from '@/components/QrModal.vue'
import { isCivil } from '@/composables/useAppState'
import {
  deviceTypeOptions,
  elders,
  getElderById,
  getHouseByElder,
  roomTypeOptions,
  type HouseDevice,
  type Room,
  type RoomType,
} from '@/mock/elders'

const route = useRoute()
const router = useRouter()
const { message, modal } = App.useApp()

const dirty = ref(false)
const selectedRoomId = ref('')
const qrOpen = ref(false)
const editingHouse = ref(false)
const entryEditing = ref(false)
const addingDevice = ref(false)
const passwordVisible = ref(false)

const elder = computed(() => getElderById(String(route.params.id)))
const house = computed(() => (elder.value ? getHouseByElder(elder.value) : null))
const canEdit = computed(() => !isCivil.value)
const selectedRoom = computed(
  () => house.value?.rooms.find((room) => room.id === selectedRoomId.value) ?? null,
)

const houseForm = reactive({
  community: '',
  building: '',
  unit: '',
  room: '',
  floor: 1,
  elevator: true,
  houseType: '',
  area: 78,
})

const entryForm = reactive({
  keyHolder: '',
  smartLock: false,
  smartLockPassword: '',
  propertyOpen: false,
  note: '',
})

const deviceForm = reactive({ type: '烟感', note: '' })

watch(
  () => house.value?.id,
  () => {
    if (house.value && (!selectedRoomId.value || !house.value.rooms.some((room) => room.id === selectedRoomId.value))) {
      selectedRoomId.value = house.value.rooms[0]?.id ?? ''
    }
  },
  { immediate: true },
)

const houseElders = computed(() =>
  elder.value ? elders.filter((item) => item.houseId === elder.value?.houseId && item.status !== '已归档') : [],
)

const deviceCount = computed(() =>
  (house.value?.rooms ?? []).reduce((sum, room) => sum + room.devices.length, 0),
)

const onlineCount = computed(() =>
  (house.value?.rooms ?? []).reduce(
    (sum, room) => sum + room.devices.filter((device) => device.status === '在线').length,
    0,
  ),
)

const roomNameError = computed(() => {
  if (!selectedRoom.value || !house.value) return ''
  const duplicated = house.value.rooms.some(
    (room) => room.id !== selectedRoom.value!.id && room.name === selectedRoom.value!.name,
  )
  return duplicated ? '房间名称已存在，请修改' : ''
})

const privacyViolation = computed(() =>
  (house.value?.rooms ?? []).some(
    (room) =>
      (room.type === '卧室' || room.type === '卫生间') &&
      room.devices.some((device) => device.type === '摄像头'),
  ),
)

const selectedRoomPrivate = computed(
  () => selectedRoom.value?.type === '卧室' || selectedRoom.value?.type === '卫生间',
)

const roomTypeColors: Record<RoomType, string> = {
  客厅: '#1F6FEB',
  卧室: '#7C5CE0',
  厨房: '#D97706',
  卫生间: '#13A8A8',
  阳台: '#2E9E5B',
  其他: '#8A96A8',
}

function markDirty() {
  if (canEdit.value) dirty.value = true
}

function goBack() {
  if (!elder.value) {
    router.push('/elders')
    return
  }
  if (dirty.value) {
    modal.confirm({
      title: '有未保存的户型修改',
      content: '离开后，本次房间与设备位置的修改将丢失。',
      okText: '确认离开',
      cancelText: '继续编辑',
      okButtonProps: { danger: true },
      onOk: () => router.push(`/elders/${elder.value!.id}`),
    })
    return
  }
  router.push(`/elders/${elder.value.id}`)
}

function selectRoom(room: Room) {
  selectedRoomId.value = room.id
}

function addRoom() {
  if (!house.value) return
  if (house.value.rooms.length >= 10) {
    message.warning('最多添加 10 个房间')
    return
  }
  const nextRoom: Room = {
    id: `RM-${Date.now()}`,
    name: `房间${house.value.rooms.length + 1}`,
    type: '其他',
    area: 8,
    gridArea: '',
    devices: [],
  }
  house.value.rooms.push(nextRoom)
  selectedRoomId.value = nextRoom.id
  markDirty()
}

function deleteRoom() {
  if (!house.value || !selectedRoom.value) return
  if (selectedRoom.value.devices.length > 0) {
    message.error(`该房间仍有 ${selectedRoom.value.devices.length} 台设备，请先解绑`)
    return
  }
  if (house.value.rooms.length <= 1) {
    message.warning('至少保留一个房间')
    return
  }
  const roomId = selectedRoom.value.id
  modal.confirm({
    title: '删除房间',
    content: `确认删除「${selectedRoom.value.name}」？删除后可在保存前撤销。`,
    okText: '确认删除',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: () => {
      if (!house.value) return
      house.value.rooms = house.value.rooms.filter((room) => room.id !== roomId)
      selectedRoomId.value = house.value.rooms[0]?.id ?? ''
      markDirty()
      message.success('房间已删除')
    },
  })
}

function addDevice() {
  if (!selectedRoom.value) return
  if (
    (selectedRoom.value.type === '卧室' || selectedRoom.value.type === '卫生间') &&
    deviceForm.type === '摄像头'
  ) {
    message.error('卧室和卫生间不允许安装摄像头，请改用毫米波雷达')
    return
  }
  const device: HouseDevice = {
    id: `DV-${Date.now()}`,
    type: deviceForm.type,
    note: deviceForm.note || '未填写安装说明',
    status: '在线',
  }
  selectedRoom.value.devices.push(device)
  deviceForm.note = ''
  addingDevice.value = false
  markDirty()
  message.success('设备位置已添加')
}

function removeDevice(device: HouseDevice) {
  if (!selectedRoom.value) return
  modal.confirm({
    title: '移除设备位置',
    content: `确认从「${selectedRoom.value.name}」移除 ${device.type}？设备台账本身不受影响。`,
    okText: '确认移除',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: () => {
      if (!selectedRoom.value) return
      selectedRoom.value.devices = selectedRoom.value.devices.filter((item) => item.id !== device.id)
      markDirty()
      message.success('设备位置已移除')
    },
  })
}

function savePlan() {
  if (!house.value) return
  if (roomNameError.value) {
    message.error(roomNameError.value)
    return
  }
  if (privacyViolation.value) {
    message.error('卧室和卫生间不允许安装摄像头，请先调整设备位置')
    return
  }
  dirty.value = false
  message.success('户型已保存')
}

function startHouseEdit() {
  if (!house.value) return
  houseForm.community = house.value.community
  houseForm.building = house.value.building
  houseForm.unit = house.value.unit
  houseForm.room = house.value.room
  houseForm.floor = house.value.floor
  houseForm.elevator = house.value.elevator
  houseForm.houseType = house.value.houseType
  houseForm.area = house.value.area
  editingHouse.value = true
}

function saveHouse() {
  if (!house.value || !elder.value) return
  house.value.community = houseForm.community
  house.value.building = houseForm.building
  house.value.unit = houseForm.unit
  house.value.room = houseForm.room
  house.value.floor = houseForm.floor
  house.value.elevator = houseForm.elevator
  house.value.houseType = houseForm.houseType
  house.value.area = houseForm.area
  elder.value.community = houseForm.community
  elder.value.building = houseForm.building
  elder.value.unit = houseForm.unit
  elder.value.room = houseForm.room
  elder.value.address = `${houseForm.community} ${houseForm.building} ${houseForm.unit} ${houseForm.room}`
  editingHouse.value = false
  dirty.value = false
  message.success('房屋信息已保存')
}

function startEntryEdit() {
  if (!house.value) return
  entryForm.keyHolder = house.value.entry.keyHolder
  entryForm.smartLock = house.value.entry.smartLock
  entryForm.smartLockPassword = house.value.entry.smartLockPassword
  entryForm.propertyOpen = house.value.entry.propertyOpen
  entryForm.note = house.value.entry.note
  entryEditing.value = true
}

function saveEntry() {
  if (!house.value || !elder.value) return
  if (!entryForm.keyHolder && !entryForm.smartLock && !entryForm.propertyOpen) {
    message.warning('请至少登记一种进门方式')
    return
  }
  const entry = {
    keyHolder: entryForm.keyHolder,
    smartLock: entryForm.smartLock,
    smartLockPassword: entryForm.smartLockPassword,
    propertyOpen: entryForm.propertyOpen,
    note: entryForm.note,
  }
  house.value.entry = entry
  elder.value.entry = { ...entry }
  entryEditing.value = false
  markDirty()
  message.success('进门方式已保存')
}

function revealPassword() {
  modal.confirm({
    title: '查看智能门锁临时密码',
    content: '本次查看会记录审计日志，密码将在 10 秒后自动隐藏。',
    okText: '确认查看',
    cancelText: '取消',
    onOk: () => {
      passwordVisible.value = true
      window.setTimeout(() => {
        passwordVisible.value = false
      }, 10000)
    },
  })
}
</script>

<template>
  <AdminLayout>
    <div class="page">
      <div class="breadcrumb">
        <a @click="goBack">老人档案</a>
        <span class="crumb-sep">/</span>
        <a v-if="elder" @click="router.push(`/elders/${elder.id}`)">{{ elder.name }}</a>
        <span class="crumb-sep">/</span>
        <span>房屋与空间</span>
      </div>

      <div v-if="!elder || !house" class="state-card card">
        <a-result status="404" title="房屋信息不存在" sub-title="请返回档案列表重新进入空间建模。">
          <template #extra>
            <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
          </template>
        </a-result>
      </div>

      <template v-else-if="elder && house">
        <div class="house-header card">
          <div class="house-header-left">
            <div class="house-icon"><EnvironmentOutlined /></div>
            <div>
              <div class="house-title">
                {{ house.community }} {{ house.building }} {{ house.unit }} {{ house.room }}
                <a-tag v-if="dirty" color="orange" class="dirty-tag">有未保存修改</a-tag>
              </div>
              <div class="house-subtitle">
                关联老人：
                <a-tag v-for="item in houseElders" :key="item.id" color="blue">{{ item.name }}</a-tag>
                <span class="text-weak">{{ house.rooms.length }} 个房间 · {{ deviceCount }} 台设备 · {{ onlineCount }} 台在线</span>
              </div>
            </div>
          </div>
          <div class="house-header-actions">
            <a-button v-if="canEdit" @click="qrOpen = true">
              <template #icon><QrcodeOutlined /></template>
              门牌码
            </a-button>
            <a-button v-if="canEdit" @click="router.push(`/devices?elderId=${elder.id}`)">
              <template #icon><ApartmentOutlined /></template>
              设备台账
            </a-button>
            <a-button v-if="canEdit" type="primary" :class="{ 'save-highlight': dirty }" @click="savePlan">
              <template #icon><SaveOutlined /></template>
              保存户型
            </a-button>
            <a-tag v-if="isCivil" color="default">只读视角</a-tag>
          </div>
        </div>

        <div class="house-grid">
          <aside class="left-col">
            <div class="side-card card">
              <div class="side-head">
                <div class="side-title">房屋信息</div>
                <a-button v-if="canEdit && !editingHouse" type="link" size="small" @click="startHouseEdit">
                  <template #icon><EditOutlined /></template>
                  编辑
                </a-button>
              </div>

              <template v-if="!editingHouse">
                <div class="info-line"><span>小区</span><strong>{{ house.building }}</strong></div>
                <div class="info-line"><span>单元 / 房号</span><strong>{{ house.unit }} / {{ house.room }}</strong></div>
                <div class="info-line"><span>楼层</span><strong>{{ house.floor }} 层</strong></div>
                <div class="info-line"><span>电梯</span><strong>{{ house.elevator ? '有' : '无' }}</strong></div>
                <div class="info-line"><span>房屋类型</span><strong>{{ house.houseType }}</strong></div>
                <div class="info-line"><span>建筑面积</span><strong>{{ house.area }} ㎡</strong></div>
              </template>

              <template v-else>
                <div class="edit-form">
                  <div class="edit-item">
                    <span>社区</span>
                    <a-select
                      v-model:value="houseForm.community"
                      :options="activeCommunities.map((item) => ({ value: item.name, label: item.name }))"
                      size="small"
                    />
                  </div>
                  <div class="edit-item"><span>小区/楼栋</span><a-input v-model:value="houseForm.building" size="small" /></div>
                  <div class="edit-item"><span>单元</span><a-input v-model:value="houseForm.unit" size="small" /></div>
                  <div class="edit-item"><span>房号</span><a-input v-model:value="houseForm.room" size="small" /></div>
                  <div class="edit-item">
                    <span>楼层</span>
                    <a-input-number v-model:value="houseForm.floor" :min="-2" :max="99" size="small" style="width: 100%" />
                  </div>
                  <div class="edit-item">
                    <span>电梯</span>
                    <a-switch v-model:checked="houseForm.elevator" size="small" checked-children="有" un-checked-children="无" />
                  </div>
                  <div class="edit-item"><span>房屋类型</span><a-input v-model:value="houseForm.houseType" size="small" /></div>
                  <div class="edit-item">
                    <span>面积</span>
                    <a-input-number v-model:value="houseForm.area" :min="1" :max="500" size="small" style="width: 100%" />
                  </div>
                  <div class="edit-actions">
                    <a-button size="small" @click="editingHouse = false">取消</a-button>
                    <a-button size="small" type="primary" @click="saveHouse">保存</a-button>
                  </div>
                </div>
              </template>
            </div>

            <div class="side-card card">
              <div class="side-head">
                <div class="side-title">进门方式</div>
                <a-button v-if="canEdit && !entryEditing" type="link" size="small" @click="startEntryEdit">
                  <template #icon><EditOutlined /></template>
                  编辑
                </a-button>
              </div>

              <template v-if="!entryEditing">
                <div class="entry-line">
                  <span class="entry-key">钥匙持有人</span>
                  <span>{{ house.entry.keyHolder || '未登记' }}</span>
                </div>
                <div class="entry-line">
                  <span class="entry-key">智能门锁</span>
                  <span v-if="!house.entry.smartLock" class="text-weak">未设置</span>
                  <span v-else-if="passwordVisible">{{ house.entry.smartLockPassword }}</span>
                  <span v-else>•••••• <a v-if="canEdit" @click="revealPassword">查看</a></span>
                </div>
                <div class="entry-line">
                  <span class="entry-key">物业代开</span>
                  <span>{{ house.entry.propertyOpen ? '可代开' : '不可代开' }}</span>
                </div>
                <div class="entry-note">{{ house.entry.note || '无补充说明' }}</div>
              </template>

              <template v-else>
                <div class="edit-form">
                  <div class="edit-item"><span>钥匙持有人</span><a-input v-model:value="entryForm.keyHolder" size="small" /></div>
                  <div class="edit-item">
                    <span>智能门锁</span>
                    <a-switch v-model:checked="entryForm.smartLock" size="small" checked-children="有" un-checked-children="无" />
                  </div>
                  <div v-if="entryForm.smartLock" class="edit-item">
                    <span>临时密码</span>
                    <a-input v-model:value="entryForm.smartLockPassword" size="small" placeholder="仅社区可见" />
                  </div>
                  <div class="edit-item">
                    <span>物业代开</span>
                    <a-switch v-model:checked="entryForm.propertyOpen" size="small" checked-children="可" un-checked-children="否" />
                  </div>
                  <div class="edit-item"><span>补充说明</span><a-input v-model:value="entryForm.note" size="small" /></div>
                  <div class="edit-actions">
                    <a-button size="small" @click="entryEditing = false">取消</a-button>
                    <a-button size="small" type="primary" @click="saveEntry">保存</a-button>
                  </div>
                </div>
              </template>
            </div>

            <div class="side-card card">
              <div class="side-title">关联老人</div>
              <div v-for="item in houseElders" :key="item.id" class="elder-line" @click="router.push(`/elders/${item.id}`)">
                <a-avatar :size="28" style="background: #eaf1fe; color: #1f6feb; font-weight: 600">
                  {{ item.name.slice(0, 1) }}
                </a-avatar>
                <div class="elder-line-main">
                  <div class="elder-line-name">{{ item.name }}</div>
                  <div class="elder-line-meta">{{ item.gender }} · {{ item.age }}岁 · {{ item.livingStatus }}</div>
                </div>
                <a-tag v-if="item.houseId === elder.houseId && item.id !== elder.id" color="default">同住</a-tag>
              </div>
            </div>
          </aside>

          <section class="plan-card card">
            <div class="plan-toolbar">
              <div>
                <div class="side-title">户型感知图</div>
                <div class="section-desc">点击房间查看与编辑设备位置；卧室、卫生间禁止安装摄像头</div>
              </div>
              <div class="plan-actions">
                <a-button v-if="canEdit" size="small" @click="addRoom">
                  <template #icon><PlusOutlined /></template>
                  添加房间
                </a-button>
              </div>
            </div>

            <div v-if="house.rooms.length === 0" class="plan-empty">
              <a-empty description="还没有房间，先添加第一个房间" />
              <a-button v-if="canEdit" type="primary" @click="addRoom">添加房间</a-button>
            </div>

            <div v-else class="plan-canvas">
              <div
                v-for="room in house.rooms"
                :key="room.id"
                :class="['room-card', { selected: room.id === selectedRoomId }]"
                :style="{
                  gridArea: room.gridArea,
                  borderTopColor: roomTypeColors[room.type],
                }"
                @click="selectRoom(room)"
              >
                <div class="room-head">
                  <span class="room-name">{{ room.name }}</span>
                  <span class="room-type" :style="{ color: roomTypeColors[room.type] }">{{ room.type }}</span>
                </div>
                <div class="room-meta">{{ room.area }} ㎡</div>
                <div class="room-devices">
                  <span v-if="room.devices.length === 0" class="text-weak">未布设设备</span>
                  <template v-else>
                    <a-tag v-for="device in room.devices.slice(0, 3)" :key="device.id" color="blue">
                      {{ device.type }}
                    </a-tag>
                    <span v-if="room.devices.length > 3" class="text-weak">+{{ room.devices.length - 3 }}</span>
                  </template>
                </div>
                <div
                  v-if="room.type === '卧室' || room.type === '卫生间'"
                  class="privacy-flag"
                >
                  <LockOutlined />
                  隐私区域
                </div>
              </div>
            </div>

            <div class="plan-legend">
              <span v-for="(color, type) in roomTypeColors" :key="type" class="legend-item">
                <i :style="{ background: color }" />{{ type }}
              </span>
            </div>
          </section>

          <aside class="right-col">
            <div class="side-card card">
              <div class="side-title">房间信息</div>
              <template v-if="selectedRoom">
                <div class="room-form">
                  <div class="form-item">
                    <div class="form-label">房间名称</div>
                    <a-input
                      v-model:value="selectedRoom.name"
                      size="small"
                      :status="roomNameError ? 'error' : undefined"
                      :disabled="!canEdit"
                      @change="markDirty"
                    />
                    <div v-if="roomNameError" class="form-error">{{ roomNameError }}</div>
                  </div>
                  <div class="form-item">
                    <div class="form-label">房间类型</div>
                    <a-select
                      v-model:value="selectedRoom.type"
                      :options="roomTypeOptions.map((item) => ({ value: item, label: item }))"
                      size="small"
                      :disabled="!canEdit"
                      @change="markDirty"
                    />
                  </div>
                  <div class="form-item">
                    <div class="form-label">面积（㎡）</div>
                    <a-input-number
                      v-model:value="selectedRoom.area"
                      :min="1"
                      :max="200"
                      size="small"
                      style="width: 100%"
                      :disabled="!canEdit"
                      @change="markDirty"
                    />
                  </div>
                  <a-button
                    v-if="canEdit"
                    danger
                    block
                    size="small"
                    :disabled="selectedRoom.devices.length > 0"
                    @click="deleteRoom"
                  >
                    <template #icon><DeleteOutlined /></template>
                    删除房间
                  </a-button>
                  <div v-if="selectedRoom.devices.length > 0" class="form-hint">该房间仍有设备，删除前请先解绑。</div>
                </div>

                <a-alert
                  v-if="selectedRoomPrivate"
                  type="warning"
                  show-icon
                  class="mt-12"
                  message="隐私区域：禁止安装摄像头"
                  description="卧室与卫生间建议使用毫米波雷达，不产生图像，可检测跌倒、呼吸与在床状态。"
                />
              </template>
              <a-empty v-else description="请选择房间" />
            </div>

            <div class="side-card card">
              <div class="side-head">
                <div class="side-title">设备位置</div>
                <a-button v-if="canEdit" type="link" size="small" @click="addingDevice = !addingDevice">
                  <template #icon><PlusOutlined /></template>
                  添加设备
                </a-button>
              </div>

              <template v-if="selectedRoom">
                <div v-if="addingDevice" class="device-form">
                  <a-select
                    v-model:value="deviceForm.type"
                    :options="deviceTypeOptions.map((item) => ({ value: item, label: item }))"
                    size="small"
                  />
                  <a-input v-model:value="deviceForm.note" size="small" placeholder="安装说明，如 床头墙面" />
                  <div class="device-form-actions">
                    <a-button size="small" @click="addingDevice = false">取消</a-button>
                    <a-button size="small" type="primary" @click="addDevice">确认添加</a-button>
                  </div>
                </div>

                <div v-if="selectedRoom.devices.length === 0" class="device-empty">
                  <WarningOutlined />
                  <span>该房间尚未布设设备</span>
                </div>
                <div v-for="device in selectedRoom.devices" :key="device.id" class="device-item">
                  <div class="device-main">
                    <div class="device-name">
                      {{ device.type }}
                      <a-tag :color="device.status === '在线' ? 'green' : 'default'">{{ device.status }}</a-tag>
                    </div>
                    <div class="device-note">{{ device.note }}</div>
                  </div>
                  <a-button
                    v-if="canEdit"
                    type="text"
                    size="small"
                    danger
                    @click="removeDevice(device)"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </div>
              </template>
              <a-empty v-else description="请先选择房间" />
            </div>

            <div class="side-tip">
              <SafetyCertificateOutlined />
              <span>设备台账与在线状态由 M2 设备与感知接入管理，本期为原型模拟。</span>
            </div>
          </aside>
        </div>

        <div class="mock-note">
          <WarningOutlined />
          原型说明：户型图为固定网格布局，拖拽绘制与真实尺寸测量列入 P2；设备数据为模拟数据。
        </div>

        <QrModal
          :open="qrOpen"
          :house="house"
          :elder-names="houseElders.map((item) => item.name)"
          @update:open="qrOpen = $event"
        />
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.breadcrumb a {
  color: var(--elder-primary);
}

.crumb-sep {
  color: var(--elder-text-weak);
}

.state-card {
  padding: 32px;
  margin-top: 16px;
}

.house-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 24px;
  margin-top: 8px;
}

.house-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.house-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--elder-primary-soft);
  color: var(--elder-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.house-title {
  font-size: 19px;
  line-height: 27px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dirty-tag {
  border-radius: 4px;
  font-weight: 400;
}

.house-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--elder-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.house-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.save-highlight {
  box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.16);
}

.house-grid {
  display: grid;
  grid-template-columns: 288px minmax(560px, 1fr) 320px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  padding: 16px 18px 18px;
}

.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.side-title {
  font-size: 15px;
  line-height: 24px;
  font-weight: 600;
}

.section-desc {
  margin-top: 2px;
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.info-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  line-height: 26px;
  color: var(--elder-text-secondary);
}

.info-line strong {
  color: var(--elder-text);
  font-weight: 500;
  text-align: right;
}

.entry-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  line-height: 26px;
}

.entry-key {
  color: var(--elder-text-secondary);
  flex-shrink: 0;
}

.entry-note {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-item {
  display: grid;
  grid-template-columns: 74px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.elder-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--elder-divider);
  cursor: pointer;
}

.elder-line:last-child {
  border-bottom: none;
}

.elder-line-main {
  flex: 1;
  min-width: 0;
}

.elder-line-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.elder-line-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 16px;
}

.plan-card {
  padding: 16px 18px 18px;
  min-height: 600px;
}

.plan-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.plan-actions {
  display: flex;
  gap: 8px;
}

.plan-canvas {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 1.2fr 1.2fr 0.8fr;
  grid-auto-rows: 110px;
  gap: 10px;
  min-height: 520px;
  padding: 12px;
  background: #f7f9fc;
  border: 1px dashed #c9d6e8;
  border-radius: 8px;
}

.room-card {
  position: relative;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--elder-border);
  border-top: 3px solid var(--elder-primary);
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.16s ease;
  overflow: hidden;
}

.room-card:hover {
  box-shadow: 0 4px 12px rgba(15, 42, 71, 0.1);
}

.room-card.selected {
  border-color: var(--elder-primary);
  box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.16);
}

.room-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.room-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-type {
  font-size: 10px;
  flex-shrink: 0;
  background: #f4f7fc;
  border-radius: 3px;
  padding: 0 4px;
}

.room-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
}

.room-devices {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 6px;
}

.room-devices :deep(.ant-tag) {
  margin-inline-end: 2px;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.privacy-flag {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 10px;
  color: var(--elder-text-weak);
  display: flex;
  align-items: center;
  gap: 3px;
}

.plan-empty {
  min-height: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f7f9fc;
  border: 1px dashed #c9d6e8;
  border-radius: 8px;
}

.plan-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--elder-text-weak);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.legend-item i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}

.room-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.form-error {
  font-size: 11px;
  color: var(--elder-danger);
}

.form-hint {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.mt-12 {
  margin-top: 12px;
}

.device-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px dashed var(--elder-border);
  border-radius: 6px;
  margin-bottom: 8px;
}

.device-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.device-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 0;
  font-size: 12px;
  color: var(--elder-text-weak);
}

.device-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--elder-divider);
}

.device-item:last-child {
  border-bottom: none;
}

.device-main {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.device-note {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.side-tip {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #eef3fb;
  color: var(--elder-text-secondary);
  font-size: 11px;
  line-height: 18px;
}

.mock-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 11px;
  color: var(--elder-text-weak);
}
</style>
