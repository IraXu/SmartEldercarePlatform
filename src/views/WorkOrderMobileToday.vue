<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  SyncOutlined,
} from '@antdv-next/icons'
import { getStaff, todayOrders, type WorkOrderStatus } from '@/composables/useWorkOrders'

const router = useRouter()
const { message } = App.useApp()

const staffName = ref('陈晓')
const staff = computed(() => getStaff(staffName.value))
const orders = computed(() => todayOrders(staffName.value))

const stats = computed(() => ({
  waiting: orders.value.filter((item) => item.status === '待接单' || item.status === '待上门').length,
  serving: orders.value.filter((item) => item.status === '服务中').length,
  signing: orders.value.filter((item) => item.status === '待签认').length,
}))

const statusColors: Record<WorkOrderStatus, string> = {
  待派单: 'default',
  待接单: 'warning',
  待上门: 'processing',
  服务中: 'blue',
  待签认: 'orange',
  待审核: 'purple',
  已完成: 'success',
  已取消: 'default',
  异常: 'error',
}

const todoOrders = computed(() =>
  [...orders.value].sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
)

function openOrder(id: string) {
  router.push(`/m/workorder/${id}`)
}

function notReady() {
  message.info('原型演示固定为服务人员「陈晓」的当日工单')
}
</script>

<template>
  <div class="mobile-page">
    <div class="phone">
      <div class="phone-status">
        <span>9:41</span>
        <span class="phone-status-right">服务人员端 · 原型演示</span>
      </div>

      <div class="mobile-header">
        <a-button type="text" size="small" @click="router.push('/workorders')">
          <template #icon><ArrowLeftOutlined /></template>
        </a-button>
        <div class="mobile-title">
          <div class="mobile-app">今日工单</div>
          <div class="mobile-user">{{ staff?.name }} · {{ staff?.org }}</div>
        </div>
        <a-button type="text" size="small" @click="notReady">
          <template #icon><SyncOutlined /></template>
        </a-button>
      </div>

      <div class="mobile-body">
        <div class="staff-card">
          <div class="staff-top">
            <div class="staff-avatar">{{ staff?.name.slice(0, 1) }}</div>
            <div class="staff-meta">
              <div class="staff-name">
                {{ staff?.name }}
                <span class="staff-title">{{ staff?.title }}</span>
              </div>
              <div class="staff-org">{{ staff?.org }}</div>
            </div>
            <div class="staff-rating">
              <StarFilled />
              <span>{{ staff?.rating }}</span>
            </div>
          </div>
          <div class="staff-qual">
            <span v-for="item in staff?.qualifications" :key="item" class="qual-tag">{{ item }}</span>
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-item">
            <div class="stat-value">{{ stats.waiting }}</div>
            <div class="stat-label">待上门</div>
          </div>
          <div class="stat-item">
            <div class="stat-value blue">{{ stats.serving }}</div>
            <div class="stat-label">服务中</div>
          </div>
          <div class="stat-item">
            <div class="stat-value orange">{{ stats.signing }}</div>
            <div class="stat-label">待签认</div>
          </div>
        </div>

        <div class="day-line">
          <span>2026-10-28 星期三</span>
          <span>共 {{ orders.length }} 单</span>
        </div>

        <div v-if="orders.length === 0" class="empty-block">
          <FileTextOutlined />
          <span>今日暂无工单</span>
        </div>

        <div
          v-for="order in todoOrders"
          :key="order.id"
          class="order-card"
          :class="{ disabled: order.status === '已取消' }"
          @click="openOrder(order.id)"
        >
          <div class="order-head">
            <span class="order-time">{{ order.scheduledStart }}</span>
            <a-tag :color="statusColors[order.status]">{{ order.status }}</a-tag>
          </div>
          <div class="order-elder">
            {{ order.elderName }}
            <span class="order-level">{{ order.level }} · {{ order.duration }} 分钟</span>
          </div>
          <div class="order-address">
            <EnvironmentOutlined />
            <span>{{ order.community }} {{ order.address }}</span>
          </div>
          <div class="order-items">
            <span v-for="item in order.items" :key="item.id" class="item-tag" :class="{ done: item.done }">
              {{ item.name }}
            </span>
          </div>
          <div class="order-foot">
            <span class="order-id">{{ order.id }}</span>
            <span class="order-hint">
              <ClockCircleOutlined />
              {{ order.recorder.online ? '记录仪在线' : '记录仪离线' }}
            </span>
          </div>
        </div>

        <div class="privacy-tip">
          <SafetyCertificateOutlined />
          <span>上门服务全程留痕：签到、录像、拍照与服务小结，仅用于服务核验与长护险结算。</span>
        </div>

        <div class="bottom-space" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  min-height: 100vh;
  padding: 24px;
  background: #e9eef5;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.phone {
  position: relative;
  width: 390px;
  min-height: 844px;
  background: #f3f6fa;
  border: 1px solid #d6dfeb;
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(15, 42, 71, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.phone-status {
  height: 28px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #5b6779;
  background: #fff;
}

.phone-status-right {
  color: #8a96a8;
}

.mobile-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 10px;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
}

.mobile-title {
  flex: 1;
}

.mobile-app {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.mobile-user {
  font-size: 11px;
  color: #8a96a8;
}

.mobile-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.staff-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1f6feb, #13a8a8);
  color: #fff;
}

.staff-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.staff-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.staff-meta {
  flex: 1;
}

.staff-name {
  font-size: 15px;
  font-weight: 600;
}

.staff-title {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 10px;
  font-weight: 400;
}

.staff-org {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.staff-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.staff-qual {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.qual-tag {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 10px;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  padding: 10px 0;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef2f7;
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.stat-value.blue {
  color: #1f6feb;
}

.stat-value.orange {
  color: #d97706;
}

.stat-label {
  margin-top: 2px;
  font-size: 11px;
  color: #8a96a8;
}

.day-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #8a96a8;
}

.order-card {
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef2f7;
  cursor: pointer;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.order-card:hover {
  box-shadow: 0 8px 20px rgba(15, 42, 71, 0.1);
  transform: translateY(-1px);
}

.order-card.disabled {
  opacity: 0.6;
}

.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-time {
  font-size: 15px;
  font-weight: 600;
  color: #1f6feb;
}

.order-elder {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.order-level {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: #8a96a8;
}

.order-address {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  font-size: 11px;
  color: #5b6779;
}

.order-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.item-tag {
  padding: 2px 8px;
  border-radius: 10px;
  background: #f1f5fb;
  font-size: 10px;
  color: #5b6779;
}

.item-tag.done {
  background: #e8f7f1;
  color: #0e9384;
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #eef2f7;
  font-size: 10px;
  color: #8a96a8;
}

.order-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.order-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  font-size: 12px;
  color: #8a96a8;
}

.privacy-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eef2f7;
  font-size: 10px;
  line-height: 17px;
  color: #8a96a8;
}

.bottom-space {
  height: 16px;
}
</style>
