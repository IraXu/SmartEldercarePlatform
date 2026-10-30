<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
} from '@antdv-next/icons'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { platformUsers, type UserStatus } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const refreshing = ref(false)

const applicationNo = computed(() => String(route.query.no ?? ''))
const record = computed(
  () => platformUsers.find((item) => item.applicationNo === applicationNo.value) ?? null,
)

const status = computed<UserStatus | ''>(() => record.value?.status ?? '')
const missing = computed(() => !record.value)

const projectName = computed(() => String(route.query.project ?? record.value?.org ?? '-'))
const role = computed(() => record.value?.roleLabel ?? String(route.query.role ?? '项目管理员'))

const stateView = computed(() => {
  if (status.value === '正常') {
    return {
      tone: 'success' as const,
      icon: CheckCircleOutlined,
      title: '注册成功，你已成为项目管理员',
      desc: '现在可以登录维护该项目的组织节点、成员账号与业务数据。',
    }
  }
  if (status.value === '停用') {
    return {
      tone: 'error' as const,
      icon: CloseCircleOutlined,
      title: '账号已停用',
      desc: '请联系平台运营方核实账号状态后再登录。',
    }
  }
  return {
    tone: 'warning' as const,
    icon: ClockCircleOutlined,
    title: '注册信息待确认',
    desc: '未找到账号开通记录，请联系平台运营方。',
  }
})

const stepCurrent = computed(() => (status.value === '正常' ? 2 : 1))
const stepStatus = computed(() => (status.value === '停用' ? 'error' : 'process'))
const stepItems = [
  { title: '填写信息', content: '负责人实名注册' },
  { title: '注册成功', content: '自动成为项目管理员' },
  { title: '登录维护', content: '配置节点与成员' },
]

async function refreshStatus() {
  refreshing.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 400))
  refreshing.value = false
  message.info('账号状态已是最新')
}

function goLogin() {
  router.push({ path: '/login', query: record.value ? { phone: record.value.phone } : {} })
}

function contactAdmin() {
  const phoneNumber = '400-800-1234'
  navigator.clipboard?.writeText(phoneNumber).catch(() => undefined)
  message.success(`已复制管理员联系电话 ${phoneNumber}`)
}
</script>

<template>
  <AuthLayout :card-width="520">
    <template v-if="missing">
      <div class="state-icon state-warning"><CloseCircleOutlined /></div>
      <h2 class="state-title">申请信息缺失，请重新注册</h2>
      <p class="state-desc">未找到对应的申请记录，可能链接已失效。</p>
      <div class="result-actions">
        <a-button type="primary" @click="router.push('/register')">重新注册</a-button>
        <a-button @click="router.push('/login')">返回登录</a-button>
      </div>
    </template>

    <template v-else>
      <div class="state-icon" :class="`state-${stateView.tone}`">
        <component :is="stateView.icon" />
      </div>
      <h2 class="state-title">{{ stateView.title }}</h2>
      <p class="state-desc">{{ stateView.desc }}</p>

      <a-steps
        class="result-steps"
        :current="stepCurrent"
        :status="stepStatus"
        :items="stepItems"
        size="small"
      />

      <div class="result-info">
        <div class="info-row">
          <span class="info-label">注册编号</span>
          <span class="info-value mono">{{ applicationNo }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">所属项目</span>
          <span class="info-value">{{ projectName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">账号角色</span>
          <span class="info-value">{{ role }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">当前状态</span>
          <span class="info-value">
            <a-tag :color="status === '正常' ? 'success' : status === '停用' ? 'error' : 'warning'">
              {{ status === '正常' ? '已开通' : status || '待确认' }}
            </a-tag>
          </span>
        </div>
      </div>

      <div class="result-actions">
        <a-button v-if="status !== '正常'" :loading="refreshing" @click="refreshStatus">
          <template #icon><ReloadOutlined /></template>
          刷新状态
        </a-button>
        <a-button :disabled="status !== '正常'" type="primary" @click="goLogin">去登录</a-button>
        <a-button @click="contactAdmin">
          <template #icon><CopyOutlined /></template>
          联系平台运营
        </a-button>
      </div>

      <div class="result-foot">
        <CustomerServiceOutlined />
        <span>如需为其他区县开通项目，请联系平台运营方 400-800-1234。</span>
      </div>
    </template>
  </AuthLayout>
</template>

<style scoped>
.state-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.state-warning {
  color: var(--elder-warning);
  background: var(--elder-warning-soft);
}

.state-success {
  color: var(--elder-success);
  background: var(--elder-success-soft);
}

.state-error {
  color: var(--elder-danger);
  background: var(--elder-danger-soft);
}

.state-title {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
  color: var(--elder-text);
  text-align: center;
}

.state-desc {
  margin: 8px auto 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 22px;
  color: var(--elder-text-secondary);
  text-align: center;
}

.result-steps {
  margin: 24px 0 4px;
}

.result-info {
  margin-top: 16px;
  padding: 4px 16px;
  border-radius: 10px;
  background: #f9fbfd;
  border: 1px solid var(--elder-divider);
  text-align: left;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--elder-divider);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--elder-text-weak);
}

.info-value {
  color: var(--elder-text);
  font-weight: 500;
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.4px;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
  flex-wrap: wrap;
}

.result-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--elder-border);
  font-size: 12px;
  color: var(--elder-text-weak);
  text-align: center;
}
</style>
