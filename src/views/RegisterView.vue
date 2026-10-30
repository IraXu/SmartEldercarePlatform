<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ClockCircleOutlined,
  LockOutlined,
  MobileOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { register } from '@/composables/useAuth'
import { resolveRegistrationCode } from '@/composables/useOrg'
import { useVerifyCode } from '@/composables/useVerifyCode'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const formRef = ref()
const submitting = ref(false)
const errorText = ref('')
const { seconds, start: startCountdown } = useVerifyCode()

const form = reactive({
  name: '',
  phone: '',
  code: '',
  password: '',
  confirm: '',
  registrationCode: String(route.query.code ?? ''),
  agree: false,
})

const projectMatch = reactive({
  checked: false,
  message: '',
  projectId: '',
  projectName: '',
  region: '',
})
const codeError = ref('')

const codeOk = computed(() => projectMatch.checked && Boolean(projectMatch.projectId))

const stepItems = [
  { title: '填写信息', content: '负责人实名注册' },
  { title: '注册成功', content: '自动成为项目管理员' },
  { title: '登录维护', content: '配置节点与成员' },
]

const codeText = computed(() => (seconds.value > 0 ? `${seconds.value}s 后重发` : '获取验证码'))

const rules: Record<string, unknown[]> = {
  name: [
    { required: true, message: '请输入真实姓名' },
    { min: 2, max: 20, message: '姓名需 2–20 个字符' },
  ],
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
  ],
  code: [
    { required: true, message: '请输入验证码' },
    { len: 6, message: '请输入 6 位验证码' },
  ],
  password: [
    { required: true, message: '请设置密码' },
    { min: 6, max: 20, message: '请输入 6–20 位密码' },
  ],
  confirm: [
    { required: true, message: '请再次输入密码' },
    {
      validator: (_rule: unknown, value: string) =>
        value === form.password ? Promise.resolve() : Promise.reject('两次输入的密码不一致'),
    },
  ],
  registrationCode: [{ required: true, message: '请输入项目注册码' }],
}

watch(
  () => form.registrationCode,
  () => {
    projectMatch.checked = false
    projectMatch.projectId = ''
    projectMatch.projectName = ''
    projectMatch.region = ''
    projectMatch.message = ''
    codeError.value = ''
  },
)

function checkCode(silent = false) {
  const result = resolveRegistrationCode(form.registrationCode)
  projectMatch.checked = result.ok
  projectMatch.message = result.message
  projectMatch.projectId = result.project?.id ?? ''
  projectMatch.projectName = result.project?.name ?? ''
  projectMatch.region = result.project ? `${result.project.city} · ${result.project.district}` : ''
  codeError.value = result.ok ? '' : result.message
  if (!silent) {
    if (result.ok) message.success(result.message)
    else message.warning(result.message)
  }
}

if (form.registrationCode) checkCode(true)

function sendCode() {
  if (!/^1\d{10}$/.test(form.phone)) {
    errorText.value = '请先输入正确的手机号'
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
    errorText.value = '请检查标红的字段'
    return
  }
  if (!codeOk.value) {
    errorText.value = '请先校验项目注册码'
    return
  }
  if (form.code !== '123456') {
    errorText.value = '验证码错误或已过期'
    return
  }
  if (!form.agree) {
    errorText.value = '请阅读并同意服务协议与隐私政策'
    return
  }
  errorText.value = ''
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 420))
  const result = register({
    name: form.name.trim(),
    phone: form.phone,
    password: form.password,
    registrationCode: form.registrationCode.trim().toUpperCase(),
    projectId: projectMatch.projectId,
  })
  submitting.value = false
  if (!result.ok) {
    errorText.value = result.message
    return
  }
  const user = result.user!
  router.replace({
    path: '/register/result',
    query: {
      no: user.applicationNo ?? '',
      phone: user.phone,
      project: projectMatch.projectName,
      role: user.roleLabel,
      phoneRaw: user.phone,
    },
  })
}
</script>

<template>
  <AuthLayout>
    <h2 class="card-title">注册项目管理员</h2>
    <p class="card-subtitle">校验项目注册码后，注册成功即成为该项目管理员</p>

    <a-steps class="register-steps" :current="0" :items="stepItems" size="small" />

    <a-alert
      v-if="errorText"
      class="register-alert"
      type="error"
      :message="errorText"
      show-icon
      closable
      @close="errorText = ''"
    />

    <a-alert
      class="register-alert"
      type="info"
      show-icon
      message="原型演示：短信验证码固定 123456；示例注册码 AN2026（安宁区）、LH2026（六合区）、HJ2026（邗江区），新建项目请使用项目管理页生成的链接"
    />

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="handleSubmit">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="真实姓名" name="name">
            <a-input v-model:value="form.name" placeholder="请输入姓名" :maxlength="20">
              <template #prefix><UserOutlined class="field-icon" /></template>
            </a-input>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="手机号" name="phone">
            <a-input v-model:value="form.phone" placeholder="11 位手机号" :maxlength="11">
              <template #prefix><MobileOutlined class="field-icon" /></template>
            </a-input>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="短信验证码" name="code">
        <div class="code-row">
          <a-input v-model:value="form.code" placeholder="请输入 6 位验证码" :maxlength="6" />
          <a-button :disabled="seconds > 0" @click="sendCode">{{ codeText }}</a-button>
        </div>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="密码" name="password">
            <a-input-password v-model:value="form.password" placeholder="6–20 位密码">
              <template #prefix><LockOutlined class="field-icon" /></template>
            </a-input-password>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="确认密码" name="confirm">
            <a-input-password v-model:value="form.confirm" placeholder="请再次输入密码">
              <template #prefix><LockOutlined class="field-icon" /></template>
            </a-input-password>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item
        label="项目注册码"
        name="registrationCode"
        :validate-status="codeError ? 'error' : undefined"
        :help="codeError || undefined"
      >
        <div class="code-row">
          <a-input
            v-model:value="form.registrationCode"
            placeholder="请输入平台提供的项目注册码"
            :maxlength="12"
            :status="codeError ? 'error' : undefined"
            @blur="form.registrationCode && checkCode(true)"
          />
          <a-button @click="checkCode(false)">校验</a-button>
        </div>
        <div v-if="codeOk" class="field-hint hint-ok">
          {{ projectMatch.message }} · 注册后将获得「项目管理员」角色
        </div>
        <div v-else class="field-hint">注册码对应唯一项目，注册成功后不可切换</div>
      </a-form-item>

      <a-form-item label="所属项目">
        <a-input
          :value="codeOk ? `${projectMatch.projectName}（${projectMatch.region}）` : '请先校验项目注册码'"
          disabled
        />
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="form.agree">
          我已阅读并同意
          <a class="agree-link" @click.prevent="message.info('《平台服务协议》为原型占位内容')">《平台服务协议》</a>
          与
          <a class="agree-link" @click.prevent="message.info('《隐私政策》为原型占位内容')">《隐私政策》</a>
        </a-checkbox>
      </a-form-item>

      <a-button
        type="primary"
        html-type="submit"
        size="large"
        block
        :loading="submitting"
        class="submit-btn"
      >
        {{ submitting ? '提交中…' : '注册并成为项目管理员' }}
      </a-button>

      <div class="back-line">
        <a-button type="link" size="small" @click="router.push('/login')">返回登录</a-button>
      </div>
    </a-form>

    <div class="role-note">
      <ClockCircleOutlined />
      <span>注册成功后使用手机号与密码登录，可直接维护本项目组织节点与成员账号。</span>
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

.register-steps {
  margin-bottom: 20px;
}

.register-alert {
  margin-bottom: 12px;
}

.field-icon {
  color: var(--elder-text-weak);
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--elder-text-weak);
}

.hint-ok {
  color: var(--elder-success);
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
  min-width: 88px;
}

.agree-link {
  font-size: 13px;
}

.submit-btn {
  height: 44px;
  font-size: 15px;
}

.back-line {
  margin-top: 12px;
  text-align: center;
}

.role-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f7f9fc;
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-secondary);
}
</style>
