<template>
  <BaseDialog
    :show="!!modelValue"
    :title="isNew ? '✨ 新建素材' : '📝 编辑素材'"
    width="520px"
    :show-close="true"
    :close-on-esc="true"
    :close-on-overlay="true"
    @close="emit('update:modelValue', null)"
  >
    <div v-if="localMaterial" class="prop-form">
      <div class="form-group">
        <label>素材名称</label>
        <div class="input-with-icon">
          <lucide-type :size="14" class="field-icon" />
          <input v-model="localMaterial.name" placeholder="请输入素材名称..." ref="nameInput" />
        </div>
      </div>

      <div class="form-group">
        <label>素材类型</label>
        <select v-model="localMaterial.type" :disabled="!isNew">
          <option value="fixed">固定字段 (静态文本)</option>
          <option value="option">选项层级 (单选/多选)</option>
          <option value="fill">填空录入 (动态输入)</option>
        </select>
      </div>

      <div class="form-group">
        <label>变量标识 (可选)</label>
        <div class="var-input-box">
          <span class="prefix">{{ '{{' }}</span>
          <input v-model="localMaterial.varName" placeholder="如: 版本 / System / Date" />
          <span class="suffix">{{ '}' + '}' }}</span>
        </div>
        <p class="field-hint">设置后可在“固定字段”中使用此变量进行内容填充</p>
      </div>

      <!-- Type Specific Fields -->
      <div v-if="localMaterial.type === 'fixed'" class="form-group">
        <label>固定内容</label>
        <textarea v-model="localMaterial.content" rows="4" placeholder="生成时直接使用的文本，可用变量如 {{版本}}..."></textarea>
      </div>

      <div v-if="localMaterial.type === 'option'" class="form-group">
        <label>选项管理</label>
        <div class="option-manager-box">
          <draggable v-model="localMaterial.options" item-key="id" class="opt-list" handle=".opt-drag">
            <template #item="{ element, index }">
              <div class="opt-edit-row">
                <lucide-grip-vertical :size="14" class="opt-drag" />
                <input v-model="element.value" placeholder="选项值" />
                <button class="remove-opt" @click="localMaterial.options.splice(index, 1)">
                  <lucide-x :size="14" />
                </button>
              </div>
            </template>
          </draggable>
          <div class="opt-add-zone">
            <input v-model="newOptionVal" placeholder="输入新选项..." @keyup.enter="addOption" />
            <button class="add-opt-btn" @click="addOption">
              <lucide-plus :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="localMaterial.type === 'fill'" class="form-group">
        <label>输入类型</label>
        <select v-model="localMaterial.fillType">
          <option value="text">普通文本</option>
          <option value="date">日期选择</option>
        </select>
        <label class="mt-4">默认值 (可选)</label>
        <textarea v-if="localMaterial.fillType === 'text'" v-model="localMaterial.defaultValue" placeholder="未输入时的默认填充内容..." rows="2"></textarea>
        <div v-else class="date-input-group">
          <input v-model="localMaterial.defaultValue" type="date" @click="(e: any) => (e.target as any).showPicker()" />
          <button v-if="localMaterial.defaultValue" class="btn-clear-date" @click="localMaterial.defaultValue = ''" title="清空日期">
            <lucide-x :size="12" />
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn-cancel" @click="emit('update:modelValue', null)">取消</button>
      <button class="btn-confirm" @click="handleConfirm">保存素材</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  Type as LucideType, 
  X as LucideX, 
  GripVertical as LucideGripVertical,
  Plus as LucidePlus 
} from 'lucide-vue-next';
import draggable from 'vuedraggable';
import { nanoid } from 'nanoid';
import BaseDialog from './BaseDialog.vue';
import type { Material } from '../../types/project';

const props = defineProps<{
  modelValue: Material | null;
  isNew: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'confirm']);

const localMaterial = ref<Material | null>(null);
const newOptionVal = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localMaterial.value = JSON.parse(JSON.stringify(newVal));
    // Focus after open
    setTimeout(() => nameInput.value?.focus(), 100);
  } else {
    localMaterial.value = null;
  }
}, { immediate: true });

const addOption = () => {
  if (!newOptionVal.value.trim() || !localMaterial.value) return;
  const mat = localMaterial.value as any;
  if (!mat.options) mat.options = [];
  mat.options.push({ 
    id: nanoid(), 
    value: newOptionVal.value.trim(), 
    label: newOptionVal.value.trim() 
  });
  newOptionVal.value = '';
};


const handleConfirm = () => {
  if (localMaterial.value) {
    emit('confirm', localMaterial.value);
  }
};
</script>

<style scoped>
.prop-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
}

.field-icon {
    position: absolute;
    left: 12px;
    color: #94a3b8;
}

.input-with-icon input {
    padding-left: 36px !important;
}

input, select, textarea {
    width: 100%;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 14px;
    background: #f8fafc;
    transition: all 0.2s;
    font-family: inherit;
}

input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.var-input-box {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
  border: 1.5px solid #e2e8f0;
}

.var-input-box .prefix, .var-input-box .suffix {
  padding: 0 10px;
  font-family: monospace;
  font-weight: 800;
  color: #6366f1;
  background: #eef2ff;
  height: 38px;
  display: flex;
  align-items: center;
}

.var-input-box input {
  border: none;
  background: transparent;
  padding: 0 12px;
  height: 38px;
}

.field-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
}

.option-manager-box {
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
}

.opt-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
}

.opt-edit-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: white;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.opt-drag {
    color: #cbd5e1;
    cursor: grab;
}

.opt-edit-row input {
    border: none;
    padding: 0;
    background: transparent;
    font-weight: 600;
}

.remove-opt {
    color: #94a3b8;
    background: transparent;
    border: none;
    cursor: pointer;
}

.remove-opt:hover { color: #ef4444; }

.opt-add-zone {
    display: flex;
    gap: 8px;
}

.add-opt-btn {
    min-width: 36px;
    height: 36px;
    background: #6366f1;
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
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

.mt-4 { margin-top: 16px; }

.date-input-group {
    position: relative;
    display: flex;
    align-items: center;
}

.btn-clear-date {
    position: absolute;
    right: 30px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: #f1f5f9;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-clear-date:hover {
    background: #fee2e2;
    color: #ef4444;
}

</style>
