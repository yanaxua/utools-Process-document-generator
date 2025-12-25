<template>
  <div v-if="currentProject" class="generate-page">
    <header class="editor-header glass">
      <div class="header-left">
        <button class="btn-back" @click="router.push('/')" title="返回首页">
          <lucide-chevron-left :size="20" />
        </button>
        <div class="header-divider"></div>
        <div class="header-info">
          <h1 class="project-name">{{ currentProject.name }}</h1>
          <div class="mode-badge generate">
            <span class="dot"></span>
            行文模式
          </div>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-secondary ghost" @click="router.push(`/editor/${currentProject.id}`)">
          <lucide-edit :size="16" />
          <span>返回编辑</span>
        </button>
        <button class="btn-primary" @click="copyAll">
          <lucide-copy :size="16" />
          <span>一键复制</span>
        </button>
      </div>
    </header>

    <div class="generate-body">
      <!-- Left: Selection -->
      <aside class="selection-panel premium-card">
        <div class="section-title">参数配置 / Selection</div>
        
        <div 
          v-for="item in activeConfigItems" 
          :key="item.key" 
          class="config-item"
          :style="{ marginLeft: (item.depth * 12) + 'px' }"
          :class="{ 'is-fixed': item.material.type === 'fixed' }"
        >
          <div class="item-header">
            <div class="header-line" v-if="item.depth > 0"></div>
            <span class="type-icon" :class="item.material.type"></span>
            <label>
              {{ item.material.name }}
            </label>
          </div>
          
          <div class="item-control">
            <!-- Option Type -->
            <template v-if="item.material.type === 'option'">
               <div class="chip-container">
                 <label v-for="opt in item.material.options" :key="opt.id" class="chip" :class="{active: state.selectedOptions[item.material.id]?.includes(opt.value)}">
                   <input type="checkbox" :value="opt.value" v-model="state.selectedOptions[item.material.id]" style="display:none" />
                   {{ opt.label }}
                 </label>
               </div>
            </template>

            <!-- Fill Type -->
            <template v-else-if="item.material.type === 'fill'">
              <div class="input-wrapper">
                <textarea v-if="item.material.fillType === 'text'" v-model="state.fillValues[item.key]" placeholder="填写内容..." rows="1"></textarea>
                <input v-else v-model="state.fillValues[item.key]" type="date" @click="(e: any) => e.target.showPicker()" />
              </div>
            </template>

            <!-- Fixed Type (Show a preview) -->
            <template v-else-if="item.material.type === 'fixed'">
               <div class="fixed-text-preview">{{ item.material.content }}</div>
            </template>
          </div>
        </div>

        <div v-if="activeConfigItems.length === 0" class="empty-hint">
            <span class="icon">🧩</span>
            <p>请先在编辑器中添加素材并完成排版</p>
        </div>
      </aside>

      <!-- Right: Preview -->
      <main class="preview-panel">
        <div class="preview-container premium-card">
          <div class="preview-header">
            <div class="title">
              <lucide-eye :size="16" />
              <h3>实时预览</h3>
            </div>
            <button @click="copyAll" class="copy-btn-mini">
                <lucide-copy :size="14" /> 拷贝
            </button>
          </div>
          <div class="preview-content">
            <pre v-if="generatedText">{{ generatedText }}</pre>
            <div v-else class="preview-empty">
                等待勾选选项生成内容...
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../store/projectStore';
import { storeToRefs } from 'pinia';
import { 
  ChevronLeft as LucideChevronLeft, 
  Copy as LucideCopy,
  Eye as LucideEye,
  Pencil as LucideEdit
} from 'lucide-vue-next';
import { generateText, getDefaultState } from '../utils/generator';
import type { GenerationState } from '../utils/generator';
import type { LayoutItem } from '../types/project';

const props = defineProps<{ id: string }>();
const router = useRouter();
const store = useProjectStore();
const { currentProject } = storeToRefs(store);

const state = reactive<GenerationState>({
  selectedOptions: {},
  fillValues: {}
});

onMounted(async () => {
  await store.selectProject(props.id);
  if (currentProject.value) {
    const defaultState = getDefaultState(currentProject.value);
    state.selectedOptions = defaultState.selectedOptions;
    state.fillValues = defaultState.fillValues;
  }
});

const activeConfigItems = computed(() => {
  if (!currentProject.value) return [];
  const items: { material: any, key: string, depth: number }[] = [];

  const scan = (layoutItems: LayoutItem[], depth: number = 0) => {
    layoutItems.forEach(item => {
      const material = currentProject.value!.materials.find(m => m.id === item.materialId);
      if (!material) return;

      // Include ALL nodes to represent the full project structure
      items.push({ material, key: item.id, depth });
      
      // Step into children
      if (item.children && item.children.length > 0) {
        scan(item.children, depth + 1);
      }
    });
  };

  scan(currentProject.value.layout);
  return items;
});



const generatedText = computed(() => {
  if (!currentProject.value) return '';
  return generateText(currentProject.value, state);
});

const copyAll = () => {
    if (!generatedText.value) return;
  (window as any).utoolsUtils.copyText(generatedText.value);
  (window as any).utoolsUtils.showNotification('内容已复制到剪贴板');
};
</script>

<style scoped>
.generate-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: white;
  border-bottom: 1.5px solid #f1f5f9;
  z-index: 100;
}


.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-back:hover {
  background: #f1f5f9;
  color: #1e293b;
  transform: translateX(-2px);
}

.header-divider {
    width: 1px;
    height: 24px;
    background: #e2e8f0;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.project-name {
  font-size: 15px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.01em;
}


.mode-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.mode-badge.editor {
    background: #eef2ff;
    color: #4f46e5;
    border: 1px solid #e0e7ff;
}

.mode-badge.generate {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #d1fae5;
}

.mode-badge .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 2px rgba(currentColor, 0.2);
}

.header-right {
  display: flex;
  gap: 12px;
}

.header-right .btn-primary {
  background: #4f46e5;
  color: white;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
}


.header-right .btn-secondary {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 6px 14px;
  font-size: 13px;
  color: #475569;
  border-radius: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}


.header-right .btn-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1e293b;
}

.header-right .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
}

.header-right .btn-primary:active {
    transform: translateY(0);
}

.generate-body {
  flex: 1;
  display: flex;
  padding: 12px;
  gap: 12px;
  background: #f8fafc;
  overflow: hidden;
}

.selection-panel {
  width: 220px;
  padding: 16px;
  background: white;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}


.section-title {
    font-size: 11px;
    font-weight: 800;
    color: #94a3b8;
    margin-bottom: 16px;
    text-transform: uppercase;
}


.config-item {
  margin-bottom: 20px;
}


.item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    position: relative;
}

.header-line {
    position: absolute;
    left: -10px;
    top: 50%;
    width: 6px;
    height: 1.5px;
    background: #e2e8f0;
}


.item-header label {
    font-size: 13px;
    font-weight: 700;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 6px;
}


.parent-ref {
    font-size: 12px;
    color: #6366f1;
    font-weight: 700;
    background: #eef2ff;
    padding: 2px 6px;
    border-radius: 4px;
}

.type-icon {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}
.type-icon.fixed { background: #cbd5e1; }
.type-icon.option { background: #10b981; }
.type-icon.fill { background: #3b82f6; }

.chip-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 4px 10px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}


.chip:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.chip.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #3b82f6;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.input-wrapper input, .input-wrapper textarea {
    width: 100%;
    padding: 10px 12px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    transition: all 0.2s;
}

.input-wrapper textarea {
    resize: vertical;
    min-height: 60px;
}

.input-wrapper input:focus, .input-wrapper textarea:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.fixed-text-preview {
  font-size: 11px;
  color: #94a3b8;
  padding: 4px 8px;
  background: #f8fafc;
  border-radius: 4px;
  border-left: 2px solid #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.config-item.is-fixed {
    margin-bottom: 8px;
    opacity: 0.8;
}


.preview-panel {
  flex: 1;
  overflow: hidden;
}

.preview-container {
  height: 100%;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}


.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1.5px solid #f1f5f9;
}


.preview-header .title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #475569;
}

.preview-header h3 {
    font-size: 16px;
    font-weight: 600;
}

.copy-btn-mini {
    background: #4f46e5;
    color: white;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    border: none;
}


.preview-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #ffffff;
}

.preview-content pre {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-style: italic;
}

.empty-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 60px;
    color: #94a3b8;
    text-align: center;
}

.empty-hint .icon {
    font-size: 40px;
    margin-bottom: 16px;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
