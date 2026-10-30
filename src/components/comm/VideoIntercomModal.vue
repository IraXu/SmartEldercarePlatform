<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { App } from 'antdv-next'
import {
  AudioOutlined,
  CameraOutlined,
  CloseOutlined,
  DownOutlined,
  LeftOutlined,
  RightOutlined,
  UpOutlined,
  VideoCameraOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@antdv-next/icons'
import { devices } from '@/mock/devices'

const props = defineProps<{
  open: boolean
  elderId?: string
  elderName?: string
  address?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const { message } = App.useApp()

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

/** 同住址下的摄像头 */
const cameras = computed(() =>
  devices.filter((item) => item.type === '摄像头' && item.enabled && item.elderId === props.elderId),
)

const selectedId = ref('')
const talking = ref(false)
const recording = ref(false)
const recordSeconds = ref(0)
const captures = ref<{ id: string; time: string; type: string }[]>([])

let timer: number | undefined

const current = computed(() => cameras.value.find((item) => item.id === selectedId.value) ?? null)
const cameraOptions = computed(() =>
  cameras.value.map((item) => ({
    value: item.id,
    label: `${item.roomName || item.name} · ${item.status}`,
  })),
)
const offline = computed(() => !current.value || current.value.status !== '在线')

const recordText = computed(() => {
  const minutes = String(Math.floor(recordSeconds.value / 60)).padStart(2, '0')
  const seconds = String(recordSeconds.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

function nowTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
    now.getSeconds(),
  ).padStart(2, '0')}`
}

function stopRecord() {
  recording.value = false
  if (timer) {
    window.clearInterval(timer)
    timer = undefined
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      stopRecord()
      talking.value = false
      return
    }
    selectedId.value = cameras.value[0]?.id ?? ''
    captures.value = []
    recordSeconds.value = 0
    talking.value = false
    stopRecord()
  },
  { immediate: true },
)

onBeforeUnmount(stopRecord)

function ptz(direction: string) {
  if (offline.value) return
  message.success(`云台${direction}（原型模拟）`)
}

function snapshot() {
  if (offline.value) {
    message.error('摄像头不在线，无法抓拍')
    return
  }
  captures.value.unshift({ id: `CP-${Date.now()}`, time: nowTime(), type: '截图' })
  message.success('已抓拍并写入证据留痕')
}

function toggleRecord() {
  if (offline.value) {
    message.error('摄像头不在线，无法录像')
    return
  }
  if (recording.value) {
    captures.value.unshift({ id: `CP-${Date.now()}`, time: nowTime(), type: `录像 ${recordText.value}` })
    stopRecord()
    message.success('录像已保存并写入证据留痕')
    return
  }
  recordSeconds.value = 0
  recording.value = true
  timer = window.setInterval(() => {
    recordSeconds.value += 1
  }, 1000)
  message.success('开始录像')
}

function toggleTalk() {
  if (offline.value) {
    message.error('摄像头不在线，无法对讲')
    return
  }
  talking.value = !talking.value
  message.success(talking.value ? '已开启对讲，声音仅传输至该摄像头' : '已结束对讲')
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="视频与对讲"
    width="min(1180px, 94vw)"
    :footer="null"
    destroy-on-hidden
  >
    <div v-if="cameras.length === 0" class="empty-box">
      <a-empty description="该住址下没有可用的摄像头">
        <div class="empty-hint">
          社区未在该地址安装摄像头，无法接入画面。请改用「拨打电话」与老人或家属确认，并在事件处置中记录联系方式。
        </div>
      </a-empty>
    </div>

    <div v-else class="intercom-body">
      <div class="stage-col">
        <div class="stage-bar">
          <a-select
            v-model:value="selectedId"
            class="camera-select"
            :options="cameraOptions"
            placeholder="选择该住址下的摄像头"
          />
          <a-tag :color="offline ? 'default' : 'green'">{{ offline ? '离线' : '在线' }}</a-tag>
          <a-tag color="blue">1080P</a-tag>
          <span class="stage-addr">{{ address || current?.address }}</span>
        </div>

        <div class="stage" :class="{ 'stage-offline': offline }">
          <div class="stage-grid" />
          <div class="stage-center">
            <VideoCameraOutlined class="stage-icon" />
            <div class="stage-title">
              {{ offline ? '摄像头离线，暂无画面' : `${current?.roomName || current?.name} 实时画面（原型模拟）` }}
            </div>
            <div class="stage-desc">
              {{ offline ? '请检查设备电源与网络，或改用电话联系' : '画面仅用于确认老人安全，不保存声音' }}
            </div>
          </div>
          <div class="stage-meta">
            <span>{{ elderName || '老人' }}</span>
            <span>{{ current?.id }}</span>
          </div>
          <div v-if="recording" class="stage-rec"><span class="rec-dot" /> 录像中 {{ recordText }}</div>
          <div v-if="talking" class="stage-talk">
            <AudioOutlined /> 对讲中，声音仅传输至该摄像头
          </div>
        </div>

        <div class="action-bar">
          <a-button size="large" :disabled="offline" @click="snapshot">
            <template #icon><CameraOutlined /></template>
            截图
          </a-button>
          <a-button size="large" :danger="recording" :disabled="offline" @click="toggleRecord">
            <template #icon><VideoCameraOutlined /></template>
            {{ recording ? `停止录像 ${recordText}` : '录像' }}
          </a-button>
          <a-button
            size="large"
            :type="talking ? 'primary' : 'default'"
            :disabled="offline"
            @click="toggleTalk"
          >
            <template #icon><AudioOutlined /></template>
            {{ talking ? '结束对讲' : '对讲' }}
          </a-button>
          <span class="action-hint">云台与变焦在右侧「云台控制」中操作</span>
        </div>
      </div>

      <aside class="side-col">
        <div class="side-block">
          <div class="side-title">云台控制</div>
          <div class="dpad">
            <span />
            <a-tooltip title="向上">
              <a-button class="dpad-btn" :disabled="offline" @click="ptz('向上转动')">
                <UpOutlined />
              </a-button>
            </a-tooltip>
            <span />
            <a-tooltip title="向左">
              <a-button class="dpad-btn" :disabled="offline" @click="ptz('向左转动')">
                <LeftOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="画面复位">
              <a-button class="dpad-btn dpad-center" :disabled="offline" @click="ptz('复位')">
                复位
              </a-button>
            </a-tooltip>
            <a-tooltip title="向右">
              <a-button class="dpad-btn" :disabled="offline" @click="ptz('向右转动')">
                <RightOutlined />
              </a-button>
            </a-tooltip>
            <span />
            <a-tooltip title="向下">
              <a-button class="dpad-btn" :disabled="offline" @click="ptz('向下转动')">
                <DownOutlined />
              </a-button>
            </a-tooltip>
            <span />
          </div>
          <div class="zoom-row">
            <span class="zoom-label">变焦</span>
            <a-button class="zoom-btn" :disabled="offline" @click="ptz('放大')">
              <template #icon><ZoomInOutlined /></template>
              放大
            </a-button>
            <a-button class="zoom-btn" :disabled="offline" @click="ptz('缩小')">
              <template #icon><ZoomOutOutlined /></template>
              缩小
            </a-button>
          </div>
        </div>

        <div class="side-block">
          <div class="side-title">本次抓拍与录像</div>
          <div v-if="captures.length === 0" class="side-empty">暂无记录，截图或录像后写入证据留痕</div>
          <div v-else class="capture-list">
            <div v-for="item in captures" :key="item.id" class="capture-item">
              <span class="capture-type">{{ item.type }}</span>
              <span class="capture-time">{{ item.time }}</span>
            </div>
          </div>
        </div>

        <div class="side-note">
          进入本页面会自动写入审计日志；截图与录像随事件归档，调阅需走审批。对讲不录音，不对外提供。
        </div>
      </aside>
    </div>

    <div class="modal-foot">
      <a-button @click="visible = false">
        <template #icon><CloseOutlined /></template>
        关闭
      </a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.empty-box {
  padding: 32px 0;
}

.empty-hint {
  max-width: 460px;
  margin: 0 auto;
  font-size: 13px;
  line-height: 22px;
  color: #8a96a8;
}

.intercom-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
}

.stage-col {
  min-width: 0;
}

.stage-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.camera-select {
  width: 280px;
}

.stage-addr {
  margin-left: auto;
  font-size: 12px;
  color: #8a96a8;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.stage {
  position: relative;
  height: clamp(360px, 56vh, 560px);
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(160deg, #0f1c2e 0%, #16324a 60%, #0d2233 100%);
}

.stage-offline {
  background: linear-gradient(160deg, #1a1f27 0%, #2a313b 100%);
}

.stage-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
}

.stage-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.86);
}

.stage-icon {
  font-size: 44px;
  color: rgba(120, 200, 255, 0.7);
}

.stage-title {
  font-size: 16px;
  font-weight: 600;
}

.stage-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.stage-meta {
  position: absolute;
  left: 14px;
  top: 12px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
}

.stage-rec {
  position: absolute;
  right: 14px;
  top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ffd7d7;
}

.rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4d4f;
}

.stage-talk {
  position: absolute;
  left: 14px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 14px;
  font-size: 12px;
  color: #d7f5e3;
  background: rgba(46, 158, 91, 0.3);
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.action-hint {
  margin-left: auto;
  font-size: 12px;
  color: #8a96a8;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #f7f9fc;
}

.side-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.dpad {
  display: grid;
  grid-template-columns: repeat(3, 46px);
  grid-auto-rows: 46px;
  gap: 8px;
  justify-content: center;
}

.dpad-btn {
  width: 46px;
  height: 46px;
  padding: 0;
  font-size: 14px;
}

.dpad-center {
  font-size: 12px;
}

.zoom-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-label {
  font-size: 12px;
  color: #8a96a8;
}

.zoom-btn {
  flex: 1;
}

.side-empty {
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.capture-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow: auto;
}

.capture-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
}

.capture-type {
  color: #1f2937;
}

.capture-time {
  color: #8a96a8;
}

.side-note {
  padding-top: 10px;
  border-top: 1px dashed #e3e8ef;
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 1080px) {
  .intercom-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage {
    height: 360px;
  }
}
</style>
