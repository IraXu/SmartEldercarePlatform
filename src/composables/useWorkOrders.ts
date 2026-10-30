import { computed, reactive } from 'vue'
import { addAudit, currentUser } from './useAuth'
import { elders } from '@/mock/elders'
import { createAuditFromWorkOrder } from './useEvidence'
import { serviceItemOptions, staffOptions } from './useDict'

export type WorkOrderStatus =
  | '待派单'
  | '待接单'
  | '待上门'
  | '服务中'
  | '待签认'
  | '待审核'
  | '已完成'
  | '已取消'
  | '异常'

export type SignType = '老人手写' | '老人指纹' | '老人语音' | '家属远程签认' | '监护人代签'

export interface PlanItem {
  name: string
  required: boolean
  photoRequired: boolean
}

export interface ServicePlan {
  id: string
  level: string
  frequency: string
  duration: number
  items: PlanItem[]
  eligibleCount: number
  updatedAt: string
  note: string
}

export interface Staff {
  name: string
  org: string
  phone: string
  title: string
  qualifications: string[]
  rating: number
}

export interface WorkOrderItem extends PlanItem {
  id: string
  done: boolean
  photoCount: number
}

export interface CheckinInfo {
  qr: boolean
  gps: boolean
  face: boolean
  deviation: number
  note?: string
  pass: boolean
}

export interface SignatureInfo {
  type: SignType
  signer: string
  relation: string
  phone?: string
  time: string
}

export interface WorkOrderException {
  type: string
  note: string
  time: string
  handled: boolean
  handler?: string
  result?: string
}

export interface VisitRecord {
  time: string
  satisfaction: string
  note: string
  complaint: string
  handler: string
}

export interface TimelineItem {
  time: string
  action: string
  operator: string
  note?: string
  tone?: 'blue' | 'green' | 'red' | 'gray' | 'orange'
}

export interface WorkOrder {
  id: string
  planId: string
  level: string
  frequency: string
  duration: number
  scheduledDate: string
  scheduledStart: string
  status: WorkOrderStatus
  source: '计划生成' | '临时加单'
  elderId: string
  elderName: string
  community: string
  grid: string
  address: string
  contactName: string
  contactPhone: string
  entry: {
    keyHolder: string
    smartLock: boolean
    smartLockPassword: string
    propertyOpen: boolean
    note: string
  }
  staffName: string
  staffOrg: string
  staffPhone: string
  staffTitle: string
  items: WorkOrderItem[]
  photos: number
  createdAt: string
  acceptedAt?: string
  checkinAt?: string
  submittedAt?: string
  signedAt?: string
  reviewedAt?: string
  cancelledAt?: string
  checkin?: CheckinInfo
  recorder: {
    online: boolean
    clips: number
    note?: string
  }
  summary?: string
  suggestion?: string
  signature?: SignatureInfo
  exception?: WorkOrderException
  review?: {
    result: '通过' | '退回'
    note: string
    time: string
    reviewer: string
  }
  visits: VisitRecord[]
  cancelReason?: string
  timeline: TimelineItem[]
}

/** 服务项目可选值来自「系统设置 → 业务字典 → 服务项目」 */
export const planItemOptions = serviceItemOptions

export const servicePlans = reactive<ServicePlan[]>([
  {
    id: 'PLAN-HEAVY',
    level: '重度失能',
    frequency: '每周 3 次',
    duration: 90,
    items: [
      { name: '助浴', required: true, photoRequired: true },
      { name: '助餐', required: true, photoRequired: false },
      { name: '康复训练', required: true, photoRequired: true },
      { name: '翻身拍背', required: true, photoRequired: false },
      { name: '生命体征监测', required: true, photoRequired: false },
    ],
    eligibleCount: 86,
    updatedAt: '2026-10-20 10:00',
    note: '适用于重度失能、卧床老人，需双人上门',
  },
  {
    id: 'PLAN-MEDIUM',
    level: '中度失能',
    frequency: '每周 2 次',
    duration: 60,
    items: [
      { name: '助浴', required: true, photoRequired: true },
      { name: '助餐', required: true, photoRequired: false },
      { name: '康复训练', required: true, photoRequired: true },
    ],
    eligibleCount: 142,
    updatedAt: '2026-10-18 14:30',
    note: '适用于中度失能、半自理老人',
  },
  {
    id: 'PLAN-LIGHT',
    level: '轻度失能',
    frequency: '每周 1 次',
    duration: 60,
    items: [
      { name: '助餐', required: true, photoRequired: false },
      { name: '健康监测', required: true, photoRequired: true },
      { name: '家居清洁', required: true, photoRequired: false },
    ],
    eligibleCount: 208,
    updatedAt: '2026-10-16 09:20',
    note: '适用于轻度失能、基本自理老人',
  },
])

/** 服务人员来自「系统设置 → 业务字典 → 服务人员」 */
export const staffMembers: Staff[] = staffOptions

export const executorStaff = staffMembers

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
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

function buildItems(plan: ServicePlan, doneCount = 0): WorkOrderItem[] {
  return plan.items.map((item, index) => ({
    id: `${plan.id}-${index + 1}`,
    name: item.name,
    required: item.required,
    photoRequired: item.photoRequired,
    done: index < doneCount,
    photoCount: item.photoRequired && index < doneCount ? 1 : 0,
  }))
}

interface SeedOrderInput {
  id: string
  planId: string
  elderId: string
  status: WorkOrderStatus
  scheduledDate: string
  scheduledStart: string
  staffName?: string
  doneCount?: number
  createdAt: string
  acceptedAt?: string
  checkinAt?: string
  submittedAt?: string
  signedAt?: string
  reviewedAt?: string
  cancelledAt?: string
  source?: '计划生成' | '临时加单'
  summary?: string
  suggestion?: string
  checkin?: CheckinInfo
  signature?: SignatureInfo
  review?: WorkOrder['review']
  visits?: VisitRecord[]
  exception?: WorkOrderException
  cancelReason?: string
  recorder?: { online: boolean; clips: number; note?: string }
}

function makeSeedOrder(input: SeedOrderInput): WorkOrder {
  const plan = servicePlans.find((item) => item.id === input.planId) ?? servicePlans[0]
  const staff = staffMembers.find((item) => item.name === input.staffName)
  const elder = resolveElder(input.elderId)
  const items = buildItems(plan, input.doneCount ?? 0)
  const photos = items.reduce((sum, item) => sum + item.photoCount, 0)
  const timeline: TimelineItem[] = [
    {
      time: input.createdAt,
      action: '生成工单',
      operator: '系统',
      note: `${plan.level} · ${plan.frequency} · ${plan.duration} 分钟`,
      tone: 'blue',
    },
  ]
  if (staff) {
    timeline.push({
      time: input.createdAt,
      action: '派单',
      operator: '机构管理员',
      note: `指派给 ${staff.name}（${staff.org}）`,
      tone: 'blue',
    })
  }
  if (input.acceptedAt) {
    timeline.push({
      time: input.acceptedAt,
      action: '服务人员接单',
      operator: staff?.name ?? '服务人员',
      tone: 'blue',
    })
  }
  if (input.checkinAt && input.checkin) {
    timeline.push({
      time: input.checkinAt,
      action: '上门签到',
      operator: staff?.name ?? '服务人员',
      note: `偏差 ${input.checkin.deviation} 米 · ${input.checkin.pass ? '通过' : '异常'}`,
      tone: input.checkin.pass ? 'green' : 'red',
    })
  }
  if (input.submittedAt) {
    timeline.push({
      time: input.submittedAt,
      action: '提交服务记录',
      operator: staff?.name ?? '服务人员',
      tone: 'green',
    })
  }
  if (input.signedAt && input.signature) {
    timeline.push({
      time: input.signedAt,
      action: '完成签认',
      operator: input.signature.signer,
      note: input.signature.type,
      tone: 'green',
    })
  }
  if (input.reviewedAt && input.review) {
    timeline.push({
      time: input.reviewedAt,
      action: input.review.result === '通过' ? '机构审核通过' : '机构退回补充',
      operator: input.review.reviewer,
      note: input.review.note,
      tone: input.review.result === '通过' ? 'green' : 'red',
    })
  }
  if (input.cancelledAt) {
    timeline.push({
      time: input.cancelledAt,
      action: '取消工单',
      operator: '机构管理员',
      note: input.cancelReason,
      tone: 'gray',
    })
  }
  if (input.exception) {
    timeline.push({
      time: input.exception.time,
      action: '异常上报',
      operator: staff?.name ?? '服务人员',
      note: `${input.exception.type}：${input.exception.note}`,
      tone: 'red',
    })
  }

  return {
    id: input.id,
    planId: plan.id,
    level: plan.level,
    frequency: plan.frequency,
    duration: plan.duration,
    scheduledDate: input.scheduledDate,
    scheduledStart: input.scheduledStart,
    status: input.status,
    source: input.source ?? '计划生成',
    ...elder,
    staffName: staff?.name ?? '',
    staffOrg: staff?.org ?? '',
    staffPhone: staff?.phone ?? '',
    staffTitle: staff?.title ?? '',
    items,
    photos,
    createdAt: input.createdAt,
    acceptedAt: input.acceptedAt,
    checkinAt: input.checkinAt,
    submittedAt: input.submittedAt,
    signedAt: input.signedAt,
    reviewedAt: input.reviewedAt,
    cancelledAt: input.cancelledAt,
    checkin: input.checkin,
    recorder: input.recorder ?? { online: true, clips: 0 },
    summary: input.summary,
    suggestion: input.suggestion,
    signature: input.signature,
    exception: input.exception,
    review: input.review,
    visits: input.visits ?? [],
    cancelReason: input.cancelReason,
    timeline,
  }
}

const seedOrders: WorkOrder[] = [
  makeSeedOrder({
    id: 'WO20261028001',
    planId: 'PLAN-HEAVY',
    elderId: 'E00001',
    status: '待上门',
    scheduledDate: '2026-10-28',
    scheduledStart: '09:00',
    staffName: '陈晓',
    createdAt: '2026-10-27 18:00',
    acceptedAt: '2026-10-28 08:30',
    recorder: { online: true, clips: 0 },
  }),
  makeSeedOrder({
    id: 'WO20261028002',
    planId: 'PLAN-HEAVY',
    elderId: 'E00003',
    status: '服务中',
    scheduledDate: '2026-10-28',
    scheduledStart: '09:30',
    staffName: '陈晓',
    createdAt: '2026-10-27 18:05',
    acceptedAt: '2026-10-28 09:00',
    checkinAt: '2026-10-28 09:28',
    doneCount: 3,
    checkin: { qr: true, gps: true, face: true, deviation: 38, pass: true },
    recorder: { online: true, clips: 2 },
  }),
  makeSeedOrder({
    id: 'WO20261028003',
    planId: 'PLAN-MEDIUM',
    elderId: 'E00002',
    status: '待签认',
    scheduledDate: '2026-10-28',
    scheduledStart: '08:30',
    staffName: '刘敏',
    createdAt: '2026-10-27 18:10',
    acceptedAt: '2026-10-28 08:05',
    checkinAt: '2026-10-28 08:32',
    submittedAt: '2026-10-28 09:35',
    doneCount: 3,
    checkin: { qr: true, gps: true, face: true, deviation: 26, pass: true },
    summary: '完成助浴、助餐与下肢康复训练，老人精神状态良好，进食正常。',
    suggestion: '建议下次增加站立平衡训练，家属注意地面防滑。',
    recorder: { online: true, clips: 3 },
  }),
  makeSeedOrder({
    id: 'WO20261028004',
    planId: 'PLAN-HEAVY',
    elderId: 'E00005',
    status: '待审核',
    scheduledDate: '2026-10-28',
    scheduledStart: '08:00',
    staffName: '刘敏',
    createdAt: '2026-10-27 18:15',
    acceptedAt: '2026-10-28 07:40',
    checkinAt: '2026-10-28 08:02',
    submittedAt: '2026-10-28 09:20',
    signedAt: '2026-10-28 09:30',
    doneCount: 5,
    checkin: { qr: true, gps: true, face: true, deviation: 18, pass: true },
    summary: '完成助浴、助餐、康复训练与生命体征监测，血压 132/82，老人配合良好。',
    suggestion: '建议家属关注夜间起夜安全，已协助加装夜灯。',
    recorder: { online: true, clips: 4 },
    signature: {
      type: '家属远程签认',
      signer: '李伟',
      relation: '儿子',
      phone: '13912342233',
      time: '2026-10-28 09:30',
    },
  }),
  makeSeedOrder({
    id: 'WO20261028005',
    planId: 'PLAN-MEDIUM',
    elderId: 'E00006',
    status: '已完成',
    scheduledDate: '2026-10-27',
    scheduledStart: '14:00',
    staffName: '刘敏',
    createdAt: '2026-10-26 18:00',
    acceptedAt: '2026-10-27 13:30',
    checkinAt: '2026-10-27 13:58',
    submittedAt: '2026-10-27 15:10',
    signedAt: '2026-10-27 15:20',
    reviewedAt: '2026-10-27 16:00',
    doneCount: 3,
    checkin: { qr: true, gps: true, face: true, deviation: 22, pass: true },
    summary: '完成助浴、助餐与康复训练，老人情绪稳定，午餐进食约 200 克。',
    suggestion: '建议增加蛋白质摄入，下次评估吞咽情况。',
    recorder: { online: true, clips: 3 },
    signature: {
      type: '老人手写',
      signer: '赵德明',
      relation: '本人',
      time: '2026-10-27 15:20',
    },
    review: {
      result: '通过',
      note: '记录完整，签到与签认合规',
      time: '2026-10-27 16:00',
      reviewer: '机构管理员',
    },
    visits: [
      {
        time: '2026-10-28 10:00',
        satisfaction: '满意',
        note: '家属反馈服务准时，记录清楚',
        complaint: '无',
        handler: '吕建成',
      },
    ],
  }),
  makeSeedOrder({
    id: 'WO20261028006',
    planId: 'PLAN-LIGHT',
    elderId: 'E00004',
    status: '待接单',
    scheduledDate: '2026-10-28',
    scheduledStart: '15:00',
    staffName: '王强',
    createdAt: '2026-10-28 09:00',
    recorder: { online: false, clips: 0, note: '设备未领取' },
  }),
  makeSeedOrder({
    id: 'WO20261027007',
    planId: 'PLAN-LIGHT',
    elderId: 'E00008',
    status: '已完成',
    scheduledDate: '2026-10-26',
    scheduledStart: '10:00',
    staffName: '王强',
    createdAt: '2026-10-25 18:00',
    acceptedAt: '2026-10-26 09:30',
    checkinAt: '2026-10-26 09:58',
    submittedAt: '2026-10-26 10:50',
    signedAt: '2026-10-26 11:00',
    reviewedAt: '2026-10-26 11:30',
    doneCount: 3,
    checkin: { qr: true, gps: true, face: true, deviation: 45, pass: true },
    summary: '完成助餐、健康监测与家居清洁，血压 128/78，家中地面已清理。',
    suggestion: '建议每周增加一次健康监测。',
    recorder: { online: true, clips: 2 },
    signature: {
      type: '监护人代签',
      signer: '周敏',
      relation: '女儿（监护人）',
      time: '2026-10-26 11:00',
    },
    review: {
      result: '通过',
      note: '记录完整，照片清晰',
      time: '2026-10-26 11:30',
      reviewer: '机构管理员',
    },
  }),
  makeSeedOrder({
    id: 'WO20261027008',
    planId: 'PLAN-HEAVY',
    elderId: 'E00009',
    status: '异常',
    scheduledDate: '2026-10-27',
    scheduledStart: '09:00',
    staffName: '陈晓',
    createdAt: '2026-10-26 18:10',
    acceptedAt: '2026-10-27 08:30',
    checkinAt: '2026-10-27 09:05',
    doneCount: 0,
    checkin: { qr: true, gps: true, face: false, deviation: 62, pass: true },
    exception: {
      type: '老人拒访',
      note: '老人表示今日身体不适不愿接受服务，已电话联系家属，家属要求改约。',
      time: '2026-10-27 09:10',
      handled: false,
    },
    recorder: { online: true, clips: 0 },
  }),
  makeSeedOrder({
    id: 'WO20261027009',
    planId: 'PLAN-MEDIUM',
    elderId: 'E00010',
    status: '已取消',
    scheduledDate: '2026-10-27',
    scheduledStart: '16:00',
    staffName: '刘敏',
    createdAt: '2026-10-26 18:20',
    cancelledAt: '2026-10-27 10:00',
    cancelReason: '老人临时住院，家属要求取消本次服务',
    recorder: { online: false, clips: 0, note: '未上门' },
  }),
  makeSeedOrder({
    id: 'WO20261027010',
    planId: 'PLAN-MEDIUM',
    elderId: 'E00007',
    status: '待派单',
    scheduledDate: '2026-10-29',
    scheduledStart: '09:00',
    createdAt: '2026-10-27 18:30',
    recorder: { online: false, clips: 0, note: '待派单' },
  }),
]

export const workOrders = reactive<WorkOrder[]>(seedOrders)

export const workOrderStats = computed(() => ({
  pendingDispatch: workOrders.filter((item) => item.status === '待派单').length,
  waitingVisit: workOrders.filter((item) => item.status === '待接单' || item.status === '待上门').length,
  inService: workOrders.filter((item) => item.status === '服务中').length,
  waitingSign: workOrders.filter((item) => item.status === '待签认').length,
  waitingReview: workOrders.filter((item) => item.status === '待审核').length,
  exceptions: workOrders.filter((item) => item.status === '异常').length,
}))

export function getWorkOrder(id: string) {
  return workOrders.find((item) => item.id === id) ?? null
}

export function getPlan(level: string) {
  return servicePlans.find((item) => item.level === level) ?? servicePlans[0]
}

export function getStaff(name: string) {
  return staffMembers.find((item) => item.name === name) ?? null
}

export function planQualified(staffName: string, planId: string) {
  const staff = getStaff(staffName)
  const plan = servicePlans.find((item) => item.id === planId)
  if (!staff || !plan) return false
  return plan.items.every((item) => staff.qualifications.includes(item.name))
}

export interface CreateWorkOrderInput {
  elderId: string
  planId: string
  staffName: string
  scheduledDate: string
  scheduledStart: string
  note?: string
}

export function createWorkOrder(input: CreateWorkOrderInput) {
  const plan = servicePlans.find((item) => item.id === input.planId)
  if (!plan) return { ok: false, message: '请选择服务计划' }
  const staff = getStaff(input.staffName)
  if (!staff) return { ok: false, message: '请选择服务人员' }
  if (!planQualified(input.staffName, input.planId)) {
    return { ok: false, message: '该人员资质不覆盖所选项目' }
  }
  const conflict = workOrders.some(
    (item) =>
      item.staffName === input.staffName &&
      item.scheduledDate === input.scheduledDate &&
      item.scheduledStart === input.scheduledStart &&
      !['已完成', '已取消'].includes(item.status),
  )
  if (conflict) return { ok: false, message: '该人员该时段已有工单' }

  const elder = resolveElder(input.elderId)
  const createdAt = formatDateTime()
  const id = `WO${formatDate()}${String(workOrders.length + 1).padStart(3, '0')}`
  const order: WorkOrder = {
    id,
    planId: plan.id,
    level: plan.level,
    frequency: plan.frequency,
    duration: plan.duration,
    scheduledDate: input.scheduledDate,
    scheduledStart: input.scheduledStart,
    status: '待接单',
    source: '计划生成',
    ...elder,
    staffName: staff.name,
    staffOrg: staff.org,
    staffPhone: staff.phone,
    staffTitle: staff.title,
    items: buildItems(plan),
    photos: 0,
    createdAt,
    recorder: { online: false, clips: 0, note: '待服务人员领取' },
    visits: [],
    timeline: [
      {
        time: createdAt,
        action: '生成工单',
        operator: '系统',
        note: `${plan.level} · ${plan.frequency} · ${plan.duration} 分钟`,
        tone: 'blue',
      },
      {
        time: createdAt,
        action: '派单',
        operator: currentUser.value?.name ?? '机构管理员',
        note: `指派给 ${staff.name}（${staff.org}）${input.note ? `：${input.note}` : ''}`,
        tone: 'blue',
      },
    ],
  }
  workOrders.unshift(order)
  addAudit('派发工单', id, '成功', `${order.elderName} · ${staff.name} · ${plan.level}`)
  return { ok: true, message: '工单已派发', order }
}

export function dispatchWorkOrder(
  id: string,
  payload: { staffName: string; scheduledDate: string; scheduledStart: string; note?: string },
) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '待派单') return { ok: false, message: '该工单当前不可派单' }
  if (!planQualified(payload.staffName, order.planId)) {
    return { ok: false, message: '该人员资质不覆盖所选项目' }
  }
  const staff = getStaff(payload.staffName)
  if (!staff) return { ok: false, message: '请选择服务人员' }
  order.staffName = staff.name
  order.staffOrg = staff.org
  order.staffPhone = staff.phone
  order.staffTitle = staff.title
  order.scheduledDate = payload.scheduledDate
  order.scheduledStart = payload.scheduledStart
  order.status = '待接单'
  order.recorder = { online: false, clips: 0, note: '待服务人员领取' }
  order.timeline.push({
    time: formatDateTime(),
    action: '派单',
    operator: currentUser.value?.name ?? '机构管理员',
    note: `指派给 ${staff.name}（${staff.org}）${payload.note ? `：${payload.note}` : ''}`,
    tone: 'blue',
  })
  addAudit('派发工单', id, '成功', `${order.elderName} · ${staff.name} · ${order.level}`)
  return { ok: true, message: '工单已派发', order }
}

export function reassignWorkOrder(
  id: string,
  payload: { staffName: string; scheduledDate: string; scheduledStart: string; reason: string },
) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (!['待接单', '待上门'].includes(order.status)) {
    return { ok: false, message: '当前状态不可改派' }
  }
  if (!planQualified(payload.staffName, order.planId)) {
    return { ok: false, message: '该人员资质不覆盖所选项目' }
  }
  if (!payload.reason.trim()) return { ok: false, message: '请填写改派原因' }
  const staff = getStaff(payload.staffName)!
  order.staffName = staff.name
  order.staffOrg = staff.org
  order.staffPhone = staff.phone
  order.staffTitle = staff.title
  order.scheduledDate = payload.scheduledDate
  order.scheduledStart = payload.scheduledStart
  order.status = '待接单'
  order.acceptedAt = undefined
  order.timeline.push({
    time: formatDateTime(),
    action: '改派',
    operator: currentUser.value?.name ?? '机构管理员',
    note: `改派给 ${staff.name}：${payload.reason.trim()}`,
    tone: 'blue',
  })
  addAudit('改派工单', id, '成功', `${staff.name}：${payload.reason.trim()}`)
  return { ok: true, message: '工单已改派' }
}

export function cancelWorkOrder(id: string, reason: string) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (!['待派单', '待接单', '待上门'].includes(order.status)) {
    return { ok: false, message: '服务已开始，无法直接取消' }
  }
  if (!reason.trim()) return { ok: false, message: '请填写取消原因' }
  order.status = '已取消'
  order.cancelledAt = formatDateTime()
  order.cancelReason = reason.trim()
  order.timeline.push({
    time: order.cancelledAt,
    action: '取消工单',
    operator: currentUser.value?.name ?? '机构管理员',
    note: reason.trim(),
    tone: 'gray',
  })
  addAudit('取消工单', id, '成功', reason.trim())
  return { ok: true, message: '工单已取消' }
}

export function acceptWorkOrder(id: string) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '待接单') return { ok: false, message: '当前状态不可接单' }
  order.status = '待上门'
  order.acceptedAt = formatDateTime()
  order.timeline.push({
    time: order.acceptedAt,
    action: '服务人员接单',
    operator: order.staffName,
    tone: 'blue',
  })
  addAudit('工单接单', id, '成功', order.staffName)
  return { ok: true, message: '接单成功，请按时上门' }
}

export function checkinWorkOrder(
  id: string,
  payload: { qr: boolean; gps: boolean; face: boolean; deviation: number; note?: string },
) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '待上门') return { ok: false, message: '请先接单再签到' }
  if (!payload.qr) return { ok: false, message: '门牌二维码与工单地址不一致' }
  if (!payload.gps) return { ok: false, message: '定位失败，请开启定位后重试' }
  const pass = payload.deviation <= 200
  order.status = '服务中'
  order.checkinAt = formatDateTime()
  order.checkin = { ...payload, pass }
  if (!pass) {
    order.exception = {
      type: '签到偏差',
      note: payload.note || `定位偏差 ${payload.deviation} 米，超过 200 米阈值`,
      time: order.checkinAt,
      handled: false,
    }
  }
  order.timeline.push({
    time: order.checkinAt,
    action: '上门签到',
    operator: order.staffName,
    note: `偏差 ${payload.deviation} 米 · ${pass ? '通过' : '异常'}`,
    tone: pass ? 'green' : 'red',
  })
  addAudit('工单签到', id, pass ? '成功' : '偏差', `偏差 ${payload.deviation} 米`)
  return {
    ok: true,
    message: pass ? '签到成功，开始服务' : '签到已记录，偏差较大已通知机构',
  }
}

export function toggleWorkItem(id: string, itemId: string, done: boolean) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '服务中') return { ok: false, message: '当前状态不可修改服务项目' }
  const item = order.items.find((entry) => entry.id === itemId)
  if (!item) return { ok: false, message: '服务项目不存在' }
  item.done = done
  recalcPhotos(order)
  return { ok: true, message: '' }
}

export function addWorkPhoto(id: string, itemId: string) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '服务中') return { ok: false, message: '当前状态不可上传照片' }
  const item = order.items.find((entry) => entry.id === itemId)
  if (!item) return { ok: false, message: '服务项目不存在' }
  if (!item.photoRequired) return { ok: false, message: '该项目无需拍照' }
  item.photoCount += 1
  recalcPhotos(order)
  return { ok: true, message: `已拍摄 ${item.photoCount} 张（模拟）` }
}

function recalcPhotos(order: WorkOrder) {
  order.photos = order.items.reduce((sum, item) => sum + item.photoCount, 0)
}

export function setRecorder(id: string, online: boolean, note?: string) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  order.recorder = { online, clips: order.recorder.clips, note: note?.trim() }
  return { ok: true, message: online ? '记录仪已连接' : '记录仪已标记离线' }
}

export function submitService(id: string, payload: { summary: string; suggestion?: string }) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '服务中') return { ok: false, message: '当前状态不可提交' }
  const missing = order.items.filter((item) => item.required && !item.done)
  if (missing.length > 0) return { ok: false, message: '请完成所有必做项目' }
  const missingPhoto = order.items.filter((item) => item.photoRequired && item.photoCount === 0)
  if (missingPhoto.length > 0) return { ok: false, message: '请上传必拍项照片' }
  if (payload.summary.trim().length < 20) {
    return { ok: false, message: '服务小结至少 20 字' }
  }
  if (!order.recorder.online && !order.recorder.note?.trim()) {
    return { ok: false, message: '记录仪离线，请填写原因' }
  }
  order.status = '待签认'
  order.submittedAt = formatDateTime()
  order.summary = payload.summary.trim()
  order.suggestion = payload.suggestion?.trim()
  order.timeline.push({
    time: order.submittedAt,
    action: '提交服务记录',
    operator: order.staffName,
    note: `完成 ${order.items.filter((item) => item.done).length}/${order.items.length} 项，照片 ${order.photos} 张`,
    tone: 'green',
  })
  addAudit('提交工单', id, '成功', `${order.elderName} · 照片 ${order.photos} 张`)
  return { ok: true, message: '服务记录已提交，请完成签认' }
}

export function signWorkOrder(
  id: string,
  payload: { type: SignType; signer: string; relation: string; phone?: string },
) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '待签认') return { ok: false, message: '当前状态不可签认' }
  if (!payload.signer.trim()) return { ok: false, message: '请填写签认人' }
  if (payload.type === '家属远程签认' && !payload.phone?.trim()) {
    return { ok: false, message: '家属远程签认需填写手机号' }
  }
  order.status = '待审核'
  order.signedAt = formatDateTime()
  order.signature = {
    type: payload.type,
    signer: payload.signer.trim(),
    relation: payload.relation.trim(),
    phone: payload.phone,
    time: order.signedAt,
  }
  order.timeline.push({
    time: order.signedAt,
    action: '完成签认',
    operator: order.signature.signer,
    note: order.signature.type,
    tone: 'green',
  })
  addAudit('工单签认', id, '成功', `${order.signature.signer}（${order.signature.relation}）`)
  return { ok: true, message: '签认完成，等待机构审核' }
}

export function reviewWorkOrder(
  id: string,
  payload: { result: '通过' | '退回'; note: string },
) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '待审核') return { ok: false, message: '当前状态不可审核' }
  if (!order.signature) return { ok: false, message: '工单尚未完成签认' }
  if (payload.result === '退回' && !payload.note.trim()) {
    return { ok: false, message: '请填写退回原因' }
  }
  order.reviewedAt = formatDateTime()
  order.review = {
    result: payload.result,
    note: payload.note.trim() || '记录完整，审核通过',
    time: order.reviewedAt,
    reviewer: currentUser.value?.name ?? '机构管理员',
  }
  if (payload.result === '通过') {
    order.status = '已完成'
  } else {
    order.status = '服务中'
    order.submittedAt = undefined
  }
  order.timeline.push({
    time: order.reviewedAt,
    action: payload.result === '通过' ? '机构审核通过' : '机构退回补充',
    operator: order.review.reviewer,
    note: order.review.note,
    tone: payload.result === '通过' ? 'green' : 'red',
  })
  addAudit(
    payload.result === '通过' ? '工单审核通过' : '工单退回',
    id,
    '成功',
    order.review.note,
  )
  let auditMessage = ''
  if (payload.result === '通过') {
    const toMinutes = (start?: string, end?: string) => {
      if (!start || !end) return 0
      const startTime = new Date(start.replace(/-/g, '/')).getTime()
      const endTime = new Date(end.replace(/-/g, '/')).getTime()
      if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) return 0
      return Math.round((endTime - startTime) / 60000)
    }
    const checkoutAt = order.signedAt ?? order.submittedAt ?? order.reviewedAt ?? ''
    const auditResult = createAuditFromWorkOrder({
      orderId: order.id,
      elderName: order.elderName,
      community: order.community,
      grid: order.grid,
      address: order.address,
      level: order.level,
      staffName: order.staffName,
      staffOrg: order.staffOrg,
      staffTitle: order.staffTitle,
      serviceDate: order.scheduledDate,
      checkinAt: order.checkinAt ?? '',
      checkoutAt,
      duration: toMinutes(order.checkinAt, checkoutAt) || order.duration,
      planDuration: order.duration,
      items: order.items.filter((item) => item.done).map((item) => item.name),
      signType: order.signature?.type ?? '未签认',
      signer: order.signature?.signer ?? order.elderName,
      photos: order.photos,
      clips: order.recorder.clips,
      recorderOnline: order.recorder.online,
      deviation: order.checkin?.deviation ?? 0,
      qr: order.checkin?.qr ?? false,
      face: order.checkin?.face ?? false,
      amount: Math.round(order.duration * 2),
    })
    auditMessage = auditResult.ok ? '，已生成证据审核单' : `，但证据审核单生成失败：${auditResult.message}`
  }
  return {
    ok: true,
    message:
      payload.result === '通过' ? `工单已完成${auditMessage}` : '工单已退回服务人员补充',
  }
}

export function reportException(id: string, payload: { type: string; note: string }) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (!['待上门', '服务中'].includes(order.status)) {
    return { ok: false, message: '当前状态不可上报异常' }
  }
  if (!payload.note.trim()) return { ok: false, message: '请填写异常说明' }
  order.status = '异常'
  order.exception = {
    type: payload.type,
    note: payload.note.trim(),
    time: formatDateTime(),
    handled: false,
  }
  order.timeline.push({
    time: order.exception.time,
    action: '异常上报',
    operator: order.staffName,
    note: `${payload.type}：${payload.note.trim()}`,
    tone: 'red',
  })
  addAudit('异常上报', id, '成功', `${payload.type}：${payload.note.trim()}`)
  return { ok: true, message: '异常已上报' }
}

export function resolveException(id: string, note: string) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '异常' || !order.exception) {
    return { ok: false, message: '该工单无待处理异常' }
  }
  if (!note.trim()) return { ok: false, message: '请填写处理结果' }
  order.exception.handled = true
  order.exception.handler = currentUser.value?.name ?? '机构管理员'
  order.exception.result = note.trim()
  order.status = '服务中'
  order.timeline.push({
    time: formatDateTime(),
    action: '异常处理',
    operator: order.exception.handler,
    note: note.trim(),
    tone: 'green',
  })
  addAudit('处理异常', id, '成功', note.trim())
  return { ok: true, message: '异常已处理，服务继续' }
}

export function addVisit(
  id: string,
  payload: { satisfaction: string; note: string; complaint: string },
) {
  const order = getWorkOrder(id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '已完成') return { ok: false, message: '工单完成后才可回访' }
  if (!payload.satisfaction) return { ok: false, message: '请选择满意度' }
  if (!payload.note.trim()) return { ok: false, message: '请填写回访记录' }
  order.visits.unshift({
    time: formatDateTime(),
    satisfaction: payload.satisfaction,
    note: payload.note.trim(),
    complaint: payload.complaint || '无',
    handler: currentUser.value?.name ?? '社区管理员',
  })
  addAudit('工单回访', id, '成功', `${payload.satisfaction} · ${payload.note.trim()}`)
  return { ok: true, message: '回访记录已保存' }
}

export function updatePlan(
  planId: string,
  payload: { frequency: string; duration: number; items: PlanItem[]; note?: string },
) {
  const plan = servicePlans.find((item) => item.id === planId)
  if (!plan) return { ok: false, message: '服务计划不存在' }
  if (payload.items.length < 3) return { ok: false, message: '请至少保留 3 个服务项目' }
  if (!payload.items.some((item) => item.photoRequired)) {
    return { ok: false, message: '请至少设置 1 个必拍项' }
  }
  if (payload.duration < 30 || payload.duration > 180) {
    return { ok: false, message: '服务时长需在 30–180 分钟' }
  }
  plan.frequency = payload.frequency
  plan.duration = payload.duration
  plan.items = payload.items.map((item) => ({ ...item }))
  plan.updatedAt = formatDateTime()
  plan.note = payload.note ?? plan.note
  addAudit('服务计划', plan.level, '成功', `${payload.frequency} · ${payload.duration} 分钟`)
  return { ok: true, message: '服务计划已更新' }
}

export function exportWorkOrders() {
  addAudit('导出', '工单台账', '成功', `导出 ${workOrders.length} 条工单`)
  return { ok: true, message: '导出任务已创建（模拟）' }
}

export function todayOrders(staffName = '陈晓') {
  return workOrders.filter(
    (item) => item.staffName === staffName && item.scheduledDate === '2026-10-28',
  )
}
