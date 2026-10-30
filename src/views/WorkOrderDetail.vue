<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { App } from 'antdv-next'
import {
  ArrowLeftOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  MobileOutlined,
  PictureOutlined,
  SolutionOutlined,
  SwapOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@antdv-next/icons'
import AdminLayout from '@/layouts/AdminLayout.vue'
import WorkOrderDispatchDrawer from '@/components/workorders/WorkOrderDispatchDrawer.vue'
import WorkOrderCancelModal from '@/components/workorders/WorkOrderCancelModal.vue'
import WorkOrderVisitModal from '@/components/workorders/WorkOrderVisitModal.vue'
import { currentUser, hasPermission } from '@/composables/useAuth'
import {
  getWorkOrder,
  resolveException,
  reviewWorkOrder,
  type WorkOrderStatus,
} from '@/composables/useWorkOrders'

const route = useRoute()
const router = useRouter()
const { message } = App.useApp()

const order = computed(() => getWorkOrder(String(route.params.id)))
const canView = computed(() => hasPermission('workorders'))

const statusColors: Record<WorkOrderStatus, string> = {
  待派单: 'default',
  待接单: 'warning',
  待上门: 'blue',
  服务中: 'cyan',
  待签认: 'purple',
  待审核: 'gold',
  已完成: 'success',
  已取消: 'default',
  异常: 'error',
}

const stepOrder: WorkOrderStatus[] = ['待接单', '待上门', '服务中', '待签认', '待审核', '已完成']
const stepItems = [
  { title: '待接单' },
  { title: '待上门' },
  { title: '服务中' },
  { title: '待签认' },
  { title: '待审核' },
  { title: '已完成' },
]

const stepCurrent = computed(() => {
  const status = order.value?.status
  if (!status) return 0
  if (status === '待派单' || status === '已取消') return 0
  if (status === '异常') return order.value?.checkinAt ? 2 : 1
  return Math.max(0, stepOrder.indexOf(status))
})

const stepStatus = computed(() => {
  const status = order.value?.status
  if (status === '异常' || status === '已取消') return 'error'
  if (status === '待派单') return 'wait'
  return 'process'
})

const reassignOpen = ref(false)
const dispatchOpen = ref(false)
const cancelOpen = ref(false)
const visitOpen = ref(false)

const reviewOpen = ref(false)
const reviewForm = reactive({ result: '通过' as '通过' | '退回', note: '' })
const reviewSubmitting = ref(false)

const exceptionOpen = ref(false)
const exceptionNote = ref('')
const exceptionSubmitting = ref(false)

const itemsColumns = [
  { key: 'name', title: '服务项目', width: 220 },
  { key: 'required', title: '必做', width: 80 },
  { key: 'photo', title: '必拍', width: 100 },
  { key: 'status', title: '状态', width: 110 },
]

function goMobile() {
  if (!order.value) return
  router.push(`/m/workorder/${order.value.id}`)
}

function openReview() {
  reviewForm.result = '通过'
  reviewForm.note = ''
  reviewOpen.value = true
}

async function submitReview() {
  if (!order.value) return
  if (reviewForm.result === '退回' && !reviewForm.note.trim()) {
    message.warning('请填写退回原因')
    return
  }
  reviewSubmitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  const result = reviewWorkOrder(order.value.id, { ...reviewForm })
  reviewSubmitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  reviewOpen.value = false
}

function openException() {
  exceptionNote.value = ''
  exceptionOpen.value = true
}

async function submitException() {
  if (!order.value) return
  if (!exceptionNote.value.trim()) {
    message.warning('请填写处理结果')
    return
  }
  exceptionSubmitting.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  const result = resolveException(order.value.id, exceptionNote.value)
  exceptionSubmitting.value = false
  if (!result.ok) {
    message.error(result.message)
    return
  }
  message.success(result.message)
  exceptionOpen.value = false
}

function checkIcon(value: boolean) {
  return value ? CheckCircleOutlined : CloseCircleOutlined
}
</script>

<template>
  <AdminLayout>
    <div class="page workorder-detail">
      <div class="back-line">
        <a-button type="link" size="small" @click="router.push('/workorders')">
          <template #icon><ArrowLeftOutlined /></template>
          返回工单台账
        </a-button>
      </div>

      <template v-if="!canView">
        <div class="card forbidden-card">
          <a-result status="403" title="当前账号无服务工单权限" sub-title="请联系管理员调整角色。">
            <template #extra>
              <a-button type="primary" @click="router.push('/elders')">返回老人档案</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else-if="!order">
        <div class="card forbidden-card">
          <a-result status="404" title="工单不存在" sub-title="该工单可能已被删除或编号有误。">
            <template #extra>
              <a-button type="primary" @click="router.push('/workorders')">返回工单台账</a-button>
            </template>
          </a-result>
        </div>
      </template>

      <template v-else>
        <div class="page-header detail-header">
          <div>
            <div class="detail-id">{{ order.id }}</div>
            <h1 class="page-title">
              {{ order.elderName }} · {{ order.level }}
              <a-tag :color="statusColors[order.status]" class="status-tag">{{ order.status }}</a-tag>
            </h1>
            <p class="page-subtitle">
              {{ order.frequency }} · {{ order.duration }} 分钟 · 服务人员 {{ order.staffName || '待派单' }}
            </p>
          </div>
          <div class="page-actions">
            <a-button v-if="order.status === '待派单'" type="primary" @click="dispatchOpen = true">
              <template #icon><SolutionOutlined /></template>
              派单
            </a-button>
            <a-button
              v-if="['待接单', '待上门', '服务中', '待签认'].includes(order.status)"
              @click="goMobile"
            >
              <template #icon><MobileOutlined /></template>
              打开服务人员端
            </a-button>
            <a-button
              v-if="['待接单', '待上门'].includes(order.status)"
              @click="reassignOpen = true"
            >
              <template #icon><SwapOutlined /></template>
              改派
            </a-button>
            <a-button v-if="order.status === '待审核'" type="primary" @click="openReview">
              <template #icon><AuditOutlined /></template>
              审核工单
            </a-button>
            <a-button
              v-if="['待派单', '待接单', '待上门'].includes(order.status)"
              danger
              ghost
              @click="cancelOpen = true"
            >
              取消工单
            </a-button>
          </div>
        </div>

        <a-alert
          v-if="order.status === '待派单'"
          type="info"
          show-icon
          message="该工单尚未派单"
          description="请选择具备对应服务项目资质的服务人员，并确认上门时间。"
        />
        <a-alert
          v-if="order.status === '异常'"
          type="error"
          show-icon
          :message="`工单异常：${order.exception?.type ?? ''}`"
          :description="order.exception?.note"
        >
          <template #action>
            <a-button size="small" type="primary" ghost @click="openException">处理异常</a-button>
          </template>
        </a-alert>
        <a-alert
          v-else-if="order.status === '已取消'"
          type="warning"
          show-icon
          message="工单已取消"
          :description="order.cancelReason || '工单已取消，如需服务请重新派单。'"
        />
        <a-alert
          v-else-if="order.checkin && !order.checkin.pass"
          type="warning"
          show-icon
          message="签到存在偏差"
          :description="order.checkin.note || `定位偏差 ${order.checkin.deviation} 米，请机构核实。`"
        />

        <div class="card step-card">
          <a-steps :current="stepCurrent" :status="stepStatus" :items="stepItems" size="small" />
        </div>

        <div class="detail-grid">
          <div class="detail-left">
            <div class="card info-card">
              <h3 class="section-title">工单要素</h3>
              <a-descriptions :column="2" size="small" class="info-desc">
                <a-descriptions-item label="工单编号">{{ order.id }}</a-descriptions-item>
                <a-descriptions-item label="来源">{{ order.source }}</a-descriptions-item>
                <a-descriptions-item label="服务计划">{{ order.planId }}</a-descriptions-item>
                <a-descriptions-item label="待遇等级">{{ order.level }}</a-descriptions-item>
                <a-descriptions-item label="频次">{{ order.frequency }}</a-descriptions-item>
                <a-descriptions-item label="时长">{{ order.duration }} 分钟</a-descriptions-item>
                <a-descriptions-item label="计划时间">
                  {{ order.scheduledDate }} {{ order.scheduledStart }}
                </a-descriptions-item>
                <a-descriptions-item label="服务人员">
                  {{ order.staffName || '待派单' }}
                  <span v-if="order.staffOrg" class="text-weak"> · {{ order.staffOrg }}</span>
                </a-descriptions-item>
              </a-descriptions>
              <div class="source-note">
                数据来源：频次与时长取自服务计划 {{ order.planId }}；服务项目候选值来自「业务字典 · 服务项目」；
                服务人员来自「业务字典 · 服务机构人员」；签到、照片、记录仪由服务人员端采集。
              </div>
            </div>

            <div class="card info-card">
              <h3 class="section-title"><UserOutlined /> 老人与进门信息</h3>
              <a-descriptions :column="1" size="small" class="info-desc">
                <a-descriptions-item label="老人">
                  {{ order.elderName }} · {{ order.community }} {{ order.grid }}
                </a-descriptions-item>
                <a-descriptions-item label="服务地址">
                  <EnvironmentOutlined class="inline-icon" />
                  {{ order.community }} {{ order.address }}
                </a-descriptions-item>
                <a-descriptions-item label="紧急联系人">
                  {{ order.contactName }} · {{ order.contactPhone }}
                </a-descriptions-item>
                <a-descriptions-item label="钥匙保管">{{ order.entry.keyHolder }}</a-descriptions-item>
                <a-descriptions-item label="智能门锁">
                  {{ order.entry.smartLock ? `临时密码 ${order.entry.smartLockPassword}` : '无' }}
                </a-descriptions-item>
                <a-descriptions-item label="物业代开">
                  {{ order.entry.propertyOpen ? '可代开' : '不可代开' }}
                </a-descriptions-item>
                <a-descriptions-item label="进门备注">{{ order.entry.note }}</a-descriptions-item>
              </a-descriptions>
            </div>

            <div class="card info-card">
              <div class="card-head">
                <h3 class="section-title"><FileTextOutlined /> 服务项目</h3>
                <span class="text-weak">
                  {{ order.items.filter((item) => item.done).length }} / {{ order.items.length }} 项
                </span>
              </div>
              <a-table
                :data-source="order.items"
                :columns="itemsColumns"
                row-key="id"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    <span class="item-name">{{ record.name }}</span>
                  </template>
                  <template v-else-if="column.key === 'required'">
                    <a-tag :color="record.required ? 'blue' : 'default'">
                      {{ record.required ? '必做' : '选做' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'photo'">
                    <span v-if="record.photoRequired" class="photo-flag">
                      <PictureOutlined />
                      {{ record.photoCount || 0 }} 张
                    </span>
                    <span v-else class="text-weak">非必拍</span>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="record.done ? 'success' : 'default'">
                      {{ record.done ? '已完成' : '未完成' }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </div>

            <div class="card info-card recorder-card">
              <h3 class="section-title"><VideoCameraOutlined /> 记录仪</h3>
              <div class="recorder-row">
                <a-tag :color="order.recorder.online ? 'success' : 'error'">
                  {{ order.recorder.online ? '在线' : '离线' }}
                </a-tag>
                <span class="recorder-clips">已录制 {{ order.recorder.clips }} 段</span>
              </div>
              <div v-if="order.recorder.note" class="recorder-note">{{ order.recorder.note }}</div>
            </div>
          </div>

          <div class="detail-right">
            <div class="card info-card">
              <div class="card-head">
                <h3 class="section-title">签到记录</h3>
                <a-tag :color="order.checkin ? (order.checkin.pass ? 'success' : 'error') : 'default'">
                  {{ order.checkin ? (order.checkin.pass ? '通过' : '异常') : '未签到' }}
                </a-tag>
              </div>
              <template v-if="order.checkin">
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item label="签到时间">{{ order.checkinAt }}</a-descriptions-item>
                  <a-descriptions-item label="门牌二维码">
                    <component :is="checkIcon(order.checkin.qr)" :class="order.checkin.qr ? 'ok' : 'bad'" />
                    {{ order.checkin.qr ? '匹配' : '不匹配' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="定位">
                    <component :is="checkIcon(order.checkin.gps)" :class="order.checkin.gps ? 'ok' : 'bad'" />
                    偏差 {{ order.checkin.deviation }} 米
                  </a-descriptions-item>
                  <a-descriptions-item label="人脸核验">
                    <component :is="checkIcon(order.checkin.face)" :class="order.checkin.face ? 'ok' : 'bad'" />
                    {{ order.checkin.face ? '通过' : '未通过' }}
                  </a-descriptions-item>
                </a-descriptions>
              </template>
              <div v-else class="empty-block">服务人员尚未签到</div>
            </div>

            <div class="card info-card">
              <h3 class="section-title">执行时间轴</h3>
              <a-timeline class="order-timeline">
                <a-timeline-item
                  v-for="item in order.timeline"
                  :key="item.time + item.action"
                  :color="item.tone ?? 'blue'"
                >
                  <div class="timeline-title">{{ item.action }}</div>
                  <div class="timeline-meta">{{ item.time }} · {{ item.operator }}</div>
                  <div v-if="item.note" class="timeline-note">{{ item.note }}</div>
                </a-timeline-item>
              </a-timeline>
            </div>

            <div v-if="order.signature" class="card info-card">
              <h3 class="section-title"><SolutionOutlined /> 签认记录</h3>
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="签认方式">{{ order.signature.type }}</a-descriptions-item>
                <a-descriptions-item label="签认人">
                  {{ order.signature.signer }}（{{ order.signature.relation }}）
                </a-descriptions-item>
                <a-descriptions-item v-if="order.signature.phone" label="联系电话">
                  {{ order.signature.phone }}
                </a-descriptions-item>
                <a-descriptions-item label="签认时间">{{ order.signature.time }}</a-descriptions-item>
              </a-descriptions>
            </div>

            <div v-if="order.exception" class="card info-card">
              <div class="card-head">
                <h3 class="section-title"><ExclamationCircleOutlined class="text-danger" /> 异常记录</h3>
                <a-tag :color="order.exception.handled ? 'success' : 'error'">
                  {{ order.exception.handled ? '已处理' : '待处理' }}
                </a-tag>
              </div>
              <div class="exception-type">{{ order.exception.type }}</div>
              <p class="exception-note">{{ order.exception.note }}</p>
              <div class="timeline-meta">{{ order.exception.time }} · {{ order.exception.handler || '服务人员' }}</div>
              <p v-if="order.exception.result" class="exception-result">
                处理结果：{{ order.exception.result }}
              </p>
              <a-button
                v-if="!order.exception.handled"
                size="small"
                type="primary"
                ghost
                @click="openException"
              >
                处理异常
              </a-button>
            </div>

            <div v-if="order.status === '待审核'" class="card review-card">
              <h3 class="section-title"><AuditOutlined /> 机构审核</h3>
              <p class="review-tip">
                签到、服务记录与签认已完成，请核对后审核通过；如有问题可退回服务人员补充。
              </p>
              <a-button type="primary" block @click="openReview">审核工单</a-button>
            </div>

            <div v-if="order.review" class="card info-card">
              <h3 class="section-title">审核结果</h3>
              <a-tag :color="order.review.result === '通过' ? 'success' : 'error'">
                {{ order.review.result }}
              </a-tag>
              <p class="review-note">{{ order.review.note }}</p>
              <div class="timeline-meta">{{ order.review.time }} · {{ order.review.reviewer }}</div>
            </div>

            <div class="card info-card">
              <div class="card-head">
                <h3 class="section-title">回访记录</h3>
                <a-button
                  v-if="order.status === '已完成'"
                  type="link"
                  size="small"
                  @click="visitOpen = true"
                >
                  回访登记
                </a-button>
              </div>
              <div v-if="order.visits.length === 0" class="empty-block">暂无回访记录</div>
              <div v-else class="visit-list">
                <div v-for="visit in order.visits" :key="visit.time" class="visit-item">
                  <div class="visit-head">
                    <a-tag :color="visit.satisfaction === '满意' ? 'success' : visit.satisfaction === '不满意' ? 'error' : 'warning'">
                      {{ visit.satisfaction }}
                    </a-tag>
                    <span class="timeline-meta">{{ visit.time }}</span>
                  </div>
                  <div class="visit-note">{{ visit.note }}</div>
                  <div class="timeline-meta">投诉：{{ visit.complaint }} · {{ visit.handler }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <WorkOrderDispatchDrawer v-model:open="dispatchOpen" mode="dispatch" :order="order" />
      <WorkOrderDispatchDrawer v-model:open="reassignOpen" mode="reassign" :order="order" />
      <WorkOrderCancelModal v-model:open="cancelOpen" :order="order" />
      <WorkOrderVisitModal v-model:open="visitOpen" :order="order" />

      <a-modal v-model:open="reviewOpen" title="审核工单" :width="520" :footer="null" destroy-on-hidden>
        <div class="review-body">
          <a-radio-group v-model:value="reviewForm.result" button-style="solid">
            <a-radio-button value="通过">审核通过</a-radio-button>
            <a-radio-button value="退回">退回补充</a-radio-button>
          </a-radio-group>
          <a-textarea
            v-model:value="reviewForm.note"
            :rows="3"
            :maxlength="120"
            show-count
            :placeholder="reviewForm.result === '通过' ? '审核意见（可选）' : '请填写退回原因'"
          />
          <div class="modal-foot">
            <a-button @click="reviewOpen = false">取消</a-button>
            <a-button type="primary" :loading="reviewSubmitting" @click="submitReview">
              {{ reviewForm.result === '通过' ? '确认通过' : '确认退回' }}
            </a-button>
          </div>
        </div>
      </a-modal>

      <a-modal v-model:open="exceptionOpen" title="处理异常" :width="520" :footer="null" destroy-on-hidden>
        <div class="review-body">
          <a-alert
            type="warning"
            show-icon
            message="处理后将恢复服务中"
            description="请记录与家属、社区或机构的沟通结果。"
          />
          <a-textarea
            v-model:value="exceptionNote"
            :rows="3"
            :maxlength="120"
            show-count
            placeholder="例如 已联系家属改约至明日 10:00，服务人员继续上门"
          />
          <div class="modal-foot">
            <a-button @click="exceptionOpen = false">取消</a-button>
            <a-button type="primary" :loading="exceptionSubmitting" @click="submitException">
              确认处理
            </a-button>
          </div>
        </div>
      </a-modal>
    </div>
  </AdminLayout>
</template>

<style scoped>
.workorder-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-line {
  margin-bottom: -8px;
}

.forbidden-card {
  padding: 48px 24px;
}

.detail-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #8a96a8;
}

.status-tag {
  margin-left: 8px;
  vertical-align: middle;
}

.step-card {
  padding: 18px 22px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.detail-left,
.detail-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  padding: 18px 20px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.info-desc {
  margin-top: 10px;
}

.source-note {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--elder-border);
  font-size: 12px;
  line-height: 20px;
  color: var(--elder-text-weak);
}

.inline-icon {
  margin-right: 4px;
  color: #1f6feb;
}

.recorder-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.item-name {
  font-size: 13px;
  color: #1f2937;
}

.photo-flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #fff4e5;
  color: #d97706;
  font-size: 12px;
}

.recorder-clips {
  font-size: 12px;
  color: #5b6779;
}

.recorder-note {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff8ec;
  font-size: 12px;
  color: #8a6d3b;
}

.ok {
  color: #2e9e5b;
  margin-right: 4px;
}

.bad {
  color: #d64545;
  margin-right: 4px;
}

.empty-block {
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: #8a96a8;
}

.order-timeline {
  margin-top: 12px;
}

.timeline-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.timeline-meta {
  font-size: 11px;
  color: #8a96a8;
}

.timeline-note {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #5b6779;
}

.exception-type {
  font-size: 13px;
  font-weight: 600;
  color: #d64545;
}

.exception-note {
  margin: 4px 0;
  font-size: 12px;
  line-height: 19px;
  color: #5b6779;
}

.exception-result {
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f0faf5;
  font-size: 12px;
  color: #2e9e5b;
}

.review-card {
  padding: 16px 18px;
  background: #fffbf0;
  border: 1px solid #f5e3bd;
  border-radius: 10px;
}

.review-tip {
  margin: 8px 0 12px;
  font-size: 12px;
  line-height: 19px;
  color: #8a6d3b;
}

.review-note {
  margin: 8px 0 4px;
  font-size: 12px;
  color: #5b6779;
}

.visit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.visit-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fbfd;
  border: 1px solid #eef2f7;
}

.visit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.visit-note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 19px;
  color: #1f2937;
}

.review-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef2f7;
}

@media (max-width: 1400px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
