import { computed, reactive } from 'vue'
import { addAudit, currentUser } from './useAuth'
import { elders } from '@/mock/elders'
import { getEventById, markEventStatus } from '@/mock/events'
import { taskTypeDict, taskTypeOptions as taskTypeOptionsFromDict } from './useDict'

export type TaskType = string
export type TaskStatus = '待接单' | '已接单' | '执行中' | '待确认' | '已完成' | '已退回' | '已取消'
export type TaskSource = '事件转派' | '子女委托' | '社区创建'
export type RewardType = '公益' | '计费'
export type ExecutorType = '物业' | '网格员'

export interface ChecklistItem {
  id: string
  label: string
  required: boolean
  photoRequired: boolean
  done: boolean
  photoCount: number
}

export interface TaskTimelineItem {
  time: string
  action: string
  operator: string
  note?: string
  tone?: 'blue' | 'green' | 'red' | 'gray' | 'orange'
}

export interface TaskEntry {
  keyHolder: string
  smartLock: boolean
  smartLockPassword: string
  propertyOpen: boolean
  note: string
}

export interface Task {
  id: string
  type: TaskType
  source: TaskSource
  status: TaskStatus
  elderId: string
  elderName: string
  community: string
  grid: string
  address: string
  eventId?: string
  contactName: string
  contactPhone: string
  entry: TaskEntry
  publisher: string
  publisherRole: string
  executorName: string
  executorOrg: string
  executorPhone: string
  executorType: ExecutorType
  windowStart: string
  windowEnd: string
  acceptLimit: number
  arriveLimit: number
  createdAt: string
  acceptedAt?: string
  arrivedAt?: string
  submittedAt?: string
  completedAt?: string
  returnedAt?: string
  cancelledAt?: string
  rewardType: RewardType
  fee?: number
  payNote?: string
  checklist: ChecklistItem[]
  photos: number
  execNote?: string
  confirmNote?: string
  rating?: number
  review?: string
  returnReason?: string
  cancelReason?: string
  responsibility: {
    text: string
    agreedBy: string
    agreedAt: string
    version: string
  }
  timeline: TaskTimelineItem[]
}

export interface Executor {
  name: string
  org: string
  phone: string
  type: ExecutorType
}

export const taskTypeOptions: string[] = taskTypeOptionsFromDict

export const taskStatusOptions: TaskStatus[] = [
  '待接单',
  '已接单',
  '执行中',
  '待确认',
  '已完成',
  '已退回',
  '已取消',
]

export const executors: Executor[] = [
  { name: '陈志强', org: '幸福里物业', phone: '13900002001', type: '物业' },
  { name: '刘芳', org: '幸福里物业', phone: '13900002002', type: '物业' },
  { name: '王敏', org: '安康社区 第3网格', phone: '13800000002', type: '网格员' },
  { name: '李强', org: '安康社区 第1网格', phone: '13900002003', type: '网格员' },
]

export const checklistTemplates: Record<string, Array<Omit<ChecklistItem, 'id' | 'done' | 'photoCount'>>> = {
  应急到场: [
    { label: '电话联系老人或家属', required: true, photoRequired: false },
    { label: '确认现场环境安全', required: true, photoRequired: true },
    { label: '查看老人意识与身体状态', required: true, photoRequired: false },
    { label: '按需协助联系 120 或社区', required: true, photoRequired: false },
    { label: '拍照留证并反馈社区', required: true, photoRequired: true },
  ],
  上门探视: [
    { label: '敲门问候并表明身份', required: true, photoRequired: false },
    { label: '查看老人起居与精神状态', required: true, photoRequired: false },
    { label: '检查水电门窗安全', required: true, photoRequired: true },
    { label: '与家属反馈探视情况', required: true, photoRequired: false },
    { label: '拍照留证', required: true, photoRequired: true },
  ],
  代购: [
    { label: '与委托人确认采购清单', required: true, photoRequired: false },
    { label: '完成采购并核对小票', required: true, photoRequired: true },
    { label: '送达老人手中', required: true, photoRequired: false },
    { label: '拍照留证并反馈', required: true, photoRequired: true },
  ],
  陪同就医: [
    { label: '到场确认并核对就诊资料', required: true, photoRequired: false },
    { label: '陪同老人前往医院', required: true, photoRequired: false },
    { label: '协助挂号、取药与就诊', required: true, photoRequired: true },
    { label: '安全送返并告知家属', required: true, photoRequired: true },
  ],
  检查水电: [
    { label: '检查燃气阀门与软管', required: true, photoRequired: true },
    { label: '检查水电线路与插座', required: true, photoRequired: true },
    { label: '检查门窗与阳台安全', required: true, photoRequired: true },
    { label: '向老人说明检查结果', required: true, photoRequired: false },
  ],
  开门配合: [
    { label: '核验委托人与老人身份', required: true, photoRequired: false },
    { label: '按约定方式开门', required: true, photoRequired: false },
    { label: '陪同进门并确认安全', required: true, photoRequired: true },
    { label: '离开时确认门锁关闭', required: true, photoRequired: true },
  ],
}

/** 任务类型简称取自业务字典，未维护简称时回落到类型名 */
export function taskTypeLabel(type: TaskType) {
  return taskTypeDict.find((item) => item.label === type)?.short ?? type
}

export const taskTypeOptionsWithShort = computed(() =>
  taskTypeOptions.map((type) => ({
    value: type,
    label: taskTypeLabel(type) === type ? type : `${type}（${taskTypeLabel(type)}）`,
  })),
)

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function toDate(value: string) {
  return new Date(value.replace(' ', 'T'))
}

export function minutesBetween(start: string, end: string) {
  const diff = toDate(end).getTime() - toDate(start).getTime()
  return Math.max(0, Math.round(diff / 60000))
}

export function formatDuration(minutes?: number) {
  if (minutes === undefined || Number.isNaN(minutes)) return '-'
  if (minutes < 60) return `${minutes} 分钟`
  const hour = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hour} 小时` : `${hour} 小时 ${rest} 分`
}

function resolveElder(id: string) {
  const elder = elders.find((item) => item.id === id)
  if (!elder) {
    return {
      elderId: id,
      elderName: id,
      community: '安康社区',
      grid: '第1网格',
      address: '-',
      contactName: '-',
      contactPhone: '-',
      entry: {
        keyHolder: '老人随身携带',
        smartLock: false,
        smartLockPassword: '',
        propertyOpen: false,
        note: '上门前请先电话联系',
      },
    }
  }
  const emergency = elder.relations.find((item) => item.isEmergency) ?? elder.relations[0]
  return {
    elderId: elder.id,
    elderName: elder.name,
    community: elder.community,
    grid: elder.grid,
    address: `${elder.building} ${elder.unit} ${elder.room}`,
    contactName: emergency?.name ?? '社区网格员',
    contactPhone: emergency?.phone ?? '13900001234',
    entry: {
      keyHolder: elder.entry.keyHolder,
      smartLock: elder.entry.smartLock,
      smartLockPassword: elder.entry.smartLockPassword,
      propertyOpen: elder.entry.propertyOpen,
      note: elder.entry.note,
    },
  }
}

function buildChecklist(type: TaskType, doneCount = 0): ChecklistItem[] {
  const template = checklistTemplates[type] ?? [
    { label: '到场确认老人情况', required: true, photoRequired: false },
    { label: '按任务要求完成处理', required: true, photoRequired: false },
    { label: '拍照留证并反馈结果', required: true, photoRequired: true },
  ]
  return template.map((item, index) => ({
    id: `${type}-${index + 1}`,
    label: item.label,
    required: item.required,
    photoRequired: item.photoRequired,
    done: index < doneCount,
    photoCount: item.photoRequired && index < doneCount ? 1 : 0,
  }))
}

interface SeedTaskInput {
  id: string
  type: TaskType
  source: TaskSource
  status: TaskStatus
  elderId: string
  executor: Executor
  createdAt: string
  windowStart: string
  windowEnd: string
  acceptLimit?: number
  arriveLimit?: number
  acceptedAt?: string
  arrivedAt?: string
  submittedAt?: string
  completedAt?: string
  returnedAt?: string
  cancelledAt?: string
  doneCount?: number
  eventId?: string
  rewardType?: RewardType
  fee?: number
  payNote?: string
  rating?: number
  review?: string
  returnReason?: string
  cancelReason?: string
  execNote?: string
  confirmNote?: string
  publisher?: string
}

function makeSeedTask(input: SeedTaskInput): Task {
  const elder = resolveElder(input.elderId)
  const checklist = buildChecklist(input.type, input.doneCount ?? 0)
  const photos = checklist.reduce((sum, item) => sum + item.photoCount, 0)
  const publisher = input.publisher ?? '吕建成'
  const timeline: TaskTimelineItem[] = [
    {
      time: input.createdAt,
      action: '派发任务',
      operator: publisher,
      note: `${input.source} · 指派给 ${input.executor.name}`,
      tone: 'blue',
    },
  ]
  if (input.acceptedAt) {
    timeline.push({
      time: input.acceptedAt,
      action: '执行人接单',
      operator: input.executor.name,
      tone: 'blue',
    })
  }
  if (input.arrivedAt) {
    timeline.push({
      time: input.arrivedAt,
      action: '确认到场',
      operator: input.executor.name,
      note: `到场用时 ${minutesBetween(input.createdAt, input.arrivedAt)} 分钟`,
      tone: 'orange',
    })
  }
  if (input.submittedAt) {
    timeline.push({
      time: input.submittedAt,
      action: '提交回执',
      operator: input.executor.name,
      note: `完成 ${checklist.filter((item) => item.done).length}/${checklist.length} 项，照片 ${photos} 张`,
      tone: 'green',
    })
  }
  if (input.completedAt) {
    timeline.push({
      time: input.completedAt,
      action: '确认完成',
      operator: '吕建成',
      note: input.review ? `评价：${input.review}` : '委托人确认完成',
      tone: 'green',
    })
  }
  if (input.returnedAt) {
    timeline.push({
      time: input.returnedAt,
      action: '超时退回',
      operator: '系统',
      note: input.returnReason ?? '超时未接单，已退回社区',
      tone: 'red',
    })
  }
  if (input.cancelledAt) {
    timeline.push({
      time: input.cancelledAt,
      action: '取消任务',
      operator: publisher,
      note: input.cancelReason,
      tone: 'gray',
    })
  }

  return {
    id: input.id,
    type: input.type,
    source: input.source,
    status: input.status,
    ...elder,
    eventId: input.eventId,
    publisher,
    publisherRole: '社区管理员',
    executorName: input.executor.name,
    executorOrg: input.executor.org,
    executorPhone: input.executor.phone,
    executorType: input.executor.type,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    acceptLimit: input.acceptLimit ?? 5,
    arriveLimit: input.arriveLimit ?? 30,
    createdAt: input.createdAt,
    acceptedAt: input.acceptedAt,
    arrivedAt: input.arrivedAt,
    submittedAt: input.submittedAt,
    completedAt: input.completedAt,
    returnedAt: input.returnedAt,
    cancelledAt: input.cancelledAt,
    rewardType: input.rewardType ?? '公益',
    fee: input.fee,
    payNote: input.payNote,
    checklist,
    photos,
    execNote: input.execNote,
    confirmNote: input.confirmNote,
    rating: input.rating,
    review: input.review,
    returnReason: input.returnReason,
    cancelReason: input.cancelReason,
    responsibility: {
      text: '本次服务为社区组织的居家养老协助，执行人按清单提供上门协助，不提供医疗诊疗服务。紧急情况请立即联系 120 与社区。',
      agreedBy: publisher,
      agreedAt: input.createdAt,
      version: 'v2.0-20261028',
    },
    timeline,
  }
}

const seedTasks: Task[] = [
  makeSeedTask({
    id: 'TK20261028001',
    type: '应急到场',
    source: '事件转派',
    status: '待接单',
    elderId: 'E00001',
    executor: executors[0],
    createdAt: '2026-10-28 10:12',
    windowStart: '10:12',
    windowEnd: '10:42',
    eventId: 'EV20261028001',
    arriveLimit: 30,
  }),
  makeSeedTask({
    id: 'TK20261028002',
    type: '上门探视',
    source: '子女委托',
    status: '执行中',
    elderId: 'E00005',
    executor: executors[0],
    createdAt: '2026-10-28 09:05',
    windowStart: '09:00',
    windowEnd: '10:00',
    acceptedAt: '2026-10-28 09:08',
    arrivedAt: '2026-10-28 09:38',
    doneCount: 3,
    acceptLimit: 10,
  }),
  makeSeedTask({
    id: 'TK20261028003',
    type: '检查水电',
    source: '社区创建',
    status: '待确认',
    elderId: 'E00002',
    executor: executors[2],
    createdAt: '2026-10-28 08:20',
    windowStart: '08:30',
    windowEnd: '09:30',
    acceptedAt: '2026-10-28 08:24',
    arrivedAt: '2026-10-28 08:45',
    submittedAt: '2026-10-28 09:10',
    doneCount: 4,
    execNote: '燃气软管有轻微老化，已提醒家属更换，其余水电门窗正常。',
    acceptLimit: 10,
  }),
  makeSeedTask({
    id: 'TK20261028004',
    type: '陪同就医',
    source: '子女委托',
    status: '已接单',
    elderId: 'E00003',
    executor: executors[1],
    createdAt: '2026-10-28 11:30',
    windowStart: '14:00',
    windowEnd: '17:00',
    acceptedAt: '2026-10-28 11:36',
    rewardType: '计费',
    fee: 80,
    payNote: '家属线上支付，平台仅登记',
    acceptLimit: 15,
  }),
  makeSeedTask({
    id: 'TK20261027005',
    type: '代购',
    source: '子女委托',
    status: '已完成',
    elderId: 'E00006',
    executor: executors[0],
    createdAt: '2026-10-27 15:40',
    windowStart: '16:00',
    windowEnd: '18:00',
    acceptedAt: '2026-10-27 15:44',
    arrivedAt: '2026-10-27 16:12',
    submittedAt: '2026-10-27 16:50',
    completedAt: '2026-10-27 17:20',
    doneCount: 4,
    rating: 5,
    review: '东西买得很全，还帮忙把米搬进厨房，很贴心。',
    acceptLimit: 10,
  }),
  makeSeedTask({
    id: 'TK20261027006',
    type: '开门配合',
    source: '子女委托',
    status: '已退回',
    elderId: 'E00009',
    executor: executors[1],
    createdAt: '2026-10-27 14:00',
    windowStart: '14:00',
    windowEnd: '15:00',
    returnedAt: '2026-10-27 15:10',
    returnReason: '超时未接单，已退回社区',
    acceptLimit: 10,
  }),
  makeSeedTask({
    id: 'TK20261027007',
    type: '上门探视',
    source: '子女委托',
    status: '已取消',
    elderId: 'E00004',
    executor: executors[1],
    createdAt: '2026-10-27 09:10',
    windowStart: '10:00',
    windowEnd: '11:00',
    cancelledAt: '2026-10-27 09:30',
    cancelReason: '老人临时住院，暂不需要上门',
    acceptLimit: 10,
  }),
  makeSeedTask({
    id: 'TK20261027008',
    type: '应急到场',
    source: '事件转派',
    status: '已完成',
    elderId: 'E00005',
    executor: executors[2],
    createdAt: '2026-10-27 06:18',
    windowStart: '06:18',
    windowEnd: '06:48',
    acceptedAt: '2026-10-27 06:20',
    arrivedAt: '2026-10-27 06:29',
    submittedAt: '2026-10-27 06:50',
    completedAt: '2026-10-27 07:05',
    doneCount: 5,
    eventId: 'EV20261027004',
    rating: 5,
    review: '到场很快，确认只是烟感误报，已协助复位。',
    execNote: '烟感探头积灰导致误报，已清理并测试。',
  }),
  makeSeedTask({
    id: 'TK20261026009',
    type: '检查水电',
    source: '社区创建',
    status: '已完成',
    elderId: 'E00008',
    executor: executors[0],
    createdAt: '2026-10-26 10:00',
    windowStart: '10:00',
    windowEnd: '11:30',
    acceptedAt: '2026-10-26 10:06',
    arrivedAt: '2026-10-26 10:26',
    submittedAt: '2026-10-26 10:55',
    completedAt: '2026-10-26 11:10',
    doneCount: 4,
    rewardType: '计费',
    fee: 30,
    payNote: '现金支付，已登记',
    rating: 4,
    review: '检查比较仔细，建议下次带更换的软管。',
    acceptLimit: 15,
  }),
  makeSeedTask({
    id: 'TK20261026010',
    type: '陪同就医',
    source: '子女委托',
    status: '已完成',
    elderId: 'E00010',
    executor: executors[1],
    createdAt: '2026-10-26 08:00',
    windowStart: '09:00',
    windowEnd: '12:00',
    acceptedAt: '2026-10-26 08:05',
    arrivedAt: '2026-10-26 09:02',
    submittedAt: '2026-10-26 11:50',
    completedAt: '2026-10-26 12:10',
    doneCount: 4,
    rewardType: '计费',
    fee: 80,
    payNote: '家属线上支付，平台仅登记',
    rating: 5,
    review: '全程陪同，取药和回程都安排得很好。',
    acceptLimit: 15,
  }),
]

export const tasks = reactive<Task[]>(seedTasks)

export const taskStats = computed(() => {
  const pending = tasks.filter((item) => item.status === '待接单').length
  const running = tasks.filter((item) => item.status === '已接单' || item.status === '执行中').length
  const confirming = tasks.filter((item) => item.status === '待确认').length
  const completed = tasks.filter((item) => item.status === '已完成').length
  const returned = tasks.filter((item) => item.status === '已退回').length
  return { pending, running, confirming, completed, returned }
})

export const overdueTasks = computed(() =>
  tasks.filter((item) => {
    if (item.status !== '待接单') return false
    const deadline = new Date(toDate(item.createdAt).getTime() + item.acceptLimit * 60000)
    return Date.now() > deadline.getTime()
  }),
)

export function isTaskOverdue(task: Task) {
  if (task.status !== '待接单') return false
  const deadline = new Date(toDate(task.createdAt).getTime() + task.acceptLimit * 60000)
  return Date.now() > deadline.getTime()
}

export function getTask(id: string) {
  return tasks.find((item) => item.id === id) ?? null
}

export function acceptMinutes(task: Task) {
  if (!task.acceptedAt) return undefined
  return minutesBetween(task.createdAt, task.acceptedAt)
}

export function arriveMinutes(task: Task) {
  if (!task.arrivedAt) return undefined
  return minutesBetween(task.createdAt, task.arrivedAt)
}

export function handleMinutes(task: Task) {
  if (!task.submittedAt || !task.arrivedAt) return undefined
  return minutesBetween(task.arrivedAt, task.submittedAt)
}

export function totalMinutes(task: Task) {
  if (!task.completedAt) return undefined
  return minutesBetween(task.createdAt, task.completedAt)
}

export const slaSummary = computed(() => {
  const completed = tasks.filter((item) => item.status === '已完成')
  const acceptList = completed
    .map((item) => acceptMinutes(item))
    .filter((value): value is number => value !== undefined)
  const arriveList = completed
    .map((item) => arriveMinutes(item))
    .filter((value): value is number => value !== undefined)
  const ended = tasks.filter((item) =>
    ['已完成', '已退回', '已取消'].includes(item.status),
  ).length
  const returned = tasks.filter((item) => item.status === '已退回').length
  return {
    avgAccept: acceptList.length
      ? Math.round(acceptList.reduce((sum, value) => sum + value, 0) / acceptList.length)
      : 0,
    avgArrive: arriveList.length
      ? Math.round(arriveList.reduce((sum, value) => sum + value, 0) / arriveList.length)
      : 0,
    completionRate: ended === 0 ? 0 : Math.round((completed.length / ended) * 100),
    overdue: returned,
    completed: completed.length,
  }
})

export interface CreateTaskInput {
  type: TaskType
  source: TaskSource
  elderId: string
  executorName: string
  windowStart: string
  windowEnd: string
  acceptLimit: number
  arriveLimit: number
  rewardType: RewardType
  fee?: number
  payNote?: string
  eventId?: string
  checklist: Array<{ label: string; required: boolean; photoRequired: boolean }>
}

export function createTask(input: CreateTaskInput) {
  const executor = executors.find((item) => item.name === input.executorName)
  if (!executor) return { ok: false, message: '请选择执行人' }
  if (!input.elderId) return { ok: false, message: '请选择老人' }
  if (!input.windowStart || !input.windowEnd) return { ok: false, message: '请选择时间窗' }
  if (input.rewardType === '计费' && !input.fee) {
    return { ok: false, message: '请填写服务金额' }
  }
  const elder = resolveElder(input.elderId)
  const createdAt = formatDateTime()
  const id = `TK${formatDate()}${String(tasks.length + 1).padStart(3, '0')}`
  const publisher = currentUser.value
  const checklist: ChecklistItem[] = input.checklist.map((item, index) => ({
    id: `${input.type}-${index + 1}`,
    label: item.label,
    required: item.required,
    photoRequired: item.photoRequired,
    done: false,
    photoCount: 0,
  }))
  const task: Task = {
    id,
    type: input.type,
    source: input.source,
    status: '待接单',
    ...elder,
    eventId: input.eventId,
    publisher: publisher?.name ?? '社区管理员',
    publisherRole: publisher?.roleLabel ?? '社区管理员',
    executorName: executor.name,
    executorOrg: executor.org,
    executorPhone: executor.phone,
    executorType: executor.type,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    acceptLimit: input.acceptLimit,
    arriveLimit: input.arriveLimit,
    createdAt,
    rewardType: input.rewardType,
    fee: input.fee,
    payNote: input.payNote,
    checklist,
    photos: 0,
    responsibility: {
      text: '本次服务为社区组织的居家养老协助，执行人按清单提供上门协助，不提供医疗诊疗服务。紧急情况请立即联系 120 与社区。',
      agreedBy: publisher?.name ?? '社区管理员',
      agreedAt: createdAt,
      version: 'v2.0-20261028',
    },
    timeline: [
      {
        time: createdAt,
        action: '派发任务',
        operator: publisher?.name ?? '社区管理员',
        note: `${input.source} · 指派给 ${executor.name}`,
        tone: 'blue',
      },
    ],
  }
  tasks.unshift(task)
  addAudit('派发任务', id, '成功', `${task.type} · ${task.elderName} · ${executor.name}`)
  return { ok: true, message: '任务已派发', task }
}

export function acceptTask(id: string) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '待接单') return { ok: false, message: '该任务当前不可接单' }
  task.status = '已接单'
  task.acceptedAt = formatDateTime()
  task.timeline.push({
    time: task.acceptedAt,
    action: '执行人接单',
    operator: task.executorName,
    tone: 'blue',
  })
  addAudit('任务接单', id, '成功', task.executorName)
  return { ok: true, message: '接单成功，请按时到场' }
}

export function arriveTask(id: string) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '已接单') return { ok: false, message: '请先接单再确认到场' }
  task.status = '执行中'
  task.arrivedAt = formatDateTime()
  task.timeline.push({
    time: task.arrivedAt,
    action: '确认到场',
    operator: task.executorName,
    note: `到场用时 ${minutesBetween(task.createdAt, task.arrivedAt)} 分钟`,
    tone: 'orange',
  })
  addAudit('任务到场', id, '成功', `${task.executorName} 已到场`)
  return { ok: true, message: '已确认到场' }
}

export function toggleChecklist(taskId: string, itemId: string, done: boolean) {
  const task = getTask(taskId)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '执行中') return { ok: false, message: '当前状态不可修改清单' }
  const item = task.checklist.find((entry) => entry.id === itemId)
  if (!item) return { ok: false, message: '清单项不存在' }
  item.done = done
  addPhotoCount(task)
  return { ok: true, message: '' }
}

export function addChecklistPhoto(taskId: string, itemId: string) {
  const task = getTask(taskId)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '执行中') return { ok: false, message: '当前状态不可上传照片' }
  const item = task.checklist.find((entry) => entry.id === itemId)
  if (!item) return { ok: false, message: '清单项不存在' }
  if (!item.photoRequired) return { ok: false, message: '该清单项无需拍照' }
  item.photoCount += 1
  addPhotoCount(task)
  return { ok: true, message: `已拍摄 ${item.photoCount} 张（模拟）` }
}

function addPhotoCount(task: Task) {
  task.photos = task.checklist.reduce((sum, item) => sum + item.photoCount, 0)
}

export function submitTask(id: string, note?: string) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '执行中') return { ok: false, message: '当前状态不可提交' }
  const missingRequired = task.checklist.filter((item) => item.required && !item.done)
  if (missingRequired.length > 0) return { ok: false, message: '请完成所有必选项' }
  const missingPhoto = task.checklist.filter((item) => item.photoRequired && item.photoCount === 0)
  if (missingPhoto.length > 0) return { ok: false, message: '请上传必拍项照片' }
  task.status = '待确认'
  task.submittedAt = formatDateTime()
  task.execNote = note?.trim() || task.execNote
  task.timeline.push({
    time: task.submittedAt,
    action: '提交回执',
    operator: task.executorName,
    note: `完成 ${task.checklist.filter((item) => item.done).length}/${task.checklist.length} 项，照片 ${task.photos} 张`,
    tone: 'green',
  })
  addAudit('提交回执', id, '成功', `${task.elderName} · 照片 ${task.photos} 张`)
  return { ok: true, message: '回执已提交，等待确认' }
}

export function confirmTask(id: string, payload: { rating?: number; review?: string }) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '待确认') return { ok: false, message: '该任务当前不可确认' }
  task.status = '已完成'
  task.completedAt = formatDateTime()
  task.rating = payload.rating
  task.review = payload.review?.trim()
  task.timeline.push({
    time: task.completedAt,
    action: '确认完成',
    operator: currentUser.value?.name ?? '委托人',
    note: payload.review ? `评价：${payload.review}` : '委托人确认完成',
    tone: 'green',
  })
  addAudit('任务完成', id, '成功', `${task.elderName} · ${task.type}`)
  if (task.eventId) {
    const event = getEventById(task.eventId)
    if (event && !['已关闭', '已归档'].includes(event.status)) {
      markEventStatus(event, '已关闭')
      event.dispositions.push({
        id: `DP-${Date.now()}`,
        time: task.completedAt,
        operator: currentUser.value?.name ?? '系统',
        action: '任务完成闭环',
        method: '任务协同',
        note: `任务 ${task.id} 已完成并经确认，事件自动关闭`,
      })
      addAudit('事件闭环', event.id, '成功', `任务 ${task.id} 完成后自动关闭事件`)
    }
  }
  return { ok: true, message: '任务已完成' }
}

export function returnTask(id: string, reason: string) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '待确认') return { ok: false, message: '当前状态不可退回' }
  if (!reason.trim()) return { ok: false, message: '请填写退回原因' }
  task.status = '执行中'
  task.submittedAt = undefined
  task.photos = task.checklist.reduce((sum, item) => sum + item.photoCount, 0)
  task.timeline.push({
    time: formatDateTime(),
    action: '回执退回',
    operator: currentUser.value?.name ?? '委托人',
    note: reason.trim(),
    tone: 'red',
  })
  addAudit('回执退回', id, '成功', reason.trim())
  return { ok: true, message: '已退回执行人重做' }
}

export function reassignTask(
  id: string,
  payload: { executorName: string; acceptLimit: number; arriveLimit: number; reason: string },
) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (!['待接单', '已退回'].includes(task.status)) {
    return { ok: false, message: '当前状态不可改派' }
  }
  const executor = executors.find((item) => item.name === payload.executorName)
  if (!executor) return { ok: false, message: '请选择执行人' }
  if (!payload.reason.trim()) return { ok: false, message: '请填写改派原因' }
  task.executorName = executor.name
  task.executorOrg = executor.org
  task.executorPhone = executor.phone
  task.executorType = executor.type
  task.acceptLimit = payload.acceptLimit
  task.arriveLimit = payload.arriveLimit
  task.status = '待接单'
  task.createdAt = formatDateTime()
  task.acceptedAt = undefined
  task.arrivedAt = undefined
  task.returnedAt = undefined
  task.timeline.push({
    time: task.createdAt,
    action: '改派任务',
    operator: currentUser.value?.name ?? '社区管理员',
    note: `改派给 ${executor.name}：${payload.reason.trim()}`,
    tone: 'blue',
  })
  addAudit('改派任务', id, '成功', `${executor.name}：${payload.reason.trim()}`)
  return { ok: true, message: '任务已改派' }
}

export function cancelTask(id: string, reason: string) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (!['待接单', '已退回'].includes(task.status)) {
    return { ok: false, message: '任务已开始执行，请先退回后再取消' }
  }
  if (!reason.trim()) return { ok: false, message: '请填写取消原因' }
  task.status = '已取消'
  task.cancelledAt = formatDateTime()
  task.cancelReason = reason.trim()
  task.timeline.push({
    time: task.cancelledAt,
    action: '取消任务',
    operator: currentUser.value?.name ?? '社区管理员',
    note: reason.trim(),
    tone: 'gray',
  })
  addAudit('取消任务', id, '成功', reason.trim())
  return { ok: true, message: '任务已取消' }
}

export function remindTask(id: string) {
  const task = getTask(id)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.status !== '待接单') return { ok: false, message: '仅待接单任务可催办' }
  addAudit('任务催办', id, '成功', `催办 ${task.executorName}`)
  return { ok: true, message: '已催办执行人' }
}

export function exportSla() {
  addAudit('导出', 'SLA 台账', '成功', `导出 ${tasks.length} 条任务`)
  return { ok: true, message: '导出任务已创建（模拟）' }
}
