<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CarryOutOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import RiskTag from '@/components/RiskTag.vue'
import EventDisposeDrawer from '@/components/EventDisposeDrawer.vue'
import PhoneGuideModal from '@/components/comm/PhoneGuideModal.vue'
import VideoIntercomModal from '@/components/comm/VideoIntercomModal.vue'
import { demoState, isCivil } from '@/composables/useAppState'
import {
  getEventById,
  getEventSla,
  levelColor,
  statusColor,
  type EventLevel,
  type EventStatus,
  type SafetyEvent,
} from '@/mock/events'
import { getDeviceById } from '@/mock/devices'
import { getElderById } from '@/mock/elders'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const loading = ref(true)
const activeTab = ref('overview')
const disposeOpen = ref(false)
const phoneOpen = ref(false)
const intercomOpen = ref(false)

onMounted(() => {
  window.setTimeout(() => {
    loading.value = false
  }, 420)
})

const event = computed(() => getEventById(String(route.params.id)))
const elder = computed(() => (event.value ? getElderById(event.value.elderId) : null))
const device = computed(() => (event.value ? getDeviceById(event.value.deviceId) : null))
const isClosed = computed(
  () => Boolean(event.value && ['已关闭', '已归档', '误报'].includes(event.value.status)),
)
const readonly = computed(() => isCivil.value || isClosed.value)
const levelLabel: Record<EventLevel, string> = { L3: 'L3 紧急', L2: 'L2 预警', L1: 'L1 关注' }

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

const sla = computed(() => (event.value ? getEventSla(event.value) : null))

function goBack() {
  router.push('/events')
}

function goTaskDispatch() {
  if (!event.value) return
  router.push({
    path: '/tasks',
    query: {
      dispatch: '1',
      event: event.value.id,
      elder: event.value.elderId,
      type: '应急到场',
    },
  })
}

function goElder() {
  if (event.value) router.push(`/elders/${event.value.elderId}`)
}

function goDevice() {
  if (event.value) router.push(`/devices/${event.value.deviceId}`)
}

function goHouse() {
  if (event.value) router.push(`/elders/${event.value.elderId}/house`)
}

function callElder() {
  if (!event.value) return
  phoneOpen.value = true
}

const contactName = computed(() => {
  if (!event.value) return ''
  const contact = event.value.snapshot.contacts[0]
  return contact ? `${contact.name}（${contact.relation}）` : event.value.snapshot.elderName
})

const contactPhone = computed(() => event.value?.snapshot.contacts[0]?.phone ?? '')

function openIntercom() {
  if (!event.value) return
  if (device.value && device.value.type !== '摄像头') {
    message.info('该住址的摄像头才能视频与对讲，请改用电话联系')
    phoneOpen.value = true
    return
  }
  intercomOpen.value = true
}

function reNotify() {
  if (!event.value) return
  event.value.notifications.push({
    id: `NT-RETRY-${Date.now()}`,
    time: '11:17',
    target: '社区值班',
    channel: '电话',
    result: '已接听',
    note: '手动重新发起通知',
  })
  message.success('已重新发起通知，通知链路已追加记录')
}

function notificationColor(result: string) {
  if (result.includes('未接听') || result.includes('失败')) return 'red'
  if (result.includes('待') || result.includes('M4')) return 'gray'
  if (result.includes('已')) return 'green'
  return 'blue'
}

function signalColor(confidence: number) {
  if (confidence >= 90) return 'red'
  if (confidence >= 80) return 'orange'
  return 'blue'
}

function handleUpdated() {
  disposeOpen.value = false
}
</script>

<template>
  <AdminLayout>
    <div class="page detail-page">
      <div class="breadcrumb">
        <a-button type="text" size="small" class="back-btn" @click="goBack">
          <template #icon><ArrowLeftOutlined /></template>
          事件中心
        </a-button>
        <span class="crumb-sep">/</span>
        <span>{{ event ? `${event.level} ${event.title}` : '事件详情' }}</span>
      </div>

      <div v-if="demoState === 'forbidden'" class="state-card card">
        <a-result status="403" title="当前账号无权查看该事件" sub-title="请返回事件中心切换辖区，或联系项目管理员申请数据权限。">
          <template #extra>
            <a-button type="primary" @click="goBack">返回事件中心</a-button>
          </template>
        </a-result>
      </div>

      <div v-else-if="loading" class="state-card card">
        <a-skeleton active avatar :paragraph="{ rows: 8 }" />
      </div>

      <div v-else-if="!event" class="state-card card">
        <a-result status="404" title="事件不存在或已归档" sub-title="请返回事件中心重新选择。">
          <template #extra>
            <a-button type="primary" @click="goBack">返回事件中心</a-button>
          </template>
        </a-result>
      </div>

      <template v-else>
        <a-alert
          v-if="isCivil"
          type="info"
          show-icon
          class="readonly-alert"
          message="民政只读视角"
          description="当前视角隐藏处置、联系电话、进门方式与设备隐私信息，仅保留事件概况与统计字段。"
        />
        <a-alert
          v-if="event.status === '误报'"
          type="warning"
          show-icon
          class="readonly-alert"
          message="该事件已标记为误报"
          :description="`误报原因：${event.misreportReason}${event.misreportNote ? ` · ${event.misreportNote}` : ''}。事件已退出响应与闭环统计，历史记录仍保留。`"
        />
        <a-alert
          v-else-if="isClosed"
          type="info"
          show-icon
          class="readonly-alert"
          message="事件已归档，不可再处置"
          description="信号、通知、处置与事发快照已完整保留，可在事件台账中复盘。"
        />

        <div class="hero card">
          <div class="hero-left">
            <div class="hero-level" :class="`level-${event.level.toLowerCase()}`">{{ event.level }}</div>
            <div class="hero-main">
              <div class="hero-title">
                {{ event.title }}
                <a-tag :color="statusColor[event.status as EventStatus]">{{ event.status }}</a-tag>
                <a-tag :color="levelColor[event.level]">{{ levelLabel[event.level] }}</a-tag>
              </div>
              <div class="hero-meta">
                {{ event.id }} · 发生于 {{ event.occurredAt }} · 已持续 {{ event.duration }}
              </div>
              <div class="hero-meta-line">
                <EnvironmentOutlined />
                {{ event.elderName }} · {{ event.address }} {{ event.roomName }}
                <span class="meta-sep">·</span>
                处置人 {{ event.assignee }}
              </div>
            </div>
          </div>

          <div v-if="!readonly" class="hero-actions">
            <a-button v-if="event.level === 'L3'" @click="goTaskDispatch">
              <template #icon><CarryOutOutlined /></template>
              转派物业
            </a-button>
            <a-button @click="reNotify">
              <template #icon><ReloadOutlined /></template>
              重新通知
            </a-button>
            <a-button type="primary" danger @click="disposeOpen = true">处置事件</a-button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-main card">
            <a-tabs v-model:activeKey="activeTab" class="detail-tabs">
              <a-tab-pane key="overview" tab="事件概况">
                <div class="overview-grid">
                  <div class="overview-card">
                    <div class="section-head">
                      <span>信号证据</span>
                      <span class="text-weak">{{ event.signals.length }} 个信号</span>
                    </div>
                    <a-timeline class="signal-timeline">
                      <a-timeline-item
                        v-for="signal in event.signals"
                        :key="signal.id"
                        :color="signalColor(signal.confidence)"
                      >
                        <div class="signal-head">
                          <strong>{{ signal.type }}</strong>
                          <a-tag :color="signalColor(signal.confidence)">{{ signal.confidence }}%</a-tag>
                        </div>
                        <div class="signal-device">{{ signal.deviceName }} · {{ signal.roomName }} · {{ signal.time }}</div>
                        <div class="signal-value">{{ signal.value }}</div>
                      </a-timeline-item>
                    </a-timeline>
                  </div>

                  <div class="overview-card">
                    <div class="section-head">融合结论</div>
                    <div class="fusion-level">
                      <span class="fusion-dot" :class="`level-${event.level.toLowerCase()}`"></span>
                      <span class="fusion-label">{{ levelLabel[event.level] }}</span>
                      <span class="fusion-confidence">置信度 {{ event.confidence }}%</span>
                    </div>
                    <p class="fusion-summary">{{ event.fusionSummary }}</p>
                    <div class="fusion-basis">
                      <div v-for="item in event.fusionBasis" :key="item" class="basis-item">{{ item }}</div>
                    </div>
                    <div class="fusion-note">分级依据来自 M2 感知规则与多源信号，硬信号可直接判定 L3。</div>
                  </div>
                </div>

                <div class="overview-card mt-16">
                  <div class="section-head">事件概况</div>
                  <a-descriptions bordered :column="2" size="small">
                    <a-descriptions-item label="事件编号">{{ event.id }}</a-descriptions-item>
                    <a-descriptions-item label="发生时间">{{ event.occurredAt }}</a-descriptions-item>
                    <a-descriptions-item label="触发设备">{{ event.deviceName }}</a-descriptions-item>
                    <a-descriptions-item label="安装房间">{{ event.roomName }}</a-descriptions-item>
                    <a-descriptions-item label="当前状态">{{ event.status }}</a-descriptions-item>
                    <a-descriptions-item label="处置人">{{ event.assignee }}</a-descriptions-item>
                    <a-descriptions-item label="响应时限">{{ event.level === 'L1' ? '不强制响应' : `${event.responseDueMinutes} 分钟` }}</a-descriptions-item>
                    <a-descriptions-item label="到场时限">{{ event.level === 'L3' ? `${event.arriveDueMinutes} 分钟` : '按需到场' }}</a-descriptions-item>
                  </a-descriptions>
                </div>
              </a-tab-pane>

              <a-tab-pane key="notifications" tab="通知链路">
                <div class="section-head">
                  <span>通知与升级记录</span>
                  <a-button v-if="!readonly" type="link" size="small" @click="reNotify">重新通知</a-button>
                </div>
                <a-timeline class="notification-timeline">
                  <a-timeline-item
                    v-for="item in event.notifications"
                    :key="item.id"
                    :color="notificationColor(item.result)"
                  >
                    <div class="notification-head">
                      <strong>{{ item.target }}</strong>
                      <a-tag :color="notificationColor(item.result)">{{ item.result }}</a-tag>
                    </div>
                    <div class="notification-meta">{{ item.time }} · {{ item.channel }}</div>
                    <div class="notification-note">{{ item.note }}</div>
                  </a-timeline-item>
                </a-timeline>
                <a-alert
                  type="info"
                  show-icon
                  message="通知链路说明"
                  description="L3 按 0/2/5/10/30 分钟升级；物业协同在 M4 开放，120/119 由人工研判后拨打。"
                />
              </a-tab-pane>

              <a-tab-pane key="dispositions" tab="处置记录">
                <a-empty v-if="event.dispositions.length === 0" description="尚未处置，事件正在等待社区确认" />
                <a-timeline v-else class="disposition-timeline">
                  <a-timeline-item v-for="item in event.dispositions" :key="item.id" color="blue">
                    <div class="disposition-head">
                      <strong>{{ item.action }}</strong>
                      <span class="text-weak">{{ item.time }}</span>
                    </div>
                    <div class="disposition-meta">
                      操作人：{{ item.operator }}<span v-if="item.method"> · 方式：{{ item.method }}</span>
                    </div>
                    <div class="disposition-note">{{ item.note }}</div>
                  </a-timeline-item>
                </a-timeline>
              </a-tab-pane>

              <a-tab-pane key="snapshot" tab="事发快照">
                <a-alert
                  type="info"
                  show-icon
                  class="mb-16"
                  message="事发时档案与设备快照"
                  description="快照在事件创建时固化，不随档案变更；用于还原现场与纠纷复盘。"
                />
                <a-descriptions bordered :column="2" size="middle">
                  <a-descriptions-item label="老人">{{ event.snapshot.elderName }} · {{ event.snapshot.age }}岁</a-descriptions-item>
                  <a-descriptions-item label="风险等级">{{ event.snapshot.riskLevel }}</a-descriptions-item>
                  <a-descriptions-item label="事发地址">{{ event.snapshot.address }} {{ event.snapshot.roomName }}</a-descriptions-item>
                  <a-descriptions-item label="进门方式">
                    {{ isCivil ? '民政视角不可见' : event.snapshot.entryMethod }}
                  </a-descriptions-item>
                  <a-descriptions-item label="风险标签" :span="2">
                    <a-tag v-for="tag in event.snapshot.riskTags" :key="tag" color="blue">{{ tag }}</a-tag>
                    <span v-if="event.snapshot.riskTags.length === 0" class="text-weak">无</span>
                  </a-descriptions-item>
                  <a-descriptions-item label="紧急联系人" :span="2">
                    <div v-for="contact in event.snapshot.contacts" :key="contact.phone" class="contact-line">
                      {{ contact.name }}（{{ contact.relation }}）· {{ isCivil ? '联系电话不可见' : contact.phone }}
                    </div>
                  </a-descriptions-item>
                  <a-descriptions-item label="事发时设备" :span="2">
                    <a-tag v-for="item in event.snapshot.devices" :key="item" class="device-tag">{{ item }}</a-tag>
                  </a-descriptions-item>
                </a-descriptions>
              </a-tab-pane>
            </a-tabs>
          </div>

          <aside class="detail-side">
            <div class="side-card card">
              <div class="side-title">
                响应时限
                <a-tag :color="event.level === 'L3' ? 'red' : event.level === 'L2' ? 'orange' : 'default'">
                  {{ levelLabel[event.level] }}
                </a-tag>
              </div>
              <div class="sla-big" :class="{ overdue: sla?.overdue }">{{ sla?.text }}</div>
              <div class="status-row">
                <span class="status-key">响应时限</span>
                <span>{{ event.level === 'L1' ? '不强制' : `${event.responseDueMinutes} 分钟` }}</span>
              </div>
              <div class="status-row">
                <span class="status-key">到场时限</span>
                <span>{{ event.level === 'L3' ? `${event.arriveDueMinutes} 分钟` : '按需' }}</span>
              </div>
              <div class="status-row">
                <span class="status-key">当前状态</span>
                <span>{{ event.status }}</span>
              </div>
              <div class="side-note">L3 5 分钟内响应、30 分钟内到场；超时自动标红并进入督办。</div>
            </div>

            <div class="side-card card">
              <div class="side-title">老人信息</div>
              <div class="elder-row" @click="goElder">
                <a-avatar :size="38" style="background: #eaf1fe; color: #1f6feb; font-weight: 600">
                  {{ event.snapshot.elderName.slice(0, 1) }}
                </a-avatar>
                <div class="elder-main">
                  <div class="elder-name">
                    {{ isCivil ? `${event.snapshot.elderName.slice(0, 1)}**` : event.snapshot.elderName }}
                    <a-tag :color="event.snapshot.riskLevel === '高风险' ? 'red' : event.snapshot.riskLevel === '中风险' ? 'orange' : 'green'">
                      {{ event.snapshot.riskLevel }}
                    </a-tag>
                  </div>
                  <div class="elder-meta">{{ event.snapshot.age }}岁 · {{ event.address }}</div>
                  <div class="elder-meta">
                    {{ isCivil ? '联系电话不可见' : event.snapshot.contacts[0]?.phone }}
                  </div>
                </div>
              </div>
              <div class="elder-tags">
                <RiskTag v-for="tag in event.snapshot.riskTags.slice(0, 3)" :key="tag" :tag="tag" />
              </div>
              <div class="elder-actions">
                <a-button size="small" @click="goElder">查看档案</a-button>
                <a-button v-if="!isCivil" size="small" @click="callElder">
                  <template #icon><PhoneOutlined /></template>
                  拨打电话
                </a-button>
              </div>
            </div>

            <div class="side-card card">
              <div class="side-title">触发设备</div>
              <div class="device-row" @click="goDevice">
                <div class="device-name">{{ event.deviceName }}</div>
                <div class="device-meta">{{ event.roomName }} · 置信度 {{ event.confidence }}%</div>
                <div class="device-meta">{{ event.signals.length }} 个信号参与融合</div>
              </div>
              <a-button size="small" block class="mt-10" @click="goDevice">查看设备详情</a-button>
            </div>

            <div v-if="!readonly" class="side-card card">
              <div class="side-title">快捷操作</div>
              <a-button block class="quick-btn" @click="callElder">
                <template #icon><PhoneOutlined /></template>
                拨打电话联系
              </a-button>
              <a-button block class="quick-btn" @click="openIntercom">
                <template #icon><VideoCameraOutlined /></template>
                视频与对讲
              </a-button>
              <div class="quick-hint">支持选择该住址下的摄像头查看画面，并可云台、截图、录像与对讲。</div>
              <a-button block class="quick-btn" @click="goHouse">
                <template #icon><ApartmentOutlined /></template>
                查看房屋与进门方式
              </a-button>
            </div>
          </aside>
        </div>
      </template>

      <EventDisposeDrawer
        v-if="event"
        :open="disposeOpen"
        :event="event"
        @update:open="disposeOpen = $event"
        @updated="handleUpdated"
      />

      <PhoneGuideModal
        v-model:open="phoneOpen"
        :name="contactName"
        :phone="contactPhone"
        scene="事件处置"
      />

      <VideoIntercomModal
        v-model:open="intercomOpen"
        :elder-id="event?.elderId"
        :elder-name="event?.snapshot.elderName"
        :address="event?.address"
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
  gap: 6px;
  height: 40px;
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.back-btn {
  padding-left: 0;
  color: var(--elder-primary);
}

.crumb-sep {
  color: var(--elder-text-weak);
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

.hero-level {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 700;
  flex-shrink: 0;
}

.level-l3 {
  background: #fdecec;
  color: #d64545;
}

.level-l2 {
  background: #fff4e5;
  color: #d97706;
}

.level-l1 {
  background: #f1f4f8;
  color: #5b6779;
}

.hero-main {
  min-width: 0;
}

.hero-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 21px;
  line-height: 30px;
  font-weight: 600;
  flex-wrap: wrap;
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

.overview-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 16px;
}

.overview-card {
  padding: 16px 18px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  background: #fff;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  margin-bottom: 12px;
}

.signal-timeline {
  padding-top: 4px;
}

.signal-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.signal-device {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.signal-value {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-secondary);
  line-height: 19px;
}

.fusion-level {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.fusion-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.fusion-dot.level-l3 {
  background: #d64545;
}

.fusion-dot.level-l2 {
  background: #d97706;
}

.fusion-dot.level-l1 {
  background: #5b6779;
}

.fusion-label {
  font-size: 16px;
  font-weight: 700;
}

.fusion-confidence {
  margin-left: auto;
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.fusion-summary {
  margin: 0;
  font-size: 13px;
  line-height: 22px;
  color: var(--elder-text-secondary);
}

.fusion-basis {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.basis-item {
  padding: 6px 10px;
  background: #f7f9fc;
  border-radius: 6px;
  font-size: 12px;
  line-height: 18px;
}

.fusion-note {
  margin-top: 12px;
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.mt-16 {
  margin-top: 16px;
}

.mb-16 {
  margin-bottom: 16px;
}

.notification-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.notification-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.notification-note {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-secondary);
  line-height: 19px;
}

.disposition-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.disposition-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.disposition-note {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-secondary);
  line-height: 19px;
}

.contact-line {
  line-height: 22px;
}

.device-tag {
  margin-bottom: 4px;
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

.sla-big {
  font-size: 26px;
  line-height: 36px;
  font-weight: 700;
  color: var(--elder-primary);
  margin-bottom: 6px;
}

.sla-big.overdue {
  color: var(--elder-danger);
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

.elder-row,
.device-row {
  cursor: pointer;
  padding: 6px 0;
}

.elder-row {
  display: flex;
  align-items: center;
  gap: 10px;
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

.device-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.device-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.mt-10 {
  margin-top: 10px;
}

.quick-btn {
  margin-top: 8px;
  text-align: left;
}

.quick-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}
</style>
