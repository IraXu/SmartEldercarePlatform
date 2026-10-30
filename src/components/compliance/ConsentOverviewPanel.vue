<script setup lang="ts">
import { computed } from 'vue'
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  VideoCameraOutlined,
} from '@antdv-next/icons'
import {
  consentTypeDescriptions,
  consentTypeOptions,
  consents,
  pendingAccessCount,
  type ConsentType,
} from '@/composables/useCompliance'

const emit = defineEmits<{
  (event: 'open-records', type?: ConsentType): void
  (event: 'open-access'): void
}>()

const typeIcons: Record<ConsentType, typeof ApartmentOutlined> = {
  设备安装: ApartmentOutlined,
  视频采集: VideoCameraOutlined,
  定位追踪: EnvironmentOutlined,
  记录仪录制: FileProtectOutlined,
}

const principles = [
  { title: '单独同意', desc: '四类采集分别签署，不打包授权' },
  { title: '最小必要', desc: '摄像头不进卧室卫生间，按房间授权' },
  { title: '可撤回', desc: '撤回即时生效，设备停止采集' },
  { title: '全程留痕', desc: '签署、变更、撤回均写审计' },
]

const typeStats = computed(() =>
  consentTypeOptions.map((type) => {
    const list = consents.filter((item) => item.type === type)
    const granted = list.filter((item) => item.status === '已授权').length
    const pending = list.filter((item) => item.status === '待确认').length
    const revoked = list.filter((item) => item.status === '已撤回').length
    const total = list.length
    return {
      type,
      icon: typeIcons[type],
      desc: consentTypeDescriptions[type],
      granted,
      pending,
      revoked,
      total,
      coverage: total === 0 ? 0 : Math.round((granted / total) * 100),
    }
  }),
)

const summary = computed(() => ({
  granted: consents.filter((item) => item.status === '已授权').length,
  pending: consents.filter((item) => item.status === '待确认').length,
  revoked: consents.filter((item) => item.status === '已撤回').length,
  expired: consents.filter((item) => item.status === '已过期').length,
}))

const pendingList = computed(() => consents.filter((item) => item.status === '待确认').slice(0, 5))
</script>

<template>
  <div class="consent-overview">
    <div class="principle-banner">
      <div class="banner-title">
        <SafetyCertificateOutlined />
        <span>隐私授权原则</span>
      </div>
      <div class="principle-list">
        <div v-for="item in principles" :key="item.title" class="principle-item">
          <CheckCircleOutlined class="principle-icon" />
          <div>
            <div class="principle-name">{{ item.title }}</div>
            <div class="principle-desc">{{ item.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-item">
        <span class="summary-value success">{{ summary.granted }}</span>
        <span class="summary-label">已授权</span>
      </div>
      <div class="summary-item">
        <span class="summary-value warning">{{ summary.pending }}</span>
        <span class="summary-label">待确认</span>
      </div>
      <div class="summary-item">
        <span class="summary-value">{{ summary.revoked }}</span>
        <span class="summary-label">已撤回</span>
      </div>
      <div class="summary-item">
        <span class="summary-value muted">{{ summary.expired }}</span>
        <span class="summary-label">已过期</span>
      </div>
      <div class="summary-actions">
        <a-button @click="emit('open-records')">查看全部记录</a-button>
        <a-badge :count="pendingAccessCount" :offset="[-2, 2]">
          <a-button type="primary" ghost @click="emit('open-access')">调阅审批</a-button>
        </a-badge>
      </div>
    </div>

    <div class="type-grid">
      <button
        v-for="item in typeStats"
        :key="item.type"
        type="button"
        class="card type-card"
        @click="emit('open-records', item.type)"
      >
        <div class="type-head">
          <span class="type-icon"><component :is="item.icon" /></span>
          <a-tag color="blue">单独同意</a-tag>
        </div>
        <div class="type-name">{{ item.type }}</div>
        <div class="type-desc">{{ item.desc }}</div>
        <div class="type-progress">
          <a-progress :percent="item.coverage" :show-info="false" :stroke-color="'#0E9384'" size="small" />
          <span class="coverage">{{ item.coverage }}%</span>
        </div>
        <div class="type-foot">
          <span>已授权 <b class="success">{{ item.granted }}</b></span>
          <span>待确认 <b class="warning">{{ item.pending }}</b></span>
          <span>已撤回 <b>{{ item.revoked }}</b></span>
        </div>
      </button>
    </div>

    <div class="card pending-card">
      <div class="card-head">
        <div>
          <h3 class="section-title">待处理授权</h3>
          <p class="section-desc">纸质授权书回传或老人本人确认后，状态将更新为已授权。</p>
        </div>
        <a-tag color="warning">待确认 {{ summary.pending }} 条</a-tag>
      </div>

      <div v-if="pendingList.length === 0" class="pending-empty">
        <CheckCircleOutlined />
        <span>暂无待处理授权</span>
      </div>

      <div v-else class="pending-list">
        <div v-for="item in pendingList" :key="item.id" class="pending-item">
          <div class="pending-main">
            <div class="pending-name">
              {{ item.elderName }}
              <a-tag>{{ item.type }}</a-tag>
            </div>
            <div class="pending-meta">{{ item.community }} {{ item.grid }} · {{ item.signer }}（{{ item.relation }}）</div>
            <div class="pending-scope">{{ item.scope }}</div>
          </div>
          <div class="pending-right">
            <span class="pending-time">签署于 {{ item.signedAt }}</span>
            <a-button type="link" size="small" @click="emit('open-records', item.type)">去处理</a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.consent-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.principle-banner {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 20px;
  border-radius: 10px;
  background: #f0f7ff;
  border: 1px solid #d6e6ff;
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f6feb;
}

.principle-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  flex: 1;
}

.principle-item {
  display: flex;
  gap: 8px;
}

.principle-icon {
  margin-top: 2px;
  color: #0e9384;
}

.principle-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.principle-desc {
  font-size: 11px;
  line-height: 17px;
  color: #5b6779;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 14px 20px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 10px;
  box-shadow: var(--elder-shadow);
}

.summary-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.summary-value {
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
}

.summary-value.success {
  color: #0e9384;
}

.summary-value.warning {
  color: #d97706;
}

.summary-value.muted {
  color: #8a96a8;
}

.summary-label {
  font-size: 12px;
  color: #8a96a8;
}

.summary-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.type-card {
  text-align: left;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.type-card:hover {
  border-color: #b9d2fb;
  box-shadow: 0 8px 20px rgba(15, 42, 71, 0.08);
}

.type-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.type-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #0e9384;
  background: #e6f6f4;
}

.type-name {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.type-desc {
  margin-top: 4px;
  min-height: 54px;
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.type-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.type-progress :deep(.ant-progress) {
  flex: 1;
  margin: 0;
}

.coverage {
  font-size: 12px;
  color: #0e9384;
  font-weight: 600;
}

.type-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #eef2f7;
  font-size: 11px;
  color: #8a96a8;
}

.type-foot b {
  color: #1f2937;
  font-weight: 600;
}

.success {
  color: #0e9384;
}

.warning {
  color: #d97706;
}

.pending-card {
  padding: 18px 20px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.pending-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
  color: #8a96a8;
  font-size: 13px;
}

.pending-list {
  display: flex;
  flex-direction: column;
}

.pending-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px dashed #eef2f7;
}

.pending-item:last-child {
  border-bottom: none;
}

.pending-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.pending-meta {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.pending-scope {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #5b6779;
}

.pending-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.pending-time {
  font-size: 11px;
  color: #8a96a8;
}

@media (max-width: 1400px) {
  .principle-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
