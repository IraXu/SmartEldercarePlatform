<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { PlatformUser } from '@/composables/useAuth'

const props = defineProps<{
  open: boolean
  user: PlatformUser | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'confirm', password: string): void
}>()

const formRef = ref()
const submitting = ref(false)
const form = reactive({ password: '', confirm: '' })

watch(
  () => props.open,
  (value) => {
    if (value) {
      form.password = ''
      form.confirm = ''
      submitting.value = false
      formRef.value?.clearValidate()
    }
  },
)

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const rules: Record<string, unknown[]> = {
  password: [
    { required: true, message: '请输入新密码' },
    { min: 6, max: 20, message: '密码需 6–20 位' },
  ],
  confirm: [
    { required: true, message: '请再次输入新密码' },
    {
      validator: (_rule: unknown, value: string) =>
        value === form.password ? Promise.resolve() : Promise.reject('两次输入的密码不一致'),
    },
  ],
}

async function handleOk() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 260))
  submitting.value = false
  emit('confirm', form.password)
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="重置密码"
    :width="480"
    ok-text="确认重置"
    :confirm-loading="submitting"
    @ok="handleOk"
  >
    <div class="reset-body">
      <a-alert
        type="info"
        show-icon
        :message="`将为 ${user?.name ?? ''}（${user?.phone ?? ''}）重置登录密码`"
        description="重置后请通过安全渠道告知本人，并提醒其首次登录后修改密码。"
      />
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="新密码" name="password">
          <a-input-password v-model:value="form.password" placeholder="请输入 6–20 位新密码" />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirm">
          <a-input-password v-model:value="form.confirm" placeholder="请再次输入新密码" />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.reset-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
