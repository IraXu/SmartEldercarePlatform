<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import {
  createUser,
  currentUser,
  roleLabels,
  type AuthRole,
  type CreateUserInput,
} from '@/composables/useAuth'
import { nodePath, orgUnitOptions, projectNodes } from '@/composables/useOrg'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created'): void
}>()

const { message } = App.useApp()
const formRef = ref()
const submitting = ref(false)

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const nodeSelectOptions = computed(() =>
  projectNodes.value.map((item) => ({ value: item.name, label: nodePath(item) })),
)

const form = reactive({
  name: '',
  phone: '',
  role: 'project_staff' as AuthRole,
  nodeName: projectNodes.value[0]?.name ?? '',
  password: '123456',
})

const roleOptions = computed(() =>
  (Object.keys(roleLabels) as AuthRole[])
    .filter((role) => {
      if (role === 'platform_admin') return false
      if (role === 'project_admin') return currentUser.value?.role === 'platform_admin'
      return true
    })
    .map((role) => ({ value: role, label: roleLabels[role] })),
)

const civilOrgOptions = computed(() => orgUnitOptions('民政局'))
const medicalOrgOptions = computed(() => orgUnitOptions('医保局'))

const activeOrgOptions = computed(() => {
  if (form.role === 'civil_viewer') return civilOrgOptions.value
  if (form.role === 'insurance_auditor') return medicalOrgOptions.value
  return nodeSelectOptions.value
})

watch(
  () => props.open,
  (value) => {
    if (!value) return
    form.name = ''
    form.phone = ''
    form.role = 'project_staff'
    form.nodeName = projectNodes.value[0]?.name ?? ''
    form.password = '123456'
    submitting.value = false
    formRef.value?.clearValidate()
  },
)

watch(
  () => form.role,
  (role) => {
    if (role === 'civil_viewer') {
      form.nodeName = civilOrgOptions.value[0]?.value ?? ''
    } else if (role === 'insurance_auditor') {
      form.nodeName = medicalOrgOptions.value[0]?.value ?? ''
    } else if (!nodeSelectOptions.value.some((item) => item.value === form.nodeName)) {
      form.nodeName = projectNodes.value[0]?.name ?? ''
    }
  },
)

const rules: Record<string, unknown[]> = {
  name: [
    { required: true, message: '请输入姓名' },
    { min: 2, max: 20, message: '姓名需 2–20 个字符' },
  ],
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
  ],
  role: [{ required: true, message: '请选择角色' }],
  nodeName: [{ required: true, message: '请选择所属节点' }],
  password: [
    { required: true, message: '请设置初始密码' },
    { min: 6, max: 20, message: '密码需 6–20 位' },
  ],
}

async function handleOk() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  const payload: CreateUserInput = {
    name: form.name.trim(),
    phone: form.phone,
    password: form.password,
    role: form.role,
    nodeName: form.nodeName,
  }
  const result = createUser(payload)
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success('用户已创建')
  visible.value = false
  emit('created')
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="新增用户"
    :width="560"
    ok-text="创建用户"
    :confirm-loading="submitting"
    @ok="handleOk"
  >
    <a-alert
      class="create-tip"
      type="info"
      show-icon
      message="管理员创建的账号默认正常可用；首次登录必须修改初始密码。"
      description="平台运营账号由部署初始化；项目管理员通过项目注册链接产生；民政、医保账号由项目管理员代建。"
    />
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="姓名" name="name">
            <a-input v-model:value="form.name" placeholder="请输入姓名" :maxlength="20" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="手机号" name="phone">
            <a-input v-model:value="form.phone" placeholder="11 位登录手机号" :maxlength="11" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="角色" name="role">
        <a-select v-model:value="form.role" :options="roleOptions" />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="所属节点 / 机构" name="nodeName">
            <a-select v-model:value="form.nodeName" :options="activeOrgOptions" show-search />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="数据范围">
            <a-input
              :value="
                form.role === 'civil_viewer'
                  ? '本项目只读'
                  : form.role === 'insurance_auditor'
                    ? '证据与结算'
                    : form.role === 'project_admin'
                      ? '本项目全部'
                      : '所属节点及下级'
              "
              disabled
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="初始密码" name="password">
        <a-input-password v-model:value="form.password" placeholder="6–20 位初始密码" />
        <div class="field-hint">建议使用默认密码并提醒本人首次登录后修改。</div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>
.create-tip {
  margin-bottom: 16px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}
</style>
