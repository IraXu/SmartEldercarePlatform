import { reactive } from 'vue'
import { devices, type Device, type DeviceType } from './devices'
import { elders, getElderById, getHouseByElder } from './elders'

export type EventLevel = 'L3' | 'L2' | 'L1'
export type EventStatus = '待确认' | '处置中' | '已到场' | '已关闭' | '已归档' | '误报'
export type EventType =
  | '疑似跌倒'
  | '烟感预警'
  | '燃气泄漏'
  | '一氧化碳超标'
  | 'SOS 求助'
  | '长时间未活动'
  | '电子围栏越界'
  | '陌生人闯入'
  | '卫生间长时间占用'
export type MisreportReason = '设备误报' | '环境干扰' | '老人正常活动' | '重复上报' | '其他'

export const eventLevelOptions: EventLevel[] = ['L3', 'L2', 'L1']
export const eventStatusOptions: EventStatus[] = ['待确认', '处置中', '已到场', '已关闭', '已归档', '误报']
export const eventTypeOptions: EventType[] = [
  '疑似跌倒',
  '烟感预警',
  '燃气泄漏',
  '一氧化碳超标',
  'SOS 求助',
  '长时间未活动',
  '电子围栏越界',
  '陌生人闯入',
  '卫生间长时间占用',
]
export const misreportReasonOptions: MisreportReason[] = [
  '设备误报',
  '环境干扰',
  '老人正常活动',
  '重复上报',
  '其他',
]

export interface EventSignal {
  id: string
  time: string
  deviceId: string
  deviceName: string
  roomName: string
  type: string
  value: string
  confidence: number
}

export interface EventNotification {
  id: string
  time: string
  target: string
  channel: string
  result: string
  note: string
}

export interface EventDisposition {
  id: string
  time: string
  operator: string
  action: string
  method?: string
  note: string
}

export interface EventContact {
  name: string
  relation: string
  phone: string
}

export interface EventSnapshot {
  elderName: string
  age: number
  riskLevel: string
  riskTags: string[]
  address: string
  roomName: string
  contacts: EventContact[]
  entryMethod: string
  devices: string[]
}

export interface SafetyEvent {
  id: string
  level: EventLevel
  type: EventType
  status: EventStatus
  title: string
  occurredAt: string
  occurredMinutesAgo: number
  duration: string
  elderId: string
  elderName: string
  age: number
  address: string
  roomName: string
  deviceId: string
  deviceName: string
  confidence: number
  signals: EventSignal[]
  fusionSummary: string
  fusionBasis: string[]
  notifications: EventNotification[]
  dispositions: EventDisposition[]
  snapshot: EventSnapshot
  misreportReason?: MisreportReason
  misreportNote?: string
  responseDueMinutes: number
  arriveDueMinutes: number
  responseElapsedMinutes?: number
  arrivalElapsedMinutes?: number
  assignee: string
  createdAt: string
}

const levelOrder: Record<EventLevel, number> = { L3: 0, L2: 1, L1: 2 }
const l3Types: EventType[] = ['燃气泄漏', '一氧化碳超标', 'SOS 求助']

function pickType(device: Device, index: number): EventType {
  if (device.type === '燃气') return '燃气泄漏'
  if (device.type === '一氧化碳') return '一氧化碳超标'
  if (device.type === '烟感') return index % 4 === 0 ? '烟感预警' : '烟感预警'
  if (device.type === '定位器') return index % 3 === 0 ? 'SOS 求助' : '电子围栏越界'
  if (device.type === '摄像头') {
    const types: EventType[] = ['陌生人闯入', '长时间未活动', '疑似跌倒']
    return types[index % types.length]
  }
  const radarTypes: EventType[] = ['疑似跌倒', '长时间未活动', '卫生间长时间占用']
  return radarTypes[index % radarTypes.length]
}

function pickLevel(type: EventType, index: number, deviceType: DeviceType): EventLevel {
  if (l3Types.includes(type)) return 'L3'
  if (type === '烟感预警') return index % 5 === 0 ? 'L3' : 'L2'
  if (type === '疑似跌倒') return index % 3 === 0 ? 'L3' : 'L2'
  if (type === '陌生人闯入') return index % 7 === 0 ? 'L3' : 'L2'
  if (type === '电子围栏越界') return 'L2'
  if (type === '长时间未活动' || type === '卫生间长时间占用') return 'L1'
  if (deviceType === '毫米波雷达') return 'L2'
  return 'L1'
}

function statusFor(index: number): EventStatus {
  if (index < 6) {
    const list: EventStatus[] = ['待确认', '待确认', '处置中', '已到场', '待确认', '待确认']
    return list[index]
  }
  if (index % 11 === 0) return '误报'
  if (index % 3 === 0) return '已归档'
  return '已关闭'
}

function timeFor(index: number, minutesAgo: number) {
  if (index < 6) {
    const hour = 10
    const minute = 32 - minutesAgo
    return `${String(hour).padStart(2, '0')}:${String(Math.max(0, minute)).padStart(2, '0')}`
  }
  const day = 26 - (index % 2)
  const hour = 8 + (index % 12)
  const minute = (index * 7) % 60
  return `2026-10-${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildSignals(device: Device, type: EventType, index: number, baseTime: string): EventSignal[] {
  const sameHouse = devices.filter((item) => item.houseId === device.houseId && item.id !== device.id && item.enabled).slice(0, 2)
  const base: EventSignal = {
    id: `SIG-${index}-1`,
    time: `${baseTime}:10`,
    deviceId: device.id,
    deviceName: device.name,
    roomName: device.roomName,
    type: type === '疑似跌倒' ? '人体跌倒' : type,
    value: type === '疑似跌倒' ? '检测到跌倒姿态并持续静止 62 秒' : '触发阈值',
    confidence: 92,
  }
  if (l3Types.includes(type)) {
    return [
      base,
      {
        id: `SIG-${index}-2`,
        time: `${baseTime}:10`,
        deviceId: sameHouse[0]?.id ?? device.id,
        deviceName: sameHouse[0]?.name ?? device.name,
        roomName: sameHouse[0]?.roomName ?? device.roomName,
        type: '环境/行为交叉确认',
        value: type === '燃气泄漏' ? '燃气浓度 28%LEL，超过 25% 高阈值' : type === 'SOS 求助' ? 'SOS 长按 3 秒，未取消' : '同房间设备确认异常持续',
        confidence: 96,
      },
    ]
  }
  if (type === '疑似跌倒') {
    return [
      base,
      {
        id: `SIG-${index}-2`,
        time: `${baseTime}:10`,
        deviceId: sameHouse[0]?.id ?? device.id,
        deviceName: sameHouse[0]?.name ?? device.name,
        roomName: device.roomName,
        type: '视觉静止确认',
        value: '人体静止超过 60 秒，未见起身',
        confidence: 88,
      },
      {
        id: `SIG-${index}-3`,
        time: `${baseTime}:10`,
        deviceId: sameHouse[1]?.id ?? device.id,
        deviceName: sameHouse[1]?.name ?? device.name,
        roomName: '房门',
        type: '房门状态',
        value: '房门未开启，老人未外出',
        confidence: 81,
      },
    ]
  }
  if (type === '烟感预警') {
    return [
      { ...base, type: '烟雾浓度', value: '烟雾浓度 0.72，超过 0.65 阈值', confidence: 89 },
      {
        id: `SIG-${index}-2`,
        time: `${baseTime}:10`,
        deviceId: sameHouse[0]?.id ?? device.id,
        deviceName: sameHouse[0]?.name ?? device.name,
        roomName: sameHouse[0]?.roomName ?? '关联房间',
        type: '视觉烟雾确认',
        value: '关联摄像头确认厨房方向有烟雾扩散',
        confidence: 76,
      },
    ]
  }
  if (type === '陌生人闯入') {
    return [
      { ...base, type: '陌生人识别', value: '非家庭成员人脸，置信度 87%', confidence: 87 },
      {
        id: `SIG-${index}-2`,
        time: `${baseTime}:10`,
        deviceId: sameHouse[0]?.id ?? device.id,
        deviceName: sameHouse[0]?.name ?? device.name,
        roomName: '入户门',
        type: '门磁状态',
        value: '入户门开启 3 分钟，未匹配授权进门方式',
        confidence: 84,
      },
    ]
  }
  if (type === '电子围栏越界') {
    return [
      { ...base, type: '电子围栏', value: '定位点超出围栏 120 米', confidence: 90 },
      {
        id: `SIG-${index}-2`,
        time: `${baseTime}:10`,
        deviceId: device.id,
        deviceName: device.name,
        roomName: '随身佩戴',
        type: '定位信号',
        value: 'GPS 信号正常，持续移动',
        confidence: 86,
      },
    ]
  }
  if (type === '长时间未活动') {
    return [{ ...base, type: '活动量', value: '活动量低于 7 日基线 82%，持续 6 小时', confidence: 73 }]
  }
  if (type === '卫生间长时间占用') {
    return [{ ...base, type: '卫生间停留', value: '卫生间停留 38 分钟，超过 30 分钟阈值', confidence: 78 }]
  }
  return [base]
}

function buildFusionSummary(
  device: Device,
  type: EventType,
  level: EventLevel,
  signals: EventSignal[],
  confidence: number,
) {
  if (level === 'L3') {
    if (l3Types.includes(type)) return `${device.name} 触发硬信号（${type}），无需等待多源确认，直接判定 L3。`
    return `${device.name} 检测到${type}，${signals.length} 个信号交叉确认，置信度 ${confidence}%，判定 L3 紧急事件。`
  }
  if (level === 'L2') {
    return `${device.name} 检测到${type}，当前为单设备预警，置信度 ${confidence}%，判定 L2，需 15 分钟内线上确认。`
  }
  return `${device.name} 检测到${type}，未发现其他异常信号，按生活节律关注处理，判定 L1，静默记录并推送子女。`
}

function buildFusionBasis(level: EventLevel, signals: EventSignal[]): string[] {
  if (level === 'L3') return [`${signals.length} 个信号参与融合`, '至少 2 类信号交叉验证', '置信度 ≥ 90%', '老人在高风险房间且未回应']
  if (level === 'L2') return ['单设备触发阈值', '未形成多源交叉确认', '需人工线上确认']
  return ['低于紧急阈值', '未发现其他异常', '静默记录，不进入待处置']
}

function addMinutes(baseTime: string, minutes: number) {
  const [hour, minute] = baseTime.split(':').map(Number)
  const total = hour * 60 + minute + minutes
  const nextHour = Math.floor(total / 60) % 24
  const nextMinute = total % 60
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}

function buildNotifications(level: EventLevel, status: EventStatus, index: number, baseTime: string): EventNotification[] {
  const done = !['待确认', '处置中'].includes(status)
  if (level === 'L1') {
    return [
      {
        id: `NT-${index}-1`,
        time: baseTime,
        target: '子女',
        channel: '站内',
        result: '已推送',
        note: '静默记录，不打扰老人',
      },
    ]
  }
  if (level === 'L2') {
    return [
      {
        id: `NT-${index}-1`,
        time: baseTime,
        target: '子女',
        channel: '站内 + 短信',
        result: done ? '已读' : '已发送',
        note: '告知事件与社区联系方式',
      },
      {
        id: `NT-${index}-2`,
        time: addMinutes(baseTime, 15),
        target: '社区值班',
        channel: '电话',
        result: done ? '已接听' : '待发送',
        note: done ? '社区确认收到事件' : '未确认时自动升级',
      },
    ]
  }
  return [
    {
      id: `NT-${index}-1`,
      time: baseTime,
      target: '子女',
      channel: '电话 + 短信',
      result: done ? '已接听' : '未接听',
      note: '0 分钟首呼',
    },
    {
      id: `NT-${index}-2`,
      time: addMinutes(baseTime, 2),
      target: '老人',
      channel: '视频与对讲',
      result: done ? '已接听' : '已接入',
      note: '2 分钟未接听时由坐席拨打老人电话并接入视频',
    },
    {
      id: `NT-${index}-3`,
      time: addMinutes(baseTime, 5),
      target: '物业',
      channel: '站内',
      result: '待 M4 开放',
      note: '5 分钟物业协同在 M4 实现',
    },
    {
      id: `NT-${index}-4`,
      time: addMinutes(baseTime, 10),
      target: '社区值班',
      channel: '电话',
      result: done ? '已接听' : '待发送',
      note: '10 分钟升级社区值班并抄送街道',
    },
    {
      id: `NT-${index}-5`,
      time: addMinutes(baseTime, 30),
      target: '120 / 119',
      channel: '人工建议',
      result: '待研判',
      note: '30 分钟未闭环时建议人工拨打',
    },
  ]
}

function buildDispositions(status: EventStatus, index: number, baseTime: string): EventDisposition[] {
  if (status === '待确认') return []
  if (status === '处置中') {
    return [
      {
        id: `DP-${index}-1`,
        time: addMinutes(baseTime, 3),
        operator: '王敏',
        action: '确认事件',
        method: '电话',
        note: '已电话联系老人，意识清醒，社区正在上门',
      },
    ]
  }
  if (status === '已到场') {
    return [
      {
        id: `DP-${index}-1`,
        time: addMinutes(baseTime, 3),
        operator: '王敏',
        action: '确认事件',
        method: '电话',
        note: '已电话联系老人，意识清醒',
      },
      {
        id: `DP-${index}-2`,
        time: addMinutes(baseTime, 20),
        operator: '王敏',
        action: '已到场',
        method: '上门',
        note: '社区网格员到场，老人坐在床边，无明显外伤',
      },
    ]
  }
  if (status === '误报') {
    return [
      {
        id: `DP-${index}-1`,
        time: addMinutes(baseTime, 8),
        operator: '李静',
        action: '标记误报',
        note: '已电话确认老人在做饭，烟感受油烟影响',
      },
    ]
  }
  return [
    {
      id: `DP-${index}-1`,
      time: addMinutes(baseTime, 3),
      operator: '王敏',
      action: '确认事件',
      method: '电话',
      note: '已联系老人并确认情况',
    },
    {
      id: `DP-${index}-2`,
      time: addMinutes(baseTime, 20),
      operator: '王敏',
      action: '已到场',
      method: '上门',
      note: '到场查看，老人状态稳定',
    },
    {
      id: `DP-${index}-3`,
      time: addMinutes(baseTime, 36),
      operator: '王敏',
      action: '关闭归档',
      note: '已协助老人联系家属，风险解除，事件关闭归档',
    },
  ]
}

function buildSnapshot(elderId: string, device: Device) {
  const elder = getElderById(elderId) ?? elders[0]
  const house = getHouseByElder(elder)
  const contacts: EventContact[] = [
    { name: elder.name, relation: '本人', phone: elder.phone },
    ...elder.relations.slice(0, 2).map((item) => ({
      name: item.name,
      relation: item.relation,
      phone: item.phone,
    })),
  ]
  const entry = house.entry
  return {
    elderName: elder.name,
    age: elder.age,
    riskLevel: elder.riskLevel,
    riskTags: [...elder.riskTags],
    address: `${elder.community} ${elder.building} ${elder.unit} ${elder.room}`,
    roomName: device.roomName,
    contacts,
    entryMethod: entry.smartLock
      ? `${entry.keyHolder}持有钥匙 · 智能门锁 · 物业可开门`
      : `${entry.keyHolder}持有钥匙 · 物业可开门`,
    devices: house.rooms.flatMap((room) => room.devices.map((item) => `${room.name} ${item.type}`)),
  }
}

function buildEvents(): SafetyEvent[] {
  const pool = devices.filter((item) => item.enabled)
  const list: SafetyEvent[] = []
  const count = 48
  for (let index = 0; index < count; index += 1) {
    const device = index % 11 === 0 && pool[10] ? pool[10] : pool[(index * 5 + 3) % pool.length]
    if (!device) continue
    const type = pickType(device, index)
    const level = pickLevel(type, index, device.type)
    const status = statusFor(index)
    const occurredMinutesAgo = index < 6 ? [2, 8, 9, 20, 3, 30][index] : 0
    const occurredAt = timeFor(index, occurredMinutesAgo)
    const baseTime = occurredAt.includes(' ') ? occurredAt.split(' ')[1] : occurredAt
    const datePart = occurredAt.includes('-') ? occurredAt.slice(0, 10).replace(/-/g, '') : '20261027'
    const signals = buildSignals(device, type, index, baseTime)
    const confidence = level === 'L3' ? 90 + (index % 9) : level === 'L2' ? 74 + (index % 18) : 62 + (index % 15)
    const responseDueMinutes = level === 'L3' ? 5 : level === 'L2' ? 15 : 0
    const arriveDueMinutes = level === 'L3' ? 30 : level === 'L2' ? 60 : 0
    const closed = ['已关闭', '已归档', '误报'].includes(status)
    const misreportReason: MisreportReason | undefined =
      status === '误报' ? misreportReasonOptions[index % misreportReasonOptions.length] : undefined
    list.push({
      id: `EV${datePart}${String(index + 1).padStart(3, '0')}`,
      level,
      type,
      status,
      title: type,
      occurredAt,
      occurredMinutesAgo,
      duration: closed ? `${12 + (index % 30)} 分钟` : `${occurredMinutesAgo} 分钟`,
      elderId: device.elderId,
      elderName: device.elderName,
      age: getElderById(device.elderId)?.age ?? 78,
      address: device.address,
      roomName: device.roomName,
      deviceId: device.id,
      deviceName: device.name,
      confidence,
      signals,
      fusionSummary: buildFusionSummary(device, type, level, signals, confidence),
      fusionBasis: buildFusionBasis(level, signals),
      notifications: buildNotifications(level, status, index, baseTime),
      dispositions: buildDispositions(status, index, baseTime),
      snapshot: buildSnapshot(device.elderId, device),
      misreportReason,
      misreportNote: misreportReason ? '现场核实为环境干扰，老人状态正常' : undefined,
      responseDueMinutes,
      arriveDueMinutes,
      responseElapsedMinutes: closed ? 2 + (index % 6) : undefined,
      arrivalElapsedMinutes: closed ? 12 + (index % 22) : undefined,
      assignee: status === '待确认' ? (index % 2 === 0 ? '未分配' : '王敏') : '王敏',
      createdAt: occurredAt,
    })
  }
  return list.sort((a, b) => {
    const levelDiff = levelOrder[a.level] - levelOrder[b.level]
    if (levelDiff !== 0) return levelDiff
    const aPending = ['待确认', '处置中', '已到场'].includes(a.status) ? 0 : 1
    const bPending = ['待确认', '处置中', '已到场'].includes(b.status) ? 0 : 1
    if (aPending !== bPending) return aPending - bPending
    return b.occurredAt.localeCompare(a.occurredAt)
  })
}

const allEvents = buildEvents()

export const safetyEvents = reactive<SafetyEvent[]>([...allEvents])

export function syncEvents(tenantElderIds: Set<string>) {
  safetyEvents.splice(
    0,
    safetyEvents.length,
    ...allEvents.filter((item) => tenantElderIds.has(item.elderId)),
  )
}

export const getEventById = (id: string) => safetyEvents.find((item) => item.id === id)

export function getEventSla(event: SafetyEvent) {
  if (event.level === 'L1') return { text: '静默记录', overdue: false, done: true }
  if (['已关闭', '已归档', '误报'].includes(event.status)) {
    const elapsed = event.responseElapsedMinutes ?? 0
    return {
      text: elapsed <= event.responseDueMinutes ? `按时响应 ${elapsed} 分钟` : `超时响应 ${elapsed} 分钟`,
      overdue: elapsed > event.responseDueMinutes,
      done: true,
    }
  }
  const remaining = event.responseDueMinutes - event.occurredMinutesAgo
  if (remaining < 0) return { text: `已超时 ${Math.abs(remaining)} 分钟`, overdue: true, done: false }
  return { text: `剩余 ${String(remaining).padStart(2, '0')}:00`, overdue: false, done: false }
}

export function markEventStatus(event: SafetyEvent, status: EventStatus) {
  event.status = status
}

export const levelColor: Record<EventLevel, string> = {
  L3: 'red',
  L2: 'orange',
  L1: 'default',
}

export const statusColor: Record<EventStatus, string> = {
  待确认: 'red',
  处置中: 'blue',
  已到场: 'cyan',
  已关闭: 'green',
  已归档: 'default',
  误报: 'default',
}
