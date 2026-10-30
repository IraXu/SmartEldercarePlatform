<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { LockOutlined, MobileOutlined } from '@antdv-next/icons'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { login } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const REMEMBER_KEY = 'se_remember_phone'

const formRef = ref()
const loading = ref(false)
const errorText = ref('')
const errorTone = ref<'error' | 'warning'>('error')

const rememberedPhone = window.localStorage.getItem(REMEMBER_KEY) ?? ''
const form = reactive({
  phone: String(route.query.phone ?? rememberedPhone),
  password: '',
  remember: Boolean(rememberedPhone),
})

const rules: Record<string, unknown[]> = {
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, max: 20, message: '请输入 6–20 位密码' },
  ],
}

const demoAccounts = [
  { name: '周建国', role: '平台运营', phone: '13800000000', desc: '开通项目、生成注册链接' },
  { name: '吕建成', role: '项目管理员', phone: '13800000001', desc: '安宁区项目组织、账号与业务' },
  { name: '王敏', role: '项目成员', phone: '13800000002', desc: '执行档案、设备、事件与任务' },
  { name: '李静', role: '民政查看', phone: '13800000003', desc: '本项目只读，敏感信息脱敏' },
  { name: '顾敏', role: '医保审核员', phone: '13800000004', desc: '机审、复核、结算与稽核' },
  { name: '李强', role: '项目管理员', phone: '13800000005', desc: '南京市六合区项目管理' },
  { name: '王芳', role: '待审核账号', phone: '13900000001', desc: '演示账号待审核时的登录拦截' },
]

onMounted(() => {
  if (route.query.expired === '1') {
    errorText.value = '登录已过期，请重新登录'
    errorTone.value = 'warning'
  }
})

function fillDemo(account: (typeof demoAccounts)[number]) {
  form.phone = account.phone
  form.password = '123456'
  errorText.value = ''
}

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  loading.value = true
  errorText.value = ''
  await new Promise((resolve) => window.setTimeout(resolve, 360))
  const result = login(form.phone, form.password)
  loading.value = false
  if (!result.ok) {
    errorText.value = result.message
    errorTone.value = result.message.includes('待审核') ? 'warning' : 'error'
    return
  }
  if (form.remember) {
    window.localStorage.setItem(REMEMBER_KEY, form.phone)
  } else {
    window.localStorage.removeItem(REMEMBER_KEY)
  }
  if (result.user?.mustChangePassword) {
    message.info('首次登录请修改初始密码')
    router.replace('/change-password?force=1')
    return
  }
  message.success('登录成功')
  const redirect = String(route.query.redirect ?? '')
  router.replace(redirect.startsWith('/') ? redirect : '/elders')
}
</script>

<template>
  <AuthLayout>
    <h2 class="card-title">登录智慧养老服务平台</h2>
    <p class="card-subtitle">请使用已开通的账号登录；社区与网格账号需先提交申请</p>

    <a-alert
      v-if="errorText"
      class="login-alert"
      :type="errorTone"
      :message="errorText"
      show-icon
      closable
      @close="errorText = ''"
    />

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="handleLogin">
      <a-form-item label="手机号" name="phone">
        <a-input v-model:value="form.phone" size="large" placeholder="请输入 11 位手机号" allow-clear>
          <template #prefix><MobileOutlined class="field-icon" /></template>
        </a-input>
      </a-form-item>

      <a-form-item label="密码" name="password">
        <a-input-password
          v-model:value="form.password"
          size="large"
          placeholder="请输入 6–20 位密码"
          @press-enter="handleLogin"
        >
          <template #prefix><LockOutlined class="field-icon" /></template>
        </a-input-password>
      </a-form-item>

      <div class="form-extra">
        <a-checkbox v-model:checked="form.remember">记住账号</a-checkbox>
        <a-button type="link" size="small" class="link-btn" @click="router.push('/forgot-password')">
          忘记密码
        </a-button>
      </div>

      <a-button type="primary" html-type="submit" size="large" block :loading="loading" class="submit-btn">
        {{ loading ? '登录中…' : '登录' }}
      </a-button>
    </a-form>

    <div class="register-line">
      还没有账号？
      <a-button type="link" size="small" class="link-btn" @click="router.push('/register')">
        注册账号
      </a-button>
    </div>

    <div class="demo-block">
      <div class="demo-head">
        <span class="demo-title">演示账号</span>
        <span class="demo-note">点击填充，密码统一 123456</span>
      </div>
      <div class="demo-grid">
        <button
          v-for="account in demoAccounts"
          :key="account.phone"
          type="button"
          class="demo-card"
          :class="{ 'demo-card-pending': account.role === '待审核账号' }"
          @click="fillDemo(account)"
        >
          <div class="demo-name">
            {{ account.name }}
            <span class="demo-role">{{ account.role }}</span>
          </div>
          <div class="demo-phone">{{ account.phone }}</div>
          <div class="demo-desc">{{ account.desc }}</div>
        </button>
      </div>
    </div>
  </AuthLayout>
</template>

<style scoped>
.card-title {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  color: var(--elder-text);
}

.card-subtitle {
  margin: 8px 0 20px;
  font-size: 13px;
  line-height: 20px;
  color: var(--elder-text-secondary);
}

.login-alert {
  margin-bottom: 16px;
}

.field-icon {
  color: var(--elder-text-weak);
}

.form-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 18px;
}

.link-btn {
  padding: 0;
  height: auto;
  font-size: 13px;
}

.submit-btn {
  height: 44px;
  font-size: 15px;
}

.register-line {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.demo-block {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px dashed var(--elder-border);
}

.demo-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.demo-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--elder-text);
}

.demo-note {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.demo-card {
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  background: #f9fbfd;
  cursor: pointer;
  transition: all 0.18s ease;
}

.demo-card:hover {
  border-color: var(--elder-primary);
  background: #f2f7ff;
}

.demo-card-pending {
  background: #fffaf1;
  border-color: #f2dfc0;
}

.demo-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--elder-text);
}

.demo-role {
  font-size: 10px;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--elder-primary-soft);
  color: var(--elder-primary);
  font-weight: 400;
  white-space: nowrap;
}

.demo-card-pending .demo-role {
  background: var(--elder-warning-soft);
  color: var(--elder-warning);
}

.demo-phone {
  margin-top: 2px;
  font-size: 12px;
  color: var(--elder-text-secondary);
  letter-spacing: 0.3px;
}

.demo-desc {
  margin-top: 2px;
  font-size: 11px;
  line-height: 16px;
  color: var(--elder-text-weak);
}
</style>
