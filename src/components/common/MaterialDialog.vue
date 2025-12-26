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
        <div class="textarea-wrapper">
          <textarea 
            ref="contentTextarea"
            v-model="localMaterial.content" 
            rows="4" 
            placeholder="生成时直接使用的文本，可用变量如 {{版本}}..."
            @input="handleContentInput"
            @keydown="handleContentKeydown"
            @click="handleContentInput"
            @blur="() => setTimeout(() => showSuggestions = false, 200)"
          ></textarea>
          
          <div v-if="showSuggestions" class="suggestion-popover" :style="{ top: suggestPos.top + 'px', left: suggestPos.left + 'px' }">
            <div v-if="availableVars.length === 0" class="suggest-empty">无匹配变量</div>
            <div 
              v-for="(v, index) in availableVars" 
              :key="v.name + index"
              class="suggest-item"
              :class="{ active: index === suggestionIdx }"
              @mousedown.prevent="insertSuggestion(v)"
            >
              <span class="s-icon" :class="v.icon">
                <lucide-type v-if="v.icon === 'fixed' || v.icon === 'fill'" :size="10" />
                <lucide-list v-else :size="10" />
              </span>
              <div class="s-info">
                  <span class="s-name">{{ v.name }}</span>
                  <span class="s-desc">{{ v.desc }}</span>
              </div>
            </div>
          </div>
        </div>
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
import { ref, watch, computed } from 'vue';
import { 
  Type as LucideType, 
  X as LucideX, 
  GripVertical as LucideGripVertical,
  Plus as LucidePlus,
  ListOrdered as LucideList
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
import { useProjectStore } from '../../store/projectStore';
import { storeToRefs } from 'pinia';

const store = useProjectStore();
const { currentProject } = storeToRefs(store);

const localMaterial = ref<Material | null>(null);
const newOptionVal = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

// --- Variable Suggestion Logic ---
const showSuggestions = ref(false);
const suggestionIdx = ref(0);
const suggestionQuery = ref('');
const contentTextarea = ref<HTMLTextAreaElement | null>(null);
const suggestPos = ref({ top: 0, left: 0 });

const availableVars = computed(() => {
  if (!currentProject.value) return [];
  return currentProject.value.materials
    .filter(m => m.varName && m.id !== localMaterial.value?.id) // Exclude self if needed, or include self? Usually variables refer to *other* inputs, but self reference might be valid or invalid. Let's include all others.
    .map(m => ({ 
      name: m.varName!, 
      desc: m.name,
      icon: m.type
    }))
    .filter(v => v.name.toLowerCase().includes(suggestionQuery.value.toLowerCase()));
});

const insertSuggestion = (v: { name: string }) => {
  if (!contentTextarea.value || !localMaterial.value) return;
  const el = contentTextarea.value;
  const val = localMaterial.value.content || ''; // Ensure content is string
  const cursor = el.selectionEnd;
  
  // Find the start of the {{
  const lastOpen = val.lastIndexOf('{{', cursor);
  if (lastOpen !== -1) {
    const prefix = val.substring(0, lastOpen + 2); // Keep {{
    const suffix = val.substring(cursor); // After cursor, likely }} or more text
    
    // Check if we already have closing brackets immediately after cursor (from auto-complete)
    let newSuffix = suffix;
    if (newSuffix.startsWith('}}')) {
       newSuffix = newSuffix.substring(2);
    } 

    localMaterial.value.content = `${prefix}${v.name}}}${newSuffix}`;
    
    // Fix cursor position
    const newCursorPos = lastOpen + 2 + v.name.length + 2; 
    setTimeout(() => {
        el.setSelectionRange(newCursorPos, newCursorPos);
        el.focus();
    });
  }
  showSuggestions.value = false;
};

// Mirror div for caret coordinates
const getCaretCoordinates = () => {
    const el = contentTextarea.value;
    if (!el) return { top: 0, left: 0 };
    
    const { selectionStart } = el;
    const div = document.createElement('div');
    const style = window.getComputedStyle(el);
    for (const prop of Array.from(style)) {
        div.style.setProperty(prop, style.getPropertyValue(prop));
    }
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.height = 'auto'; // Recalculate height
    div.style.width = el.offsetWidth + 'px'; // Exact width match
    
    div.textContent = (localMaterial.value?.content || '').substring(0, selectionStart);
    const span = document.createElement('span');
    span.textContent = '|';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const { offsetLeft, offsetTop } = span;
    const rect = el.getBoundingClientRect(); // relative to viewport
    document.body.removeChild(div);
    
    // We want position relative to the wrapper
    // The wrapper is "input-overlay-wrapper" (to be added)
    // Actually simpler: return relative to the textarea's top-left content box
    const lineHeight = style.lineHeight === 'normal' ? '20' : style.lineHeight;
    return {
        left: offsetLeft,
        top: offsetTop + parseInt(lineHeight) // Move down one line
    };
};

const handleContentInput = (e: Event) => {
    const el = e.target as HTMLTextAreaElement;
    const val = el.value;
    const cursor = el.selectionEnd;
    
    // 1. Check for {{ auto-complete
    if ((e as InputEvent).data === '{' && val.slice(cursor - 2, cursor) === '{{') {
        // If next chars are not already }}, insert them
        if (val.slice(cursor, cursor + 2) !== '}}') {
            const newVal = val.slice(0, cursor) + '}}' + val.slice(cursor);
            localMaterial.value!.content = newVal;
            // Restore cursor
            setTimeout(() => el.setSelectionRange(cursor, cursor), 0);
        }
    }

    // 2. Check if we are inside {{ }}
    const lastOpen = val.lastIndexOf('{{', cursor);
    const lastClose = val.lastIndexOf('}}', cursor);
    
    if (lastOpen !== -1 && lastOpen > lastClose) {
        // We are inside an open tag
        // Check if there is a closing tag coming up shortly (to ensure we are in a valid block)
        // Actually simpler: just assume editing if open > close found before cursor
        
        // Extract query
        const query = val.slice(lastOpen + 2, cursor);
        // Only suggest if query doesn't contain newlines or invalid chars?
        if (!query.includes('\n')) {
            suggestionQuery.value = query.trim();
            showSuggestions.value = true;
            suggestionIdx.value = 0;
            suggestPos.value = getCaretCoordinates();
            return;
        }
    }
    
    showSuggestions.value = false;
};

const handleContentKeydown = (e: KeyboardEvent) => {
    if (!showSuggestions.value) return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        suggestionIdx.value = (suggestionIdx.value + 1) % availableVars.value.length;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        suggestionIdx.value = (suggestionIdx.value - 1 + availableVars.value.length) % availableVars.value.length;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (availableVars.value.length > 0) {
            insertSuggestion(availableVars.value[suggestionIdx.value]);
        }
    } else if (e.key === 'Escape') {
        showSuggestions.value = false;
    }
};

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localMaterial.value = JSON.parse(JSON.stringify(newVal));
    if(!localMaterial.value.content) localMaterial.value.content = ''; // Ensure content init
    setTimeout(() => nameInput.value?.focus(), 100);
  } else {
    localMaterial.value = null;
    showSuggestions.value = false;
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


.textarea-wrapper {
    position: relative;
    width: 100%;
}

.suggestion-popover {
    position: absolute;
    z-index: 9999;
    background: white;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 8px;
    width: 220px;
    max-height: 200px;
    overflow-y: auto;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.suggest-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.1s;
}

.suggest-item:hover, .suggest-item.active {
    background: #f1f5f9;
}

.suggest-item.active {
    background: #eef2ff;
}

.suggest-empty {
    padding: 8px;
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
}

.s-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: #f8fafc;
    color: #64748b;
}

.s-icon.fixed { background: #f1f5f9; }
.s-icon.option { background: #ecfdf5; color: #059669; }
.s-icon.fill { background: #eff6ff; color: #3b82f6; }


.s-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.s-name {
    font-size: 12px;
    font-weight: 700;
    color: #334155;
}

.s-desc {
    font-size: 10px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

</style>
