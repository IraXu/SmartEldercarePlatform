import { reactive, watch } from 'vue'
import { currentProjectId } from './useOrg'

/** 业务字典项：项目内可维护的任务类型、服务项目、异常类型 */
export interface DictItem {
  id: string
  label: string
  short?: string
  enabled: boolean
  note?: string
}

/** 服务人员台账项：项目内机构人员，派单时可选 */
export interface StaffItem {
  id: string
  name: string
  org: string
  phone: string
  title: string
  qualifications: string[]
  rating: number
  enabled: boolean
}

interface DictStore {
  taskTypes: Record<string, DictItem[]>
  serviceItems: Record<string, DictItem[]>
  exceptionTypes: Record<string, DictItem[]>
  staff: Record<string, StaffItem[]>
}

const STORE_KEY = 'se_platform_dict_v2'

let seedIndex = 0
function dictId(prefix: string) {
  seedIndex += 1
  return `${prefix}-${Date.now().toString(36)}${seedIndex}`
}

function defaultTaskTypes(): DictItem[] {
  return [
    { id: 'TT-01', label: '应急到场', short: '应急', enabled: true, note: 'L3 事件到场核实' },
    { id: 'TT-02', label: '上门探视', short: '探视', enabled: true, note: '日常探视与情况反馈' },
    { id: 'TT-03', label: '代购', short: '代购', enabled: true, note: '生活物资代购' },
    { id: 'TT-04', label: '陪同就医', short: '就医', enabled: true, note: '陪同就诊与取药' },
    { id: 'TT-05', label: '检查水电', short: '水电', enabled: true, note: '水电气与门窗安全检查' },
    { id: 'TT-06', label: '开门配合', short: '开门', enabled: true, note: '配合家属或救援开门' },
  ]
}

function defaultServiceItems(): DictItem[] {
  return [
    { id: 'SI-01', label: '助浴', enabled: true, note: '协助沐浴、擦身并观察皮肤状况' },
    { id: 'SI-02', label: '助餐', enabled: true, note: '协助进食、喂食与餐后清洁' },
    { id: 'SI-03', label: '康复训练', enabled: true, note: '按康复方案进行肢体功能训练' },
    { id: 'SI-04', label: '翻身拍背', enabled: true, note: '卧床老人定时翻身与拍背排痰' },
    { id: 'SI-05', label: '生命体征监测', enabled: true, note: '测量血压、心率、血氧并记录' },
    { id: 'SI-06', label: '健康监测', enabled: true, note: '用药提醒与基础健康观察' },
    { id: 'SI-07', label: '家居清洁', enabled: true, note: '居室清洁、整理与通风' },
  ]
}

function defaultExceptionTypes(): DictItem[] {
  return [
    { id: 'ET-01', label: '老人不在家', enabled: true, note: '上门无人应答，需重新预约' },
    { id: 'ET-02', label: '老人拒绝服务', enabled: true, note: '老人或家属临时拒绝本次服务' },
    { id: 'ET-03', label: '身体不适需就医', enabled: true, note: '服务中发现异常需转医处理' },
    { id: 'ET-04', label: '门锁无法打开', enabled: true, note: '钥匙、密码或门锁故障' },
    { id: 'ET-05', label: '设备或记录仪故障', enabled: true, note: '签到设备或记录仪不可用' },
  ]
}

function defaultStaff(): StaffItem[] {
  return [
    {
      id: 'ST-01',
      name: '陈晓',
      org: '安康居家护理站',
      phone: '13900003001',
      title: '高级护理员',
      qualifications: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测'],
      rating: 4.9,
      enabled: true,
    },
    {
      id: 'ST-02',
      name: '刘敏',
      org: '安康居家护理站',
      phone: '13900003002',
      title: '护理员',
      qualifications: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测', '健康监测', '家居清洁'],
      rating: 4.8,
      enabled: true,
    },
    {
      id: 'ST-03',
      name: '王强',
      org: '康乐颐养服务中心',
      phone: '13900003003',
      title: '康复师',
      qualifications: ['康复训练', '助餐', '生命体征监测', '健康监测', '家居清洁'],
      rating: 4.7,
      enabled: true,
    },
    {
      id: 'ST-04',
      name: '赵丽',
      org: '康乐颐养服务中心',
      phone: '13900003004',
      title: '护理员',
      qualifications: ['助浴', '助餐', '翻身拍背', '生命体征监测', '家居清洁'],
      rating: 4.6,
      enabled: true,
    },
  ]
}

function readStore(): DictStore {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DictStore
      if (
        parsed.taskTypes &&
        parsed.serviceItems &&
        parsed.exceptionTypes &&
        parsed.staff
      ) {
        return parsed
      }
    }
  } catch {
    // 原型存储失败时回落到默认字典
  }
  return { taskTypes: {}, serviceItems: {}, exceptionTypes: {}, staff: {} }
}

const store = readStore()

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // 原型存储失败不阻断交互
  }
}

function ensure(projectId: string) {
  if (!store.taskTypes[projectId]) store.taskTypes[projectId] = defaultTaskTypes()
  if (!store.serviceItems[projectId]) store.serviceItems[projectId] = defaultServiceItems()
  if (!store.exceptionTypes[projectId]) store.exceptionTypes[projectId] = defaultExceptionTypes()
  if (!store.staff[projectId]) store.staff[projectId] = defaultStaff()
}

ensure(currentProjectId.value)

export const taskTypeDict = reactive<DictItem[]>(store.taskTypes[currentProjectId.value])
export const serviceItemDict = reactive<DictItem[]>(store.serviceItems[currentProjectId.value])
export const exceptionTypeDict = reactive<DictItem[]>(store.exceptionTypes[currentProjectId.value])
export const staffDict = reactive<StaffItem[]>(store.staff[currentProjectId.value])

/** 供筛选与表单直接使用的启用项，切换项目时同步替换 */
export const taskTypeOptions = reactive<string[]>([])
export const serviceItemOptions = reactive<string[]>([])
export const exceptionTypeOptions = reactive<string[]>([])
export const staffOptions = reactive<StaffItem[]>([])

function syncOptions() {
  taskTypeOptions.splice(
    0,
    taskTypeOptions.length,
    ...taskTypeDict.filter((item) => item.enabled).map((item) => item.label),
  )
  serviceItemOptions.splice(
    0,
    serviceItemOptions.length,
    ...serviceItemDict.filter((item) => item.enabled).map((item) => item.label),
  )
  exceptionTypeOptions.splice(
    0,
    exceptionTypeOptions.length,
    ...exceptionTypeDict.filter((item) => item.enabled).map((item) => item.label),
  )
  staffOptions.splice(
    0,
    staffOptions.length,
    ...staffDict.filter((item) => item.enabled),
  )
}

function replaceList<T>(target: T[], source: T[]) {
  const next = [...source]
  target.splice(0, target.length, ...next)
}

function switchProject(projectId: string) {
  ensure(projectId)
  replaceList(taskTypeDict, store.taskTypes[projectId])
  replaceList(serviceItemDict, store.serviceItems[projectId])
  replaceList(exceptionTypeDict, store.exceptionTypes[projectId])
  replaceList(staffDict, store.staff[projectId])
  syncOptions()
}

watch(
  currentProjectId,
  (projectId) => {
    switchProject(projectId)
  },
  { immediate: true },
)

watch([taskTypeDict, serviceItemDict, exceptionTypeDict, staffDict], () => {
  syncOptions()
  persist()
})

export type DictKind = 'taskTypes' | 'serviceItems' | 'exceptionTypes'

const dictMap: Record<DictKind, DictItem[]> = {
  taskTypes: taskTypeDict,
  serviceItems: serviceItemDict,
  exceptionTypes: exceptionTypeDict,
}

const prefixMap: Record<DictKind, string> = {
  taskTypes: 'TT',
  serviceItems: 'SI',
  exceptionTypes: 'ET',
}

export function addDictItem(
  kind: DictKind,
  payload: { label: string; short?: string; note?: string },
) {
  const label = payload.label.trim()
  if (!label) return { ok: false, message: '请填写名称' }
  if (dictMap[kind].some((item) => item.label === label)) {
    return { ok: false, message: '该名称已存在' }
  }
  dictMap[kind].push({
    id: dictId(prefixMap[kind]),
    label,
    short: payload.short?.trim() || undefined,
    note: payload.note?.trim() || undefined,
    enabled: true,
  })
  return { ok: true, message: `已新增「${label}」` }
}

export function updateDictItem(
  kind: DictKind,
  id: string,
  payload: { label: string; short?: string; note?: string },
) {
  const item = dictMap[kind].find((row) => row.id === id)
  if (!item) return { ok: false, message: '字典项不存在' }
  const label = payload.label.trim()
  if (!label) return { ok: false, message: '请填写名称' }
  if (dictMap[kind].some((row) => row.id !== id && row.label === label)) {
    return { ok: false, message: '该名称已存在' }
  }
  item.label = label
  item.short = payload.short?.trim() || undefined
  item.note = payload.note?.trim() || undefined
  return { ok: true, message: '已保存' }
}

export function toggleDictItem(kind: DictKind, id: string) {
  const item = dictMap[kind].find((row) => row.id === id)
  if (!item) return { ok: false, message: '字典项不存在' }
  item.enabled = !item.enabled
  return { ok: true, message: `${item.label} 已${item.enabled ? '启用' : '停用'}` }
}

export function removeDictItem(kind: DictKind, id: string) {
  const index = dictMap[kind].findIndex((row) => row.id === id)
  if (index < 0) return { ok: false, message: '字典项不存在' }
  const [removed] = dictMap[kind].splice(index, 1)
  return { ok: true, message: `已删除「${removed.label}」` }
}

export function addStaff(payload: {
  name: string
  org: string
  phone: string
  title: string
  qualifications: string[]
}) {
  const name = payload.name.trim()
  if (!name || !payload.org.trim()) return { ok: false, message: '请填写姓名与所属机构' }
  if (staffDict.some((item) => item.name === name && item.org === payload.org.trim())) {
    return { ok: false, message: '该机构下已存在同名人员' }
  }
  staffDict.push({
    id: dictId('ST'),
    name,
    org: payload.org.trim(),
    phone: payload.phone.trim(),
    title: payload.title.trim() || '护理员',
    qualifications: payload.qualifications,
    rating: 4.5,
    enabled: true,
  })
  return { ok: true, message: `已新增服务人员「${name}」` }
}

export function updateStaff(
  id: string,
  payload: {
    name: string
    org: string
    phone: string
    title: string
    qualifications: string[]
  },
) {
  const item = staffDict.find((row) => row.id === id)
  if (!item) return { ok: false, message: '人员不存在' }
  const name = payload.name.trim()
  const org = payload.org.trim()
  if (!name || !org) return { ok: false, message: '请填写姓名与所属机构' }
  if (staffDict.some((row) => row.id !== id && row.name === name && row.org === org)) {
    return { ok: false, message: '该机构下已存在同名人员' }
  }
  item.name = name
  item.org = org
  item.phone = payload.phone.trim()
  item.title = payload.title.trim() || item.title
  item.qualifications = payload.qualifications
  return { ok: true, message: `已保存「${name}」` }
}

export function toggleStaff(id: string) {
  const item = staffDict.find((row) => row.id === id)
  if (!item) return { ok: false, message: '人员不存在' }
  item.enabled = !item.enabled
  return { ok: true, message: `${item.name} 已${item.enabled ? '启用' : '停用'}` }
}

export function removeStaff(id: string) {
  const index = staffDict.findIndex((row) => row.id === id)
  if (index < 0) return { ok: false, message: '人员不存在' }
  const [removed] = staffDict.splice(index, 1)
  return { ok: true, message: `已删除「${removed.name}」` }
}
