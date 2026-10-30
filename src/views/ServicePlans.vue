<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ArrowLeftOutlined,
  CameraOutlined,
  EditOutlined,
  FieldTimeOutlined,
  TeamOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { currentUser, hasPermission } from '@/composables/useAuth'
import {
  planItemOptions,
  servicePlans,
  updatePlan,
  type PlanItem,
  type ServicePlan,
} from '@/composables/useWorkOrders'

const router = useRouter()
const { message } = App.useApp()

const canView = computed(() => hasPermission('workorders'))

const editOpen = ref(false)
const activePlan = ref<ServicePlan | null>(null)
const errorText = ref('')
const submitting = ref(false)

const frequencyOptions = ['每周 1 次', '每周 2 次', '每周 3 次', '每周 5 次'].map((item) => ({
  value: item,
  label: item,
}))

interface EditItem extends PlanItem {
  enabled: boolean
}

const editForm = reactive({
  frequency: '',
  duration: 60,
  note: '',
  items: [] as EditItem[],
})

function openEdit(plan: ServicePlan) {
  activePlan.value = plan
  editForm.frequency = plan.frequency
  editForm.duration = plan.duration
  editForm.note = plan.note
  editForm.items = planItemOptions.map((name) => {
    const existing = plan.items.find((item) => item.name === name)
    return {
      name,
      required: existing?.required ?? true,
      photoRequired: existing?.photoRequired ?? false,
      enabled: Boolean(existing),
    }
  })
  errorText.value = ''
  submitting.value = false
  editOpen.value = true
}

function toggleItem(item: EditItem, enabled: boolean) {
  item.enabled = enabled
  if (enabled && !item.required && !item.photoRequired) {
    item.required = true
  }
}

async function handleSave() {
  if (!activePlan.value) return
  const items = editForm.items
    .filter((item) => item.enabled)
    .map((item) => ({
      name: item.name,
      required: item.required,
      photoRequired: item.photoRequired,
    }))
  if (items.length < 3) {
    errorText.value = '请至少保留 3 个服务项目'
    return
  }
  if (!items.some((item) => item.photoRequired)) {
    errorText.value = '请至少设置 1 个必拍项'
    return
  }
  if (editForm.duration < 30 || editForm.duration > 180) {
    errorText.value = '服务时长需在 30–180 分钟'
    return
  }
  errorText.value = ''
  submitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  const result = updatePlan(activePlan.value.id, {
    frequency: editForm.frequency,
    duration: editForm.duration,
    items,
    note: editForm.note,
  })
  submitting.value = false
  if (!result.ok) {
    errorText.value = result.message
    return
  }
  message.success(result.message)
  editOpen.value = false
}

const photoCount = (plan: ServicePlan) => plan.items.filter((item) => item.photoRequired).length
</script>

<template>
  <AdminLayout>
    <div class="page plans-page">
      <div class="back-line">
        <a-button type="link" size="small" @click="router.push('/workorders')">
          <template #icon><ArrowLeftOutlined /></template>
          返回工单台账
        </a-button>
      </div>

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result status="403" title="当前账号无服务工单权限" sub-title="请联系管理员调整角色。" />
        </div>
      </template>

      <template v-else>
        <div class="page-header">
          <div>
            <h1 class="page-title">服务计划</h1>
            <p class="page-subtitle">
              按长护险待遇等级配置服务项目、频次、时长与必拍项；计划变更不影响已生成工单。
            </p>
          </div>
          <div class="page-actions">
            <a-tag color="blue">共 {{ servicePlans.length }} 个待遇等级</a-tag>
          </div>
        </div>

        <a-alert
          type="info"
          show-icon
          message="服务计划是工单生成的依据"
          description="每个等级至少 3 个项目、1 个必拍项；时长 30–180 分钟。保存后写入审计。"
        />

        <div class="plan-grid">
          <div v-for="plan in servicePlans" :key="plan.id" class="card plan-card">
            <div class="plan-head">
              <div>
                <div class="plan-level">{{ plan.level }}</div>
                <div class="plan-note">{{ plan.note }}</div>
              </div>
              <a-button size="small" @click="openEdit(plan)">
                <template #icon><EditOutlined /></template>
                编辑计划
              </a-button>
            </div>

            <div class="plan-metrics">
              <div class="metric">
                <FieldTimeOutlined />
                <span>{{ plan.frequency }}</span>
              </div>
              <div class="metric">
                <FieldTimeOutlined />
                <span>{{ plan.duration }} 分钟</span>
              </div>
              <div class="metric">
                <TeamOutlined />
                <span>{{ plan.eligibleCount }} 位老人</span>
              </div>
              <div class="metric">
                <CameraOutlined />
                <span>必拍 {{ photoCount(plan) }} 项</span>
              </div>
            </div>

            <div class="plan-items">
              <a-tag v-for="item in plan.items" :key="item.name" :color="item.photoRequired ? 'orange' : 'blue'">
                {{ item.name }}
                <span v-if="item.photoRequired">· 拍</span>
              </a-tag>
            </div>

            <div class="plan-foot">
              <span>最近更新 {{ plan.updatedAt }}</span>
            </div>
          </div>
        </div>
      </template>

      <a-modal
        v-model:open="editOpen"
        :title="`编辑服务计划 · ${activePlan?.level ?? ''}`"
        :width="640"
        :footer="null"
        destroy-on-hidden
      >
        <div class="edit-body">
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="服务频次" required>
                  <a-select v-model:value="editForm.frequency" :options="frequencyOptions" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="服务时长" required>
                  <a-input-number v-model:value="editForm.duration" :min="30" :max="180" style="width: 100%">
                    <template #suffix>分钟</template>
                  </a-input-number>
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="服务项目" required>
              <div class="item-editor">
                <div v-for="item in editForm.items" :key="item.name" class="item-row" :class="{ disabled: !item.enabled }">
                  <a-checkbox :checked="item.enabled" @change="toggleItem(item, Boolean($event.target.checked))">
                    {{ item.name }}
                  </a-checkbox>
                  <div class="item-flags" v-if="item.enabled">
                    <a-checkbox v-model:checked="item.required">必做</a-checkbox>
                    <a-checkbox v-model:checked="item.photoRequired">必拍</a-checkbox>
                  </div>
                </div>
              </div>
              <div class="field-hint">至少保留 3 个项目，至少 1 个必拍项。</div>
            </a-form-item>

            <a-form-item label="计划说明">
              <a-textarea v-model:value="editForm.note" :rows="2" :maxlength="120" show-count />
            </a-form-item>
          </a-form>

          <a-alert v-if="errorText" type="error" show-icon :message="errorText" />

          <div class="edit-foot">
            <a-button @click="editOpen = false">取消</a-button>
            <a-button type="primary" :loading="submitting" @click="handleSave">
              {{ submitting ? '保存中…' : '保存计划' }}
            </a-button>
          </div>
        </div>
      </a-modal>
    </div>
  </AdminLayout>
</template>

<style scoped>
.plans-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-line {
  margin-bottom: -8px;
}

.forbidden-card {
  padding: 48px 24px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.plan-card {
  padding: 18px 20px;
}

.plan-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.plan-level {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.plan-note {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.plan-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  border-radius: 8px;
  background: #f9fbfd;
}

.metric {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5b6779;
}

.plan-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
  min-height: 54px;
}

.plan-foot {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #eef2f7;
  font-size: 11px;
  color: #8a96a8;
}

.edit-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.item-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f9fbfd;
  border: 1px solid #eef2f7;
}

.item-row.disabled {
  opacity: 0.55;
}

.item-flags {
  display: flex;
  gap: 12px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8a96a8;
}

.edit-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
}

@media (max-width: 1400px) {
  .plan-grid {
    grid-template-columns: 1fr;
  }
}
</style>
