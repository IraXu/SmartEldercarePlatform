import { computed, reactive, ref } from 'vue'

export type ProjectStatus = '筹备' | '运行' | '停用'
export type NodeStatus = '启用' | '停用'
export type OrgUnitType = '民政局' | '医保局' | '服务机构'

export interface Project {
  id: string
  name: string
  city: string
  district: string
  status: ProjectStatus
  dataRegion: string
  contact: string
  registrationCode: string
  createdAt: string
}

/**
 * 组织节点不再区分街道/社区/网格，统一为可自定义名称、任意层级的节点。
 * parentId 为空表示项目根节点。
 */
export interface OrgNode {
  id: string
  projectId: string
  parentId: string
  name: string
  status: NodeStatus
}

export interface OrgUnit {
  id: string
  projectId: string
  name: string
  type: OrgUnitType
  status: NodeStatus
  contact?: string
}

const STORE_KEY = 'se_platform_projects_v4'
const CURRENT_KEY = 'se_platform_project_v1'

interface OrgStore {
  projects: Project[]
  nodes: OrgNode[]
  units: OrgUnit[]
}

function buildSeed(): OrgStore {
  const projects: Project[] = [
    {
      id: 'P-AN',
      name: '安宁区智慧养老服务项目',
      city: '安宁市',
      district: '安宁区',
      status: '运行',
      dataRegion: '华东 · 安宁',
      contact: '安宁区民政局',
      registrationCode: 'AN2026',
      createdAt: '2026-08-15 09:00',
    },
    {
      id: 'P-NJ-LH',
      name: '六合区智慧养老服务项目',
      city: '南京市',
      district: '六合区',
      status: '运行',
      dataRegion: '华东 · 南京',
      contact: '六合区民政局',
      registrationCode: 'LH2026',
      createdAt: '2026-10-08 10:20',
    },
    {
      id: 'P-YZ-HJ',
      name: '邗江区智慧养老服务项目',
      city: '扬州市',
      district: '邗江区',
      status: '筹备',
      dataRegion: '华东 · 扬州',
      contact: '邗江区民政局',
      registrationCode: 'HJ2026',
      createdAt: '2026-10-20 14:30',
    },
  ]

  const nodes: OrgNode[] = []
  const add = (projectId: string, parentId: string, name: string) => {
    const node: OrgNode = {
      id: `N-${projectId}-${nodes.length + 1}`,
      projectId,
      parentId,
      name,
      status: '启用',
    }
    nodes.push(node)
    return node
  }

  const seedTree = (
    projectId: string,
    root: string,
    branches: Array<{ name: string; children: Array<{ name: string; leaves: number }> }>,
  ) => {
    const rootNode = add(projectId, '', root)
    branches.forEach((branch) => {
      const branchNode = add(projectId, rootNode.id, branch.name)
      branch.children.forEach((child) => {
        const childNode = add(projectId, branchNode.id, child.name)
        for (let index = 1; index <= child.leaves; index += 1) {
          add(projectId, childNode.id, `第${index}网格`)
        }
      })
    })
  }

  seedTree('P-AN', '安宁区', [
    {
      name: '安康街道',
      children: [
        { name: '安康社区', leaves: 6 },
        { name: '康乐社区', leaves: 4 },
      ],
    },
  ])
  seedTree('P-NJ-LH', '六合区', [
    { name: '雄州街道', children: [{ name: '龙池社区', leaves: 3 }] },
  ])
  seedTree('P-YZ-HJ', '邗江区', [
    { name: '邗上街道', children: [{ name: '兰庄社区', leaves: 3 }] },
  ])

  const units: OrgUnit[] = [
    { id: 'U-AN-CIVIL', projectId: 'P-AN', name: '安宁区民政局', type: '民政局', status: '启用', contact: '民政业务科' },
    { id: 'U-AN-MEDICAL', projectId: 'P-AN', name: '安宁区医保局', type: '医保局', status: '启用', contact: '长护险经办科' },
    { id: 'U-AN-ORG-01', projectId: 'P-AN', name: '安康居家护理站', type: '服务机构', status: '启用', contact: '陈晓' },
    { id: 'U-AN-ORG-02', projectId: 'P-AN', name: '康乐颐养服务中心', type: '服务机构', status: '启用', contact: '王强' },
    { id: 'U-LH-CIVIL', projectId: 'P-NJ-LH', name: '六合区民政局', type: '民政局', status: '启用', contact: '养老服务科' },
    { id: 'U-LH-MEDICAL', projectId: 'P-NJ-LH', name: '六合区医保局', type: '医保局', status: '启用', contact: '长护险经办科' },
    { id: 'U-LH-ORG-01', projectId: 'P-NJ-LH', name: '龙池颐养服务中心', type: '服务机构', status: '启用', contact: '待分配' },
    { id: 'U-HJ-CIVIL', projectId: 'P-YZ-HJ', name: '邗江区民政局', type: '民政局', status: '启用', contact: '养老服务科' },
    { id: 'U-HJ-MEDICAL', projectId: 'P-YZ-HJ', name: '邗江区医保局', type: '医保局', status: '启用', contact: '长护险经办科' },
    { id: 'U-HJ-ORG-01', projectId: 'P-YZ-HJ', name: '兰庄养老服务站', type: '服务机构', status: '启用', contact: '待分配' },
  ]

  return { projects, nodes, units }
}

function readStore(): OrgStore {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as OrgStore
      if (
        Array.isArray(parsed.projects) &&
        Array.isArray(parsed.nodes) &&
        Array.isArray(parsed.units)
      ) {
        return parsed
      }
    }
  } catch {
    // Prototype storage is best-effort.
  }
  return buildSeed()
}

const initial = readStore()
export const projects = reactive<Project[]>(initial.projects)
export const orgNodes = reactive<OrgNode[]>(initial.nodes)
export const orgUnits = reactive<OrgUnit[]>(initial.units)

const savedProjectId = localStorage.getItem(CURRENT_KEY) ?? ''
export const currentProjectId = ref(
  projects.some((item) => item.id === savedProjectId) ? savedProjectId : projects[0].id,
)

export const currentProject = computed(
  () => projects.find((item) => item.id === currentProjectId.value) ?? projects[0],
)

export const projectOptions = computed(() =>
  projects
    .filter((item) => item.status !== '停用')
    .map((item) => ({
      value: item.id,
      label: `${item.name}（${item.city} · ${item.district}）`,
    })),
)

export const projectNodes = computed(() =>
  orgNodes.filter((item) => item.projectId === currentProjectId.value),
)

export const projectRootNodes = computed(() =>
  projectNodes.value.filter((item) => !item.parentId),
)

export const projectRoot = computed(() => projectRootNodes.value[0] ?? null)

export const projectUnits = computed(() =>
  orgUnits.filter((item) => item.projectId === currentProjectId.value),
)

export const activeProjectNodes = computed(() =>
  projectNodes.value.filter((item) => item.status === '启用'),
)

export const projectLeafNodes = computed(() =>
  projectNodes.value.filter(
    (item) => !projectNodes.value.some((child) => child.parentId === item.id),
  ),
)

/** 业务筛选用：根节点以下的启用节点，按树顺序返回 */
export const businessNodeOptions = computed(() =>
  projectNodes.value
    .filter((item) => item.parentId && item.status === '启用')
    .map((item) => ({ value: item.name, label: item.name })),
)

/** 兼容业务页筛选用：根节点以下的启用节点 */
export const activeCommunities = computed(() =>
  projectNodes.value.filter((item) => item.parentId && item.status === '启用'),
)

export function childrenOf(parentId: string) {
  return projectNodes.value.filter((item) => item.parentId === parentId)
}

export function descendantIds(nodeId: string) {
  const ids: string[] = []
  const walk = (id: string) => {
    childrenOf(id).forEach((child) => {
      ids.push(child.id)
      walk(child.id)
    })
  }
  walk(nodeId)
  return ids
}

export function nodePath(node: OrgNode) {
  const names: string[] = [node.name]
  let parent = projectNodes.value.find((item) => item.id === node.parentId)
  while (parent) {
    names.unshift(parent.name)
    parent = projectNodes.value.find((item) => item.id === parent?.parentId)
  }
  return names.join(' / ')
}

export function findNodeByName(name: string, projectId = currentProjectId.value) {
  return (
    orgNodes.find(
      (item) => item.projectId === projectId && item.name === name,
    ) ?? null
  )
}

export function accountOrgOptions() {
  return [
    ...projectNodes.value.filter((item) => item.parentId).map((item) => item.name),
    ...projectUnits.value.filter((item) => item.status === '启用').map((item) => item.name),
  ]
}

export function orgUnitOptions(type: OrgUnitType, projectId = currentProjectId.value) {
  return orgUnits
    .filter(
      (item) => item.projectId === projectId && item.type === type && item.status === '启用',
    )
    .map((item) => ({ value: item.name, label: item.name }))
}

export function setCurrentProject(id: string) {
  if (!projects.some((item) => item.id === id)) return { ok: false, message: '项目不存在' }
  currentProjectId.value = id
  localStorage.setItem(CURRENT_KEY, id)
  return { ok: true, message: '项目已切换' }
}

export function switchProject(id: string) {
  const project = projects.find((item) => item.id === id)
  if (!project) return { ok: false, message: '项目不存在' }
  if (project.status === '停用') return { ok: false, message: '该项目已停用' }
  return setCurrentProject(id)
}

function persist() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ projects, nodes: orgNodes, units: orgUnits }),
    )
    localStorage.setItem(CURRENT_KEY, currentProjectId.value)
  } catch {
    // ignore
  }
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function createProject(payload: {
  city: string
  district: string
  dataRegion: string
  contact: string
  rootName?: string
}) {
  const city = payload.city.trim()
  const district = payload.district.trim()
  if (!city || !district) return { ok: false, message: '请填写城市与区县' }
  if (projects.some((item) => item.city === city && item.district === district)) {
    return { ok: false, message: '该区县项目已存在' }
  }
  const projectId = `P-${String(projects.length + 1).padStart(3, '0')}`
  const project: Project = {
    id: projectId,
    name: `${district}智慧养老服务项目`,
    city,
    district,
    status: '筹备',
    dataRegion: payload.dataRegion.trim() || '待分配',
    contact: payload.contact.trim() || `${district}民政局`,
    registrationCode: randomCode(),
    createdAt: formatDateTime(),
  }
  projects.push(project)
  orgNodes.push({
    id: `${projectId}-ROOT`,
    projectId,
    parentId: '',
    name: payload.rootName?.trim() || district,
    status: '启用',
  })
  persist()
  return { ok: true, message: `项目「${project.name}」已创建`, project }
}

export function toggleProject(id: string) {
  const project = projects.find((item) => item.id === id)
  if (!project) return { ok: false, message: '项目不存在' }
  if (project.id === currentProjectId.value) {
    return { ok: false, message: '不能停用当前正在维护的项目' }
  }
  project.status = project.status === '停用' ? '运行' : '停用'
  persist()
  return { ok: true, message: project.status === '停用' ? '项目已停用' : '项目已启用' }
}

export function resetRegistrationCode(id: string) {
  const project = projects.find((item) => item.id === id)
  if (!project) return { ok: false, message: '项目不存在' }
  project.registrationCode = randomCode()
  persist()
  return { ok: true, message: '注册码已重置', code: project.registrationCode }
}

export interface RegistrationResolution {
  ok: boolean
  message: string
  project?: Project
}

export function resolveRegistrationCode(code: string): RegistrationResolution {
  const value = code.trim().toUpperCase()
  if (!value) return { ok: false, message: '请输入项目注册码' }
  const project = projects.find((item) => item.registrationCode === value)
  if (!project) return { ok: false, message: '注册码无效，请向平台运营方获取专属注册链接' }
  if (project.status === '停用') return { ok: false, message: '所属项目已停用，请联系平台运营方' }
  return {
    ok: true,
    message: `已匹配项目：${project.name}`,
    project,
  }
}

export function addNode(payload: { parentId: string; name: string }) {
  const name = payload.name.trim()
  if (!name) return { ok: false, message: '请填写节点名称' }
  if (name.length < 1 || name.length > 20) return { ok: false, message: '节点名称需 1–20 个字符' }
  if (!payload.parentId) return { ok: false, message: '请选择上级节点' }
  const parent = projectNodes.value.find((item) => item.id === payload.parentId)
  if (!parent) return { ok: false, message: '上级节点不存在' }
  if (childrenOf(parent.id).some((item) => item.name === name)) {
    return { ok: false, message: '同级下已存在同名节点' }
  }
  const node: OrgNode = {
    id: `N-${currentProjectId.value}-${Date.now()}`,
    projectId: currentProjectId.value,
    parentId: parent.id,
    name,
    status: '启用',
  }
  orgNodes.push(node)
  persist()
  return { ok: true, message: `节点「${name}」已创建`, node }
}

export function renameNode(id: string, name: string) {
  const value = name.trim()
  if (!value) return { ok: false, message: '请填写节点名称' }
  const node = projectNodes.value.find((item) => item.id === id)
  if (!node) return { ok: false, message: '节点不存在' }
  if (childrenOf(node.parentId).some((item) => item.id !== id && item.name === value)) {
    return { ok: false, message: '同级下已存在同名节点' }
  }
  const duplicatedAccount = projectUnits.value.some((item) => item.name === node.name)
  node.name = value
  persist()
  return {
    ok: true,
    message: duplicatedAccount ? '节点已重命名，原名称的机构账号需重新分配' : '节点已重命名',
  }
}

export function toggleNode(id: string) {
  const node = projectNodes.value.find((item) => item.id === id)
  if (!node) return { ok: false, message: '节点不存在' }
  if (!node.parentId) return { ok: false, message: '项目根节点不可停用' }
  if (node.status === '启用' && childrenOf(node.id).some((item) => item.status === '启用')) {
    return { ok: false, message: '请先停用该节点下的启用子节点' }
  }
  node.status = node.status === '启用' ? '停用' : '启用'
  persist()
  return { ok: true, message: node.status === '启用' ? '节点已启用' : '节点已停用' }
}

export function deleteNode(id: string) {
  const node = projectNodes.value.find((item) => item.id === id)
  if (!node) return { ok: false, message: '节点不存在' }
  if (!node.parentId) return { ok: false, message: '项目根节点不可删除' }
  if (childrenOf(node.id).length > 0) {
    return { ok: false, message: '请先删除该节点下的子节点' }
  }
  const index = orgNodes.findIndex((item) => item.id === id)
  if (index >= 0) orgNodes.splice(index, 1)
  persist()
  return { ok: true, message: `节点「${node.name}」已删除` }
}

export function addOrgUnit(payload: { name: string; type: OrgUnitType }) {
  const name = payload.name.trim()
  if (!name) return { ok: false, message: '请填写机构名称' }
  if (projectUnits.value.some((item) => item.name === name)) {
    return { ok: false, message: '该项目下机构名称已存在' }
  }
  orgUnits.push({
    id: `U-${Date.now()}`,
    projectId: currentProjectId.value,
    name,
    type: payload.type,
    status: '启用',
  })
  persist()
  return { ok: true, message: `机构「${name}」已创建` }
}

export function toggleOrgUnit(id: string) {
  const unit = orgUnits.find((item) => item.id === id && item.projectId === currentProjectId.value)
  if (!unit) return { ok: false, message: '机构不存在' }
  if (unit.type !== '服务机构') {
    return { ok: false, message: '民政局与医保局为项目基础机构，不可停用' }
  }
  unit.status = unit.status === '启用' ? '停用' : '启用'
  persist()
  return { ok: true, message: unit.status === '启用' ? '机构已启用' : '机构已停用' }
}

export function projectNodeCount(id: string) {
  return {
    nodes: orgNodes.filter((item) => item.projectId === id).length,
    leaves: orgNodes.filter(
      (item) =>
        item.projectId === id &&
        !orgNodes.some((child) => child.projectId === id && child.parentId === item.id),
    ).length,
  }
}

export function orgDisplayName(input: { org: string; community: string; grid: string }) {
  if (input.grid) return `${input.community} · ${input.grid}`
  return input.org || input.community || '未分配节点'
}

export function resetOrgStore() {
  const seed = buildSeed()
  projects.splice(0, projects.length, ...seed.projects)
  orgNodes.splice(0, orgNodes.length, ...seed.nodes)
  orgUnits.splice(0, orgUnits.length, ...seed.units)
  currentProjectId.value = seed.projects[0].id
  persist()
}

function formatDateTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
