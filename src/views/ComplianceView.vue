<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiOutlined,
  AuditOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ConsentOverviewPanel from '@/components/compliance/ConsentOverviewPanel.vue'
import ConsentRecordsPanel from '@/components/compliance/ConsentRecordsPanel.vue'
import AccessApprovalPanel from '@/components/compliance/AccessApprovalPanel.vue'
import RetentionPanel from '@/components/compliance/RetentionPanel.vue'
import IntegrationPanel from '@/components/compliance/IntegrationPanel.vue'
import SecurityBaselinePanel from '@/components/compliance/SecurityBaselinePanel.vue'
import {
  canViewCompliance,
  isComplianceAdmin,
  pendingAccessCount,
  pendingConsentCount,
  type ConsentType,
} from '@/composables/useCompliance'
import { currentUser } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()

const tabKeys = ['consents', 'records', 'access', 'retention', 'integrations', 'security'] as const
type TabKey = (typeof tabKeys)[number]

const activeTab = computed<TabKey>(() => {
  const tab = String(route.query.tab ?? 'consents') as TabKey
  return tabKeys.includes(tab) ? tab : 'consents'
})

watch(
  () => route.query.tab,
  (value) => {
    if (!value) router.replace({ path: '/compliance', query: { tab: 'consents' } })
  },
  { immediate: true },
)

const recordTypeFilter = ref<ConsentType | ''>('')

const tabs = [
  { key: 'consents', label: '隐私授权', icon: SafetyCertificateOutlined },
  { key: 'records', label: '同意记录', icon: FileProtectOutlined },
  { key: 'access', label: '调阅审批', icon: AuditOutlined },
  { key: 'retention', label: '留存策略', icon: DeleteOutlined },
  { key: 'integrations', label: '集成配置', icon: ApiOutlined },
  { key: 'security', label: '安全基线', icon: SafetyOutlined },
]

function handleTabChange(key: string | number) {
  const next = String(key)
  if (next === 'records') recordTypeFilter.value = ''
  router.replace({ path: '/compliance', query: { tab: next } })
}

function openRecords(type?: ConsentType) {
  recordTypeFilter.value = type ?? ''
  router.replace({ path: '/compliance', query: { tab: 'records' } })
}

function openAccess() {
  router.replace({ path: '/compliance', query: { tab: 'access' } })
}
</script>

<template>
  <AdminLayout>
    <div class="page compliance-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">合规与安全</h1>
          <p class="page-subtitle">
            统一管理单独同意、授权撤回、敏感数据调阅、留存销毁、外部集成与安全基线，所有关键操作留痕。
          </p>
        </div>
        <div class="page-actions">
          <a-tag v-if="canViewCompliance" color="green">
            当前账号：{{ currentUser?.name }} · {{ currentUser?.roleLabel }}
          </a-tag>
          <a-tag v-else color="red">无访问权限</a-tag>
        </div>
      </div>

      <div v-if="!canViewCompliance" class="card forbidden-card">
        <a-result
          status="403"
          title="当前账号无合规与安全权限"
          sub-title="合规与安全仅项目管理员与平台运营可访问，请联系项目管理员调整角色。"
        >
          <template #extra>
            <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
          </template>
        </a-result>
      </div>

      <template v-else>
        <a-alert
          v-if="pendingAccessCount > 0 && activeTab !== 'access'"
          class="pending-alert"
          type="warning"
          show-icon
          :message="`当前有 ${pendingAccessCount} 条调阅申请待审批`"
          description="跨域调阅需项目管理员完成二级审批后方可生效。"
        >
          <template #action>
            <a-button size="small" type="primary" ghost @click="openAccess">去审批</a-button>
          </template>
        </a-alert>

        <div class="card tabs-card">
          <a-tabs :active-key="activeTab" class="compliance-tabs" @change="handleTabChange">
            <a-tab-pane v-for="tab in tabs" :key="tab.key">
              <template #tab>
                <span class="tab-label">
                  <component :is="tab.icon" />
                  {{ tab.label }}
                  <span v-if="tab.key === 'consents' && pendingConsentCount > 0" class="tab-badge warning">
                    {{ pendingConsentCount }}
                  </span>
                  <span v-else-if="tab.key === 'access' && pendingAccessCount > 0" class="tab-badge">
                    {{ pendingAccessCount }}
                  </span>
                </span>
              </template>
            </a-tab-pane>
          </a-tabs>

          <div class="tab-panel">
            <ConsentOverviewPanel
              v-if="activeTab === 'consents'"
              @open-records="openRecords"
              @open-access="openAccess"
            />
            <ConsentRecordsPanel v-else-if="activeTab === 'records'" :initial-type="recordTypeFilter" />
            <AccessApprovalPanel v-else-if="activeTab === 'access'" />
            <RetentionPanel v-else-if="activeTab === 'retention'" />
            <IntegrationPanel v-else-if="activeTab === 'integrations'" />
            <SecurityBaselinePanel v-else />
          </div>

          <div v-if="!isComplianceAdmin && activeTab !== 'consents'" class="readonly-tip">
            当前以只读身份查看，留存策略、集成配置与安全设置仅项目管理员可调整。
          </div>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.compliance-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.forbidden-card {
  padding: 48px 24px;
}

.pending-alert {
  margin-bottom: 0;
}

.tabs-card {
  padding: 4px 20px 20px;
}

.compliance-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 18px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  color: #fff;
  background: #d97706;
}

.tab-badge.warning {
  background: #c2410c;
}

.readonly-tip {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f7f9fc;
  font-size: 12px;
  line-height: 20px;
  color: #8a96a8;
}
</style>
