<script setup lang="ts">
import { computed, ref } from 'vue'
import { App } from 'antdv-next'
import {
  BellOutlined,
  MessageOutlined,
  NotificationOutlined,
  PhoneOutlined,
  SaveOutlined,
  SoundOutlined,
} from '@antdv-next/icons'
import { notificationSettings, saveNotifications } from '@/composables/useAuth'

const { message } = App.useApp()
const saving = ref(false)

const channels = [
  {
    key: 'internal' as const,
    label: '站内通知',
    icon: BellOutlined,
    desc: '平台消息中心与待办提醒，所有事件默认写入。',
    fixed: true,
  },
  {
    key: 'sms' as const,
    label: '短信通知',
    icon: MessageOutlined,
    desc: '向监护人、社区管理员发送事件短信，关闭后事件中心标记未启用。',
    fixed: false,
  },
  {
    key: 'call' as const,
    label: '电话通知',
    icon: PhoneOutlined,
    desc: 'L2/L3 事件由值班坐席或 12349 热线电话通知责任人；本平台不发起通话。',
    fixed: false,
  },
  {
    key: 'intercom' as const,
    label: '视频与对讲',
    icon: SoundOutlined,
    desc: '通过老人住址下的摄像头接入画面并双向通话，用于确认老人状态。',
    fixed: false,
  },
]

const variables = ['{address}', '{eventType}', '{contact}', '{time}']

const preview = computed(() =>
  notificationSettings.template
    .replace(/\{address\}/g, '安康社区 3 号楼 2 单元 401')
    .replace(/\{eventType\}/g, '燃气泄漏')
    .replace(/\{contact\}/g, '王敏 138****0002')
    .replace(/\{time\}/g, '2026-10-27 10:12'),
)

async function handleSave() {
  saving.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 320))
  const result = saveNotifications()
  saving.value = false
  if (result.ok) message.success(result.message)
  else message.error(result.message)
}
</script>

<template>
  <div class="notify-panel">
    <div class="channel-grid">
      <div v-for="channel in channels" :key="channel.key" class="card channel-card">
        <div class="channel-head">
          <span class="channel-icon"><component :is="channel.icon" /></span>
          <a-switch
            v-model:checked="notificationSettings[channel.key]"
            :disabled="channel.fixed"
            checked-children="开"
            un-checked-children="关"
          />
        </div>
        <div class="channel-name">
          {{ channel.label }}
          <a-tag v-if="channel.fixed" class="channel-tag">必选</a-tag>
        </div>
        <div class="channel-desc">{{ channel.desc }}</div>
      </div>
    </div>

    <div class="notify-body">
      <div class="card rule-card">
        <div class="panel-head">
          <h3 class="section-title">升级时限</h3>
          <p class="section-desc">事件未确认时按阶梯再次通知，单位：分钟；L1 仅站内静默记录。</p>
        </div>

        <a-form layout="vertical">
          <a-form-item label="L3 紧急事件升级节点">
            <a-input v-model:value="notificationSettings.l3Times" placeholder="例如 0/2/5/10/30" />
            <div class="field-hint">默认 0/2/5/10/30，共 5 次升级通知，间隔不得小于 1 分钟。</div>
          </a-form-item>
          <a-form-item label="L2 重要事件升级节点">
            <a-input v-model:value="notificationSettings.l2Times" placeholder="例如 0/15" />
            <div class="field-hint">默认 0/15，共 2 次升级通知。</div>
          </a-form-item>
          <a-form-item label="L1 一般事件">
            <a-input value="静默记录，不触发通知" disabled />
            <div class="field-hint">进入事件中心列表，按需在巡查中查看。</div>
          </a-form-item>
        </a-form>
      </div>

      <div class="card template-card">
        <div class="panel-head">
          <h3 class="section-title">事件通知模板</h3>
          <p class="section-desc">适用于短信、站外与对讲播报，变量在发送时替换为真实信息。</p>
        </div>

        <a-form layout="vertical">
          <a-form-item label="模板内容">
            <a-textarea
              v-model:value="notificationSettings.template"
              :rows="5"
              :maxlength="200"
              show-count
              placeholder="请输入事件通知模板"
            />
          </a-form-item>
        </a-form>

        <div class="var-row">
          <span class="var-label">可用变量</span>
          <a-tag v-for="item in variables" :key="item" class="var-tag">{{ item }}</a-tag>
        </div>

        <div class="preview">
          <div class="preview-label"><NotificationOutlined /> 发送预览</div>
          <div class="preview-text">{{ preview }}</div>
        </div>

        <div class="notify-actions">
          <a-button type="primary" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            {{ saving ? '保存中…' : '保存配置' }}
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notify-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.channel-card {
  padding: 18px 20px;
}

.channel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.channel-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: #1f6feb;
  background: #eaf1fe;
}

.channel-name {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.channel-tag {
  margin-left: 6px;
  font-size: 10px;
  line-height: 16px;
}

.channel-desc {
  margin-top: 4px;
  min-height: 57px;
  font-size: 12px;
  line-height: 19px;
  color: #8a96a8;
}

.notify-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 16px;
  align-items: start;
}

.rule-card,
.template-card {
  padding: 18px 20px;
}

.panel-head {
  margin-bottom: 8px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: #8a96a8;
}

.var-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: -4px;
}

.var-label {
  font-size: 12px;
  color: #8a96a8;
}

.var-tag {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.preview {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f7f9fc;
  border: 1px dashed #dbe3ee;
}

.preview-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #5b6779;
}

.preview-text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 21px;
  color: #1f2937;
}

.notify-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #eef2f7;
}
</style>
