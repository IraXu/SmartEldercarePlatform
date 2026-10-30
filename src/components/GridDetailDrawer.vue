<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CloseOutlined, EnvironmentOutlined } from '@antdv-next/icons'
import type { GridStat } from '@/mock/analytics'

const props = defineProps<{ open: boolean; grid: GridStat | null }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()
const router = useRouter()

const riskColor = computed(() => {
  if (!props.grid) return 'default'
  if (props.grid.riskScore >= 70) return 'red'
  if (props.grid.riskScore >= 40) return 'orange'
  return 'green'
})

const riskPercent = computed(() => {
  if (!props.grid) return 0
  return Math.round((props.grid.highRisk / Math.max(1, props.grid.elders)) * 100)
})

function close() {
  emit('update:open', false)
}

function goElder() {
  if (!props.grid) return
  router.push({
    path: '/elders',
    query: { community: props.grid.community, grid: props.grid.name },
  })
  close()
}

function goDevice() {
  if (!props.grid) return
  router.push({ path: '/devices', query: { community: props.grid.community } })
  close()
}

function goEvent() {
  if (!props.grid) return
  router.push({ path: '/events', query: { community: props.grid.community } })
  close()
}
</script>

<template>
  <a-drawer
    :open="open"
    :size="520"
    placement="right"
    :closable="false"
    :styles="{ body: { padding: '0' } }"
  >
    <div v-if="grid" class="grid-drawer">
      <div class="drawer-header">
        <div>
          <div class="drawer-title">{{ grid.community }} · {{ grid.name }}</div>
          <div class="drawer-subtitle">
            <EnvironmentOutlined />
            {{ grid.district }} · {{ grid.street }} · {{ grid.community }}
          </div>
        </div>
        <a-button type="text" shape="circle" @click="close">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <div class="drawer-body">
        <div class="risk-hero">
          <div class="risk-score" :class="`risk-${riskColor}`">{{ grid.riskScore }}</div>
          <div class="risk-main">
            <div class="risk-title">
              <a-tag :color="riskColor">{{ grid.riskLevel }}</a-tag>
              <span class="text-weak">风险分 0–100</span>
            </div>
            <div class="risk-desc">
              高风险老人占比 {{ riskPercent }}%，L3 未闭环 {{ grid.l3Pending }} 起，设备在线率 {{ grid.onlineRate }}%。
            </div>
          </div>
        </div>

        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">服务老人</div>
            <div class="metric-value">{{ grid.elders }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">高风险老人</div>
            <div class="metric-value danger">{{ grid.highRisk }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">设备在线</div>
            <div class="metric-value">{{ grid.onlineDevices }}/{{ grid.devices }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">L3 未闭环</div>
            <div class="metric-value" :class="{ danger: grid.l3Pending > 0 }">{{ grid.l3Pending }}</div>
          </div>
        </div>

        <div class="section-title">风险结构</div>
        <div class="risk-bars">
          <div class="risk-bar-row">
            <span class="bar-label">高风险</span>
            <div class="bar-track"><div class="bar high" :style="{ width: `${(grid.highRisk / grid.elders) * 100}%` }"></div></div>
            <span class="bar-value">{{ grid.highRisk }}</span>
          </div>
          <div class="risk-bar-row">
            <span class="bar-label">中风险</span>
            <div class="bar-track"><div class="bar medium" :style="{ width: `${(grid.mediumRisk / grid.elders) * 100}%` }"></div></div>
            <span class="bar-value">{{ grid.mediumRisk }}</span>
          </div>
          <div class="risk-bar-row">
            <span class="bar-label">低风险</span>
            <div class="bar-track"><div class="bar low" :style="{ width: `${(grid.lowRisk / grid.elders) * 100}%` }"></div></div>
            <span class="bar-value">{{ grid.lowRisk }}</span>
          </div>
        </div>

        <div class="section-title">楼栋排行</div>
        <table class="building-table">
          <thead>
            <tr>
              <th>楼栋</th>
              <th>老人</th>
              <th>高风险</th>
              <th>离线设备</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in grid.buildings" :key="item.name">
              <td>{{ item.name }}</td>
              <td>{{ item.elders }}</td>
              <td :class="{ danger: item.highRisk > 0 }">{{ item.highRisk }}</td>
              <td :class="{ danger: item.offlineDevices > 0 }">{{ item.offlineDevices }}</td>
            </tr>
          </tbody>
        </table>

        <div class="drawer-note">
          网格风险分 = 高风险老人占比 × 60 + L3 未闭环 × 20 +（1 - 设备在线率）× 20。当前为网格示意图，不代表真实地理边界。
        </div>
      </div>

      <div class="drawer-footer">
        <a-button @click="goElder">查看老人</a-button>
        <a-button @click="goDevice">查看设备</a-button>
        <a-button type="primary" @click="goEvent">查看事件</a-button>
      </div>
    </div>

    <div v-else class="empty-wrap">
      <a-empty description="该网格暂无老人或设备数据" />
      <a-button @click="close">关闭</a-button>
    </div>
  </a-drawer>
</template>

<style scoped>
.grid-drawer {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  height: 72px;
  padding: 0 20px 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--elder-divider);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 17px;
  line-height: 25px;
  font-weight: 600;
}

.drawer-subtitle {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 11px;
  line-height: 17px;
  color: var(--elder-text-weak);
}

.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 20px 24px 24px;
}

.risk-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f7f9fc;
  border: 1px solid var(--elder-border);
  border-radius: 10px;
}

.risk-score {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  flex-shrink: 0;
}

.risk-score.risk-red {
  background: #fdecec;
  color: #d64545;
}

.risk-score.risk-orange {
  background: #fff4e5;
  color: #d97706;
}

.risk-score.risk-green {
  background: #eaf7ef;
  color: #2e9e5b;
}

.risk-main {
  min-width: 0;
}

.risk-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.risk-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-secondary);
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.metric-card {
  padding: 12px 14px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
}

.metric-label {
  font-size: 11px;
  color: var(--elder-text-secondary);
  line-height: 17px;
}

.metric-value {
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
}

.danger {
  color: var(--elder-danger);
}

.section-title {
  margin: 20px 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.risk-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  width: 52px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.bar-track {
  flex: 1;
  height: 10px;
  background: #f1f4f8;
  border-radius: 5px;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 5px;
}

.bar.high {
  background: #d64545;
}

.bar.medium {
  background: #d97706;
}

.bar.low {
  background: #2e9e5b;
}

.bar-value {
  width: 32px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
}

.building-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.building-table th,
.building-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--elder-divider);
}

.building-table th {
  background: #f7f9fc;
  color: var(--elder-text-secondary);
  font-weight: 500;
}

.drawer-note {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--elder-divider);
  font-size: 11px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.drawer-footer {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--elder-divider);
  flex-shrink: 0;
}

.empty-wrap {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
</style>
