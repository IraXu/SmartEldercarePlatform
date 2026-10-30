<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { LockOutlined, MobileOutlined } from '@antdv-next/icons'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { resetPasswordByPhone } from '@/composables/useAuth'
import { useVerifyCode } from '@/composables/useVerifyCode'

const router = useRouter()
const { message } = App.useApp()

const formRef = ref()
const submitting = ref(false)
const errorText = ref('')
const { seconds, start: startCountdown } = useVerifyCode()

const form = reactive({
  phone: '',
  code: '',
  password: '',
  confirm: '',
})

const codeText = computed(() => (seconds.value > 0 ? `${seconds.value}s 后重发` : '获取验证码'))

const rules: Record<string, unknown[]> = {
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
  ],
  code: [{ required: true, message: '请输入验证码' }],
  password: [
    { required: true, message: '请输入新密码' },
    { min: 6, max: 20, message: '请输入 6–20 位密码' },
  ],
  confirm: [
    { required: true, message: '请再次输入新密码' },
    {
      validator: (_rule: unknown, value: string) =>
        value === form.password ? Promise.resolve() : Promise.reject('两次输入的密码不一致'),
    },
  ],
}

function sendCode() {
  if (!/^1\d{10}$/.test(form.phone)) {
    errorText.value = '请输入正确的手机号'
    return
  }
  errorText.value = ''
  startCountdown()
  message.success('验证码已发送，演示码 123456')
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  errorText.value = ''
  if (form.code !== '123456') {
    errorText.value = '验证码错误或已过期'
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  const result = resetPasswordByPhone(form.phone, form.password)
  submitting.value = false
  if (!result.ok) {
    errorText.value = result.message
    return
  }
  message.success('密码已重置，请使用新密码登录')
  router.replace({ path: '/login', query: { phone: form.phone } })
}
</script>

<template>
  <AuthLayout>
    <h2 class="card-title">忘记密码</h2>
    <p class="card-subtitle">验证注册手机号后设置新密码</p>

    <a-alert
      v-if="errorText"
      class="form-alert"
      type="error"
      :message="errorText"
      show-icon
      closable
      @close="errorText = ''"
    />

    <a-alert
      class="form-alert"
      type="info"
      show-icon
      message="原型演示：短信验证码固定为 123456"
    />

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="注册手机号" name="phone">
        <a-input v-model:value="form.phone" placeholder="请输入 11 位手机号" :maxlength="11">
          <template #prefix><MobileOutlined class="field-icon" /></template>
        </a-input>
      </a-form-item>

      <a-form-item label="短信验证码" name="code">
        <div class="code-row">
          <a-input v-model:value="form.code" placeholder="请输入 6 位验证码" :maxlength="6" />
          <a-button :disabled="seconds > 0" @click="sendCode">{{ codeText }}</a-button>
        </div>
      </a-form-item>

      <a-form-item label="新密码" name="password">
        <a-input-password v-model:value="form.password" placeholder="6–20 位新密码">
          <template #prefix><LockOutlined class="field-icon" /></template>
        </a-input-password>
      </a-form-item>

      <a-form-item label="确认新密码" name="confirm">
        <a-input-password v-model:value="form.confirm" placeholder="请再次输入新密码">
          <template #prefix><LockOutlined class="field-icon" /></template>
        </a-input-password>
      </a-form-item>

      <a-button type="primary" size="large" block :loading="submitting" class="submit-btn" @click="handleSubmit">
        {{ submitting ? '重置中…' : '重置密码' }}
      </a-button>

      <div class="back-line">
        <a-button type="link" size="small" @click="router.push('/login')">返回登录</a-button>
      </div>
    </a-form>
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

.form-alert {
  margin-bottom: 12px;
}

.field-icon {
  color: var(--elder-text-weak);
}

.code-row {
  display: flex;
  gap: 10px;
}

.code-row .ant-input {
  flex: 1;
}

.code-row .ant-btn {
  flex-shrink: 0;
  min-width: 108px;
}

.submit-btn {
  height: 44px;
  font-size: 15px;
}

.back-line {
  margin-top: 12px;
  text-align: center;
}
</style>
