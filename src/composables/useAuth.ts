import { computed, reactive, ref } from 'vue'
import { switchRole } from './useAppState'
import { currentProjectId, projects, setCurrentProject } from './useOrg'

export type AuthRole =
  | 'platform_admin'
  | 'project_admin'
  | 'project_staff'
  | 'civil_viewer'
  | 'insurance_auditor'
export type UserStatus = '待审核' | '正常' | '停用' | '已驳回'
export type PermissionKey = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve'

export interface PlatformUser {
  id: string
  name: string
  phone: string
  password: string
  role: AuthRole
  roleLabel: string
  /** 所属节点或机构名称 */
  org: string
  community: string
  grid: string
  status: UserStatus
  source: '预置' | '注册' | '管理员创建'
  createdAt: string
  lastLogin: string
  applicationNo?: string
  rejectReason?: string
  mustChangePassword?: boolean
  projectId?: string
}

export interface AuditLog {
  id: string
  time: string
  operator: string
  role: string
  action: string
  target: string
  result: string
  ip: string
  note: string
}

export interface RegisterInput {
  name: string
  phone: string
  password: string
  registrationCode: string
  projectId: string
}

export interface CreateUserInput {
  name: string
  phone: string
  password: string
  nodeName: string
  role: AuthRole
}

export interface NotificationSettings {
  internal: boolean
  sms: boolean
  call: boolean
  intercom: boolean
  l3Times: string
  l2Times: string
  template: string
}

const USERS_KEY = 'se_platform_users_v3'
const AUDIT_KEY = 'se_platform_audit_v1'
const SESSION_KEY = 'se_platform_session_v1'
const PERMISSION_KEY = 'se_platform_permissions_v3'
const NOTIFY_KEY = 'se_platform_notifications_v1'

export const roleLabels: Record<AuthRole, string> = {
  platform_admin: '平台运营',
  project_admin: '项目管理员',
  project_staff: '项目成员',
  civil_viewer: '民政查看',
  insurance_auditor: '医保审核员',
}

export const roleDescriptions: Record<AuthRole, string> = {
  platform_admin: '开通项目、生成注册链接、跨项目运维，拥有全部业务查看权限',
  project_admin: '本项目的组织节点、成员账号、业务数据与审计维护',
  project_staff: '本项目的档案、设备、事件、任务与工单执行',
  civil_viewer: '本项目只读查看与脱敏导出',
  insurance_auditor: '长护险工单机审、人工复核、结算与稽核',
}

export const moduleDefinitions = [
  { key: 'elders', label: '老人档案', permissions: ['view', 'create', 'edit', 'delete', 'export'] as PermissionKey[] },
  { key: 'devices', label: '设备与感知', permissions: ['view', 'create', 'edit', 'delete', 'export'] as PermissionKey[] },
  { key: 'events', label: '事件中心', permissions: ['view', 'create', 'edit', 'delete', 'export', 'approve'] as PermissionKey[] },
  { key: 'tasks', label: '任务协同', permissions: ['view', 'create', 'edit', 'export', 'approve'] as PermissionKey[] },
  { key: 'workorders', label: '服务工单', permissions: ['view', 'create', 'edit', 'export', 'approve'] as PermissionKey[] },
  { key: 'audit', label: '证据与监管', permissions: ['view', 'create', 'edit', 'export', 'approve'] as PermissionKey[] },
  { key: 'map', label: '区域一张图', permissions: ['view', 'export'] as PermissionKey[] },
  { key: 'settings', label: '系统设置', permissions: ['view', 'create', 'edit', 'delete', 'export', 'approve'] as PermissionKey[] },
]

export const permissionLabels: Record<PermissionKey, string> = {
  view: '查看',
  create: '新增',
  edit: '编辑',
  delete: '删除',
  export: '导出',
  approve: '审核',
}

const seedUsers: PlatformUser[] = [
  {
    id: 'U0001',
    name: '周建国',
    phone: '13800000000',
    password: '123456',
    role: 'platform_admin',
    roleLabel: '平台运营',
    org: '平台运营中心',
    community: '',
    grid: '',
    status: '正常',
    source: '预置',
    createdAt: '2026-09-01 09:00',
    lastLogin: '2026-10-27 08:20',
  },
  {
    id: 'U0002',
    name: '吕建成',
    phone: '13800000001',
    password: '123456',
    role: 'project_admin',
    roleLabel: '项目管理员',
    projectId: 'P-AN',
    org: '安康社区',
    community: '安康社区',
    grid: '',
    status: '正常',
    source: '预置',
    createdAt: '2026-09-01 09:10',
    lastLogin: '2026-10-27 08:32',
  },
  {
    id: 'U0003',
    name: '王敏',
    phone: '13800000002',
    password: '123456',
    role: 'project_staff',
    roleLabel: '项目成员',
    projectId: 'P-AN',
    org: '第3网格',
    community: '安康社区',
    grid: '第3网格',
    status: '正常',
    source: '预置',
    createdAt: '2026-09-01 09:20',
    lastLogin: '2026-10-26 17:40',
  },
  {
    id: 'U0004',
    name: '李静',
    phone: '13800000003',
    password: '123456',
    role: 'civil_viewer',
    roleLabel: '民政查看',
    projectId: 'P-AN',
    org: '安宁区民政局',
    community: '安宁区民政局',
    grid: '',
    status: '正常',
    source: '预置',
    createdAt: '2026-09-01 09:30',
    lastLogin: '2026-10-27 09:05',
  },
  {
    id: 'U0007',
    name: '顾敏',
    phone: '13800000004',
    password: '123456',
    role: 'insurance_auditor',
    roleLabel: '医保审核员',
    projectId: 'P-AN',
    org: '安宁区医保局',
    community: '安宁区医保局',
    grid: '',
    status: '正常',
    source: '预置',
    createdAt: '2026-09-01 09:40',
    lastLogin: '2026-10-28 08:10',
  },
  {
    id: 'U0008',
    name: '李强',
    phone: '13800000005',
    password: '123456',
    role: 'project_admin',
    roleLabel: '项目管理员',
    projectId: 'P-NJ-LH',
    org: '六合区 / 雄州街道 / 龙池社区',
    community: '龙池社区',
    grid: '',
    status: '正常',
    source: '预置',
    createdAt: '2026-10-08 10:30',
    lastLogin: '2026-10-28 09:15',
  },
  {
    id: 'U0005',
    name: '王芳',
    phone: '13900000001',
    password: '123456',
    role: 'project_staff',
    roleLabel: '项目成员',
    projectId: 'P-AN',
    org: '第5网格',
    community: '安康社区',
    grid: '第5网格',
    status: '待审核',
    source: '注册',
    createdAt: '2026-10-27 09:10',
    lastLogin: '从未登录',
    applicationNo: 'REG20261027001',
  },
  {
    id: 'U0006',
    name: '陈晓',
    phone: '13900000002',
    password: '123456',
    role: 'project_staff',
    roleLabel: '项目成员',
    projectId: 'P-AN',
    org: '康乐社区',
    community: '康乐社区',
    grid: '',
    status: '已驳回',
    source: '注册',
    createdAt: '2026-10-24 14:20',
    lastLogin: '从未登录',
    applicationNo: 'REG20261024001',
    rejectReason: '组织信息与街道提供的名单不一致，请补充介绍信后重新申请',
  },
]

const seedAudit: AuditLog[] = [
  {
    id: 'A0001',
    time: '2026-10-27 09:05',
    operator: '李静',
    role: '民政查看',
    action: '登录',
    target: '平台',
    result: '成功',
    ip: '10.0.1.24',
    note: '民政账号登录',
  },
  {
    id: 'A0002',
    time: '2026-10-27 09:10',
    operator: '王芳',
    role: '申请人',
    action: '注册申请',
    target: 'REG20261027001',
    result: '待审核',
    ip: '10.0.2.18',
    note: '安康社区 第5网格 · 网格员',
  },
  {
    id: 'A0003',
    time: '2026-10-24 15:02',
    operator: '周建国',
    role: '平台管理员',
    action: '审核驳回',
    target: 'U0006',
    result: '成功',
    ip: '10.0.0.12',
    note: '驳回陈晓的社区管理员申请：组织信息与街道名单不一致',
  },
  {
    id: 'A0004',
    time: '2026-10-27 09:45',
    operator: '吕建成',
    role: '社区管理员',
    action: '导出',
    target: '巡查名单',
    result: '成功',
    ip: '10.0.1.23',
    note: '导出高风险老人 42 条',
  },
  {
    id: 'A0005',
    time: '2026-10-27 10:05',
    operator: '吕建成',
    role: '社区管理员',
    action: '隐私配置',
    target: '摄像头 401-客厅',
    result: '成功',
    ip: '10.0.1.23',
    note: '新增遮蔽区“阳台门”',
  },
  {
    id: 'A0006',
    time: '2026-10-27 10:12',
    operator: '未知账号',
    role: '-',
    action: '登录失败',
    target: '13800000009',
    result: '失败',
    ip: '10.0.3.77',
    note: '账号或密码错误',
  },
]

const defaultPermissions: Record<AuthRole, Record<string, PermissionKey[]>> = {
  platform_admin: Object.fromEntries(moduleDefinitions.map((item) => [item.key, [...item.permissions]])),
  project_admin: {
    elders: ['view', 'create', 'edit', 'delete', 'export'],
    devices: ['view', 'create', 'edit', 'delete', 'export'],
    events: ['view', 'create', 'edit', 'delete', 'export', 'approve'],
    tasks: ['view', 'create', 'edit', 'export', 'approve'],
    workorders: ['view', 'create', 'edit', 'export', 'approve'],
    audit: [],
    map: ['view', 'export'],
    settings: ['view', 'create', 'edit', 'delete', 'export', 'approve'],
  },
  project_staff: {
    elders: ['view', 'create', 'edit', 'export'],
    devices: ['view', 'create', 'edit', 'export'],
    events: ['view', 'create', 'edit', 'export'],
    tasks: ['view', 'create', 'edit', 'export'],
    workorders: ['view', 'create', 'edit', 'export'],
    audit: [],
    map: ['view'],
    settings: [],
  },
  civil_viewer: {
    elders: ['view', 'export'],
    devices: ['view', 'export'],
    events: ['view', 'export'],
    tasks: ['view'],
    workorders: ['view', 'export'],
    audit: [],
    map: ['view', 'export'],
    settings: [],
  },
  insurance_auditor: {
    elders: ['view'],
    devices: ['view'],
    events: ['view'],
    tasks: ['view'],
    workorders: ['view', 'approve'],
    audit: ['view', 'create', 'edit', 'approve', 'export'],
    map: ['view'],
    settings: [],
  },
}

const defaultNotifications: NotificationSettings = {
  internal: true,
  sms: true,
  call: true,
  intercom: true,
  l3Times: '0/2/5/10/30',
  l2Times: '0/15',
  template: '【智慧养老】{address} 发生 {eventType}，请及时处置。联系人：{contact}，时间：{time}。',
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Prototype storage is best-effort.
  }
}

function formatDateTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDate(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

/** 历史本地缓存里的旧姓名，读取时统一纠正，避免右上角仍显示旧名字 */
const legacyNames: Record<string, string> = { 徐志诚: '吕建成' }

const initialUsers = readStorage(USERS_KEY, seedUsers)
let usersRenamed = false
initialUsers.forEach((user) => {
  const nextName = legacyNames[user.name]
  if (nextName) {
    user.name = nextName
    usersRenamed = true
  }
  if (!user.projectId && user.role !== 'platform_admin') {
    user.projectId = 'P-AN'
  }
})
if (usersRenamed) writeStorage(USERS_KEY, initialUsers)

const initialAudit = readStorage(AUDIT_KEY, seedAudit)
let auditRenamed = false
initialAudit.forEach((log) => {
  const nextName = legacyNames[log.operator]
  if (nextName) {
    log.operator = nextName
    auditRenamed = true
  }
})
if (auditRenamed) writeStorage(AUDIT_KEY, initialAudit)

export const platformUsers = reactive<PlatformUser[]>(initialUsers)
export const auditLogs = reactive<AuditLog[]>(initialAudit)
export const permissionMatrix = reactive<Record<AuthRole, Record<string, PermissionKey[]>>>(
  readStorage(PERMISSION_KEY, defaultPermissions),
)
export const notificationSettings = reactive<NotificationSettings>(
  readStorage(NOTIFY_KEY, defaultNotifications),
)

function syncRole(user: PlatformUser) {
  switchRole(user.role === 'civil_viewer' ? 'civil' : 'community')
}

const sessionId = readStorage<string>(SESSION_KEY, '')
const sessionUser = platformUsers.find((item) => item.id === sessionId && item.status === '正常')
export const currentUser = ref<PlatformUser | null>(sessionUser ?? null)
if (sessionUser) {
  syncRole(sessionUser)
  if (sessionUser.projectId) setCurrentProject(sessionUser.projectId)
}

export const isAuthenticated = computed(() => Boolean(currentUser.value))
export const isPlatformAdmin = computed(() => currentUser.value?.role === 'platform_admin')
export const isProjectAdmin = computed(() => currentUser.value?.role === 'project_admin')

/** 统一权限判断：读取角色权限矩阵，平台运营固定全开 */
export function hasPermission(moduleKey: string, permission: PermissionKey = 'view') {
  const role = currentUser.value?.role
  if (!role) return false
  if (role === 'platform_admin') return true
  return (permissionMatrix[role]?.[moduleKey] ?? []).includes(permission)
}

export const canManageSettings = computed(() => hasPermission('settings'))
export const currentAuthRoleLabel = computed(() => currentUser.value?.roleLabel ?? '未登录')
export const pendingCount = computed(() => platformUsers.filter((item) => item.status === '待审核').length)

function persistUsers() {
  writeStorage(USERS_KEY, platformUsers)
}

function persistAudit() {
  writeStorage(AUDIT_KEY, auditLogs)
}

export function addAudit(
  action: string,
  target: string,
  result: string,
  note = '',
  operator = currentUser.value?.name ?? '系统',
  role = currentUser.value?.roleLabel ?? '系统',
) {
  auditLogs.unshift({
    id: `A${Date.now()}${Math.floor(Math.random() * 100)}`,
    time: formatDateTime(),
    operator,
    role,
    action,
    target,
    result,
    ip: '10.0.1.23',
    note,
  })
  if (auditLogs.length > 500) auditLogs.splice(500)
  persistAudit()
}

export function login(phone: string, password: string) {
  const user = platformUsers.find((item) => item.phone === phone)
  if (!user || user.password !== password) {
    addAudit('登录失败', phone, '失败', '账号或密码错误', phone, '-')
    return { ok: false, message: '账号或密码错误' }
  }
  if (user.status === '待审核') {
    addAudit('登录失败', phone, '失败', '账号待审核', user.name, user.roleLabel)
    return { ok: false, message: '账号待审核，请联系管理员' }
  }
  if (user.status === '停用') {
    addAudit('登录失败', phone, '失败', '账号已停用', user.name, user.roleLabel)
    return { ok: false, message: '账号已停用，请联系管理员' }
  }
  if (user.status === '已驳回') {
    addAudit('登录失败', phone, '失败', '注册申请已驳回', user.name, user.roleLabel)
    return { ok: false, message: '注册申请已驳回，请联系管理员' }
  }
  user.lastLogin = formatDateTime()
  persistUsers()
  currentUser.value = user
  if (user.projectId) {
    setCurrentProject(user.projectId)
  } else if (user.role === 'platform_admin' && projects.length > 0) {
    setCurrentProject(projects[0].id)
  }
  writeStorage(SESSION_KEY, user.id)
  syncRole(user)
  addAudit('登录', '平台', '成功', `${user.roleLabel}登录`, user.name, user.roleLabel)
  return { ok: true, message: '登录成功', user }
}

export function logout() {
  if (currentUser.value) {
    addAudit('退出登录', '平台', '成功', '用户主动退出')
  }
  currentUser.value = null
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
  switchRole('community')
}

export function register(input: RegisterInput) {
  if (platformUsers.some((item) => item.phone === input.phone)) {
    return { ok: false, message: '该手机号已注册，请直接登录' }
  }
  const sequence = platformUsers.length + 1
  const user: PlatformUser = {
    id: `U${String(sequence).padStart(4, '0')}`,
    name: input.name,
    phone: input.phone,
    password: input.password,
    role: 'project_admin',
    roleLabel: roleLabels.project_admin,
    org: '',
    community: '',
    grid: '',
    status: '正常',
    source: '注册',
    createdAt: formatDateTime(),
    lastLogin: '从未登录',
    projectId: input.projectId,
    applicationNo: `PRJ${formatDate()}${String(sequence).padStart(3, '0')}`,
    mustChangePassword: false,
  }
  platformUsers.unshift(user)
  persistUsers()
  addAudit(
    '项目注册',
    user.applicationNo ?? user.id,
    '成功',
    `通过项目注册码 ${input.registrationCode} 成为项目管理员`,
    user.name,
    '项目负责人',
  )
  return { ok: true, message: '注册成功，请使用新账号登录', user }
}

export function approveUser(id: string) {
  const user = platformUsers.find((item) => item.id === id)
  if (!user) return { ok: false, message: '用户不存在' }
  user.status = '正常'
  user.rejectReason = ''
  user.mustChangePassword = true
  persistUsers()
  addAudit('审核通过', user.id, '成功', `通过${user.name}的${user.roleLabel}申请`)
  return { ok: true, message: '已通过，账号可登录' }
}

export function rejectUser(id: string, reason: string) {
  const user = platformUsers.find((item) => item.id === id)
  if (!user) return { ok: false, message: '用户不存在' }
  if (!reason.trim()) return { ok: false, message: '请填写驳回原因' }
  user.status = '已驳回'
  user.rejectReason = reason.trim()
  persistUsers()
  addAudit('审核驳回', user.id, '成功', `驳回${user.name}的申请：${reason.trim()}`)
  return { ok: true, message: '已驳回申请' }
}

export function setUserStatus(id: string, status: '正常' | '停用') {
  const user = platformUsers.find((item) => item.id === id)
  if (!user) return { ok: false, message: '用户不存在' }
  if (status === '停用' && user.role === 'platform_admin') {
    const activeAdmins = platformUsers.filter(
      (item) => item.role === 'platform_admin' && item.status === '正常',
    ).length
    if (activeAdmins <= 1) return { ok: false, message: '至少保留一个平台运营账号' }
  }
  user.status = status
  persistUsers()
  addAudit(status === '停用' ? '停用账号' : '启用账号', user.id, '成功', user.name)
  if (currentUser.value?.id === user.id && status === '停用') logout()
  return { ok: true, message: status === '停用' ? '账号已停用' : '账号已启用' }
}

export function resetUserPassword(id: string, password: string) {
  const user = platformUsers.find((item) => item.id === id)
  if (!user) return { ok: false, message: '用户不存在' }
  if (password.length < 6) return { ok: false, message: '密码至少 6 位' }
  user.password = password
  user.mustChangePassword = true
  persistUsers()
  addAudit('重置密码', user.id, '成功', `${user.name} · 需首次登录修改密码`)
  return { ok: true, message: '密码已重置，用户首次登录需修改密码' }
}

export interface UpdateUserInput {
  role: AuthRole
  nodeName: string
}

export function updateUser(id: string, payload: UpdateUserInput) {
  const user = platformUsers.find((item) => item.id === id)
  if (!user) return { ok: false, message: '用户不存在' }
  if (user.status === '待审核') return { ok: false, message: '待审核账号请先完成审核' }
  if (currentUser.value?.id === user.id && payload.role !== user.role) {
    return { ok: false, message: '不能调整自己的角色，请联系其他管理员' }
  }
  if (!payload.nodeName) return { ok: false, message: '请选择所属节点' }
  if (payload.role === 'platform_admin' && user.role !== 'platform_admin') {
    return { ok: false, message: '平台运营账号不由项目内开通' }
  }
  if (payload.role === 'project_admin' && user.role !== 'project_admin') {
    return { ok: false, message: '项目管理员通过项目注册链接产生，不能在此授予' }
  }
  if (user.role === 'platform_admin' && payload.role !== 'platform_admin') {
    const activeAdmins = platformUsers.filter(
      (item) => item.role === 'platform_admin' && item.status === '正常',
    ).length
    if (activeAdmins <= 1) return { ok: false, message: '至少保留一个平台运营账号' }
  }
  if (user.role === 'project_admin' && payload.role !== 'project_admin') {
    const activeProjectAdmins = platformUsers.filter(
      (item) =>
        item.role === 'project_admin' &&
        item.projectId === user.projectId &&
        item.status === '正常',
    ).length
    if (activeProjectAdmins <= 1) {
      return { ok: false, message: '每个项目至少保留一个项目管理员' }
    }
  }

  const before = `${user.roleLabel} · ${user.org || '未分配节点'}`
  user.role = payload.role
  user.roleLabel = roleLabels[payload.role]
  user.org = payload.nodeName
  user.community = payload.nodeName
  user.grid = ''
  persistUsers()
  addAudit('调整账号', user.id, '成功', `${before} → ${user.roleLabel} · ${user.org}`)
  return { ok: true, message: '账号角色与所属节点已更新' }
}

export function changeOwnPassword(oldPassword: string, newPassword: string) {
  const user = currentUser.value
  if (!user) return { ok: false, message: '登录已过期，请重新登录' }
  if (user.password !== oldPassword) return { ok: false, message: '当前密码不正确' }
  if (newPassword.length < 6 || newPassword.length > 20) {
    return { ok: false, message: '新密码需为 6–20 位' }
  }
  if (newPassword === oldPassword) {
    return { ok: false, message: '新密码不能与当前密码相同' }
  }
  user.password = newPassword
  user.mustChangePassword = false
  persistUsers()
  addAudit('修改密码', user.id, '成功', '首次登录修改初始密码')
  return { ok: true, message: '密码已更新' }
}

export function createUser(input: CreateUserInput) {
  if (platformUsers.some((item) => item.phone === input.phone)) {
    return { ok: false, message: '该手机号已存在' }
  }
  if (input.role === 'project_admin' && currentUser.value?.role !== 'platform_admin') {
    return { ok: false, message: '项目管理员由项目注册链接产生，项目内不能直接创建' }
  }
  if (!input.nodeName) return { ok: false, message: '请选择所属节点' }
  const sequence = platformUsers.length + 1
  const user: PlatformUser = {
    id: `U${String(sequence).padStart(4, '0')}`,
    name: input.name,
    phone: input.phone,
    password: input.password,
    role: input.role,
    roleLabel: roleLabels[input.role],
    org: input.nodeName,
    community: input.nodeName,
    grid: '',
    status: '正常',
    source: '管理员创建',
    createdAt: formatDateTime(),
    lastLogin: '从未登录',
    mustChangePassword: true,
    projectId: currentProjectId.value,
  }
  platformUsers.unshift(user)
  persistUsers()
  addAudit('新增用户', user.id, '成功', `${user.name} · ${user.roleLabel} · ${user.org}`)
  return { ok: true, message: '用户已创建', user }
}

export function savePermissions() {
  const adminModules = permissionMatrix.platform_admin.settings ?? []
  if (!adminModules.includes('view')) {
    return { ok: false, message: '平台运营必须保留系统设置权限' }
  }
  writeStorage(PERMISSION_KEY, permissionMatrix)
  addAudit('权限保存', '角色权限矩阵', '成功', '更新角色模块权限')
  return { ok: true, message: '权限已保存' }
}

export function saveNotifications() {
  if (!notificationSettings.internal) {
    return { ok: false, message: '站内通知为必选通道' }
  }
  writeStorage(NOTIFY_KEY, notificationSettings)
  addAudit('通知配置', '通知通道与模板', '成功', '更新通知通道与升级时限')
  return { ok: true, message: '通知配置已保存' }
}

export function resetPasswordByPhone(phone: string, password: string) {
  const user = platformUsers.find((item) => item.phone === phone)
  if (!user) return { ok: false, message: '手机号未注册' }
  if (password.length < 6) return { ok: false, message: '密码至少 6 位' }
  user.password = password
  persistUsers()
  addAudit('找回密码', user.id, '成功', user.name, user.name, user.roleLabel)
  return { ok: true, message: '密码已重置，请使用新密码登录' }
}
