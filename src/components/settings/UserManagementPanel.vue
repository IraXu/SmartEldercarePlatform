<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { App } from 'antdv-next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
} from '@antdv-next/icons'
import UserActionModal from './UserActionModal.vue'
import UserCreateModal from './UserCreateModal.vue'
import UserEditModal from './UserEditModal.vue'
import UserPasswordModal from './UserPasswordModal.vue'
import {
  approveUser,
  platformUsers,
  rejectUser,
  resetUserPassword,
  roleLabels,
  setUserStatus,
  type AuthRole,
  type PlatformUser,
  type UserStatus,
} from '@/composables/useAuth'
import { accountOrgOptions, currentProject, currentProjectId } from '@/composables/useOrg'

const { message, modal } = App.useApp()

const statusColors: Record<UserStatus, string> = {
  待审核: 'warning',
  正常: 'success',
  停用: 'default',
  已驳回: 'error',
}

const statusOptions = ['待审核', '正常', '停用', '已驳回'].map((item) => ({ value: item, label: item }))
const roleOptions = (Object.keys(roleLabels) as AuthRole[]).map((role) => ({
  value: role,
  label: roleLabels[role],
}))
const orgOptions = computed(() =>
  accountOrgOptions().map((item) => ({ value: item, label: item })),
)

const filters = reactive({
  keyword: '',
  status: undefined as UserStatus | undefined,
  role: undefined as AuthRole | undefined,
  org: undefined as string | undefined,
})
const applied = ref({ ...filters })

const projectUsers = computed(() =>
  platformUsers.filter((item) => item.projectId === currentProjectId.value),
)

const stats = computed(() => ({
  total: projectUsers.value.length,
  pending: projectUsers.value.filter((item) => item.status === '待审核').length,
  normal: projectUsers.value.filter((item) => item.status === '正常').length,
  disabled: projectUsers.value.filter((item) => item.status === '停用').length,
  rejected: projectUsers.value.filter((item) => item.status === '已驳回').length,
}))

const filtered = computed(() => {
  const condition = applied.value
  const keyword = condition.keyword.trim().toLowerCase()
  return projectUsers.value.filter((item) => {
    if (condition.status && item.status !== condition.status) return false
    if (condition.role && item.role !== condition.role) return false
    if (
      condition.org &&
      item.community !== condition.org &&
      !item.org.includes(condition.org)
    ) {
      return false
    }
    if (
      keyword &&
      !`${item.name}${item.phone}${item.org}`.toLowerCase().includes(keyword)
    ) {
      return false
    }
    return true
  })
})

const emptyText = computed(() =>
  applied.value.status === '待审核' ? '暂无待审核申请' : '暂无符合条件的用户',
)

function applyFilters() {
  applied.value = { ...filters }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = undefined
  filters.role = undefined
  filters.org = undefined
  applied.value = { ...filters }
}

const columns = [
  { key: 'user', title: '用户', width: 220 },
  { key: 'role', title: '角色', width: 120 },
  { key: 'org', title: '所属组织', width: 220 },
  { key: 'status', title: '状态', width: 110 },
  { key: 'lastLogin', title: '最近登录', width: 160 },
  { key: 'actions', title: '操作', width: 240 },
]

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

const createOpen = ref(false)
const actionOpen = ref(false)
const actionMode = ref<'approve' | 'reject' | 'disable'>('approve')
const actionUser = ref<PlatformUser | null>(null)
const passwordOpen = ref(false)
const passwordUser = ref<PlatformUser | null>(null)
const editOpen = ref(false)
const editUser = ref<PlatformUser | null>(null)

function openEdit(user: PlatformUser) {
  editUser.value = user
  editOpen.value = true
}

function openAction(mode: 'approve' | 'reject' | 'disable', user: PlatformUser) {
  actionMode.value = mode
  actionUser.value = user
  actionOpen.value = true
}

async function handleActionConfirm(payload: { mode: 'approve' | 'reject' | 'disable'; reason?: string }) {
  const user = actionUser.value
  if (!user) return
  let result: { ok: boolean; message: string }
  if (payload.mode === 'approve') {
    result = approveUser(user.id)
  } else if (payload.mode === 'reject') {
    result = rejectUser(user.id, payload.reason ?? '')
  } else {
    result = setUserStatus(user.id, '停用')
  }
  if (result.ok) {
    message.success(result.message)
  } else {
    message.error(result.message)
  }
  actionOpen.value = false
  actionUser.value = null
}

function handleEnable(user: PlatformUser) {
  modal.confirm({
    title: '启用账号',
    content: `启用后 ${user.name} 可立即使用原密码登录，是否继续？`,
    okText: '确认启用',
    cancelText: '取消',
    onOk() {
      const result = setUserStatus(user.id, '正常')
      if (result.ok) message.success(result.message)
      else message.error(result.message)
    },
  })
}

function openPassword(user: PlatformUser) {
  passwordUser.value = user
  passwordOpen.value = true
}

function handlePasswordConfirm(password: string) {
  const user = passwordUser.value
  if (!user) return
  const result = resetUserPassword(user.id, password)
  if (result.ok) message.success(result.message)
  else message.error(result.message)
  passwordOpen.value = false
  passwordUser.value = null
}

const statCards = computed(() => [
  {
    key: 'total',
    label: '用户总数',
    value: stats.value.total,
    icon: TeamOutlined,
    tone: 'primary',
    hint: `含已驳回 ${stats.value.rejected}`,
  },
  { key: 'pending', label: '待审核', value: stats.value.pending, icon: ClockCircleOutlined, tone: 'warning' },
  { key: 'normal', label: '正常', value: stats.value.normal, icon: CheckCircleOutlined, tone: 'success' },
  { key: 'disabled', label: '停用', value: stats.value.disabled, icon: StopOutlined, tone: 'muted' },
])
</script>

<template>
  <div class="user-panel">
    <div class="stat-grid">
      <div v-for="card in statCards" :key="card.key" class="card stat-card">
        <div class="stat-icon" :class="`tone-${card.tone}`">
          <component :is="card.icon" />
        </div>
        <div>
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
          <div v-if="card.hint" class="stat-hint">{{ card.hint }}</div>
        </div>
      </div>
    </div>

    <div class="card filter-card">
      <div class="filter-row">
        <a-input
          v-model:value="filters.keyword"
          class="filter-keyword"
          placeholder="搜索姓名 / 手机号 / 组织"
          allow-clear
          @press-enter="applyFilters"
        >
          <template #prefix><SearchOutlined class="text-weak" /></template>
        </a-input>
        <a-select
          v-model:value="filters.status"
          class="filter-select"
          :options="statusOptions"
          placeholder="全部状态"
          allow-clear
        />
        <a-select
          v-model:value="filters.role"
          class="filter-select"
          :options="roleOptions"
          placeholder="全部角色"
          allow-clear
        />
        <a-select
          v-model:value="filters.org"
          class="filter-select"
          :options="orgOptions"
          placeholder="全部组织"
          allow-clear
        />
        <a-button type="primary" @click="applyFilters">查询</a-button>
        <a-button @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
        <div class="filter-spacer" />
        <a-button type="primary" ghost @click="createOpen = true">
          <template #icon><PlusOutlined /></template>
          新增用户
        </a-button>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-head">
        <div>
          <h3 class="section-title">用户列表</h3>
          <p class="section-desc">
            共 {{ filtered.length }} 个账号；当前项目：{{ currentProject.name }}。项目管理员通过项目注册链接注册产生，项目成员、民政与医保账号由项目管理员创建；首次登录须修改初始密码，所有调整、停用与重置操作写入审计日志。
          </p>
        </div>
        <a-tag color="blue">固定五类角色</a-tag>
      </div>

      <a-table
        :data-source="filtered"
        :columns="columns"
        :row-key="(record: PlatformUser) => record.id"
        :scroll="{ x: 1030 }"
        :pagination="{ pageSize: 8, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }"
        :locale="{ emptyText }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <div class="user-cell">
              <a-avatar :size="34" class="user-avatar">{{ record.name.slice(0, 1) }}</a-avatar>
              <div>
                <div class="user-name">
                  {{ record.name }}
                  <a-tag v-if="record.source === '注册'" color="purple" class="source-tag">自助注册</a-tag>
                </div>
                <div class="user-phone">{{ maskPhone(record.phone) }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag color="blue">{{ record.roleLabel }}</a-tag>
          </template>
          <template v-else-if="column.key === 'org'">
            <div class="org-cell">{{ record.org }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status as UserStatus]">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'lastLogin'">
            <span :class="{ 'text-weak': record.lastLogin === '从未登录' }">{{ record.lastLogin }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="4">
              <template v-if="record.status === '待审核'">
                <a-button type="link" size="small" @click="openAction('approve', record)">通过</a-button>
                <a-button type="link" size="small" danger @click="openAction('reject', record)">驳回</a-button>
              </template>
              <template v-else-if="record.status === '正常'">
                <a-button type="link" size="small" @click="openEdit(record)">调整</a-button>
                <a-button type="link" size="small" danger @click="openAction('disable', record)">停用</a-button>
                <a-button type="link" size="small" @click="openPassword(record)">重置密码</a-button>
              </template>
              <template v-else-if="record.status === '停用'">
                <a-button type="link" size="small" @click="handleEnable(record)">启用</a-button>
                <a-button type="link" size="small" @click="openPassword(record)">重置密码</a-button>
              </template>
              <template v-else>
                <a-button type="link" size="small" @click="handleEnable(record)">重新启用</a-button>
                <a-button type="link" size="small" @click="openPassword(record)">重置密码</a-button>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <UserActionModal
      v-model:open="actionOpen"
      :mode="actionMode"
      :user="actionUser"
      @confirm="handleActionConfirm"
    />
    <UserPasswordModal
      v-model:open="passwordOpen"
      :user="passwordUser"
      @confirm="handlePasswordConfirm"
    />
    <UserCreateModal v-model:open="createOpen" @created="applyFilters" />
    <UserEditModal v-model:open="editOpen" :user="editUser" @done="applyFilters" />
  </div>
</template>

<style scoped>
.user-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}

.tone-primary {
  color: #1f6feb;
  background: #eaf1fe;
}

.tone-warning {
  color: #d97706;
  background: #fff4e5;
}

.tone-success {
  color: #2e9e5b;
  background: #eaf7ef;
}

.tone-muted {
  color: #5b6779;
  background: #f0f3f7;
}

.stat-label {
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.stat-value {
  font-size: 24px;
  line-height: 30px;
  font-weight: 600;
  color: #1f2937;
}

.stat-hint {
  font-size: 11px;
  line-height: 16px;
  color: #8a96a8;
}

.filter-card {
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-keyword {
  width: 260px;
}

.filter-select {
  width: 150px;
}

.filter-spacer {
  flex: 1;
}

.table-card {
  padding: 18px 20px 12px;
}

.table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  background: #eaf1fe;
  color: #1f6feb;
  font-weight: 600;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.source-tag {
  margin-left: 6px;
  font-size: 10px;
  line-height: 16px;
}

.user-phone {
  font-size: 12px;
  color: #8a96a8;
  letter-spacing: 0.3px;
}

.org-cell {
  font-size: 13px;
  color: #1f2937;
}
</style>
