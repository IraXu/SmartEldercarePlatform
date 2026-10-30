<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { ArrowLeftOutlined, BulbOutlined, ExportOutlined, SettingOutlined, WarningOutlined } from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { demoState, isCivil } from '@/composables/useAppState'
import { misreportReasonOptions, safetyEvents, type MisreportReason, type SafetyEvent } from '@/mock/events'

const router = useRouter()
const { message, modal } = App.useApp()
const loading = ref(true)
const timeRange = ref('30d')

onMounted(() => {
  window.setTimeout(() => {
    loading.value = false
  }, 460)
})

const rangeLabel = computed(() => (timeRange.value === '7d' ? '近 7 天' : '近 30 天'))
const rangeDays = computed(() => (timeRange.value === '7d' ? 7 : 30))
/** 演示数据中最近一条误报的时间作为「今天」，避免使用真实系统日期导致筛选全空 */
const demoToday = computed(() => {
  const times = safetyEvents.map((item) => item.occurredAt.slice(0, 10)).sort()
  return times[times.length - 1] ?? ''
})
const rangeStart = computed(() => {
  if (!demoToday.value) return ''
  const date = new Date(`${demoToday.value}T00:00:00`)
  date.setDate(date.getDate() - rangeDays.value + 1)
  return date.toISOString().slice(0, 10)
})

const misreports = computed(() =>
  safetyEvents.filter(
    (item) =>
      item.status === '误报' &&
      (!rangeStart.value || item.occurredAt.slice(0, 10) >= rangeStart.value),
  ),
)
const totalEvents = computed(() =>
  safetyEvents.filter((item) => !rangeStart.value || item.occurredAt.slice(0, 10) >= rangeStart.value),
)
const misreportRate = computed(() =>
  totalEvents.value.length > 0
    ? ((misreports.value.length / totalEvents.value.length) * 100).toFixed(1)
    : '0.0',
)
const affectedHouseholds = computed(() => new Set(misreports.value.map((item) => item.address)).size)

const reasonStats = computed(() => {
  const colors: Record<MisreportReason, string> = {
    设备误报: '#D64545',
    环境干扰: '#D97706',
    老人正常活动: '#1F6FEB',
    重复上报: '#7C5CE0',
    其他: '#5B6779',
  }
  const max = Math.max(1, ...misreportReasonOptions.map((reason) => misreports.value.filter((item) => item.misreportReason === reason).length))
  return misreportReasonOptions.map((reason) => {
    const count = misreports.value.filter((item) => item.misreportReason === reason).length
    return {
      reason,
      count,
      color: colors[reason],
      percent: Math.round((count / max) * 100),
    }
  })
})

const deviceRanking = computed(() => {
  const map = new Map<string, { deviceId: string; deviceName: string; type: string; count: number; lastTime: string; reasons: string[] }>()
  misreports.value.forEach((item) => {
    const current = map.get(item.deviceId)
    if (current) {
      current.count += 1
      current.lastTime = item.occurredAt
      if (item.misreportReason) current.reasons.push(item.misreportReason)
    } else {
      map.set(item.deviceId, {
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        type: item.title,
        count: 1,
        lastTime: item.occurredAt,
        reasons: item.misreportReason ? [item.misreportReason] : [],
      })
    }
  })
  return [...map.values()]
    .map((item) => ({ ...item, suggestion: suggestionFor(item.reasons), toTune: item.count >= 3 }))
    .sort((a, b) => b.count - a.count)
})

const tuneDevices = computed(() => deviceRanking.value.filter((item) => item.toTune))

function suggestionFor(reasons: string[]) {
  if (reasons.includes('环境干扰')) return '调整安装位置或增加遮蔽区，避开油烟、蒸汽与宠物活动区域'
  if (reasons.includes('设备误报')) return '提高触发阈值或增加延迟确认，观察 7 天误报变化'
  if (reasons.includes('老人正常活动')) return '调整生活节律基线与静默时段，减少正常活动打扰'
  if (reasons.includes('重复上报')) return '增加事件去重窗口，合并同一设备短时重复信号'
  return '复核设备状态与感知规则，必要时安排现场检测'
}

const recentMisreports = computed(() => misreports.value.slice(0, 6))

function goEvent(event: SafetyEvent) {
  router.push(`/events/${event.id}`)
}

function goRules(deviceId: string) {
  if (isCivil.value) return
  router.push(`/devices/${deviceId}?tab=rules`)
}

function handleExport() {
  modal.confirm({
    title: '导出误报分析',
    content: '将按当前时间范围导出误报明细与设备统计，操作会记录审计日志。',
    okText: '确认导出',
    cancelText: '取消',
    onOk: () => message.success('导出任务已创建（原型模拟，不生成实际文件）'),
  })
}

const columns = [
  { key: 'device', title: '设备', width: 240 },
  { key: 'type', title: '事件类型', width: 140 },
  { key: 'count', title: '误报次数', width: 110 },
  { key: 'last', title: '最近误报', width: 160 },
  { key: 'suggestion', title: '建议动作', width: 360 },
  { key: 'actions', title: '操作', width: 120 },
]

const recentColumns = [
  { key: 'event', title: '事件', width: 240 },
  { key: 'elder', title: '老人 / 地址', width: 260 },
  { key: 'device', title: '设备', width: 220 },
  { key: 'reason', title: '误报原因', width: 140 },
  { key: 'time', title: '标记时间', width: 160 },
  { key: 'actions', title: '操作', width: 100 },
]
</script>

<template>
  <AdminLayout>
    <div class="page misreport-page">
      <div class="page-header">
        <div class="header-left">
          <a-button type="text" size="small" class="back-btn" @click="router.push('/events')">
            <template #icon><ArrowLeftOutlined /></template>
            返回事件中心
          </a-button>
          <h1 class="page-title">误报分析</h1>
          <p class="page-subtitle">找到误报高发设备与原因，把误报沉淀为规则调优</p>
        </div>
        <div class="page-actions">
          <a-select
            v-model:value="timeRange"
            :options="[
              { value: '7d', label: '近 7 天' },
              { value: '30d', label: '近 30 天' },
            ]"
            class="range-select"
          />
          <a-button @click="handleExport">
            <template #icon><ExportOutlined /></template>
            导出
          </a-button>
        </div>
      </div>

      <a-alert
        v-if="isCivil"
        type="info"
        show-icon
        class="readonly-alert"
        message="民政只读视角"
        description="当前视角仅展示误报统计与脱敏明细，设备规则配置入口已隐藏。"
      />

      <div v-if="demoState === 'forbidden'" class="state-card card">
        <a-result status="403" title="当前账号无权查看误报分析" sub-title="请返回事件中心切换辖区，或联系项目管理员申请数据权限。">
          <template #extra>
            <a-button type="primary" @click="router.push('/events')">返回事件中心</a-button>
          </template>
        </a-result>
      </div>

      <div v-else-if="loading" class="state-card card">
        <a-skeleton active :paragraph="{ rows: 8 }" />
      </div>

      <template v-else>
        <div class="stat-grid">
          <div class="stat-card card">
            <div class="stat-icon red"><WarningOutlined /></div>
            <div>
              <div class="stat-label">误报事件</div>
              <div class="stat-value">{{ misreports.length }}</div>
              <div class="stat-hint">{{ rangeLabel }}</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon orange"><WarningOutlined /></div>
            <div>
              <div class="stat-label">误报率</div>
              <div class="stat-value">{{ misreportRate }}%</div>
              <div class="stat-hint">误报 / 事件总数</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon blue"><WarningOutlined /></div>
            <div>
              <div class="stat-label">影响户数</div>
              <div class="stat-value">{{ affectedHouseholds }}</div>
              <div class="stat-hint">去重后的老人家庭</div>
            </div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon purple"><SettingOutlined /></div>
            <div>
              <div class="stat-label">待调优设备</div>
              <div class="stat-value">{{ tuneDevices.length }}</div>
              <div class="stat-hint">{{ rangeLabel }}误报 ≥ 3 次</div>
            </div>
          </div>
        </div>

        <div class="analysis-grid">
          <div class="analysis-card card">
            <div class="card-title">误报原因分布</div>
            <div v-if="misreports.length === 0" class="empty-block">
              <a-empty :description="`${rangeLabel}暂无有效误报`" />
            </div>
            <div v-else class="reason-list">
              <div v-for="item in reasonStats" :key="item.reason" class="reason-row">
                <div class="reason-label">{{ item.reason }}</div>
                <div class="reason-track">
                  <div class="reason-bar" :style="{ width: `${item.percent}%`, background: item.color }"></div>
                </div>
                <div class="reason-count">{{ item.count }}</div>
              </div>
            </div>
            <div class="card-note">误报率越低，老人与家属对告警的信任越高；建议优先处理环境干扰与设备误报。</div>
          </div>

          <div class="analysis-card card">
            <div class="card-title">设备误报排行</div>
            <div v-if="deviceRanking.length === 0" class="empty-block">
              <a-empty description="暂无需调优的设备" />
            </div>
            <div v-else class="device-list">
              <div v-for="(item, index) in deviceRanking.slice(0, 4)" :key="item.deviceId" class="device-item">
                <div class="rank-index">{{ index + 1 }}</div>
                <div class="rank-main">
                  <div class="rank-name">{{ item.deviceName }}</div>
                  <div class="rank-meta">{{ item.type }} · 最近 {{ item.lastTime }}</div>
                </div>
                <div class="rank-count">{{ item.count }} 次</div>
              </div>
            </div>
          </div>
        </div>

        <div class="suggestion-card card">
          <div class="card-title">
            <BulbOutlined class="title-icon" />
            规则调优建议
          </div>
          <div v-if="tuneDevices.length === 0" class="empty-block small">
            <a-empty description="暂无需调优的设备" />
          </div>
          <div v-else class="suggestion-list">
            <div v-for="item in tuneDevices" :key="item.deviceId" class="suggestion-item">
              <div class="suggestion-main">
                <div class="suggestion-title">{{ item.deviceName }} · {{ rangeLabel }}误报 {{ item.count }} 次</div>
                <div class="suggestion-text">{{ item.suggestion }}</div>
              </div>
              <a-button v-if="!isCivil" size="small" type="primary" ghost @click="goRules(item.deviceId)">
                去调规则
              </a-button>
            </div>
          </div>
        </div>

        <div class="table-card card">
          <div class="table-head">
            <div class="card-title">设备误报明细</div>
            <span class="text-weak">按误报次数排序</span>
          </div>
          <a-table
            :data-source="deviceRanking"
            :columns="columns"
            :row-key="(record: any) => record.deviceId"
            :pagination="false"
            :scroll="{ x: 1100 }"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'device'">
                <div class="table-device">{{ record.deviceName }}</div>
              </template>
              <template v-else-if="column.key === 'type'">
                {{ record.type }}
              </template>
              <template v-else-if="column.key === 'count'">
                <a-tag :color="record.count >= 3 ? 'red' : 'default'">{{ record.count }} 次</a-tag>
              </template>
              <template v-else-if="column.key === 'last'">
                {{ record.lastTime }}
              </template>
              <template v-else-if="column.key === 'suggestion'">
                <span class="suggestion-cell">{{ record.suggestion }}</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button v-if="!isCivil" type="link" size="small" @click="goRules(record.deviceId)">去调规则</a-button>
                <span v-else class="text-weak">只读</span>
              </template>
            </template>
          </a-table>
        </div>

        <div class="table-card card">
          <div class="table-head">
            <div class="card-title">最近误报事件</div>
            <a-button type="link" size="small" @click="router.push('/events')">查看全部事件</a-button>
          </div>
          <a-table
            :data-source="recentMisreports"
            :columns="recentColumns"
            :row-key="(record: SafetyEvent) => record.id"
            :pagination="false"
            :scroll="{ x: 1100 }"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'event'">
                <div class="table-event">{{ record.level }} {{ record.title }}</div>
                <div class="table-sub">{{ record.id }}</div>
              </template>
              <template v-else-if="column.key === 'elder'">
                <div>{{ isCivil ? `${record.elderName.slice(0, 1)}**` : record.elderName }}</div>
                <div class="table-sub">{{ record.address }} {{ record.roomName }}</div>
              </template>
              <template v-else-if="column.key === 'device'">
                {{ record.deviceName }}
              </template>
              <template v-else-if="column.key === 'reason'">
                <a-tag color="orange">{{ record.misreportReason }}</a-tag>
              </template>
              <template v-else-if="column.key === 'time'">
                {{ record.occurredAt }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button type="link" size="small" @click="goEvent(record)">查看</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.misreport-page {
  padding-bottom: 40px;
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.back-btn {
  padding-left: 0;
  margin-bottom: 2px;
  color: var(--elder-primary);
}

.range-select {
  width: 120px;
}

.readonly-alert {
  margin-top: 16px;
  border-radius: 8px;
}

.state-card {
  padding: 32px;
  margin-top: 16px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  padding: 20px;
}

.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-icon.red {
  background: #fdecec;
  color: #d64545;
}

.stat-icon.orange {
  background: #fff4e5;
  color: #d97706;
}

.stat-icon.blue {
  background: #eaf1fe;
  color: #1f6feb;
}

.stat-icon.purple {
  background: #f1ecfd;
  color: #7c5ce0;
}

.stat-label {
  font-size: 12px;
  color: var(--elder-text-secondary);
  line-height: 18px;
}

.stat-value {
  font-size: 26px;
  line-height: 34px;
  font-weight: 600;
}

.stat-hint {
  font-size: 11px;
  line-height: 16px;
  color: var(--elder-text-weak);
}

.analysis-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.analysis-card {
  padding: 18px 20px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
  margin-bottom: 14px;
}

.title-icon {
  color: #d97706;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reason-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reason-label {
  width: 88px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.reason-track {
  flex: 1;
  height: 10px;
  background: #f1f4f8;
  border-radius: 5px;
  overflow: hidden;
}

.reason-bar {
  height: 100%;
  border-radius: 5px;
  min-width: 4px;
}

.reason-count {
  width: 28px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
}

.card-note {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.empty-block {
  padding: 10px 0;
}

.empty-block.small {
  padding: 0;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--elder-divider);
}

.device-item:last-child {
  border-bottom: none;
}

.rank-index {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #f1f4f8;
  color: var(--elder-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.rank-main {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.rank-meta {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.rank-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-danger);
}

.suggestion-card {
  margin-top: 16px;
  padding: 18px 20px;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  background: #fffdf7;
}

.suggestion-main {
  min-width: 0;
}

.suggestion-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
}

.suggestion-text {
  margin-top: 2px;
  font-size: 12px;
  line-height: 19px;
  color: var(--elder-text-secondary);
}

.table-card {
  margin-top: 16px;
  overflow: hidden;
}

.table-head {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--elder-divider);
}

.table-head .card-title {
  margin-bottom: 0;
}

.table-device {
  font-size: 13px;
  font-weight: 500;
}

.table-event {
  font-size: 13px;
  font-weight: 500;
}

.table-sub {
  font-size: 11px;
  color: var(--elder-text-weak);
  line-height: 17px;
}

.suggestion-cell {
  font-size: 12px;
  color: var(--elder-text-secondary);
}
</style>
