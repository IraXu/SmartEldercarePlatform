<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import { LockOutlined } from '@antdv-next/icons'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { changeOwnPassword, currentUser } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const formRef = ref()
const submitting = ref(false)
const errorText = ref('')

const forced = computed(() => route.query.force === '1' || Boolean(currentUser.value?.mustChangePassword))

const form = reactive({
  oldPassword: '',
  password: '',
  confirm: '',
})

const rules: Record<string, unknown[]> = {
  oldPassword: [{ required: true, message: '请输入当前密码' }],
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

onMounted(() => {
  if (!currentUser.value) {
    router.replace({ path: '/login', query: { redirect: '/change-password' } })
  }
})

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  errorText.value = ''
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = changeOwnPassword(form.oldPassword, form.password)
  submitting.value = false
  if (!result.ok) {
    errorText.value = result.message
    return
  }
  message.success('密码已更新')
  router.replace('/elders')
}
</script>

<template>
  <AuthLayout>
    <h2 class="card-title">{{ forced ? '首次登录修改密码' : '修改密码' }}</h2>
    <p class="card-subtitle">
      {{ forced ? '当前为初始密码，修改后才能进入业务系统' : '定期更换密码可降低账号被盗风险' }}
    </p>

    <a-alert
      v-if="forced"
      class="form-alert"
      type="warning"
      show-icon
      message="为保障数据安全，首次登录必须修改初始密码"
    />

    <a-alert
      v-if="errorText"
      class="form-alert"
      type="error"
      :message="errorText"
      show-icon
      closable
      @close="errorText = ''"
    />

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="当前密码" name="oldPassword">
        <a-input-password v-model:value="form.oldPassword" placeholder="请输入当前密码">
          <template #prefix><LockOutlined class="field-icon" /></template>
        </a-input-password>
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
        {{ submitting ? '保存中…' : '保存并进入系统' }}
      </a-button>
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
  margin-bottom: 14px;
}

.field-icon {
  color: var(--elder-text-weak);
}

.submit-btn {
  height: 44px;
  font-size: 15px;
}
</style>
