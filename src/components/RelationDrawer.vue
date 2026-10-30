<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { App } from 'antdv-next'
import { CloseOutlined } from '@antdv-next/icons'
import type { Elder, Relation } from '@/mock/elders'

const props = defineProps<{ open: boolean; elder: Elder | null; relation?: Relation | null }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'saved'): void
}>()

const { message } = App.useApp()
const formRef = ref()
const saving = ref(false)

const form = reactive({
  name: '',
  relation: '儿子',
  phone: '',
  sameCity: true,
  guardian: false,
  caregiver: false,
})

const isEdit = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    isEdit.value = Boolean(props.relation)
    form.name = props.relation?.name ?? ''
    form.relation = props.relation?.relation ?? '儿子'
    form.phone = props.relation?.phone ?? ''
    form.sameCity = props.relation?.sameCity ?? true
    form.guardian = props.relation?.guardian ?? false
    form.caregiver = props.relation?.caregiver ?? false
    formRef.value?.clearValidate()
  },
)

const rules = {
  name: [{ required: true, message: '请输入关系人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/, message: '请输入正确的联系电话', trigger: 'blur' },
  ],
}

function close() {
  emit('update:open', false)
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (form.guardian && props.elder) {
    const guardianCount = props.elder.relations.filter(
      (item) => item.active !== false && item.guardian && item.id !== props.relation?.id,
    ).length
    if (guardianCount >= 2) {
      message.error('监护人最多 2 名')
      return
    }
  }
  saving.value = true
  window.setTimeout(() => {
    if (!props.elder) {
      saving.value = false
      return
    }
    if (props.relation) {
      props.relation.name = form.name
      props.relation.relation = form.relation
      props.relation.phone = form.phone
      props.relation.sameCity = form.sameCity
      props.relation.guardian = form.guardian
      props.relation.caregiver = form.caregiver
    } else {
      const hasEmergency = props.elder.relations.some((item) => item.active !== false && item.isEmergency)
      props.elder.relations.push({
        id: `R-${Date.now()}`,
        name: form.name,
        relation: form.relation,
        phone: form.phone,
        sameCity: form.sameCity,
        guardian: form.guardian,
        caregiver: form.caregiver,
        authorized: '已授权',
        isEmergency: !hasEmergency,
        active: true,
      })
    }
    saving.value = false
    message.success('关系人已保存')
    emit('saved')
    emit('update:open', false)
  }, 600)
}
</script>

<template>
  <a-drawer
    :open="open"
    :size="520"
    placement="right"
    :closable="false"
    :mask-closable="false"
    :styles="{ body: { padding: '0' } }"
  >
    <div class="relation-shell">
      <div class="relation-header">
        <div>
          <div class="relation-title">{{ isEdit ? '编辑关系人' : '新增关系人' }}</div>
          <div class="relation-subtitle">关系人将用于事件通知、任务派发与紧急联系</div>
        </div>
        <a-button type="text" shape="circle" @click="close">
          <template #icon><CloseOutlined /></template>
        </a-button>
      </div>

      <div class="relation-body">
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" required-mark>
          <a-form-item label="姓名" name="name">
            <a-input v-model:value="form.name" placeholder="如 李伟" :maxlength="20" />
          </a-form-item>
          <a-form-item label="关系类型" name="relation">
            <a-select
              v-model:value="form.relation"
              :options="['儿子', '女儿', '配偶', '监护人', '主要照护者', '其他亲属', '物业管家', '签约服务机构'].map((item) => ({ value: item, label: item }))"
            />
          </a-form-item>
          <a-form-item label="联系电话" name="phone">
            <a-input v-model:value="form.phone" placeholder="11 位手机号或带区号固话" :maxlength="20" />
          </a-form-item>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="是否同城">
                <a-switch v-model:checked="form.sameCity" checked-children="是" un-checked-children="否" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="是否监护人">
                <a-switch v-model:checked="form.guardian" checked-children="是" un-checked-children="否" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="主要照护者">
                <a-switch v-model:checked="form.caregiver" checked-children="是" un-checked-children="否" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="授权状态">
                <a-tag :color="props.relation?.authorized === '已授权' ? 'green' : 'default'">
                  {{ props.relation?.authorized ?? '未授权' }}
                </a-tag>
              </a-form-item>
            </a-col>
          </a-row>
          <a-alert
            type="info"
            show-icon
            message="家属授权由合规模块统一管理"
            description="本期只读展示授权状态，电子授权书的签署与撤回将在 M8 合规模块中提供。"
          />
        </a-form>
      </div>

      <div class="relation-footer">
        <a-button @click="close">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
.relation-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.relation-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--elder-divider);
}

.relation-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}

.relation-subtitle {
  font-size: 11px;
  line-height: 17px;
  color: var(--elder-text-weak);
}

.relation-body {
  flex: 1;
  overflow: auto;
  padding: 20px 24px;
}

.relation-footer {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--elder-divider);
}
</style>
