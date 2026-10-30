<script setup lang="ts">
import { ref, watch } from 'vue'
import { App } from 'antdv-next'
import { DownloadOutlined, InboxOutlined } from '@antdv-next/icons'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'imported', count: number): void
}>()

const { message } = App.useApp()
const current = ref(0)
const fileName = ref('')
const validating = ref(false)
const importing = ref(false)
const failureVisible = ref(true)

const summary = { total: 24, success: 18, fail: 6 }

const failures = [
  { row: 3, name: '王秀兰', field: '身份证号', reason: '身份证已存在，档案编号 E00003' },
  { row: 7, name: '李国强', field: '联系电话', reason: '手机号格式不正确' },
  { row: 11, name: '陈秀珍', field: '居住地址', reason: '小区、楼栋、房号不完整' },
  { row: 15, name: '周德海', field: '失能等级', reason: '失能等级不在可选范围' },
  { row: 19, name: '吴桂英', field: '责任网格员', reason: '网格员不在本社区人员名单' },
  { row: 22, name: '郑福生', field: '身份证号', reason: '身份证号位数不足 18 位' },
]

const failureColumns = [
  { title: '行号', dataIndex: 'row', key: 'row', width: 64 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
  { title: '字段', dataIndex: 'field', key: 'field', width: 110 },
  { title: '失败原因', dataIndex: 'reason', key: 'reason' },
]

watch(
  () => props.open,
  (open) => {
    if (open) {
      current.value = 0
      fileName.value = ''
      validating.value = false
      importing.value = false
      failureVisible.value = true
    }
  },
)

function close() {
  if (validating.value || importing.value) return
  emit('update:open', false)
}

function handleBeforeUpload(file: File) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    message.error('请上传 .xlsx 格式文件')
    return false
  }
  fileName.value = file.name
  return false
}

function useDemoFile() {
  fileName.value = '安康社区老人档案_202610.xlsx'
}

function downloadTemplate() {
  message.success('导入模板已下载（原型模拟）')
}

function startValidate() {
  if (!fileName.value) {
    message.warning('请先上传档案模板')
    return
  }
  current.value = 1
  validating.value = true
  window.setTimeout(() => {
    validating.value = false
  }, 900)
}

function confirmImport() {
  importing.value = true
  window.setTimeout(() => {
    importing.value = false
    current.value = 2
  }, 800)
}

function downloadFailures() {
  message.success('失败明细已下载（原型模拟）')
}

function finish() {
  emit('imported', summary.success)
}

function back() {
  current.value = 0
}
</script>

<template>
  <a-modal
    :open="open"
    :width="720"
    :footer="null"
    :mask-closable="false"
    :closable="false"
    :styles="{ body: { padding: '0' } }"
    @cancel="close"
  >
    <div class="import-shell">
      <div class="import-header">
        <div>
          <div class="import-title">导入老人档案</div>
          <div class="import-subtitle">支持 .xlsx 模板，单次不超过 1,000 行；部分失败不影响成功行入库</div>
        </div>
        <a-button type="text" @click="close">关闭</a-button>
      </div>

      <div class="import-steps">
        <a-steps
          :current="current"
          size="small"
          :items="[{ title: '上传文件' }, { title: '数据校验' }, { title: '导入结果' }]"
        />
      </div>

      <div class="import-body">
        <template v-if="current === 0">
          <div class="template-row">
            <div>
              <div class="body-title">第一步：准备档案模板</div>
              <div class="muted-hint">请先下载最新模板，按列填写后上传。必填列与新增档案一致。</div>
            </div>
            <a-button type="link" @click="downloadTemplate">
              <template #icon><DownloadOutlined /></template>
              下载导入模板
            </a-button>
          </div>

          <a-upload-dragger
            accept=".xlsx"
            :show-upload-list="false"
            :before-upload="handleBeforeUpload"
            class="upload-area"
          >
            <InboxOutlined class="upload-icon" />
            <div class="upload-title">点击或拖拽文件到此处上传</div>
            <div class="upload-hint">仅支持 .xlsx，单个文件不超过 10MB</div>
          </a-upload-dragger>

          <div class="selected-file">
            <template v-if="fileName">
              <span class="file-name">{{ fileName }}</span>
              <a-button type="link" size="small" @click="useDemoFile">重新选择示例文件</a-button>
            </template>
            <template v-else>
              <span class="text-weak">还没有选择文件，可先使用示例文件体验完整流程</span>
              <a-button type="link" size="small" @click="useDemoFile">使用示例文件</a-button>
            </template>
          </div>

          <a-alert
            type="info"
            show-icon
            message="导入说明"
            description="身份证重复、手机号格式错误、地址缺失、失能等级非法的行会被判定为失败；成功行按完整度标记为正常或待完善。"
          />
        </template>

        <template v-else-if="current === 1">
          <div class="body-title">第二步：数据校验</div>
          <div v-if="validating" class="validating">
            <a-spin size="large" />
            <div class="validating-text">正在校验 24 条档案，请稍候…</div>
          </div>
          <template v-else>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">总行数</div>
                <div class="summary-value">{{ summary.total }}</div>
              </div>
              <div class="summary-item success">
                <div class="summary-label">可导入</div>
                <div class="summary-value">{{ summary.success }}</div>
              </div>
              <div class="summary-item danger">
                <div class="summary-label">失败</div>
                <div class="summary-value">{{ summary.fail }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">重复身份证</div>
                <div class="summary-value">2</div>
              </div>
            </div>

            <div class="failure-head">
              <div>
                <div class="body-title">失败明细</div>
                <div class="muted-hint">修正后可重新上传失败行，已成功行不会重复入库</div>
              </div>
              <a-button size="small" @click="downloadFailures">
                <template #icon><DownloadOutlined /></template>
                下载失败明细
              </a-button>
            </div>
            <a-table
              :data-source="failureVisible ? failures : []"
              :columns="failureColumns"
              :pagination="false"
              row-key="row"
              size="small"
              :scroll="{ y: 180 }"
            />
          </template>
        </template>

        <template v-else>
          <a-result
            status="success"
            title="导入完成"
            :sub-title="`成功导入 ${summary.success} 条档案，${summary.fail} 条失败。失败明细已生成，可回到上一步下载。`"
          >
            <template #extra>
              <div class="result-tags">
                <a-tag color="green">成功 {{ summary.success }}</a-tag>
                <a-tag color="red">失败 {{ summary.fail }}</a-tag>
              </div>
            </template>
          </a-result>
          <div class="result-note">
            成功导入的档案已按完整度标记为“正常”或“待完善”，可在档案列表中筛选查看。
          </div>
        </template>
      </div>

      <div class="import-footer">
        <template v-if="current === 0">
          <a-button @click="close">取消</a-button>
          <a-button type="primary" :disabled="!fileName" @click="startValidate">开始校验</a-button>
        </template>
        <template v-else-if="current === 1">
          <a-button :disabled="validating || importing" @click="back">上一步</a-button>
          <a-button type="primary" :loading="importing" :disabled="validating" @click="confirmImport">
            确认导入
          </a-button>
        </template>
        <template v-else>
          <a-button @click="close">关闭</a-button>
          <a-button type="primary" @click="finish">查看导入档案</a-button>
        </template>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.import-shell {
  display: flex;
  flex-direction: column;
  max-height: 640px;
}

.import-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--elder-divider);
}

.import-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}

.import-subtitle {
  font-size: 11px;
  line-height: 17px;
  color: var(--elder-text-weak);
}

.import-steps {
  padding: 16px 24px;
  border-bottom: 1px solid var(--elder-divider);
}

.import-body {
  flex: 1;
  min-height: 320px;
  overflow: auto;
  padding: 20px 24px;
}

.template-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.body-title {
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
}

.upload-area {
  display: block;
}

.upload-icon {
  font-size: 40px;
  color: var(--elder-primary);
}

.upload-title {
  margin-top: 8px;
  font-size: 14px;
  color: var(--elder-text);
}

.upload-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--elder-text-weak);
}

.selected-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  margin: 8px 0 16px;
  font-size: 12px;
}

.file-name {
  color: var(--elder-success);
  font-weight: 500;
}

.validating {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.validating-text {
  font-size: 13px;
  color: var(--elder-text-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 12px 0 20px;
}

.summary-item {
  padding: 12px 14px;
  border: 1px solid var(--elder-border);
  border-radius: 8px;
  background: #f9fbfe;
}

.summary-item.success {
  background: var(--elder-success-soft);
  border-color: #c9ebd7;
}

.summary-item.danger {
  background: var(--elder-danger-soft);
  border-color: #f5cccc;
}

.summary-label {
  font-size: 12px;
  color: var(--elder-text-secondary);
}

.summary-value {
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
}

.failure-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.result-tags {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.result-note {
  text-align: center;
  font-size: 12px;
  color: var(--elder-text-weak);
  margin-top: 8px;
}

.import-footer {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--elder-divider);
  flex-shrink: 0;
}
</style>
