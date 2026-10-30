<script setup lang="ts">
import {
  AlertOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@antdv-next/icons'

const points = [
  { icon: UserOutlined, title: '一人一档', desc: '1286 位老人档案，风险标签与联系人一体' },
  { icon: ApartmentOutlined, title: '设备感知', desc: '202 台设备在线监测，异常信号实时接入' },
  { icon: AlertOutlined, title: '事件闭环', desc: 'L1–L3 分级处置，通知与到场全程留痕' },
  { icon: DashboardOutlined, title: '区域态势', desc: '社区—网格—楼栋穿透，驾驶舱一屏统览' },
]

const safeguards = [
  { icon: SafetyCertificateOutlined, label: '等保三级设计' },
  { icon: LockOutlined, label: '数据脱敏' },
  { icon: CheckCircleOutlined, label: '操作留痕' },
  { icon: UserOutlined, label: '最小授权' },
]
</script>

<template>
  <aside class="brand-panel">
    <div class="brand-head">
      <div class="brand-logo">智</div>
      <div>
        <div class="brand-name">智慧养老服务平台</div>
        <div class="brand-en">SMART ELDERCARE PLATFORM</div>
      </div>
    </div>

    <div class="brand-body">
      <h1 class="brand-heading">让每一次守护，都有数据回应</h1>
      <p class="brand-subheading">
        覆盖老人档案、设备感知、安全事件与区域治理的一体化平台，为社区与民政提供可追溯的居家养老服务底座。
      </p>

      <div class="point-list">
        <div v-for="item in points" :key="item.title" class="point-item">
          <div class="point-icon"><component :is="item.icon" /></div>
          <div class="point-text">
            <div class="point-title">{{ item.title }}</div>
            <div class="point-desc">{{ item.desc }}</div>
          </div>
        </div>
      </div>

      <div class="safeguards">
        <span v-for="item in safeguards" :key="item.label" class="safeguard">
          <component :is="item.icon" />
          {{ item.label }}
        </span>
      </div>
    </div>

    <div class="brand-foot">鹤梦产品部 · v2.0 二期原型 · 数据仅用于评审演示</div>
  </aside>
</template>

<style scoped>
.brand-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 40px;
  padding: 56px 64px;
  color: var(--elder-text);
  background: transparent;
}

.brand-head {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 760px;
}

.brand-logo {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  font-weight: 700;
  background: linear-gradient(135deg, #1f6feb, #13a8a8);
  color: #fff;
  box-shadow: 0 8px 18px rgba(31, 111, 235, 0.22);
}

.brand-name {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: #10233a;
}

.brand-en {
  font-size: 10px;
  line-height: 16px;
  letter-spacing: 2px;
  color: rgba(16, 35, 58, 0.5);
}

.brand-body {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: auto 0;
}

.brand-heading {
  margin: 0;
  font-size: 38px;
  line-height: 52px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #10233a;
}

.brand-subheading {
  margin: 16px 0 0;
  max-width: 540px;
  font-size: 15px;
  line-height: 27px;
  color: #4b5a72;
}

.point-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 40px;
}

.point-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.point-item:hover {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(31, 111, 235, 0.18);
  transform: translateY(-1px);
}

.point-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: var(--elder-primary);
  background: linear-gradient(135deg, rgba(31, 111, 235, 0.14), rgba(19, 168, 168, 0.12));
}

.point-text {
  min-width: 0;
}

.point-title {
  font-size: 15px;
  line-height: 23px;
  font-weight: 600;
  color: #16273c;
}

.point-desc {
  margin-top: 2px;
  font-size: 13px;
  line-height: 21px;
  color: #4d5c72;
  text-wrap: balance;
}

.safeguards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
}

.safeguard {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 112px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
  color: #43536a;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(31, 41, 55, 0.08);
  backdrop-filter: blur(6px);
}

.brand-foot {
  position: relative;
  z-index: 1;
  max-width: 760px;
  font-size: 12px;
  line-height: 20px;
  color: rgba(16, 35, 58, 0.7);
}

@media (max-width: 1280px) {
  .brand-panel {
    padding: 44px 48px;
  }

  .brand-heading {
    font-size: 32px;
    line-height: 44px;
  }

  .point-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .brand-panel {
    display: none;
  }
}
</style>
