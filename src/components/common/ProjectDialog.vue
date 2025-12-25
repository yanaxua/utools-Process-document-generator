<template>
  <BaseDialog
    :show="show"
    :title="title || '✨ 项目配置'"
    width="420px"
    :show-close="true"
    @close="emit('close')"
  >
    <div class="prop-form">
      <div class="form-item">
        <label>项目名称</label>
        <div class="input-with-icon">
          <lucide-type :size="16" class="field-icon" />
          <input v-model="form.name" placeholder="例如：新零售线发版邮件" ref="nameInput" />
        </div>
      </div>
      
      <div class="form-item">
        <label>描述信息</label>
        <textarea v-model="form.description" placeholder="简要描述该项目的使用场景..." rows="4"></textarea>
      </div>
    </div>
    
    <template #footer>
      <button class="btn-cancel" @click="emit('close')">取消</button>
      <button class="btn-confirm" :disabled="!form.name" @click="handleConfirm">
          {{ confirmText || '立即执行' }}
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, watch, ref } from 'vue';
import { Type as LucideType } from 'lucide-vue-next';
import BaseDialog from './BaseDialog.vue';

const props = defineProps<{
  show: boolean;
  title?: string;
  confirmText?: string;
  initialData?: { name: string, description: string };
}>();

const emit = defineEmits(['close', 'confirm']);

const form = reactive({
  name: '',
  description: ''
});

const nameInput = ref<HTMLInputElement | null>(null);

watch(() => props.show, (newVal) => {
  if (newVal) {
    form.name = props.initialData?.name || '';
    form.description = props.initialData?.description || '';
    setTimeout(() => nameInput.value?.focus(), 100);
  }
});

const handleConfirm = () => {
  if (form.name) {
    emit('confirm', { ...form });
  }
};
</script>

<style scoped>
.prop-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-item label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    margin-bottom: 8px;
    text-transform: uppercase;
}

.input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
}

.field-icon {
    position: absolute;
    left: 12px;
    color: #cbd5e1;
}

input, textarea {
    width: 100%;
    padding: 12px 14px;
    font-size: 14px;
    border-radius: 12px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    transition: all 0.2s;
}

input:focus, textarea:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

input {
    padding-left: 36px;
}

.btn-cancel {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-weight: 700;
  cursor: pointer;
}

.btn-confirm {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.btn-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
