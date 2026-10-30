<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import RiskTag from '@/components/RiskTag.vue'
import DeviceFormDrawer from '@/components/DeviceFormDrawer.vue'
import RemoveDeviceModal from '@/components/RemoveDeviceModal.vue'
import DeviceRulesPanel from '@/components/DeviceRulesPanel.vue'
import DevicePrivacyPanel from '@/components/DevicePrivacyPanel.vue'
import PhoneGuideModal from '@/components/comm/PhoneGuideModal.vue'
import VideoIntercomModal from '@/components/comm/VideoIntercomModal.vue'
import { demoState, isCivil } from '@/composables/useAppState'
import { getDeviceById, type Device, type DeviceStatus, type DeviceType } from '@/mock/devices'
import { getElderById, maskPhone } from '@/mock/elders'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const loading = ref(true)
const activeTab = ref('basic')
const formOpen = ref(false)
const removeOpen = ref(false)
const phoneOpen = ref(false)
const intercomOpen = ref(false)

onMounted(() => {
  window.setTimeout(() => {
    loading.value = false
  }, 420)
})

const device = computed(() => getDeviceById(String(route.params.id)))
const elder = computed(() => (device.value ? getElderById(device.value.elderId) : null))
const isRemoved = computed(() => Boolean(device.value && !device.value.enabled))
const readonly = computed(() => isCivil.value || isRemoved.value)

watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab === 'string' && tab !== activeTab.value) activeTab.value = tab
  },
  { immediate: true },
)

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab } })
})

watch(
  isCivil,
  (civil) => {
    if (civil && activeTab.value === 'privacy') activeTab.value = 'basic'
  },
  { immediate: true },
)

const typeMeta: Record<DeviceType, { color: string; bg: string }> = {
  摄像头: { color: '#1F6FEB', bg: '#EAF1FE' },
  烟感: { color: '#D97706', bg: '#FFF4E5' },
  燃气: { color: '#D64545', bg: '#FDECEC' },
  一氧化碳: { color: '#B45309', bg: '#FEF3C7' },
  毫米波雷达: { color: '#7C5CE0', bg: '#F1ECFD' },
  定位器: { color: '#13A8A8', bg: '#E6F7F7' },
}

const statusColor: Record<DeviceStatus, string> = {
  在线: 'green',
  离线: 'orange',
  故障: 'red',
  已拆除: 'default',
}

const lowBattery = computed(
  () => device.value?.battery !== undefined && device.value.battery < 20,
)

function goBack() {
  router.push('/devices')
}

function goElder() {
  if (elder.value) router.push(`/elders/${elder.value.id}`)
}

function goHouse() {
  if (elder.value) router.push(`/elders/${elder.value.id}/house`)
}

function callElder() {
  if (!elder.value) return
  phoneOpen.value = true
}

function testReport() {
  if (!device.value || isRemoved.value) return
  device.value.status = '在线'
  device.value.lastReport = '刚刚'
  device.value.lastReportAt = '2026-10-27 11:00'
  device.value.changes.unshift({
    id: `DC-TEST-${Date.now()}`,
    time: '2026-10-27 11:00',
    operator: '吕建成',
    action: '状态测试',
    detail: '执行测试上报，设备恢复在线',
  })
  message.success('设备上报正常，已更新为在线')
}

function handleRemoved() {
  removeOpen.value = false
  router.push('/devices')
}
</script>

<template>
  <AdminLayout>
    <div class="page detail-page">
      <div class="breadcrumb">
        <a @click="goBack">设备与感知</a>
        <span class="crumb-sep">/</span>
        <span>{{ device?.name ?? '设备详情' }}</span>
        <a-button type="text" size="small" class="refresh-btn" @click="testReport" :disabled="readonly">
          <template #icon><ReloadOutlined /></template>
          测试上报
        </a-button>
      </div>

      <div v-if="demoState === 'forbidden'" class="state-card card">
        <a-result status="403" title="当前账号无权查看该设备" sub-title="请返回列表切换辖区，或联系项目管理员申请数据权限。">
          <template #extra>
            <a-button type="primary" @click="goBack">返回设备列表</a-button>
          </template>
        </a-result>
      </div>

      <div v-else-if="loading" class="state-card card">
        <a-skeleton active avatar :paragraph="{ rows: 8 }" />
      </div>

      <div v-else-if="!device" class="state-card card">
        <a-result status="404" title="设备不存在或已拆除" sub-title="请返回设备列表重新选择。">
          <template #extra>
            <a-button type="primary" @click="goBack">返回设备列表</a-button>
          </template>
        </a-result>
      </div>

      <template v-else-if="device">
        <a-alert
          v-if="isCivil"
          type="info"
          show-icon
          class="readonly-alert"
          message="民政只读视角"
          description="当前视角隐藏编辑、拆除、感知规则保存与隐私配置；视频与定位信息不可见。"
        />
        <a-alert
          v-if="isRemoved"
          type="warning"
          show-icon
          class="readonly-alert"
          message="设备已拆除，历史记录保留"
          description="设备不再计入在线率与覆盖率，不可再次启用；如需重新使用，请新建设备并绑定。"
        />

        <div class="hero card">
          <div class="hero-left">
            <div
              class="device-icon"
              :style="{
                background: typeMeta[device.type].bg,
                color: typeMeta[device.type].color,
              }"
            >
              {{ device.type.slice(0, 1) }}
            </div>
            <div class="hero-main">
              <div class="hero-name">
                {{ device.name }}
                <a-tag :color="statusColor[device.status]">{{ device.status }}</a-tag>
                <a-tag v-if="lowBattery" color="red">低电 {{ device.battery }}%</a-tag>
                <a-tag color="blue" class="type-tag">{{ device.type }}</a-tag>
              </div>
              <div class="hero-meta">
                {{ device.sn }} · {{ device.brand }} {{ device.model }} · {{ device.protocol }}
              </div>
              <div class="hero-meta-line">
                <EnvironmentOutlined />
                {{ device.address }} {{ device.roomName }}
                <span class="meta-sep">·</span>
                绑定老人 {{ device.elderName }}
              </div>
            </div>
          </div>

          <div v-if="!readonly" class="hero-actions">
            <a-button type="primary" @click="formOpen = true">
              <template #icon><EditOutlined /></template>
              编辑设备
            </a-button>
            <a-button danger @click="removeOpen = true">
              <template #icon><DeleteOutlined /></template>
              拆除设备
            </a-button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-main card">
            <a-tabs v-model:activeKey="activeTab" class="detail-tabs">
              <a-tab-pane key="basic" tab="基本信息">
                <a-descriptions bordered :column="2" size="middle">
                  <a-descriptions-item label="设备编号">{{ device.sn }}</a-descriptions-item>
                  <a-descriptions-item label="设备类型">{{ device.type }}</a-descriptions-item>
                  <a-descriptions-item label="品牌型号">{{ device.brand }} {{ device.model }}</a-descriptions-item>
                  <a-descriptions-item label="通信协议">{{ device.protocol }}</a-descriptions-item>
                  <a-descriptions-item label="启用状态">{{ device.enabled ? '启用' : '已拆除' }}</a-descriptions-item>
                  <a-descriptions-item label="在线状态">{{ device.status }}</a-descriptions-item>
                  <a-descriptions-item label="信号强度">{{ device.signal }} dBm</a-descriptions-item>
                  <a-descriptions-item label="电量">
                    {{ device.battery !== undefined ? `${device.battery}%` : '有线供电' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="最近上报">{{ device.lastReport }}</a-descriptions-item>
                  <a-descriptions-item label="上报时间">{{ device.lastReportAt }}</a-descriptions-item>
                  <a-descriptions-item label="创建时间">{{ device.createdAt }}</a-descriptions-item>
                  <a-descriptions-item label="绑定老人">{{ device.elderName }}</a-descriptions-item>
                </a-descriptions>
              </a-tab-pane>

              <a-tab-pane key="install" tab="安装位置">
                <a-descriptions bordered :column="2" size="middle" class="mb-16">
                  <a-descriptions-item label="所属社区">{{ device.address }}</a-descriptions-item>
                  <a-descriptions-item label="安装房间">{{ device.roomName }}（{{ device.roomType }}）</a-descriptions-item>
                  <a-descriptions-item label="安装说明">{{ device.installNote }}</a-descriptions-item>
                  <a-descriptions-item label="覆盖范围">{{ device.coverage }}</a-descriptions-item>
                  <a-descriptions-item label="绑定老人">{{ device.elderName }}</a-descriptions-item>
                  <a-descriptions-item label="设备状态">{{ device.status }}</a-descriptions-item>
                </a-descriptions>
                <div class="install-actions">
                  <a-button @click="goElder">查看老人档案</a-button>
                  <a-button @click="goHouse">
                    <template #icon><ApartmentOutlined /></template>
                    查看房屋与房间
                  </a-button>
                </div>
                <a-alert
                  type="info"
                  show-icon
                  class="mt-16"
                  message="安装位置与 M1 一房一图共用"
                  description="设备绑定的房屋与房间来自老人档案；房间类型决定摄像头隐私限制与雷达部署建议。"
                />
              </a-tab-pane>

              <a-tab-pane key="rules" tab="感知规则">
                <DeviceRulesPanel :device="device" :readonly="readonly" />
              </a-tab-pane>

              <a-tab-pane v-if="!isCivil" key="privacy" tab="隐私配置">
                <DevicePrivacyPanel :device="device" :readonly="readonly" />
              </a-tab-pane>

              <a-tab-pane key="changes" tab="变更记录">
                <a-timeline class="change-timeline">
                  <a-timeline-item v-for="change in device.changes" :key="change.id" color="blue">
                    <div class="change-head">
                      <strong>{{ change.action }}</strong>
                      <span class="text-weak">{{ change.time }}</span>
                    </div>
                    <div class="change-body">{{ change.detail }}</div>
                    <div class="change-meta">操作人：{{ change.operator }}</div>
                  </a-timeline-item>
                </a-timeline>
              </a-tab-pane>
            </a-tabs>
          </div>

          <aside class="detail-side">
            <div class="side-card card">
              <div class="side-title">
                设备状态
                <a-tag :color="statusColor[device.status]">{{ device.status }}</a-tag>
              </div>
              <div class="status-row">
                <span class="status-key">最近上报</span>
                <span>{{ device.lastReport }}</span>
              </div>
              <div class="status-row">
                <span class="status-key">上报时间</span>
                <span>{{ device.lastReportAt }}</span>
              </div>
              <div class="status-row">
                <span class="status-key">信号强度</span>
                <span>{{ device.signal }} dBm</span>
              </div>
              <div class="status-row">
                <span class="status-key">电量</span>
                <span :class="{ 'text-danger': lowBattery }">
                  {{ device.battery !== undefined ? `${device.battery}%` : '有线供电' }}
                </span>
              </div>
              <div class="side-note">状态每 60 秒自动刷新；离线判定为超过 2 小时无上报。</div>
            </div>

            <div class="side-card card">
              <div class="side-title">绑定老人</div>
              <template v-if="elder">
                <div class="elder-row" @click="goElder">
                  <a-avatar :size="38" style="background: #eaf1fe; color: #1f6feb; font-weight: 600">
                    {{ elder.name.slice(0, 1) }}
                  </a-avatar>
                  <div class="elder-main">
                    <div class="elder-name">
                      {{ isCivil ? elder.name.slice(0, 1) + '**' : elder.name }}
                      <a-tag :color="elder.riskLevel === '高风险' ? 'red' : elder.riskLevel === '中风险' ? 'orange' : 'green'">
                        {{ elder.riskLevel }}
                      </a-tag>
                    </div>
                    <div class="elder-meta">{{ elder.gender }} · {{ elder.age }}岁 · {{ elder.community }}</div>
                    <div class="elder-meta">{{ isCivil ? maskPhone(elder.phone) : elder.phone }}</div>
                  </div>
                </div>
                <div class="elder-tags">
                  <RiskTag v-for="tag in elder.riskTags.slice(0, 3)" :key="tag" :tag="tag" />
                </div>
                <div class="elder-actions">
                  <a-button size="small" @click="goElder">查看档案</a-button>
                  <a-button size="small" @click="callElder">
                    <template #icon><PhoneOutlined /></template>
                    拨打电话
                  </a-button>
                </div>
              </template>
              <div v-else class="text-weak">未绑定老人</div>
            </div>

            <div v-if="!readonly" class="side-card card">
              <div class="side-title">快捷操作</div>
              <a-button v-if="device.type === '摄像头'" block class="quick-btn" @click="intercomOpen = true">
                <template #icon><VideoCameraOutlined /></template>
                视频与对讲
              </a-button>
              <a-button block class="quick-btn" @click="testReport">
                <template #icon><ThunderboltOutlined /></template>
                测试上报
              </a-button>
              <a-button block class="quick-btn" @click="goHouse">
                <template #icon><ApartmentOutlined /></template>
                查看房屋与房间
              </a-button>
              <a-button block class="quick-btn" @click="router.push(`/events?deviceId=${device.id}`)">
                <template #icon><ThunderboltOutlined /></template>
                查看相关事件
              </a-button>
              <a-button block class="quick-btn" @click="formOpen = true">
                <template #icon><EditOutlined /></template>
                编辑设备信息
              </a-button>
            </div>
          </aside>
        </div>
      </template>

      <DeviceFormDrawer
        v-if="device"
        :open="formOpen"
        :device="device"
        @update:open="formOpen = $event"
        @saved="message.success('设备已保存')"
      />
      <RemoveDeviceModal
        v-if="device"
        :open="removeOpen"
        :device="device"
        @update:open="removeOpen = $event"
        @removed="handleRemoved"
      />

      <PhoneGuideModal
        v-model:open="phoneOpen"
        :name="elder?.name ?? '老人'"
        :phone="elder?.phone ?? ''"
        scene="设备与感知"
      />

      <VideoIntercomModal
        v-model:open="intercomOpen"
        :elder-id="device?.elderId"
        :elder-name="elder?.name"
        :address="device?.address"
      />
    </div>
  </AdminLayout>
</template>

<style scoped>
.detail-page {
  padding-bottom: 40px;
}

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

.refresh-btn {
  margin-left: auto;
  color: var(--elder-text-secondary);
}

.state-card {
  padding: 32px;
  margin-top: 16px;
}

.readonly-alert {
  margin-top: 12px;
  border-radius: 8px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px;
  margin-top: 12px;
}

.hero-left {
  display: flex;
  gap: 16px;
  min-width: 0;
}

.device-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  flex-shrink: 0;
}

.hero-main {
  min-width: 0;
}

.hero-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 21px;
  line-height: 30px;
  font-weight: 600;
  flex-wrap: wrap;
}

.type-tag {
  border-radius: 4px;
}

.hero-meta {
  margin-top: 4px;
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-secondary);
}

.hero-meta-line {
  margin-top: 6px;
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-weak);
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-sep {
  margin: 0 4px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.detail-main {
  padding: 8px 24px 24px;
  min-height: 520px;
}

.detail-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.detail-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  padding: 16px 20px 18px;
}

.side-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  line-height: 24px;
  font-weight: 600;
  margin-bottom: 10px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  line-height: 26px;
}

.status-key {
  color: var(--elder-text-secondary);
}

.side-note {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.elder-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 0;
}

.elder-main {
  min-width: 0;
}

.elder-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.elder-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.elder-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 6px;
}

.elder-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.quick-btn {
  margin-top: 8px;
  text-align: left;
}

.install-actions {
  display: flex;
  gap: 10px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mt-16 {
  margin-top: 16px;
}

.change-timeline {
  padding-top: 8px;
}

.change-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.change-body {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.change-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
}
</style>
