<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import {
  roleLabels,
  updateUser,
  type AuthRole,
  type PlatformUser,
} from '@/composables/useAuth'
import { nodePath, orgUnitOptions, projectNodes } from '@/composables/useOrg'

const props = defineProps<{
  open: boolean
  user: PlatformUser | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'done'): void
}>()

const { message } = App.useApp()
const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const formRef = ref()
const submitting = ref(false)
const form = reactive({
  role: 'project_staff' as AuthRole,
  nodeName: '',
})

const roleOptions = computed(() =>
  (Object.keys(roleLabels) as AuthRole[])
    .filter(
      (role) =>
        (role !== 'platform_admin' && role !== 'project_admin') ||
        props.user?.role === role,
    )
    .map((role) => ({
      value: role,
      label: roleLabels[role],
    })),
)

const nodeSelectOptions = computed(() =>
  projectNodes.value.map((item) => ({ value: item.name, label: nodePath(item) })),
)

const orgOptions = computed(() => {
  if (form.role === 'platform_admin' || form.role === 'project_admin') {
    return form.nodeName ? [{ value: form.nodeName, label: form.nodeName }] : []
  }
  if (form.role === 'civil_viewer') {
    return orgUnitOptions('民政局')
  }
  if (form.role === 'insurance_auditor') {
    return orgUnitOptions('医保局')
  }
  return nodeSelectOptions.value
})

watch(
  () => props.open,
  (value) => {
    if (!value || !props.user) return
    form.role = props.user.role
    form.nodeName = props.user.org || props.user.community
    submitting.value = false
    formRef.value?.clearValidate()
  },
)

watch(
  () => form.role,
  () => {
    const options = orgOptions.value
    if (!options.some((item) => item.value === form.nodeName)) {
      form.nodeName = options[0]?.value ?? ''
    }
  },
)

const rules: Record<string, unknown[]> = {
  role: [{ required: true, message: '请选择角色' }],
  nodeName: [{ required: true, message: '请选择所属节点' }],
}

async function handleOk() {
  if (!props.user) return
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 280))
  const result = updateUser(props.user.id, {
    role: form.role,
    nodeName: form.nodeName,
  })
  submitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  visible.value = false
  emit('done')
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="调整账号"
    :width="560"
    ok-text="保存调整"
    :confirm-loading="submitting"
    destroy-on-hidden
    @ok="handleOk"
  >
    <div v-if="user" class="edit-body">
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="账号">{{ user.name }}</a-descriptions-item>
        <a-descriptions-item label="手机号">{{ user.phone }}</a-descriptions-item>
        <a-descriptions-item label="当前角色">{{ user.roleLabel }}</a-descriptions-item>
        <a-descriptions-item label="当前节点">{{ user.org || '未分配节点' }}</a-descriptions-item>
      </a-descriptions>

      <a-alert
        type="warning"
        show-icon
        message="角色与节点调整立即生效并写入审计日志"
        description="账号已产生的业务数据不迁移；调整后按新节点与新角色重新计算可见范围。"
      />

      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="角色" name="role">
          <a-select v-model:value="form.role" :options="roleOptions" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="所属节点 / 机构" name="nodeName">
              <a-select v-model:value="form.nodeName" :options="orgOptions" placeholder="请选择节点" show-search />
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
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.edit-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
