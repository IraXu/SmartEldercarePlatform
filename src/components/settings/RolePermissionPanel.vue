<script setup lang="ts">
import { computed, ref } from 'vue'
import { App } from 'antdv-next'
import {
  AuditOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import {
  isPlatformAdmin,
  moduleDefinitions,
  permissionLabels,
  permissionMatrix,
  platformUsers,
  roleDescriptions,
  roleLabels,
  savePermissions,
  type AuthRole,
  type PermissionKey,
} from '@/composables/useAuth'

const { message } = App.useApp()

const roleOrder: AuthRole[] = [
  'platform_admin',
  'project_admin',
  'project_staff',
  'civil_viewer',
  'insurance_auditor',
]
const activeRole = ref<AuthRole>('project_admin')
const saving = ref(false)

const roleCards = computed(() =>
  roleOrder.map((role) => ({
    role,
    label: roleLabels[role],
    description: roleDescriptions[role],
    count: platformUsers.filter((item) => item.role === role).length,
    active: platformUsers.filter((item) => item.role === role && item.status === '正常').length,
  })),
)

const activeDescription = computed(() => roleDescriptions[activeRole.value])
/** 权限矩阵为全局模板，仅平台运营可编辑，项目管理员只读查看 */
const canEdit = computed(() => isPlatformAdmin.value)
const readonly = computed(() => !canEdit.value || activeRole.value === 'platform_admin')

const permissionKeys: PermissionKey[] = ['view', 'create', 'edit', 'delete', 'export', 'approve']

const columns = [
  { key: 'label', title: '功能模块', width: 220 },
  ...permissionKeys.map((key) => ({
    key,
    title: permissionLabels[key],
    width: 110,
    align: 'center' as const,
  })),
]

const rowKey = (record: { key: string }) => record.key

function has(moduleKey: string, permission: PermissionKey) {
  return (permissionMatrix[activeRole.value][moduleKey] ?? []).includes(permission)
}

function hasColumn(moduleKey: string, columnKey: string) {
  return has(moduleKey, columnKey as PermissionKey)
}

function toggle(moduleKey: string, permission: PermissionKey, checked: boolean) {
  const list = permissionMatrix[activeRole.value][moduleKey] ?? []
  const next = checked ? [...list, permission] : list.filter((item) => item !== permission)
  permissionMatrix[activeRole.value][moduleKey] = next
}

function handleCheckboxChange(
  moduleKey: string,
  columnKey: string,
  event: { target?: { checked?: boolean } },
) {
  toggle(moduleKey, columnKey as PermissionKey, Boolean(event.target?.checked))
}

async function handleSave() {
  saving.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = savePermissions()
  saving.value = false
  if (result.ok) message.success(result.message)
  else message.error(result.message)
}
</script>

<template>
  <div class="role-panel">
    <div class="role-grid">
      <button
        v-for="card in roleCards"
        :key="card.role"
        type="button"
        class="card role-card"
        :class="{ active: card.role === activeRole }"
        @click="activeRole = card.role"
      >
        <div class="role-card-head">
          <span class="role-icon">
            <SafetyCertificateOutlined v-if="card.role === 'platform_admin'" />
            <TeamOutlined v-else-if="card.role === 'project_admin'" />
            <UserOutlined v-else-if="card.role === 'project_staff'" />
            <AuditOutlined v-else />
          </span>
          <a-tag v-if="card.role === activeRole" color="blue">当前编辑</a-tag>
          <LockOutlined v-if="card.role === 'platform_admin'" class="role-lock" />
        </div>
        <div class="role-name">{{ card.label }}</div>
        <div class="role-desc">{{ card.description }}</div>
        <div class="role-count">
          <span>{{ card.count }} 个账号</span>
          <span class="text-weak">正常 {{ card.active }}</span>
        </div>
      </button>
    </div>

    <div class="card matrix-card">
      <div class="matrix-head">
        <div>
          <h3 class="section-title">权限矩阵 · {{ roleLabels[activeRole] }}</h3>
          <p class="section-desc">{{ activeDescription }}</p>
        </div>
        <div class="matrix-actions">
          <a-tag v-if="!canEdit" color="gold">仅平台运营可调整权限</a-tag>
          <a-tag v-else-if="readonly" color="gold">平台运营权限固定全开</a-tag>
        </div>
      </div>

      <a-table
        :data-source="moduleDefinitions"
        :row-key="rowKey"
        :pagination="false"
        :columns="columns"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'label'">
            <span class="module-name">{{ record.label }}</span>
          </template>
          <template v-else>
            <a-checkbox
              :checked="hasColumn(record.key, String(column.key))"
              :disabled="readonly"
              @change="handleCheckboxChange(record.key, String(column.key), $event)"
            />
          </template>
        </template>
      </a-table>

      <div class="matrix-foot">
        <div class="foot-tip">
          <CheckCircleOutlined />
          <span>权限矩阵为全局模板，保存后对所有项目生效；平台运营权限固定全开且不可编辑。</span>
        </div>
        <a-button v-if="canEdit" :disabled="readonly" :loading="saving" type="primary" @click="handleSave">
          <template #icon><SaveOutlined /></template>
          {{ saving ? '保存中…' : '保存权限' }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.role-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.role-card {
  text-align: left;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.role-card:hover {
  border-color: #b9d2fb;
}

.role-card.active {
  border-color: #1f6feb;
  box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.12);
}

.role-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #1f6feb;
  background: #eaf1fe;
}

.role-lock {
  margin-left: auto;
  color: #8a96a8;
}

.role-name {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.role-desc {
  margin-top: 4px;
  min-height: 38px;
  font-size: 12px;
  line-height: 19px;
  color: #8a96a8;
}

.role-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #eef2f7;
  font-size: 12px;
  color: #5b6779;
}

.matrix-card {
  padding: 18px 20px 16px;
}

.matrix-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.matrix-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.matrix-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
}

.foot-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8a96a8;
}
</style>
