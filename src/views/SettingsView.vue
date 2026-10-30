<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AuditOutlined,
  BellOutlined,
  ClusterOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import UserManagementPanel from '@/components/settings/UserManagementPanel.vue'
import RolePermissionPanel from '@/components/settings/RolePermissionPanel.vue'
import OrgScopePanel from '@/components/settings/OrgScopePanel.vue'
import DictPanel from '@/components/settings/DictPanel.vue'
import AuditLogPanel from '@/components/settings/AuditLogPanel.vue'
import NotificationPanel from '@/components/settings/NotificationPanel.vue'
import { canManageSettings, currentUser, isPlatformAdmin, platformUsers } from '@/composables/useAuth'
import { currentProject, currentProjectId } from '@/composables/useOrg'

const route = useRoute()
const router = useRouter()

const tabKeys = ['users', 'dict', 'roles', 'orgs', 'audit', 'notifications'] as const
type TabKey = (typeof tabKeys)[number]

const activeTab = computed<TabKey>(() => {
  const tab = String(route.query.tab ?? 'users') as TabKey
  if (!tabKeys.includes(tab)) return 'users'
  if (!isPlatformAdmin.value && !['users', 'dict', 'roles', 'orgs', 'audit'].includes(tab)) return 'users'
  return tab
})

watch(
  () => route.query.tab,
  (value) => {
    if (!value) router.replace({ path: '/settings', query: { tab: 'users' } })
  },
  { immediate: true },
)

const scopedPendingCount = computed(
  () =>
    platformUsers.filter(
      (item) =>
        item.status === '待审核' && (item.projectId ?? '') === currentProjectId.value,
    ).length,
)

const tabs = [
  { key: 'users', label: '用户管理', icon: TeamOutlined },
  { key: 'dict', label: '业务字典', icon: TagsOutlined },
  { key: 'roles', label: '角色权限', icon: SafetyCertificateOutlined },
  { key: 'orgs', label: '组织与数据域', icon: ClusterOutlined },
  { key: 'audit', label: '审计日志', icon: AuditOutlined },
  { key: 'notifications', label: '通知配置', icon: BellOutlined },
].filter((tab) => {
  if (!isPlatformAdmin.value) {
    return ['users', 'dict', 'roles', 'orgs', 'audit'].includes(tab.key)
  }
  return true
})

function handleTabChange(key: string | number) {
  router.replace({ path: '/settings', query: { tab: String(key) } })
}

function goUsers() {
  router.replace({ path: '/settings', query: { tab: 'users' } })
}
</script>

<template>
  <AdminLayout>
    <div class="page settings-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">系统设置</h1>
          <p class="page-subtitle">
            管理账号审核、组织节点与审计；平台运营可跨项目运维，项目管理员只维护本项目。
          </p>
        </div>
        <div class="page-actions">
          <a-tag color="blue">当前项目：{{ currentProject.name }}</a-tag>
          <a-tag v-if="canManageSettings" color="blue">
            当前账号：{{ currentUser?.name }} · {{ currentUser?.roleLabel }}
          </a-tag>
          <a-tag v-else color="red">无操作权限</a-tag>
        </div>
      </div>

      <template v-if="!canManageSettings">
        <div class="card forbidden-card">
          <a-result status="403" title="当前账号无系统设置权限" sub-title="系统设置仅平台运营与项目管理员可访问，请联系管理员调整账号角色。">
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <a-alert
          v-if="scopedPendingCount > 0 && activeTab !== 'users'"
          class="pending-alert"
          type="warning"
          show-icon
          :message="`当前有 ${scopedPendingCount} 个注册申请待审核，审核通过后申请人才能登录。`"
        >
          <template #action>
            <a-button size="small" type="primary" ghost @click="goUsers">去审核</a-button>
          </template>
        </a-alert>

        <div class="card tabs-card">
          <a-tabs :active-key="activeTab" class="settings-tabs" @change="handleTabChange">
            <a-tab-pane v-for="tab in tabs" :key="tab.key">
              <template #tab>
                <span class="tab-label">
                  <component :is="tab.icon" />
                  {{ tab.label }}
                  <span v-if="tab.key === 'users' && scopedPendingCount > 0" class="tab-badge">
                    {{ scopedPendingCount }}
                  </span>
                </span>
              </template>
            </a-tab-pane>
          </a-tabs>

          <div class="tab-panel">
            <UserManagementPanel v-if="activeTab === 'users'" />
            <DictPanel v-else-if="activeTab === 'dict'" />
            <RolePermissionPanel v-else-if="activeTab === 'roles'" />
            <OrgScopePanel v-else-if="activeTab === 'orgs'" />
            <AuditLogPanel v-else-if="activeTab === 'audit'" />
            <NotificationPanel v-else />
          </div>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.settings-page {
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

.settings-tabs :deep(.ant-tabs-nav) {
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
</style>
