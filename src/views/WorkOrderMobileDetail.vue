<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  KeyOutlined,
  PhoneOutlined,
  PictureOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from '@antdv-next/icons'
import { exceptionTypeOptions as exceptionTypeOptionsFromDict } from '@/composables/useDict'
import {
  acceptWorkOrder,
  addWorkPhoto,
  checkinWorkOrder,
  getWorkOrder,
  reportException,
  setRecorder,
  signWorkOrder,
  submitService,
  toggleWorkItem,
  type SignType,
  type WorkOrderStatus,
} from '@/composables/useWorkOrders'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const order = computed(() => getWorkOrder(String(route.params.id)))

const statusColors: Record<WorkOrderStatus, string> = {
  待派单: 'default',
  待接单: 'warning',
  待上门: 'processing',
  服务中: 'blue',
  待签认: 'orange',
  待审核: 'purple',
  已完成: 'success',
  已取消: 'default',
  异常: 'error',
}

const loading = ref(false)
const summary = ref('')
const suggestion = ref('')
const recorderNote = ref('')

watch(
  () => order.value?.id,
  () => {
    summary.value = order.value?.summary ?? ''
    suggestion.value = order.value?.suggestion ?? ''
    recorderNote.value = order.value?.recorder.note ?? ''
  },
  { immediate: true },
)

const checkinForm = reactive({
  qr: false,
  gps: false,
  face: false,
  deviation: 32,
})

const doneCount = computed(() => order.value?.items.filter((item) => item.done).length ?? 0)
const editable = computed(() => order.value?.status === '服务中')
const deviationWarn = computed(() => checkinForm.deviation > 200)

const actionText = computed(() => {
  const item = order.value
  if (!item) return '工单不存在'
  if (item.status === '待接单') return '接单'
  if (item.status === '待上门') return '上门签到'
  if (item.status === '服务中') return '提交服务记录'
  if (item.status === '待签认') return '完成签认'
  if (item.status === '异常') return '等待机构处理'
  if (item.status === '待审核') return '等待机构审核'
  if (item.status === '已完成') return '工单已完成'
  return '工单已关闭'
})

const actionDisabled = computed(() =>
  ['待审核', '已完成', '已取消', '异常'].includes(order.value?.status ?? ''),
)

const footHint = computed(() => {
  const item = order.value
  if (!item) return ''
  if (item.status === '待接单') return '接单后请按时上门，进门方式见下方说明'
  if (item.status === '待上门') return '到家后请依次完成二维码、定位与人脸签到'
  if (item.status === '服务中') return '完成必做项与必拍项，并填写不少于 20 字的服务小结'
  if (item.status === '待签认') return '请老人、家属或监护人完成服务签认'
  if (item.status === '待审核') return '机构将在当日完成记录审核'
  if (item.status === '异常') return item.exception?.type ?? ''
  return `${item.staffOrg} · ${item.staffName}`
})

const signOpen = ref(false)
const exceptionOpen = ref(false)
const signForm = reactive<{ type: SignType; signer: string; relation: string; phone: string }>({
  type: '老人手写',
  signer: '',
  relation: '本人',
  phone: '',
})
const exceptionForm = reactive({ type: '', note: '' })

function openException() {
  if (!exceptionForm.type) exceptionForm.type = exceptionTypeOptions[0] ?? '老人不在家'
  exceptionOpen.value = true
}

watch(
  () => signForm.type,
  (value) => {
    signForm.relation =
      value === '家属远程签认' ? '子女' : value === '监护人代签' ? '监护人' : '本人'
  },
)

const signTypeOptions: SignType[] = [
  '老人手写',
  '老人指纹',
  '老人语音',
  '家属远程签认',
  '监护人代签',
]

const exceptionTypeOptions = exceptionTypeOptionsFromDict.length
  ? exceptionTypeOptionsFromDict
  : ['老人不在家', '老人拒绝服务', '身体不适需就医', '门锁无法打开', '设备或记录仪故障']

async function handlePrimary() {
  const item = order.value
  if (!item) return
  if (item.status === '待接单') {
    const result = acceptWorkOrder(item.id)
    if (result.ok) message.success(result.message)
    else message.error(result.message)
    return
  }
  if (item.status === '待上门') {
    loading.value = true
    await new Promise((resolve) => window.setTimeout(resolve, 320))
    const result = checkinWorkOrder(item.id, { ...checkinForm })
    loading.value = false
    if (result.ok) message.success(result.message)
    else message.error(result.message)
    return
  }
  if (item.status === '服务中') {
    loading.value = true
    await new Promise((resolve) => window.setTimeout(resolve, 320))
    const result = submitService(item.id, { summary: summary.value, suggestion: suggestion.value })
    loading.value = false
    if (result.ok) {
      message.success(result.message)
      signOpen.value = true
    } else message.error(result.message)
    return
  }
  if (item.status === '待签认') {
    signForm.signer = item.elderName
    signOpen.value = true
  }
}

function handleCheck(itemId: string, event: unknown) {
  if (!order.value) return
  const target = (event as { target?: { checked?: boolean } })?.target
  const result = toggleWorkItem(order.value.id, itemId, Boolean(target?.checked))
  if (!result.ok) message.warning(result.message)
}

function takePhoto(itemId: string) {
  if (!order.value) return
  const result = addWorkPhoto(order.value.id, itemId)
  if (result.ok) message.success(result.message)
  else message.warning(result.message)
}

function toggleRecorder(online: boolean) {
  if (!order.value) return
  const result = setRecorder(order.value.id, online, recorderNote.value)
  if (result.ok) message.success(result.message)
}

function saveRecorderNote() {
  if (!order.value) return
  const result = setRecorder(order.value.id, order.value.recorder.online, recorderNote.value)
  if (result.ok) message.success('记录仪说明已保存')
}

function confirmSign() {
  if (!order.value) return
  const result = signWorkOrder(order.value.id, {
    type: signForm.type,
    signer: signForm.signer,
    relation: signForm.relation,
    phone: signForm.phone,
  })
  if (result.ok) {
    message.success(result.message)
    signOpen.value = false
  } else message.error(result.message)
}

function confirmException() {
  if (!order.value) return
  const result = reportException(order.value.id, { ...exceptionForm })
  if (result.ok) {
    message.success(result.message)
    exceptionOpen.value = false
  } else message.error(result.message)
}

function goBack() {
  router.push('/m/workorders')
}
</script>

<template>
  <div class="mobile-page">
    <div class="phone">
      <div class="phone-status">
        <span>9:41</span>
        <span class="phone-status-right">服务人员端 · 原型演示</span>
      </div>

      <div class="mobile-header">
        <a-button type="text" size="small" @click="goBack">
          <template #icon><ArrowLeftOutlined /></template>
        </a-button>
        <div class="mobile-title">
          <div class="mobile-app">服务执行</div>
          <div class="mobile-user">{{ order?.staffName }} · {{ order?.staffOrg }}</div>
        </div>
        <a-tag :color="order ? statusColors[order.status] : 'default'">{{ order?.status ?? '-' }}</a-tag>
      </div>

      <div v-if="!order" class="mobile-empty">
        <WarningOutlined />
        <span>工单不存在或已被删除</span>
        <a-button type="primary" size="small" @click="router.push('/m/workorders')">
          返回今日工单
        </a-button>
      </div>

      <div v-else class="mobile-body">
        <div class="order-hero">
          <div class="hero-top">
            <span class="hero-type">{{ order.level }} · {{ order.duration }} 分钟</span>
            <span class="hero-id">{{ order.id }}</span>
          </div>
          <div class="hero-elder">{{ order.elderName }}</div>
          <div class="hero-address">
            <EnvironmentOutlined />
            <span>{{ order.community }} {{ order.address }}</span>
          </div>
          <div class="hero-time">{{ order.scheduledDate }} {{ order.scheduledStart }} 上门</div>
        </div>

        <a-alert
          v-if="order.status === '异常'"
          type="error"
          show-icon
          :message="order.exception?.type"
          :description="order.exception?.note"
        />

        <div class="mobile-card">
          <div class="card-title">
            <UserOutlined />
            <span>老人与进门信息</span>
          </div>
          <div class="entry-line">联系人：{{ order.contactName }}</div>
          <div class="entry-line contact-line">
            <span>{{ order.contactPhone }}</span>
            <a-button size="small" :href="`tel:${order.contactPhone}`">
              <template #icon><PhoneOutlined /></template>
              拨号
            </a-button>
          </div>
          <div class="entry-line">点击拨号后由手机系统发起通话，平台不代拨、不录音。</div>
          <div class="entry-line">
            <KeyOutlined />
            钥匙保管：{{ order.entry.keyHolder }}
          </div>
          <div class="entry-line">
            智能门锁：{{ order.entry.smartLock ? `临时密码 ${order.entry.smartLockPassword}` : '无' }}
          </div>
          <div class="entry-note">{{ order.entry.note }}</div>
        </div>

        <div v-if="order.status === '待上门'" class="mobile-card">
          <div class="card-title">
            <ScanOutlined />
            <span>上门签到</span>
          </div>
          <div class="checkin-row">
            <a-checkbox v-model:checked="checkinForm.qr">
              <QrcodeOutlined /> 门牌二维码
            </a-checkbox>
            <a-checkbox v-model:checked="checkinForm.gps">
              <EnvironmentOutlined /> 定位
            </a-checkbox>
            <a-checkbox v-model:checked="checkinForm.face">
              <SafetyCertificateOutlined /> 人脸
            </a-checkbox>
          </div>
          <div class="deviation-row">
            <span>定位偏差</span>
            <a-input-number
              v-model:value="checkinForm.deviation"
              :min="0"
              :max="999"
              size="small"
              style="width: 96px"
            />
            <span class="unit">米</span>
            <a-tag :color="deviationWarn ? 'error' : 'success'">
              {{ deviationWarn ? '超 200 米阈值' : '阈值内' }}
            </a-tag>
          </div>
          <div class="privacy-tip">
            <SafetyCertificateOutlined />
            <span>签到必须同时满足二维码匹配与定位成功，人脸仅用于本人核验，不作存储。</span>
          </div>
        </div>

        <div v-else-if="order.checkin" class="mobile-card">
          <div class="card-title">
            <CheckCircleOutlined />
            <span>签到记录</span>
            <span class="card-count">{{ order.checkinAt }}</span>
          </div>
          <div class="checkin-line">
            二维码 {{ order.checkin.qr ? '通过' : '未通过' }} · 定位
            {{ order.checkin.gps ? '通过' : '未通过' }} · 人脸
            {{ order.checkin.face ? '通过' : '未通过' }} · 偏差 {{ order.checkin.deviation }} 米
          </div>
        </div>

        <div class="mobile-card">
          <div class="card-title">
            <CheckCircleOutlined />
            <span>服务项目</span>
            <span class="card-count">{{ doneCount }} / {{ order.items.length }}</span>
          </div>
          <div class="check-list">
            <div v-for="item in order.items" :key="item.id" class="check-item">
              <a-checkbox
                :checked="item.done"
                :disabled="!editable"
                @change="handleCheck(item.id, $event)"
              />
              <div class="check-body">
                <div class="check-label">
                  {{ item.name }}
                  <a-tag v-if="item.required" color="blue" class="check-tag">必做</a-tag>
                  <a-tag v-if="item.photoRequired" color="orange" class="check-tag">必拍</a-tag>
                </div>
                <div v-if="item.photoRequired" class="photo-row">
                  <a-button size="small" :disabled="!editable" @click="takePhoto(item.id)">
                    <template #icon><PictureOutlined /></template>
                    拍照
                  </a-button>
                  <span class="photo-count">{{ item.photoCount }} 张</span>
                </div>
              </div>
            </div>
          </div>
          <div class="privacy-tip">
            <SafetyCertificateOutlined />
            <span>请勿拍摄老人面部特写，仅拍摄环境与关键部位。</span>
          </div>
        </div>

        <div class="mobile-card">
          <div class="card-title">
            <VideoCameraOutlined />
            <span>服务记录仪</span>
            <a-switch
              size="small"
              class="recorder-switch"
              :checked="order.recorder.online"
              :disabled="!editable"
              @change="toggleRecorder(Boolean($event))"
            />
          </div>
          <div class="entry-line">
            状态：{{ order.recorder.online ? '在线录制' : '离线' }} · 已录制
            {{ order.recorder.clips }} 段
          </div>
          <a-textarea
            v-model:value="recorderNote"
            :rows="2"
            :maxlength="100"
            :disabled="!editable"
            placeholder="记录仪离线时请填写原因"
            @blur="saveRecorderNote"
          />
        </div>

        <div class="mobile-card">
          <div class="card-title">
            <PictureOutlined />
            <span>服务小结</span>
            <span class="card-count">{{ summary.length }} / 20 字起</span>
          </div>
          <a-textarea
            v-model:value="summary"
            :rows="3"
            :maxlength="300"
            show-count
            :disabled="!editable"
            placeholder="请描述完成的服务项目、老人状态与进食情况"
          />
          <a-textarea
            v-model:value="suggestion"
            :rows="2"
            :maxlength="200"
            class="suggestion-input"
            :disabled="!editable"
            placeholder="建议与注意事项（选填）"
          />
        </div>

        <div v-if="order.signature" class="mobile-card">
          <div class="card-title">
            <SafetyCertificateOutlined />
            <span>签认记录</span>
          </div>
          <div class="entry-line">
            {{ order.signature.type }} · {{ order.signature.signer }}（{{ order.signature.relation }}）
          </div>
          <div class="entry-line">{{ order.signature.time }}</div>
        </div>

        <a-button
          v-if="['待接单', '待上门', '服务中'].includes(order.status)"
          block
          danger
          class="exception-btn"
          @click="openException"
        >
          <template #icon><WarningOutlined /></template>
          上报异常
        </a-button>

        <div class="bottom-space" />
      </div>

      <div v-if="order" class="mobile-foot">
        <a-button
          type="primary"
          block
          size="large"
          :loading="loading"
          :disabled="actionDisabled"
          @click="handlePrimary"
        >
          {{ actionText }}
        </a-button>
        <div class="foot-hint">{{ footHint }}</div>
      </div>
    </div>

    <a-modal
      v-model:open="signOpen"
      title="服务签认"
      :width="420"
      ok-text="确认签认"
      cancel-text="取消"
      destroy-on-hidden
      @ok="confirmSign"
    >
      <a-form layout="vertical" class="sign-form">
        <a-form-item label="签认方式">
          <a-radio-group v-model:value="signForm.type">
            <a-radio v-for="item in signTypeOptions" :key="item" :value="item">{{ item }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="签认人" required>
          <a-input v-model:value="signForm.signer" placeholder="请输入签认人姓名" />
        </a-form-item>
        <a-form-item label="与老人关系">
          <a-input v-model:value="signForm.relation" />
        </a-form-item>
        <a-form-item v-if="signForm.type === '家属远程签认'" label="家属手机号" required>
          <a-input v-model:value="signForm.phone" placeholder="请输入接收签认短信的手机号" />
        </a-form-item>
        <div class="sign-tip">
          <SafetyCertificateOutlined />
          <span>签认结果将与服务记录、照片、录像一并作为长护险结算凭证。</span>
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="exceptionOpen"
      title="上报服务异常"
      :width="420"
      ok-text="提交上报"
      cancel-text="取消"
      destroy-on-hidden
      @ok="confirmException"
    >
      <a-form layout="vertical">
        <a-form-item label="异常类型">
          <a-select
            v-model:value="exceptionForm.type"
            :options="exceptionTypeOptions.map((item) => ({ label: item, value: item }))"
          />
        </a-form-item>
        <a-form-item label="异常说明" required>
          <a-textarea
            v-model:value="exceptionForm.note"
            :rows="3"
            :maxlength="200"
            show-count
            placeholder="请说明现场情况与已采取的措施"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.mobile-page {
  min-height: 100vh;
  padding: 24px;
  background: #e9eef5;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.phone {
  position: relative;
  width: 390px;
  min-height: 844px;
  background: #f3f6fa;
  border: 1px solid #d6dfeb;
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(15, 42, 71, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.phone-status {
  height: 28px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #5b6779;
  background: #fff;
}

.phone-status-right {
  color: #8a96a8;
}

.mobile-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 10px;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
}

.mobile-title {
  flex: 1;
}

.mobile-app {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.mobile-user {
  font-size: 11px;
  color: #8a96a8;
}

.mobile-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #8a96a8;
  font-size: 13px;
}

.order-hero {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1f6feb, #13a8a8);
  color: #fff;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
}

.hero-type {
  font-weight: 600;
  color: #fff;
}

.hero-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.hero-elder {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 600;
}

.hero-address {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.86);
}

.hero-time {
  margin-top: 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.mobile-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef2f7;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.card-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 400;
  color: #8a96a8;
}

.recorder-switch {
  margin-left: auto;
}

.entry-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 22px;
  color: #5b6779;
}

.contact-line {
  justify-content: space-between;
}

.entry-note {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff8ec;
  font-size: 11px;
  line-height: 18px;
  color: #8a6d3b;
}

.checkin-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.deviation-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: #5b6779;
}

.unit {
  color: #8a96a8;
}

.checkin-line {
  font-size: 11px;
  line-height: 19px;
  color: #5b6779;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.check-body {
  flex: 1;
}

.check-label {
  font-size: 12px;
  line-height: 20px;
  color: #1f2937;
}

.check-tag {
  margin-left: 4px;
  font-size: 10px;
  line-height: 16px;
}

.photo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.photo-count {
  font-size: 11px;
  color: #8a96a8;
}

.privacy-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f9fc;
  font-size: 11px;
  line-height: 18px;
  color: #8a96a8;
}

.suggestion-input {
  margin-top: 8px;
}

.exception-btn {
  margin-top: 2px;
}

.bottom-space {
  height: 12px;
}

.mobile-foot {
  position: sticky;
  bottom: 0;
  padding: 12px 14px 14px;
  background: #fff;
  border-top: 1px solid #eef2f7;
}

.foot-hint {
  margin-top: 6px;
  text-align: center;
  font-size: 10px;
  color: #8a96a8;
}

.sign-form :deep(.ant-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
}

.sign-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f9fc;
  font-size: 11px;
  line-height: 18px;
  color: #8a96a8;
}
</style>
