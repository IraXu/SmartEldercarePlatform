import { computed, reactive } from 'vue'
import { addAudit, currentUser } from './useAuth'

export type AuditStatus =
  | '待机审'
  | '机审通过'
  | '机审异常'
  | '复核通过'
  | '复核不通过'
  | '申诉中'
  | '已结算'

export type ElementKey = 'person' | 'time' | 'place' | 'item' | 'media'
export type ElementStatus = '通过' | '异常' | '待核'
export type RiskLevel = '高' | '中' | '低'

export interface AuditElement {
  key: ElementKey
  label: string
  status: ElementStatus
  summary: string
  facts: string[]
}

export interface EvidenceItem {
  id: string
  type: string
  content: string
  time: string
  hash: string
  retention: string
  scope: '医保专属' | '机构可见' | '脱敏公开'
}

export interface AuditTimeline {
  time: string
  action: string
  operator: string
  note?: string
  tone?: 'blue' | 'green' | 'red' | 'gray' | 'orange' | 'purple'
}

export interface AuditReview {
  result: '通过' | '不通过'
  reason?: string
  note: string
  reviewer: string
  time: string
}

export interface AuditAppeal {
  note: string
  applicant: string
  time: string
}

export interface AuditRecord {
  id: string
  orderId: string
  elderName: string
  community: string
  grid: string
  address: string
  level: string
  staffName: string
  staffOrg: string
  staffTitle: string
  serviceDate: string
  checkinAt: string
  checkoutAt: string
  duration: number
  planDuration: number
  items: string[]
  signType: string
  signer: string
  photos: number
  clips: number
  recorderOnline: boolean
  recorderNote?: string
  deviation: number
  qr: boolean
  face: boolean
  machineStatus: '待机审' | '通过' | '异常'
  status: AuditStatus
  risk: RiskLevel
  amount: number
  elements: AuditElement[]
  evidence: EvidenceItem[]
  review?: AuditReview
  appeal?: AuditAppeal
  settlementBatch?: string
  auditedAt?: string
  /** 数据来源：seed 为演示种子，workorder 为服务工单审核后生成 */
  origin?: 'seed' | 'workorder'
  timeline: AuditTimeline[]
}

export interface SettlementBatch {
  id: string
  org: string
  period: string
  count: number
  amount: number
  status: '待拨付' | '已拨付' | '已撤回'
  createdAt: string
  paidAt?: string
  payNo?: string
}

export interface AuditOrg {
  id: string
  name: string
  license: string
  validUntil: string
  status: '有效' | '临期' | '已过期'
  compliance: number
  score: number
  orders: number
  exceptions: number
  staffCount: number
  address: string
}

export interface AuditStaff {
  name: string
  org: string
  title: string
  licenseNo: string
  validUntil: string
  status: '正常' | '临期' | '已过期'
  qualifications: string[]
  orders: number
  compliance: number
  rating: number
}

export type LeadType = '集中异常' | '重复申报' | '影像缺失' | '金额异常' | '设备离线'
export type LeadStatus = '待处理' | '处理中' | '已关闭'

export interface AuditLead {
  id: string
  type: LeadType
  target: string
  description: string
  related: string[]
  risk: RiskLevel
  status: LeadStatus
  foundAt: string
  rule: string
  suggestion: string
  conclusion?: string
  records: AuditTimeline[]
}

const auditStatusColors: Record<AuditStatus, string> = {
  待机审: 'default',
  机审通过: 'success',
  机审异常: 'error',
  复核通过: 'cyan',
  复核不通过: 'gold',
  申诉中: 'blue',
  已结算: 'default',
}

const riskColors: Record<RiskLevel, string> = {
  高: 'error',
  中: 'warning',
  低: 'success',
}

const elementStatusColors: Record<ElementStatus, string> = {
  通过: 'success',
  异常: 'error',
  待核: 'default',
}

export const auditStatusColor = (status: AuditStatus) => auditStatusColors[status]
export const riskColor = (risk: RiskLevel) => riskColors[risk]
export const elementColor = (status: ElementStatus) => elementStatusColors[status]

export const elementLabels: Record<ElementKey, string> = {
  person: '人',
  time: '时',
  place: '地',
  item: '项',
  media: '影像',
}

const levelAmount: Record<string, number> = {
  重度失能: 180,
  中度失能: 140,
  轻度失能: 100,
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function hashCode(seed: string) {
  let value = 0
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0
  }
  const base = value.toString(16).padStart(8, '0')
  const extra = ((value ^ 0x9e3779b9) >>> 0).toString(16).padStart(8, '0')
  return `${base}${extra}${base.slice(0, 8)}`
}

function shortHash(seed: string) {
  return hashCode(seed).slice(0, 12)
}

interface RecordInput {
  id: string
  orderId: string
  elderName: string
  community: string
  grid: string
  address: string
  level: string
  staffName: string
  staffOrg: string
  staffTitle: string
  serviceDate: string
  checkinAt: string
  checkoutAt: string
  duration: number
  planDuration: number
  items: string[]
  signType: string
  signer: string
  photos: number
  clips: number
  recorderOnline?: boolean
  recorderNote?: string
  deviation?: number
  qr?: boolean
  face?: boolean
  frequencyNote?: string
  frequencyViolation?: boolean
  machineStatus: '待机审' | '通过' | '异常'
  status: AuditStatus
  risk: RiskLevel
  review?: AuditReview
  appeal?: AuditAppeal
  settlementBatch?: string
  auditedAt?: string
}

function buildElements(input: RecordInput): AuditElement[] {
  const deviation = input.deviation ?? 36
  const qr = input.qr ?? true
  const face = input.face ?? true
  const recorderOnline = input.recorderOnline ?? true
  const timeThreshold = Math.round(input.planDuration * 0.8)
  const timeStatus: ElementStatus = input.duration >= timeThreshold ? '通过' : '异常'
  const placeStatus: ElementStatus = qr && deviation <= 200 ? '通过' : '异常'
  const itemStatus: ElementStatus = input.frequencyViolation ? '异常' : '通过'
  const mediaStatus: ElementStatus = recorderOnline && input.clips > 0 ? '通过' : '异常'

  return [
    {
      key: 'person',
      label: '人',
      status: '通过',
      summary: '人员在册、资质匹配，无同时多地记录',
      facts: [
        `服务人员：${input.staffName}（${input.staffOrg} · ${input.staffTitle}）`,
        `资质覆盖：${input.items.length}/${input.items.length} 项`,
        '当日无同时多地打卡',
      ],
    },
    {
      key: 'time',
      label: '时',
      status: timeStatus,
      summary: `实际 ${input.duration} 分钟 / 计划 ${input.planDuration} 分钟`,
      facts: [
        `签到 ${input.checkinAt.slice(11)}，签退 ${input.checkoutAt.slice(11)}`,
        `时长下限：计划时长的 80%（${timeThreshold} 分钟）`,
        timeStatus === '通过'
          ? `时长达标，超出下限 ${input.duration - timeThreshold} 分钟`
          : `时长不足，低于下限 ${timeThreshold - input.duration} 分钟`,
      ],
    },
    {
      key: 'place',
      label: '地',
      status: placeStatus,
      summary: `定位偏差 ${deviation} 米 / 门牌扫码${qr ? '一致' : '未完成'}`,
      facts: [
        `门牌二维码：${qr ? '已扫码，与档案地址一致' : '未扫码'}`,
        `GPS 围栏：偏差 ${deviation} 米（阈值 200 米）`,
        `人脸比对：${face ? '通过' : '未通过（已转人工核验）'}`,
      ],
    },
    {
      key: 'item',
      label: '项',
      status: itemStatus,
      summary: input.frequencyViolation
        ? '服务频次超出待遇等级计划'
        : `${input.items.length} 项服务均在目录内`,
      facts: [
        `服务项目：${input.items.join('、')}`,
        `待遇等级：${input.level}`,
        input.frequencyNote ?? '项目与频次匹配，无超范围申报',
      ],
    },
    {
      key: 'media',
      label: '影像',
      status: mediaStatus,
      summary:
        mediaStatus === '通过'
          ? `记录仪 ${input.clips} 段，照片 ${input.photos} 张`
          : '记录仪离线或关键节点缺失',
      facts: [
        `记录仪：${recorderOnline ? '在线' : '离线'}${
          input.recorderNote ? `（${input.recorderNote}）` : ''
        }`,
        `关键节点：${input.clips} 段，进门前告知${input.clips > 0 ? '已完成' : '缺失'}`,
        input.photos > 0 ? `服务照片 ${input.photos} 张，人脸已打码` : '无服务照片',
      ],
    },
  ]
}

function buildEvidence(input: RecordInput): EvidenceItem[] {
  const evidence: EvidenceItem[] = [
    {
      id: 'EVD-01',
      type: '签到记录',
      content: `GPS + 门牌二维码，偏差 ${input.deviation ?? 36} 米`,
      time: input.checkinAt,
      hash: shortHash(`${input.id}-sign`),
      retention: '2027-10-28',
      scope: '机构可见',
    },
    {
      id: 'EVD-02',
      type: '服务照片',
      content: `${input.photos} 张，人脸已自动打码`,
      time: input.checkoutAt,
      hash: shortHash(`${input.id}-photo`),
      retention: '2027-04-28',
      scope: '脱敏公开',
    },
    {
      id: 'EVD-03',
      type: '记录仪片段',
      content:
        input.clips > 0 ? `${input.clips} 段，关键节点齐全` : '无片段（记录仪离线或未领取）',
      time: input.checkinAt,
      hash: shortHash(`${input.id}-clip`),
      retention: '2026-11-27',
      scope: '医保专属',
    },
    {
      id: 'EVD-04',
      type: '签认记录',
      content: `${input.signType} · ${input.signer}`,
      time: input.checkoutAt,
      hash: shortHash(`${input.id}-signature`),
      retention: '2027-10-28',
      scope: '机构可见',
    },
    {
      id: 'EVD-05',
      type: '服务清单',
      content: `${input.items.length} 项服务项目、时长与小结`,
      time: input.checkoutAt,
      hash: shortHash(`${input.id}-items`),
      retention: '2027-10-28',
      scope: '脱敏公开',
    },
  ]
  return evidence
}

function buildTimeline(input: RecordInput): AuditTimeline[] {
  const timeline: AuditTimeline[] = [
    {
      time: input.checkinAt,
      action: '上门签到',
      operator: input.staffName,
      note: `偏差 ${input.deviation ?? 36} 米 · 二维码校验通过`,
      tone: 'blue',
    },
    {
      time: input.checkoutAt,
      action: '完成服务并提交记录',
      operator: input.staffName,
      note: `${input.items.length} 项服务 · 照片 ${input.photos} 张 · 片段 ${input.clips} 段`,
      tone: 'green',
    },
    {
      time: input.checkoutAt,
      action: '完成签认',
      operator: input.signer,
      note: input.signType,
      tone: 'green',
    },
    {
      time: input.checkoutAt,
      action: '机构审核通过',
      operator: '机构管理员',
      note: '记录完整，提交医保机审',
      tone: 'blue',
    },
  ]
  if (input.auditedAt) {
    timeline.push({
      time: input.auditedAt,
      action: input.machineStatus === '通过' ? '机审通过' : '机审异常',
      operator: '医保机审',
      note:
        input.machineStatus === '通过'
          ? '五要素校验全部通过'
          : '命中异常规则，转人工复核',
      tone: input.machineStatus === '通过' ? 'green' : 'red',
    })
  }
  if (input.review) {
    timeline.push({
      time: input.review.time,
      action: input.review.result === '通过' ? '人工复核通过' : '人工复核不通过',
      operator: input.review.reviewer,
      note: input.review.note,
      tone: input.review.result === '通过' ? 'green' : 'orange',
    })
  }
  if (input.appeal) {
    timeline.push({
      time: input.appeal.time,
      action: '机构提交申诉',
      operator: input.appeal.applicant,
      note: input.appeal.note,
      tone: 'purple',
    })
  }
  return timeline
}

function makeRecord(input: RecordInput): AuditRecord {
  return {
    ...input,
    recorderOnline: input.recorderOnline ?? true,
    deviation: input.deviation ?? 36,
    qr: input.qr ?? true,
    face: input.face ?? true,
    amount: levelAmount[input.level] ?? 140,
    elements: buildElements(input),
    evidence: buildEvidence(input),
    timeline: buildTimeline(input),
  }
}

const seedRecords: AuditRecord[] = [
  makeRecord({
    id: 'AU20261028006',
    orderId: 'WO20261028006',
    elderName: '陈建国',
    community: '康乐社区',
    grid: '第1网格',
    address: '幸福里 5栋 1单元 102',
    level: '轻度失能',
    staffName: '王强',
    staffOrg: '康乐颐养服务中心',
    staffTitle: '康复师',
    serviceDate: '2026-10-28',
    checkinAt: '2026-10-28 10:02',
    checkoutAt: '2026-10-28 11:06',
    duration: 64,
    planDuration: 60,
    items: ['助餐', '健康监测', '家居清洁'],
    signType: '老人手写',
    signer: '陈建国（本人）',
    photos: 1,
    clips: 2,
    machineStatus: '待机审',
    status: '待机审',
    risk: '低',
  }),
  makeRecord({
    id: 'AU20261028005',
    orderId: 'WO20261028005',
    elderName: '赵德明',
    community: '安康社区',
    grid: '第1网格',
    address: '幸福里 3栋 1单元 202',
    level: '中度失能',
    staffName: '刘敏',
    staffOrg: '安康居家护理站',
    staffTitle: '护理员',
    serviceDate: '2026-10-27',
    checkinAt: '2026-10-27 13:58',
    checkoutAt: '2026-10-27 15:10',
    duration: 72,
    planDuration: 60,
    items: ['助浴', '助餐', '康复训练'],
    signType: '老人手写',
    signer: '赵德明（本人）',
    photos: 3,
    clips: 3,
    machineStatus: '通过',
    status: '机审通过',
    risk: '低',
    auditedAt: '2026-10-27 16:20',
  }),
  makeRecord({
    id: 'AU20261027007',
    orderId: 'WO20261027007',
    elderName: '周志强',
    community: '康乐社区',
    grid: '第3网格',
    address: '幸福里 6栋 2单元 401',
    level: '轻度失能',
    staffName: '王强',
    staffOrg: '康乐颐养服务中心',
    staffTitle: '康复师',
    serviceDate: '2026-10-26',
    checkinAt: '2026-10-26 09:58',
    checkoutAt: '2026-10-26 10:58',
    duration: 60,
    planDuration: 60,
    items: ['助餐', '健康监测', '家居清洁'],
    signType: '监护人代签',
    signer: '周敏（女儿）',
    photos: 2,
    clips: 2,
    machineStatus: '通过',
    status: '机审通过',
    risk: '低',
    auditedAt: '2026-10-26 12:05',
  }),
  makeRecord({
    id: 'AU20261027011',
    orderId: 'WO20261027011',
    elderName: '张桂芳',
    community: '安康社区',
    grid: '第1网格',
    address: '幸福里 3栋 2单元 501',
    level: '重度失能',
    staffName: '陈晓',
    staffOrg: '安康居家护理站',
    staffTitle: '高级护理员',
    serviceDate: '2026-10-27',
    checkinAt: '2026-10-27 09:02',
    checkoutAt: '2026-10-27 09:44',
    duration: 42,
    planDuration: 90,
    items: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测'],
    signType: '家属远程签认',
    signer: '李伟（儿子）',
    photos: 2,
    clips: 2,
    machineStatus: '异常',
    status: '机审异常',
    risk: '高',
    auditedAt: '2026-10-27 10:10',
  }),
  makeRecord({
    id: 'AU20261027012',
    orderId: 'WO20261027012',
    elderName: '李长顺',
    community: '安康社区',
    grid: '第2网格',
    address: '幸福里 3栋 1单元 402',
    level: '中度失能',
    staffName: '刘敏',
    staffOrg: '安康居家护理站',
    staffTitle: '护理员',
    serviceDate: '2026-10-27',
    checkinAt: '2026-10-27 14:05',
    checkoutAt: '2026-10-27 15:15',
    duration: 70,
    planDuration: 60,
    items: ['助浴', '助餐', '康复训练'],
    signType: '老人指纹',
    signer: '李长顺（本人）',
    photos: 2,
    clips: 0,
    recorderOnline: false,
    recorderNote: '设备未领取',
    machineStatus: '异常',
    status: '机审异常',
    risk: '中',
    auditedAt: '2026-10-27 16:10',
  }),
  makeRecord({
    id: 'AU20261027013',
    orderId: 'WO20261027013',
    elderName: '王秀兰',
    community: '安康社区',
    grid: '第3网格',
    address: '幸福里 4栋 1单元 601',
    level: '重度失能',
    staffName: '陈晓',
    staffOrg: '安康居家护理站',
    staffTitle: '高级护理员',
    serviceDate: '2026-10-27',
    checkinAt: '2026-10-27 08:30',
    checkoutAt: '2026-10-27 10:05',
    duration: 95,
    planDuration: 90,
    items: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测'],
    signType: '家属远程签认',
    signer: '王建军（儿子）',
    photos: 3,
    clips: 4,
    deviation: 268,
    machineStatus: '异常',
    status: '机审异常',
    risk: '高',
    auditedAt: '2026-10-27 11:20',
  }),
  makeRecord({
    id: 'AU20261027014',
    orderId: 'WO20261027014',
    elderName: '陈建国',
    community: '康乐社区',
    grid: '第1网格',
    address: '幸福里 5栋 1单元 102',
    level: '轻度失能',
    staffName: '王强',
    staffOrg: '康乐颐养服务中心',
    staffTitle: '康复师',
    serviceDate: '2026-10-27',
    checkinAt: '2026-10-27 15:00',
    checkoutAt: '2026-10-27 16:02',
    duration: 62,
    planDuration: 60,
    items: ['助餐', '健康监测', '家居清洁'],
    signType: '老人手写',
    signer: '陈建国（本人）',
    photos: 1,
    clips: 2,
    frequencyNote: '本周第 2 次服务，计划为每周 1 次，超出 1 次',
    frequencyViolation: true,
    machineStatus: '异常',
    status: '机审异常',
    risk: '中',
    auditedAt: '2026-10-27 17:00',
  }),
  makeRecord({
    id: 'AU20261027015',
    orderId: 'WO20261027015',
    elderName: '孙玉梅',
    community: '康乐社区',
    grid: '第2网格',
    address: '幸福里 7栋 2单元 302',
    level: '中度失能',
    staffName: '赵丽',
    staffOrg: '康乐颐养服务中心',
    staffTitle: '护理员',
    serviceDate: '2026-10-25',
    checkinAt: '2026-10-25 09:00',
    checkoutAt: '2026-10-25 10:12',
    duration: 72,
    planDuration: 60,
    items: ['助浴', '助餐', '翻身拍背'],
    signType: '老人指纹',
    signer: '孙玉梅（本人）',
    photos: 2,
    clips: 0,
    recorderNote: '设备短暂掉线',
    machineStatus: '异常',
    status: '复核通过',
    risk: '中',
    auditedAt: '2026-10-25 11:00',
    review: {
      result: '通过',
      note: '记录仪片段完整，服务项目与申报一致，影像缺失为设备短暂掉线，不影响服务真实性。',
      reviewer: '顾敏',
      time: '2026-10-25 14:20',
    },
  }),
  makeRecord({
    id: 'AU20261026016',
    orderId: 'WO20261026016',
    elderName: '吴凤英',
    community: '安康社区',
    grid: '第4网格',
    address: '幸福里 2栋 1单元 203',
    level: '重度失能',
    staffName: '刘敏',
    staffOrg: '安康居家护理站',
    staffTitle: '护理员',
    serviceDate: '2026-10-24',
    checkinAt: '2026-10-24 08:10',
    checkoutAt: '2026-10-24 09:45',
    duration: 95,
    planDuration: 90,
    items: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测'],
    signType: '家属远程签认',
    signer: '吴晓东（儿子）',
    photos: 4,
    clips: 5,
    frequencyNote: '本周第 2 次服务，计划为每周 1 次',
    frequencyViolation: true,
    machineStatus: '异常',
    status: '复核通过',
    risk: '中',
    auditedAt: '2026-10-24 10:30',
    review: {
      result: '通过',
      note: '临时加单已备案，服务记录与签认齐全，同意按实际服务结算。',
      reviewer: '顾敏',
      time: '2026-10-24 15:00',
    },
  }),
  makeRecord({
    id: 'AU20261025017',
    orderId: 'WO20261025017',
    elderName: '郑海龙',
    community: '康乐社区',
    grid: '第4网格',
    address: '幸福里 9栋 1单元 501',
    level: '中度失能',
    staffName: '陈晓',
    staffOrg: '安康居家护理站',
    staffTitle: '高级护理员',
    serviceDate: '2026-10-24',
    checkinAt: '2026-10-24 13:58',
    checkoutAt: '2026-10-24 15:12',
    duration: 74,
    planDuration: 60,
    items: ['助浴', '助餐', '康复训练'],
    signType: '老人手写',
    signer: '郑海龙（本人）',
    photos: 2,
    clips: 3,
    deviation: 232,
    machineStatus: '异常',
    status: '复核不通过',
    risk: '高',
    auditedAt: '2026-10-24 16:00',
    review: {
      result: '不通过',
      reason: '地点不符',
      note: '签到位置与档案地址偏差 232 米，且未补充说明，判定服务地点不符合。',
      reviewer: '顾敏',
      time: '2026-10-25 09:30',
    },
  }),
  makeRecord({
    id: 'AU20261025020',
    orderId: 'WO20261025020',
    elderName: '周志强',
    community: '康乐社区',
    grid: '第3网格',
    address: '幸福里 6栋 2单元 401',
    level: '轻度失能',
    staffName: '王强',
    staffOrg: '康乐颐养服务中心',
    staffTitle: '康复师',
    serviceDate: '2026-10-25',
    checkinAt: '2026-10-25 10:02',
    checkoutAt: '2026-10-25 11:00',
    duration: 58,
    planDuration: 60,
    items: ['助餐', '健康监测', '家居清洁'],
    signType: '监护人代签',
    signer: '周敏（女儿）',
    photos: 2,
    clips: 2,
    frequencyNote: '24 小时内重复申报同项目，已纳入稽核线索',
    frequencyViolation: true,
    machineStatus: '异常',
    status: '申诉中',
    risk: '中',
    auditedAt: '2026-10-25 12:10',
    review: {
      result: '不通过',
      reason: '超范围',
      note: '同一老人 24 小时内重复申报居家清洁，超出计划频次。',
      reviewer: '顾敏',
      time: '2026-10-25 15:40',
    },
    appeal: {
      note: '老人呕吐污染地面，属临时清洁需求，已电话报备社区网格员，申请按实际服务结算。',
      applicant: '康乐颐养服务中心 · 机构管理员',
      time: '2026-10-26 09:20',
    },
  }),
  makeRecord({
    id: 'AU20261024018',
    orderId: 'WO20261024018',
    elderName: '吴凤英',
    community: '安康社区',
    grid: '第4网格',
    address: '幸福里 2栋 1单元 203',
    level: '重度失能',
    staffName: '陈晓',
    staffOrg: '安康居家护理站',
    staffTitle: '高级护理员',
    serviceDate: '2026-10-20',
    checkinAt: '2026-10-20 08:05',
    checkoutAt: '2026-10-20 09:40',
    duration: 95,
    planDuration: 90,
    items: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测'],
    signType: '家属远程签认',
    signer: '吴晓东（儿子）',
    photos: 4,
    clips: 4,
    machineStatus: '通过',
    status: '已结算',
    risk: '低',
    auditedAt: '2026-10-20 11:00',
    settlementBatch: 'B20261020-01',
  }),
  makeRecord({
    id: 'AU20261024019',
    orderId: 'WO20261024019',
    elderName: '赵德明',
    community: '安康社区',
    grid: '第1网格',
    address: '幸福里 3栋 1单元 202',
    level: '中度失能',
    staffName: '刘敏',
    staffOrg: '安康居家护理站',
    staffTitle: '护理员',
    serviceDate: '2026-10-20',
    checkinAt: '2026-10-20 14:02',
    checkoutAt: '2026-10-20 15:10',
    duration: 68,
    planDuration: 60,
    items: ['助浴', '助餐', '康复训练'],
    signType: '老人手写',
    signer: '赵德明（本人）',
    photos: 3,
    clips: 3,
    machineStatus: '通过',
    status: '已结算',
    risk: '低',
    auditedAt: '2026-10-20 16:10',
    settlementBatch: 'B20261020-01',
  }),
]

const allAuditRecords = [...seedRecords]

export const auditRecords = reactive<AuditRecord[]>([...allAuditRecords])

export function syncAuditToElderNames(names: Set<string>) {
  auditRecords.splice(
    0,
    auditRecords.length,
    ...allAuditRecords.filter((item) => names.has(item.elderName)),
  )
  // 机构、人员、结算批次、稽核线索跟随当前项目的服务人员归属收敛，避免跨项目串数据
  const orgNames = new Set(auditRecords.map((item) => item.staffOrg))
  const leadOrg = (target: string) => target.split(' · ')[0]
  settlementBatches.splice(
    0,
    settlementBatches.length,
    ...[...snapshotBatches, ...runtimeBatches].filter((item) => orgNames.has(item.org)),
  )
  auditOrgs.splice(0, auditOrgs.length, ...snapshotOrgs.filter((item) => orgNames.has(item.name)))
  auditStaff.splice(0, auditStaff.length, ...snapshotStaff.filter((item) => orgNames.has(item.org)))
  auditLeads.splice(
    0,
    auditLeads.length,
    ...snapshotLeads.filter(
      (item) =>
        orgNames.has(leadOrg(item.target)) ||
        item.related.some((orderId) =>
          auditRecords.some((record) => record.orderId === orderId),
        ),
    ),
  )
}

export interface WorkOrderAuditInput {
  orderId: string
  elderName: string
  community: string
  grid: string
  address: string
  level: string
  staffName: string
  staffOrg: string
  staffTitle: string
  serviceDate: string
  checkinAt: string
  checkoutAt: string
  duration: number
  planDuration: number
  items: string[]
  signType: string
  signer: string
  photos: number
  clips: number
  recorderOnline: boolean
  deviation: number
  qr: boolean
  face: boolean
  amount: number
}

/** 工单机构审核通过后生成证据审核单，打通 M5 服务工单 → M6 证据监管 */
export function createAuditFromWorkOrder(input: WorkOrderAuditInput) {
  if (
    auditRecords.some((item) => item.orderId === input.orderId && item.origin === 'workorder')
  ) {
    return { ok: false, message: '该工单已生成证据审核单' }
  }
  // 演示种子与工单号可能重复：生成真实审核单时替换旧种子，避免同号两条
  const staleIndex = allAuditRecords.findIndex((item) => item.orderId === input.orderId)
  if (staleIndex >= 0) {
    allAuditRecords.splice(staleIndex, 1)
    const visibleIndex = auditRecords.findIndex((item) => item.orderId === input.orderId)
    if (visibleIndex >= 0) auditRecords.splice(visibleIndex, 1)
  }
  const now = formatDateTime()
  const idPrefix = `AU${formatDate()}`
  const idSequence =
    allAuditRecords.filter((item) => item.id.startsWith(idPrefix)).length + 1
  const record: AuditRecord = {
    id: `${idPrefix}${String(idSequence).padStart(3, '0')}`,
    orderId: input.orderId,
    elderName: input.elderName,
    community: input.community,
    grid: input.grid,
    address: input.address,
    level: input.level,
    staffName: input.staffName,
    staffOrg: input.staffOrg,
    staffTitle: input.staffTitle,
    serviceDate: input.serviceDate,
    checkinAt: input.checkinAt,
    checkoutAt: input.checkoutAt,
    duration: input.duration,
    planDuration: input.planDuration,
    items: input.items,
    signType: input.signType,
    signer: input.signer,
    photos: input.photos,
    clips: input.clips,
    recorderOnline: input.recorderOnline,
    deviation: input.deviation,
    qr: input.qr,
    face: input.face,
    machineStatus: '待机审',
    status: '待机审',
    risk: input.deviation > 200 ? '中' : '低',
    amount: input.amount,
    origin: 'workorder',
    elements: [
      {
        key: 'person',
        label: '人',
        status: '待核',
        summary: '服务人员与老人身份待机审比对',
        facts: [`服务人员：${input.staffName}（${input.staffOrg}）`, `服务对象：${input.elderName}`],
      },
      {
        key: 'time',
        label: '时',
        status: '待核',
        summary: '签到与签退时间待机审核验',
        facts: [`签到：${input.checkinAt}`, `签退：${input.checkoutAt}`, `服务时长：${input.duration} 分钟`],
      },
      {
        key: 'place',
        label: '地',
        status: '待核',
        summary: '服务地点与定位偏差待机审核验',
        facts: [`地址：${input.address}`, `定位偏差：${input.deviation} 米`],
      },
      {
        key: 'item',
        label: '项',
        status: '待核',
        summary: '服务项目与计划一致性待机审核验',
        facts: [`服务项目：${input.items.join('、') || '未记录'}`, `计划时长：${input.planDuration} 分钟`],
      },
      {
        key: 'media',
        label: '影像',
        status: '待核',
        summary: '照片与记录仪证据完整性待机审核验',
        facts: [`照片 ${input.photos} 张`, `记录仪片段 ${input.clips} 段`, `签认方式：${input.signType}`],
      },
    ],
    evidence: [
      {
        id: `EV-${input.orderId}-PHOTO`,
        type: '服务照片',
        content: `服务过程照片 ${input.photos} 张`,
        time: input.checkinAt,
        hash: '待机审生成',
        retention: '3 年',
        scope: '医保专属',
      },
      {
        id: `EV-${input.orderId}-SIGN`,
        type: '签认记录',
        content: `${input.signType} · ${input.signer}`,
        time: input.checkoutAt,
        hash: '待机审生成',
        retention: '3 年',
        scope: '机构可见',
      },
    ],
    timeline: [
      {
        time: input.checkinAt || now,
        action: '上门签到',
        operator: input.staffName,
        note: `定位偏差 ${input.deviation} 米 · ${input.qr ? '扫码通过' : '扫码未通过'} · ${input.face ? '人脸通过' : '人脸未通过'}`,
        tone: 'gray',
      },
      {
        time: input.checkoutAt || now,
        action: '完成服务并提交记录',
        operator: input.staffName,
        note: `完成 ${input.items.length} 项服务，照片 ${input.photos} 张`,
        tone: 'gray',
      },
      {
        time: input.checkoutAt || now,
        action: '完成签认',
        operator: input.signer,
        note: input.signType,
        tone: 'gray',
      },
      {
        time: now,
        action: '生成审核单',
        operator: '系统',
        note: `服务工单 ${input.orderId} 机构审核通过后自动生成，等待机审`,
        tone: 'blue',
      },
    ],
  }
  auditRecords.unshift(record)
  allAuditRecords.unshift(record)
  addAudit('生成审核单', record.id, '成功', `${input.elderName} · 工单 ${input.orderId} 待机审`)
  return { ok: true, message: '已生成证据审核单，等待机审', record }
}

export const settlementBatches = reactive<SettlementBatch[]>([
  {
    id: 'B20261020-01',
    org: '安康居家护理站',
    period: '2026-10 上半月',
    count: 2,
    amount: 320,
    status: '已拨付',
    createdAt: '2026-10-20 18:00',
    paidAt: '2026-10-21 10:20',
    payNo: 'P20261021001',
  },
])

export const auditOrgs = reactive<AuditOrg[]>([
  {
    id: 'ORG01',
    name: '安康居家护理站',
    license: '定点资格 A2023-018',
    validUntil: '2027-06-30',
    status: '有效',
    compliance: 94.2,
    score: 92.6,
    orders: 128,
    exceptions: 7,
    staffCount: 2,
    address: '安康街道幸福路 18 号',
  },
  {
    id: 'ORG02',
    name: '康乐颐养服务中心',
    license: '定点资格 A2024-006',
    validUntil: '2026-12-10',
    status: '临期',
    compliance: 88.5,
    score: 86.4,
    orders: 96,
    exceptions: 11,
    staffCount: 2,
    address: '康乐街道安平路 6 号',
  },
])

export const auditStaff = reactive<AuditStaff[]>([
  {
    name: '陈晓',
    org: '安康居家护理站',
    title: '高级护理员',
    licenseNo: 'HL2023-0412',
    validUntil: '2027-03-31',
    status: '正常',
    qualifications: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测'],
    orders: 62,
    compliance: 95.2,
    rating: 4.9,
  },
  {
    name: '刘敏',
    org: '安康居家护理站',
    title: '护理员',
    licenseNo: 'HL2022-0287',
    validUntil: '2026-12-05',
    status: '临期',
    qualifications: ['助浴', '助餐', '康复训练', '翻身拍背', '生命体征监测'],
    orders: 54,
    compliance: 93.7,
    rating: 4.8,
  },
  {
    name: '王强',
    org: '康乐颐养服务中心',
    title: '康复师',
    licenseNo: 'KF2022-0139',
    validUntil: '2026-11-20',
    status: '临期',
    qualifications: ['康复训练', '助餐', '生命体征监测', '健康监测', '家居清洁'],
    orders: 48,
    compliance: 89.6,
    rating: 4.7,
  },
  {
    name: '赵丽',
    org: '康乐颐养服务中心',
    title: '护理员',
    licenseNo: 'HL2024-0506',
    validUntil: '2027-08-15',
    status: '正常',
    qualifications: ['助浴', '助餐', '翻身拍背', '生命体征监测', '家居清洁'],
    orders: 42,
    compliance: 91.4,
    rating: 4.6,
  },
])

export const auditLeads = reactive<AuditLead[]>([
  {
    id: 'LD20261028001',
    type: '集中异常',
    target: '安康居家护理站 · 陈晓',
    description: '近 7 天 4 单服务时长不足，命中「时」异常规则',
    related: ['AU20261027011', 'AU20261027013'],
    risk: '高',
    status: '待处理',
    foundAt: '2026-10-28 08:10',
    rule: '7 天内同一人员时长异常 ≥ 3 单',
    suggestion: '转人工复核，核查排班与签到记录',
    records: [],
  },
  {
    id: 'LD20261028002',
    type: '影像缺失',
    target: '安康居家护理站 · 刘敏',
    description: '记录仪连续 3 单离线且未登记原因，影像要素全部异常',
    related: ['AU20261027012'],
    risk: '高',
    status: '待处理',
    foundAt: '2026-10-28 08:15',
    rule: '同一人员 7 天内影像缺失 ≥ 3 单',
    suggestion: '要求机构补传片段或说明原因',
    records: [],
  },
  {
    id: 'LD20261027003',
    type: '重复申报',
    target: '康乐社区 · 周志强',
    description: '同一老人 24 小时内出现 2 单同项目申报',
    related: ['AU20261025020'],
    risk: '中',
    status: '处理中',
    foundAt: '2026-10-27 09:20',
    rule: '同一老人 24 小时内同项目申报 ≥ 2 单',
    suggestion: '核对服务计划与临时加单备案',
    records: [
      {
        time: '2026-10-27 10:00',
        action: '转人工复核',
        operator: '顾敏',
        note: '已生成待复核工单，等待机构补充说明',
        tone: 'blue',
      },
    ],
  },
  {
    id: 'LD20261026004',
    type: '金额异常',
    target: '康乐颐养服务中心',
    description: '上月结算金额环比增长 46%，高于区域均值 18 个百分点',
    related: [],
    risk: '中',
    status: '待处理',
    foundAt: '2026-10-26 15:30',
    rule: '机构月结算金额环比增长 ≥ 30%',
    suggestion: '抽查该机构高频服务项目与人员',
    records: [],
  },
  {
    id: 'LD20261020005',
    type: '设备离线',
    target: '康乐颐养服务中心 · 赵丽',
    description: '记录仪连续 5 天未上线',
    related: [],
    risk: '低',
    status: '已关闭',
    foundAt: '2026-10-20 09:00',
    rule: '记录仪连续 3 天未上线',
    suggestion: '核查设备领用与培训记录',
    conclusion: '已补领设备并完成培训，线索关闭',
    records: [
      {
        time: '2026-10-21 11:00',
        action: '标记已处理',
        operator: '顾敏',
        note: '已补领设备并完成培训，线索关闭',
        tone: 'green',
      },
    ],
  },
])

/** 证据监管侧数据的初始快照，用于按项目切换时恢复 */
const snapshotBatches = [...settlementBatches]
const snapshotOrgs = [...auditOrgs]
const snapshotStaff = [...auditStaff]
const snapshotLeads = [...auditLeads]
/** 原型运行期新建的结算批次，切换项目后仍需保留 */
const runtimeBatches: SettlementBatch[] = []

export const auditStats = computed(() => ({
  pending: auditRecords.filter((item) => item.status === '待机审').length,
  passed: auditRecords.filter((item) => item.status === '机审通过').length,
  abnormal: auditRecords.filter((item) => item.status === '机审异常').length,
  reviewing: auditRecords.filter((item) => item.status === '机审异常' || item.status === '申诉中')
    .length,
  settlementAmount: auditRecords
    .filter(
      (item) =>
        (item.status === '机审通过' || item.status === '复核通过') && !item.settlementBatch,
    )
    .reduce((sum, item) => sum + item.amount, 0),
}))

export const poolRecords = computed(() =>
  auditRecords.filter(
    (item) => (item.status === '机审通过' || item.status === '复核通过') && !item.settlementBatch,
  ),
)

export const settlementStats = computed(() => ({
  pendingCount: poolRecords.value.length,
  pendingAmount: poolRecords.value.reduce((sum, item) => sum + item.amount, 0),
  settledAmount: auditRecords
    .filter((item) => item.status === '已结算')
    .reduce((sum, item) => sum + item.amount, 0),
  deducted: auditRecords
    .filter((item) => item.status === '复核不通过')
    .reduce((sum, item) => sum + item.amount, 0),
}))

export const reviewQueue = computed(() =>
  auditRecords
    .filter((item) => item.status === '机审异常' || item.status === '申诉中')
    .sort((a, b) => {
      const weight: Record<RiskLevel, number> = { 高: 0, 中: 1, 低: 2 }
      const gap = weight[a.risk] - weight[b.risk]
      if (gap !== 0) return gap
      return a.checkinAt.localeCompare(b.checkinAt)
    }),
)

export const leadStats = computed(() => ({
  pending: auditLeads.filter((item) => item.status !== '已关闭').length,
  high: auditLeads.filter((item) => item.risk === '高' && item.status !== '已关闭').length,
  month: auditLeads.filter((item) => item.foundAt.startsWith('2026-10')).length,
  closed: auditLeads.filter((item) => item.status === '已关闭').length,
}))

export function getAudit(id: string) {
  return auditRecords.find((item) => item.id === id) ?? null
}

function appendTimeline(record: AuditRecord, item: AuditTimeline) {
  record.timeline.push(item)
}

function evaluate(record: AuditRecord) {
  const abnormal = record.elements.filter((item) => item.status === '异常')
  record.machineStatus = abnormal.length > 0 ? '异常' : '通过'
  record.status = abnormal.length > 0 ? '机审异常' : '机审通过'
  record.auditedAt = formatDateTime()
  appendTimeline(record, {
    time: record.auditedAt,
    action: abnormal.length > 0 ? '机审异常' : '机审通过',
    operator: '医保机审',
    note:
      abnormal.length > 0
        ? `命中 ${abnormal.map((item) => item.label).join('、')} ${abnormal.length} 项异常`
        : '五要素校验全部通过',
    tone: abnormal.length > 0 ? 'red' : 'green',
  })
  addAudit(
    '执行机审',
    record.id,
    abnormal.length > 0 ? '异常' : '通过',
    abnormal.length > 0
      ? `命中 ${abnormal.map((item) => item.label).join('、')}`
      : '五要素全部通过',
  )
}

export function runAllAudit() {
  const pending = auditRecords.filter((item) => item.status === '待机审')
  if (pending.length === 0) {
    return { ok: false, message: '暂无可机审工单' }
  }
  let passed = 0
  let abnormal = 0
  pending.forEach((record) => {
    evaluate(record)
    if (record.status === '机审通过') passed += 1
    else abnormal += 1
  })
  return {
    ok: true,
    passed,
    abnormal,
    message: `机审完成：通过 ${passed} 条，异常 ${abnormal} 条`,
  }
}

export function runAudit(id: string) {
  const record = getAudit(id)
  if (!record) return { ok: false, message: '审核单不存在' }
  evaluate(record)
  return {
    ok: true,
    message: record.status === '机审通过' ? '已机审：五要素全部通过' : '已机审：机审异常',
  }
}

export interface ReviewInput {
  result: '通过' | '不通过'
  reason?: string
  note: string
  notify?: boolean
}

export function submitReview(id: string, payload: ReviewInput) {
  const record = getAudit(id)
  if (!record) return { ok: false, message: '审核单不存在' }
  if (!['机审异常', '申诉中'].includes(record.status)) {
    return { ok: false, message: '该工单当前不可复核' }
  }
  if (payload.note.trim().length < 10) {
    return { ok: false, message: '复核意见至少 10 个字' }
  }
  if (payload.result === '不通过' && !payload.reason) {
    return { ok: false, message: '请选择退回原因' }
  }
  record.review = {
    result: payload.result,
    reason: payload.reason,
    note: payload.note.trim(),
    reviewer: currentUser.value?.name ?? '医保审核员',
    time: formatDateTime(),
  }
  record.status = payload.result === '通过' ? '复核通过' : '复核不通过'
  record.appeal = undefined
  appendTimeline(record, {
    time: record.review.time,
    action: payload.result === '通过' ? '人工复核通过' : '人工复核不通过',
    operator: record.review.reviewer,
    note: record.review.note,
    tone: payload.result === '通过' ? 'green' : 'orange',
  })
  addAudit(
    '提交复核结论',
    record.id,
    payload.result,
    payload.result === '通过' ? '复核通过，进入结算池' : `退回机构：${payload.reason}`,
  )
  return {
    ok: true,
    message:
      payload.result === '通过' ? '复核通过，已进入结算池' : '复核不通过，已退回机构',
  }
}

export function submitAppeal(id: string, note: string) {
  const record = getAudit(id)
  if (!record) return { ok: false, message: '审核单不存在' }
  if (record.status !== '复核不通过') return { ok: false, message: '当前状态不可申诉' }
  if (record.appeal) return { ok: false, message: '该工单已提交过申诉' }
  if (note.trim().length < 20) return { ok: false, message: '申诉说明至少 20 个字' }
  record.appeal = {
    note: note.trim(),
    applicant: currentUser.value?.name ?? '机构管理员',
    time: formatDateTime(),
  }
  record.status = '申诉中'
  appendTimeline(record, {
    time: record.appeal.time,
    action: '机构提交申诉',
    operator: record.appeal.applicant,
    note: record.appeal.note,
    tone: 'purple',
  })
  addAudit('机构申诉', record.id, '成功', note.trim())
  return { ok: true, message: '申诉已提交，等待医保复审' }
}

export interface CreateBatchInput {
  org: string
  period: string
  ids: string[]
}

export function createBatch(payload: CreateBatchInput) {
  if (!payload.org) return { ok: false, message: '请选择机构' }
  if (!payload.period) return { ok: false, message: '请选择结算周期' }
  if (payload.ids.length === 0) return { ok: false, message: '请至少选择 1 条待结算工单' }
  const records = auditRecords.filter((item) => payload.ids.includes(item.id))
  if (records.some((item) => item.status !== '机审通过' && item.status !== '复核通过')) {
    return { ok: false, message: '所选工单含申诉中或复核不通过记录' }
  }
  const amount = records.reduce((sum, item) => sum + item.amount, 0)
  if (amount === 0) return { ok: false, message: '该批次可结算金额为 0' }
  const datePrefix = `B${formatDate()}`
  const sequence =
    settlementBatches.filter((item) => item.id.startsWith(datePrefix)).length + 1
  const id = `${datePrefix}-${String(sequence).padStart(2, '0')}`
  const batch: SettlementBatch = {
    id,
    org: payload.org,
    period: payload.period,
    count: records.length,
    amount,
    status: '待拨付',
    createdAt: formatDateTime(),
  }
  runtimeBatches.unshift(batch)
  settlementBatches.unshift(batch)
  records.forEach((record) => {
    record.settlementBatch = id
  })
  addAudit('生成结算批次', id, '成功', `${payload.org} · ${records.length} 单 · ¥${amount.toFixed(2)}`)
  return { ok: true, message: `结算批次 ${id} 已生成`, batch }
}

export function payBatch(id: string) {
  const batch = settlementBatches.find((item) => item.id === id)
  if (!batch) return { ok: false, message: '结算批次不存在' }
  if (batch.status !== '待拨付') return { ok: false, message: '该批次不可拨付' }
  batch.status = '已拨付'
  batch.paidAt = formatDateTime()
  batch.payNo = `P${formatDate()}${String(Math.floor(Math.random() * 900) + 100)}`
  auditRecords
    .filter((item) => item.settlementBatch === id)
    .forEach((record) => {
      record.status = '已结算'
      appendTimeline(record, {
        time: batch.paidAt!,
        action: '完成拨付',
        operator: '医保经办',
        note: `批次 ${id} · 拨付单 ${batch.payNo}`,
        tone: 'gray',
      })
    })
  addAudit('确认拨付', id, '成功', `${batch.count} 单 · ¥${batch.amount.toFixed(2)}`)
  return {
    ok: true,
    message: `拨付完成，共 ${batch.count} 单，金额 ¥${batch.amount.toFixed(2)}`,
  }
}

export function revokeBatch(id: string) {
  const batch = settlementBatches.find((item) => item.id === id)
  if (!batch) return { ok: false, message: '结算批次不存在' }
  if (batch.status !== '待拨付') return { ok: false, message: '已拨付批次不可撤回' }
  batch.status = '已撤回'
  auditRecords
    .filter((item) => item.settlementBatch === id)
    .forEach((record) => {
      record.settlementBatch = undefined
    })
  addAudit('撤回结算批次', id, '成功', `${batch.count} 单返回待结算`)
  return { ok: true, message: '批次已撤回，工单返回待结算' }
}

export interface LeadHandleInput {
  action: '转人工复核' | '标记已处理' | '标记不成立'
  note: string
  notify?: boolean
}

export function handleLead(id: string, payload: LeadHandleInput) {
  const lead = auditLeads.find((item) => item.id === id)
  if (!lead) return { ok: false, message: '线索不存在' }
  if (lead.status === '已关闭') return { ok: false, message: '线索已关闭' }
  if (!payload.action) return { ok: false, message: '请选择处置方式' }
  if (payload.note.trim().length < 10) return { ok: false, message: '处置意见至少 10 个字' }
  const time = formatDateTime()
  lead.records.push({
    time,
    action: payload.action,
    operator: currentUser.value?.name ?? '医保稽核',
    note: payload.note.trim(),
    tone: payload.action === '标记不成立' ? 'gray' : payload.action === '转人工复核' ? 'blue' : 'green',
  })
  lead.status = payload.action === '转人工复核' ? '处理中' : '已关闭'
  if (payload.action === '标记不成立') {
    lead.conclusion = payload.note.trim()
  }
  addAudit('处置稽核线索', id, '成功', `${payload.action}：${payload.note.trim()}`)
  return {
    ok: true,
    message:
      payload.action === '转人工复核'
        ? '线索已转人工复核'
        : payload.action === '标记不成立'
          ? '线索已标记不成立'
          : '线索已标记处理完成',
  }
}

export const auditPendingCount = computed(() => reviewQueue.value.length)
