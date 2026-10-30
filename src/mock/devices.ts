import { reactive } from 'vue'
import { elders, getHouseByElder, getElderById, type Elder, type Room } from './elders'

export type DeviceType = '摄像头' | '烟感' | '燃气' | '一氧化碳' | '毫米波雷达' | '定位器'
export type DeviceStatus = '在线' | '离线' | '故障' | '已拆除'
export type DeviceMode = '在家模式' | '离家模式' | '睡眠模式'
export type ConsentStatus = '已授权' | '未授权' | '已过期' | '不适用'

export const deviceTypeOptions: DeviceType[] = [
  '摄像头',
  '烟感',
  '燃气',
  '一氧化碳',
  '毫米波雷达',
  '定位器',
]

export const deviceStatusOptions: DeviceStatus[] = ['在线', '离线', '故障', '已拆除']
export const protocolOptions = ['MQTT', 'GB28181', 'ONVIF', 'HTTP', '蓝牙']
export const modeOptions: DeviceMode[] = ['在家模式', '离家模式', '睡眠模式']
export const notifyTargetOptions = ['子女', '社区', '物业']
export const linkageOptions = ['声光报警', '电话通知', '短信', '双向对讲', '关闭燃气阀', '开启排风扇', '通知社区', '上报 120']
export const removeReasonOptions = ['设备更换', '老人迁出', '设备损坏', '其他']

export interface DeviceRules {
  fallStillSeconds: number
  baselineDays: number
  strangerDetect: boolean
  smokeThreshold: number
  smokeDelaySeconds: number
  gasLow: number
  gasHigh: number
  coThreshold: number
  awayMinutes: number
  breathDetect: boolean
  fenceRadius: number
  sosSeconds: number
  lowBattery: number
  offlineHours: number
  reportLocation: boolean
  silentStart: string
  silentEnd: string
  notifyTargets: string[]
  escalationMinutes: number
  linkage: string[]
}

export interface DevicePrivacy {
  maskAreas: string[]
  mode: DeviceMode
  rawVideoLocalOnly: boolean
  locationScope: string
  consentStatus: ConsentStatus
}

export interface DeviceChange {
  id: string
  time: string
  operator: string
  action: string
  detail: string
}

export interface Device {
  id: string
  name: string
  type: DeviceType
  brand: string
  model: string
  sn: string
  protocol: string
  status: DeviceStatus
  enabled: boolean
  battery?: number
  signal: number
  lastReport: string
  lastReportAt: string
  elderId: string
  elderName: string
  houseId: string
  address: string
  roomId: string
  roomName: string
  roomType: string
  installNote: string
  coverage: string
  rules: DeviceRules
  privacy: DevicePrivacy
  changes: DeviceChange[]
  hasOpenEvent: boolean
  createdAt: string
}

export function defaultRules(type: DeviceType): DeviceRules {
  const base: DeviceRules = {
    fallStillSeconds: 60,
    baselineDays: 14,
    strangerDetect: true,
    smokeThreshold: 0.65,
    smokeDelaySeconds: 30,
    gasLow: 10,
    gasHigh: 25,
    coThreshold: 50,
    awayMinutes: 30,
    breathDetect: true,
    fenceRadius: 500,
    sosSeconds: 3,
    lowBattery: 20,
    offlineHours: 2,
    reportLocation: true,
    silentStart: '22:00',
    silentEnd: '07:00',
    notifyTargets: ['子女', '社区'],
    escalationMinutes: 15,
    linkage: [],
  }
  const linkageMap: Record<DeviceType, string[]> = {
    摄像头: ['双向对讲', '电话通知'],
    烟感: ['声光报警', '电话通知'],
    燃气: ['关闭燃气阀', '开启排风扇', '声光报警'],
    一氧化碳: ['声光报警', '开启排风扇', '电话通知'],
    毫米波雷达: ['通知社区', '电话通知'],
    定位器: ['电话通知', '短信'],
  }
  return { ...base, linkage: linkageMap[type] }
}

const brandMap: Record<DeviceType, { brand: string; model: string; protocol: string }> = {
  摄像头: { brand: '海康威视', model: 'DS-2CD3T', protocol: 'GB28181' },
  烟感: { brand: '海湾', model: 'JTY-GD-G3', protocol: 'MQTT' },
  燃气: { brand: '汉威科技', model: 'GT-901', protocol: 'MQTT' },
  一氧化碳: { brand: '汉威科技', model: 'CO-500', protocol: 'MQTT' },
  毫米波雷达: { brand: '华为海思', model: 'HiRadar-60', protocol: 'MQTT' },
  定位器: { brand: '中兴物联', model: 'MeTracker-4G', protocol: 'HTTP' },
}

const coverageMap: Record<DeviceType, string> = {
  摄像头: '客厅与入户门',
  烟感: '厨房与客厅',
  燃气: '厨房灶台',
  一氧化碳: '厨房与取暖房间',
  毫米波雷达: '床位与卫生间门口',
  定位器: '室外 500 米电子围栏',
}

const installMap: Record<DeviceType, string> = {
  摄像头: '客厅电视柜上方，画面避开卧室与卫生间',
  烟感: '厨房吊顶，避开油烟直冲位置',
  燃气: '灶台侧墙，距地面 30 厘米',
  一氧化碳: '取暖房间墙面，距地面 1.5 米',
  毫米波雷达: '床头墙面，距地 1.2 米',
  定位器: '手表式，老人随身佩戴',
}

function isDeviceType(value: string): value is DeviceType {
  return (deviceTypeOptions as string[]).includes(value)
}

function pad(value: number, length: number) {
  return String(value).padStart(length, '0')
}

function buildStatus(originalStatus: string, seq: number): DeviceStatus {
  if (seq % 71 === 0) return '已拆除'
  if (seq % 83 === 0) return '故障'
  if (seq % 53 === 0 || (originalStatus === '离线' && seq <= 10)) return '离线'
  return '在线'
}

function buildLastReport(status: DeviceStatus, seq: number) {
  if (status === '在线') return { lastReport: `${(seq % 4) + 1} 分钟前`, lastReportAt: '2026-10-27 10:32' }
  if (status === '离线') return { lastReport: `${(seq % 8) + 3} 小时前`, lastReportAt: '2026-10-27 04:12' }
  if (status === '故障') return { lastReport: '2 小时前', lastReportAt: '2026-10-27 08:20' }
  return { lastReport: '9 天前', lastReportAt: '2026-10-18 09:10' }
}

function buildPrivacy(type: DeviceType, seq: number): DevicePrivacy {
  const isCamera = type === '摄像头'
  const isTracker = type === '定位器'
  return {
    maskAreas: isCamera ? ['卧室门口', '卫生间门'] : [],
    mode: seq % 4 === 0 ? '睡眠模式' : '在家模式',
    rawVideoLocalOnly: true,
    locationScope: isTracker ? '子女可见，社区告警时可见' : '不适用',
    consentStatus: isCamera || isTracker ? (seq % 17 === 0 ? '已过期' : seq % 9 === 0 ? '未授权' : '已授权') : '不适用',
  }
}

function buildChanges(seq: number, type: DeviceType, roomName: string): DeviceChange[] {
  const list: DeviceChange[] = [
    {
      id: `DC-${seq}-1`,
      time: '2026-09-12 09:20',
      operator: '王敏',
      action: '安装设备',
      detail: `安装于${roomName}，完成联网与状态上报测试`,
    },
    {
      id: `DC-${seq}-2`,
      time: '2026-10-08 15:40',
      operator: '吕建成',
      action: '规则调整',
      detail: type === '毫米波雷达' ? '离床未归时长由 60 分钟调整为 30 分钟' : '静默时段调整为 22:00–07:00',
    },
  ]
  if (seq % 5 === 0) {
    list.push({
      id: `DC-${seq}-3`,
      time: '2026-10-19 11:05',
      operator: '李静',
      action: '隐私配置',
      detail: '新增遮蔽区“卫生间门”，原始视频不出户保持开启',
    })
  }
  return list
}

function createFromRoomDevice(
  elder: Elder,
  house: ReturnType<typeof getHouseByElder>,
  room: (typeof house.rooms)[number],
  type: DeviceType,
  note: string,
  seq: number,
): Device {
  const status = buildStatus(room.devices.find((item) => item.type === type)?.status ?? '在线', seq)
  const last = buildLastReport(status, seq)
  const meta = brandMap[type]
  const battery = type === '定位器' ? 100 - ((seq * 13) % 95) : undefined
  return {
    id: `D${pad(seq, 4)}`,
    name: `${type} ${house.room}-${room.name}${seq % 7 === 0 ? ' B' : ''}`,
    type,
    brand: meta.brand,
    model: meta.model,
    sn: `SN20261027${pad(seq, 3)}`,
    protocol: meta.protocol,
    status,
    enabled: status !== '已拆除',
    battery,
    signal: -(45 + (seq % 50)),
    lastReport: last.lastReport,
    lastReportAt: last.lastReportAt,
    elderId: elder.id,
    elderName: elder.name,
    houseId: elder.houseId,
    address: `${elder.community} ${elder.building} ${elder.unit} ${elder.room}`,
    roomId: room.id,
    roomName: room.name,
    roomType: room.type,
    installNote: note || installMap[type],
    coverage: coverageMap[type],
    rules: defaultRules(type),
    privacy: buildPrivacy(type, seq),
    changes: buildChanges(seq, type, room.name),
    hasOpenEvent: seq % 53 === 0,
    createdAt: '2026-09-12',
  }
}

function generateDevices(): Device[] {
  const list: Device[] = []
  let seq = 0
  const candidates = [
    ...elders.slice(0, 48),
    ...elders.filter((item) => item.tenantId !== 'P-AN').slice(0, 12),
  ]
  candidates.forEach((elder, index) => {
    const house = getHouseByElder(elder)
    house.rooms.forEach((room) => {
      room.devices.forEach((device) => {
        if (!isDeviceType(device.type)) return
        seq += 1
        list.push(createFromRoomDevice(elder, house, room, device.type, device.note, seq))
      })
    })
    if (index % 4 === 0) {
      seq += 1
      const trackerRoom: Room = {
        id: `${house.id}-TRACKER`,
        name: '随身佩戴',
        type: '其他',
        area: 0,
        gridArea: '',
        devices: [],
      }
      list.push(createFromRoomDevice(elder, house, trackerRoom, '定位器', installMap['定位器'], seq))
    }
  })
  return list
}

const allDevices = generateDevices()

export const devices = reactive<Device[]>([...allDevices])

export function syncDevices(tenantElderIds: Set<string>) {
  devices.splice(
    0,
    devices.length,
    ...allDevices.filter((item) => tenantElderIds.has(item.elderId)),
  )
}

export const getDeviceById = (id: string) => devices.find((item) => item.id === id)

export const getDevicesByElderId = (elderId: string) =>
  devices.filter((item) => item.elderId === elderId && item.enabled)

export interface DeviceInput {
  type: DeviceType
  brand: string
  model: string
  sn: string
  protocol: string
  elderId: string
  roomId: string
  roomName: string
  roomType: string
  installNote: string
  coverage: string
}

export function createDevice(input: DeviceInput): Device {
  const elder = getElderById(input.elderId)
  const seq = devices.length + 1
  const type = input.type
  const meta = brandMap[type]
  return {
    id: `D${pad(seq, 4)}`,
    name: `${type} ${elder?.room ?? ''}-${input.roomName}`,
    type,
    brand: input.brand || meta.brand,
    model: input.model || meta.model,
    sn: input.sn,
    protocol: input.protocol,
    status: '在线',
    enabled: true,
    battery: type === '定位器' ? 88 : undefined,
    signal: -58,
    lastReport: '刚刚',
    lastReportAt: '2026-10-27 10:35',
    elderId: input.elderId,
    elderName: elder?.name ?? '',
    houseId: elder?.houseId ?? '',
    address: elder ? `${elder.community} ${elder.building} ${elder.unit} ${elder.room}` : '',
    roomId: input.roomId,
    roomName: input.roomName,
    roomType: input.roomType,
    installNote: input.installNote || installMap[type],
    coverage: input.coverage || coverageMap[type],
    rules: defaultRules(type),
    privacy: {
      maskAreas: type === '摄像头' ? ['卧室门口'] : [],
      mode: '在家模式',
      rawVideoLocalOnly: true,
      locationScope: type === '定位器' ? '子女可见，社区告警时可见' : '不适用',
      consentStatus: '已授权',
    },
    changes: [
      {
        id: `DC-NEW-${seq}`,
        time: '2026-10-27 10:35',
        operator: '吕建成',
        action: '新建设备',
        detail: `新增${type}并绑定${elder?.name ?? '老人'}，套用默认规则模板`,
      },
    ],
    hasOpenEvent: false,
    createdAt: '2026-10-27',
  }
}
