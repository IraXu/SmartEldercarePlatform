<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  AlertOutlined,
  ApartmentOutlined,
  BankOutlined,
  DashboardOutlined,
  DownOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import DemoStateControl from '@/components/DemoStateControl.vue'
import NotificationCenter from '@/components/NotificationCenter.vue'
import { canManageSettings, currentUser, hasPermission, isPlatformAdmin, logout, platformUsers } from '@/composables/useAuth'
import { canViewCompliance, pendingAccessCount } from '@/composables/useCompliance'
import { overdueTasks } from '@/composables/useTasks'
import { auditPendingCount } from '@/composables/useEvidence'
import {
  currentProject,
  currentProjectId,
  projectOptions,
  switchProject,
} from '@/composables/useOrg'

const route = useRoute()
const router = useRouter()
const { message, modal } = App.useApp()

const selectedKey = computed(() => {
  if (route.path.startsWith('/devices')) return 'devices'
  if (route.path.startsWith('/events')) return 'events'
  if (route.path.startsWith('/tasks') || route.path.startsWith('/m/task')) return 'tasks'
  if (route.path.startsWith('/workorders') || route.path.startsWith('/m/workorder')) return 'workorders'
  if (route.path.startsWith('/audit')) return 'audit'
  if (route.path.startsWith('/map')) return 'map'
  if (route.path.startsWith('/projects')) return 'projects'
  if (route.path.startsWith('/settings')) return 'settings'
  if (route.path.startsWith('/compliance')) return 'compliance'
  return 'elders'
})

const canViewTasks = computed(() => hasPermission('tasks'))

const canViewWorkOrders = computed(() => hasPermission('workorders'))

const canViewAudit = computed(() => hasPermission('audit'))

interface MenuEntry {
  key: string
  label: string
  icon: unknown
}

interface MenuGroup {
  key: string
  title: string
  items: MenuEntry[]
}

/** 按业务域分组，避免 10 个一级菜单平铺 */
const menuGroups = computed<MenuGroup[]>(() => {
  const groups: MenuGroup[] = [
    {
      key: 'service',
      title: '养老服务',
      items: [
        { key: 'elders', label: '老人档案', icon: UserOutlined },
        { key: 'devices', label: '设备与感知', icon: ApartmentOutlined },
        { key: 'events', label: '事件中心', icon: AlertOutlined },
        { key: 'tasks', label: '任务协同', icon: ScheduleOutlined },
        { key: 'workorders', label: '服务工单', icon: FileTextOutlined },
      ],
    },
    {
      key: 'supervise',
      title: '监管与治理',
      items: [
        { key: 'audit', label: '证据与监管', icon: SafetyCertificateOutlined },
        { key: 'map', label: '区域一张图', icon: DashboardOutlined },
        { key: 'compliance', label: '合规与安全', icon: FileProtectOutlined },
      ],
    },
    {
      key: 'admin',
      title: '平台管理',
      items: [
        { key: 'projects', label: '项目管理', icon: BankOutlined },
        { key: 'settings', label: '系统设置', icon: SettingOutlined },
      ],
    },
  ]
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.key === 'settings') return canManageSettings.value
        if (item.key === 'projects') return isPlatformAdmin.value
        if (item.key === 'compliance') return canViewCompliance.value
        if (item.key === 'tasks') return canViewTasks.value
        if (item.key === 'workorders') return canViewWorkOrders.value
        if (item.key === 'audit') return canViewAudit.value
        return true
      }),
    }))
    .filter((group) => group.items.length > 0)
})

function handleMenuClick({ key }: { key: string | number }) {
  if (key === 'elders') {
    router.push('/elders')
    return
  }
  if (key === 'devices') {
    router.push('/devices')
    return
  }
  if (key === 'events') {
    router.push('/events')
    return
  }
  if (key === 'tasks') {
    if (!canViewTasks.value) {
      message.warning('任务协同面向项目管理员、平台运营与项目成员开放')
      return
    }
    router.push('/tasks')
    return
  }
  if (key === 'workorders') {
    if (!canViewWorkOrders.value) {
      message.warning('服务工单面向项目管理员、平台运营与项目成员开放')
      return
    }
    router.push('/workorders')
    return
  }
  if (key === 'audit') {
    if (!canViewAudit.value) {
      message.warning('证据与监管面向医保审核员与平台运营开放')
      return
    }
    router.push('/audit/workorders')
    return
  }
  if (key === 'map') {
    router.push('/map')
    return
  }
  if (key === 'settings') {
    if (!canManageSettings.value) {
      message.warning('系统设置仅平台运营与项目管理员可访问')
      return
    }
    router.push('/settings')
    return
  }
  if (key === 'projects') {
    if (!isPlatformAdmin.value) {
      message.warning('项目管理仅平台运营方可访问')
      return
    }
    router.push('/projects')
    return
  }
  if (key === 'compliance') {
    if (!canViewCompliance.value) {
      message.warning('合规与安全仅项目管理员与平台运营可访问')
      return
    }
    router.push('/compliance')
  }
}

const orgText = computed(() => {
  const user = currentUser.value
  if (!user) return '未登录'
  if (user.role === 'platform_admin') return '跨项目运维'
  return user.org || '未分配节点'
})

const projectSwitching = ref(false)

const scopedPendingCount = computed(
  () =>
    platformUsers.filter(
      (item) =>
        item.status === '待审核' && (item.projectId ?? '') === currentProjectId.value,
    ).length,
)

function handleProjectSwitch(value: string) {
  const result = switchProject(value)
  if (!result.ok) {
    message.error(result.message)
    return
  }
  projectSwitching.value = true
  message.success(`已切换到 ${currentProject.value.name}`)
  window.setTimeout(() => {
    projectSwitching.value = false
  }, 200)
}

const avatarText = computed(() => currentUser.value?.name.slice(0, 1) ?? '未')

const roleColor = computed(() => {
  const role = currentUser.value?.role
  if (role === 'platform_admin') return 'blue'
  if (role === 'project_admin') return 'cyan'
  if (role === 'project_staff') return 'green'
  return 'purple'
})

const userMenuItems = computed(() => {
  const items: Array<{ key: string; label: string; danger?: boolean; disabled?: boolean }> = [
    { key: 'profile', label: currentUser.value?.phone ?? '未登录', disabled: true },
  ]
  if (canManageSettings.value) items.push({ key: 'settings', label: '系统设置' })
  items.push({ key: 'logout', label: '退出登录', danger: true })
  return items
})

function handleUserMenu({ key }: { key: string | number }) {
  if (key === 'settings') {
    router.push('/settings')
    return
  }
  if (key === 'logout') {
    modal.confirm({
      title: '退出登录',
      content: '退出登录后将返回登录页，是否需要继续？',
      okText: '退出登录',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        logout()
        message.success('已退出登录')
        router.replace('/login')
      },
    })
  }
}

/** 侧栏折叠，密集页面（一张图、大屏）可让出更多宽度 */
const collapsed = ref(window.localStorage.getItem('se_sider_collapsed') === '1')

watch(collapsed, (value) => {
  window.localStorage.setItem('se_sider_collapsed', value ? '1' : '0')
})

/** 菜单右侧的红点数字，按业务待办数量展示 */
function badgeOf(key: string): number {
  if (key === 'settings') return scopedPendingCount.value
  if (key === 'compliance') return pendingAccessCount.value
  if (key === 'tasks') return overdueTasks.value.length
  if (key === 'audit') return auditPendingCount.value
  return 0
}
</script>

<template>
  <a-layout class="app-layout">
    <a-layout-sider
      :width="248"
      :collapsed-width="76"
      :collapsed="collapsed"
      :trigger="null"
      collapsible
      class="app-sider"
    >
      <div class="brand" :class="{ 'brand-collapsed': collapsed }">
        <div class="brand-logo">智</div>
        <div v-if="!collapsed" class="brand-text">
          <div class="brand-title">智慧养老</div>
          <div class="brand-sub">SMART ELDERCARE</div>
        </div>
        <button
          class="collapse-btn"
          type="button"
          :title="collapsed ? '展开菜单' : '收起菜单'"
          @click="collapsed = !collapsed"
        >
          <MenuUnfoldOutlined v-if="collapsed" />
          <MenuFoldOutlined v-else />
        </button>
      </div>

      <div class="nav-scroll">
        <nav class="nav">
          <div v-for="group in menuGroups" :key="group.key" class="nav-group">
            <div v-if="!collapsed" class="group-title">
              <span>{{ group.title }}</span>
              <i />
            </div>
            <div v-else class="group-divider" />
            <a-tooltip
              v-for="item in group.items"
              :key="item.key"
              :title="collapsed ? item.label : ''"
              placement="right"
            >
              <button
                type="button"
                class="nav-item"
                :class="{ active: selectedKey === item.key, 'nav-item-collapsed': collapsed }"
                @click="handleMenuClick({ key: item.key })"
              >
                <component :is="item.icon" class="nav-icon" />
                <template v-if="!collapsed">
                  <span class="nav-label">{{ item.label }}</span>
                  <span v-if="badgeOf(item.key) > 0" class="nav-badge">{{ badgeOf(item.key) }}</span>
                </template>
                <span v-else-if="badgeOf(item.key) > 0" class="nav-dot" />
              </button>
            </a-tooltip>
          </div>
        </nav>
      </div>

      <div class="sider-footer" :class="{ 'sider-footer-collapsed': collapsed }">
        <template v-if="!collapsed">
          <div class="sider-footer-title">智慧养老服务平台</div>
          <div class="sider-footer-desc">v2.0 二期原型 · 演示数据</div>
        </template>
        <span v-else class="sider-footer-mark">v2</span>
      </div>
    </a-layout-sider>

    <a-layout class="main-layout">
      <a-layout-header class="app-header">
        <div class="header-left">
          <span class="header-org">{{ orgText }}</span>
          <a-tag :color="roleColor" class="header-tag">{{ currentUser?.roleLabel ?? '未登录' }}</a-tag>
        </div>
        <div class="header-right">
          <a-select
            v-if="isPlatformAdmin"
            :value="currentProjectId"
            class="project-switcher"
            size="small"
            :options="projectOptions"
            :loading="projectSwitching"
            @change="handleProjectSwitch"
          />
          <a-tag v-else color="blue" class="project-tag">{{ currentProject.name }}</a-tag>
          <NotificationCenter />
          <a-divider type="vertical" class="header-divider" />
          <a-dropdown
            placement="bottomRight"
            :trigger="['click']"
            :menu="{ items: userMenuItems, onClick: handleUserMenu }"
          >
            <div class="header-user">
              <a-avatar size="small" style="background: #1f6feb">{{ avatarText }}</a-avatar>
              <span class="header-user-name">{{ currentUser?.name ?? '未登录' }}</span>
              <DownOutlined class="user-caret" />
            </div>
          </a-dropdown>
        </div>
      </a-layout-header>

      <a-layout-content class="app-content">
        <slot />
      </a-layout-content>
    </a-layout>
  </a-layout>
  <DemoStateControl />
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-sider {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #0a1b31 0%, #0d2439 55%, #0b2135 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.app-sider::after {
  content: '';
  position: absolute;
  left: -90px;
  bottom: -130px;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.16), transparent 70%);
  pointer-events: none;
}

.brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 64px;
  flex: none;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.brand-collapsed {
  height: auto;
  flex-direction: column;
  gap: 8px;
  padding: 14px 0 10px;
}

.brand-collapsed .collapse-btn {
  margin-left: 0;
}

.brand-logo {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #2d7ef7, #13a8a8);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 1px;
  box-shadow: 0 6px 16px rgba(45, 126, 247, 0.32);
}

.brand-title {
  color: #fff;
  font-size: 15px;
  line-height: 20px;
  font-weight: 600;
  letter-spacing: 1px;
}

.brand-sub {
  color: rgba(255, 255, 255, 0.42);
  font-size: 10px;
  line-height: 14px;
  letter-spacing: 1.4px;
}

.collapse-btn {
  margin-left: auto;
  width: 26px;
  height: 26px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 7px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  background: transparent;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.collapse-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-scroll {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 10px 8px;
}

.nav-scroll::-webkit-scrollbar {
  width: 4px;
}

.nav-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
}

.nav-group {
  margin-bottom: 12px;
}

.nav-group:last-child {
  margin-bottom: 0;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 7px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.38);
}

.group-title i {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.12), transparent);
}

.group-divider {
  height: 1px;
  margin: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 42px;
  margin-bottom: 3px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  font-weight: 600;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.24), rgba(56, 189, 248, 0.04));
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.16);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 20px;
  border-radius: 0 3px 3px 0;
  background: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.7);
  transform: translateY(-50%);
}

.nav-item-collapsed {
  justify-content: center;
  padding: 0;
  height: 44px;
}

.nav-icon {
  flex: none;
  font-size: 16px;
  opacity: 0.92;
}

.nav-item.active .nav-icon {
  color: #7dd3fc;
  opacity: 1;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav-badge {
  flex: none;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  color: #1a1206;
  background: #f0b45a;
}

.nav-dot {
  position: absolute;
  top: 9px;
  right: 20px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f0b45a;
  box-shadow: 0 0 0 2px rgba(15, 33, 51, 0.9);
}

.sider-footer {
  position: relative;
  z-index: 1;
  flex: none;
  padding: 14px 18px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.sider-footer-collapsed {
  display: flex;
  justify-content: center;
  padding: 12px 0 16px;
}

.sider-footer-title {
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
}

.sider-footer-desc {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.32);
  font-size: 11px;
  line-height: 18px;
}

.sider-footer-mark {
  width: 26px;
  height: 20px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.main-layout {
  min-width: 0;
}

.app-header {
  height: 64px;
  line-height: 64px;
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--elder-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: var(--elder-primary);
}

.header-org {
  font-size: 14px;
  color: var(--elder-text);
  font-weight: 500;
}

.project-switcher {
  width: 260px;
  flex: none;
}

.project-tag {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 4px;
}

.header-tag {
  margin-left: 4px;
  border-radius: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-divider {
  height: 20px;
  border-color: var(--elder-border);
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.18s ease;
}

.header-user:hover {
  background: #f4f7fb;
}

.header-user-meta {
  display: flex;
  flex-direction: column;
  line-height: 16px;
}

.header-user-name {
  font-size: 13px;
  color: var(--elder-text);
  font-weight: 500;
}

.header-user-role {
  font-size: 11px;
  color: var(--elder-text-weak);
}

.user-caret {
  font-size: 10px;
  color: var(--elder-text-weak);
}

.app-content {
  height: calc(100vh - 64px);
  overflow: auto;
  background: var(--elder-bg);
}
</style>
