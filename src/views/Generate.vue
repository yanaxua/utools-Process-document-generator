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

        <button class="btn-primary" @click="copyAll">
          <lucide-copy :size="16" />
          <span>一键复制</span>
        </button>
      </div>
    </header>

    <div class="generate-body">
      <!-- Left: Selection -->
      <aside class="selection-panel">
        <div class="panel-header">
           <div class="header-group">
             <span class="header-dot"></span>
             <span class="section-title">参数配置</span>
           </div>
        </div>

        <div class="selection-scroll-area">
          <!-- 1. Global Variables Section (Sticky or Top) -->
          <div v-if="globalVars.length > 0" class="config-group-card global-vars-card">
            <div class="group-header">
              <span class="group-tag">Global</span>
              <span class="group-name">全局变量 / Variables</span>
            </div>
            <div class="tree-container">
              <div v-for="v in globalVars" :key="'global-'+v.id" class="config-item">
                <div class="item-header">
                  <span class="type-icon fill"></span>
                  <label>{{ v.name }} <span class="var-name-hint">({{ v.varName }})</span></label>
                </div>
                <div class="item-control">
                  <div class="input-wrapper">
                    <textarea 
                      v-if="v.fillType === 'text'" 
                      v-model="state.fillValues[v.id]" 
                      @input="syncByVarName(v)"
                      placeholder="统一修改..." 
                      rows="1"
                    ></textarea>
                    <div class="date-input-group" v-if="v.fillType === 'date'">
                      <input 
                        v-model="state.fillValues[v.id]" 
                        @input="syncByVarName(v)"
                        type="date" 
                        @click="(e: any) => e.target.showPicker()"
                      />
                      <button v-if="state.fillValues[v.id]" class="btn-clear-date" @click="state.fillValues[v.id] = ''; syncByVarName(v)" title="清空日期">
                        <lucide-x :size="12" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. The Main Layout Tree (Grouped into Cards by Root Nodes) -->
          <div v-for="group in cardItems" :key="group.id" class="config-group-card">
            <div v-if="group.rootName" class="group-header">
              <span class="group-tag">Branch</span>
              <span class="group-name">{{ group.rootName }}</span>
            </div>
            
            <div class="tree-container">
              <div 
                v-for="item in group.items" 
                :key="item.key" 
                class="config-item"
                :class="{ 
                  'is-fixed': item.material.type === 'fixed',
                  'is-hidden': !!item.material.varName && item.material.type === 'fill'
                }"
                :style="{ marginLeft: (item.depth * 14) + 'px' }"
              >
                <!-- Indentation Guide Line -->
                <div class="tree-guide" v-if="item.depth > 0"></div>

                <div class="item-header">
                  <span class="type-icon" :class="item.material.type"></span>
                  <label>{{ item.material.name }}</label>
                </div>

                <div class="item-control">
                  <!-- Option Type -->
                  <template v-if="item.material.type === 'option'">
                    <div class="chip-container">
                      <label v-for="opt in item.material.options" :key="opt.id" class="chip" :class="{active: state.selectedOptions[item.material.id]?.includes(opt.value)}">
                        <input type="checkbox" :value="opt.value" v-model="state.selectedOptions[item.material.id]" style="display:none" />
                        {{ opt.value }}
                      </label>
                    </div>
                  </template>

                  <!-- Fill Type (If not treated as global or for instance specific overrides) -->
                  <template v-else-if="item.material.type === 'fill'">
                    <div class="input-wrapper">
                      <textarea 
                          v-if="item.material.fillType === 'text'" 
                          v-model="state.fillValues[item.id]" 
                          @input="syncGlobal(item.material)"
                          placeholder="点此输入..." 
                          rows="1"
                      ></textarea>
                      <div class="date-input-group" v-if="item.material.fillType === 'date'">
                        <input 
                            v-model="state.fillValues[item.id]" 
                            @input="syncGlobal(item.material)"
                            type="date" 
                            @click="(e: any) => e.target.showPicker()" 
                        />
                        <button v-if="state.fillValues[item.id]" class="btn-clear-date" @click="state.fillValues[item.id] = ''; syncGlobal(item.material)" title="清空日期">
                          <lucide-x :size="12" />
                        </button>
                      </div>
                    </div>
                  </template>

                  <!-- Fixed Type -->
                  <template v-else-if="item.material.type === 'fixed'">
                    <div class="fixed-text-preview" v-html="highlightVars(item.material.content)"></div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="visibleItems.length === 0" class="empty-hint">
          <span class="icon">🧩</span>
          <p>请先在编辑器中添加素材</p>
        </div>
      </aside>




      <!-- Right: Preview -->
      <main class="preview-panel">
        <div class="preview-container premium-card">
          <div class="preview-header">
            <div class="title header-group">
               <span class="header-dot"></span>
               <span class="section-title">实时预览</span>
            </div>
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
  Pencil as LucideEdit,
  X as LucideX
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

const visibleItems = computed(() => {
  if (!currentProject.value) return [];
  const items: { material: any, key: string, id: string, depth: number }[] = [];

  const scan = (layoutItems: LayoutItem[], depth: number = 0) => {
    layoutItems.forEach(item => {
      const material = currentProject.value!.materials.find(m => m.id === item.materialId);
      if (!material) return;
      
      // Node is always added
      items.push({ material, key: item.id, id: item.id, depth });
      
      // But we only recurse if it's not an OPTION or if the OPTION has a selection
      let shouldRecurse = true;
      if (material.type === 'option') {
          const selected = state.selectedOptions[material.id] || [];
          if (selected.length === 0) shouldRecurse = false;
      }
      
      if (shouldRecurse && item.children) {
          scan(item.children, depth + 1);
      }
    });
  };

  scan(currentProject.value.layout);
  return items;
});

const globalVars = computed(() => {
    if (!currentProject.value) return [];
    
    const activeMaterials = visibleItems.value.map(i => i.material);
    const activeMaterialIds = new Set(activeMaterials.map(m => m.id));
    
    const referencedVarNames = new Set<string>();
    activeMaterials.forEach(m => {
        if (m.type === 'fixed' && m.content) {
            const matches = m.content.matchAll(/\{\{(.*?)\}\}/g);
            for (const match of matches) {
                referencedVarNames.add(match[1].trim());
            }
        }
    });
    
    // Use a record to ensure uniqueness by varName
    const varsMap = new Map();
    currentProject.value.materials.forEach(m => {
        if (m.type === 'fill' && m.varName) {
            const isExplicitInLayout = activeMaterialIds.has(m.id);
            const isReferencedByText = referencedVarNames.has(m.varName);
            
            if (isExplicitInLayout || isReferencedByText) {
                // If multiple materials have same varName, we only show the first one 
                // found in the project library to avoid duplicates in the UI
                if (!varsMap.has(m.varName)) {
                    varsMap.set(m.varName, m);
                }
            }
        }
    });
    
    return Array.from(varsMap.values());
});

const cardItems = computed(() => {
    if (!currentProject.value) return [];
    const groups: { id: string, rootName: string | null, items: any[] }[] = [];
    
    currentProject.value.layout.forEach(root => {
        const material = currentProject.value!.materials.find(m => m.id === root.materialId);
        const group: { id: string, rootName: string | null, items: any[] } = {
            id: root.id,
            rootName: material?.name || 'Untitled Branch',
            items: []
        };
        
        const scan = (item: LayoutItem, depth: number = 0) => {
            const mat = currentProject.value!.materials.find(m => m.id === item.materialId);
            if (!mat) return;
            group.items.push({ material: mat, key: item.id, id: item.id, depth });
            
            let shouldRecurse = true;
            if (mat.type === 'option') {
                const selected = state.selectedOptions[mat.id] || [];
                if (selected.length === 0) shouldRecurse = false;
            }

            if (shouldRecurse && item.children) {
                item.children.forEach(c => scan(c, depth + 1));
            }
        };
        
        scan(root);
        // Only add group if root is present
        if (group.items.length > 0) {
            groups.push(group);
        }
    });
    
    return groups;
});



const highlightVars = (text: string) => {
    return text.replace(/\{\{(.*?)\}\}/g, '<span class="var-badge">$1</span>');
};

const syncGlobal = (material: any) => {
    if (!material) return;
    const materialId = material.id;
    const items = visibleItems.value;
    const instancesOfSameMaterial = items.filter(i => i.material.id === materialId);
    
    const firstInstance = instancesOfSameMaterial.find(i => state.fillValues[i.id] !== undefined) || instancesOfSameMaterial[0];
    if (!firstInstance) return;

    const sourceValue = state.fillValues[firstInstance.id];
    if (sourceValue !== undefined) {
        state.fillValues[materialId] = sourceValue;
        
        instancesOfSameMaterial.forEach(inst => {
            state.fillValues[inst.id] = sourceValue;
        });

        // Also sync by varName if exists
        if (material.varName) {
            syncByVarName(material);
        }
    }
};

const syncByVarName = (material: any) => {
    if (!material.varName || !currentProject.value) return;
    const val = state.fillValues[material.id];
    
    // Find all materials with same varName
    currentProject.value.materials.forEach(m => {
        if (m.varName === material.varName && m.type === 'fill') {
            state.fillValues[m.id] = val;
            // Also update all their visible layout instances
            visibleItems.value.forEach(item => {
                if (item.material.id === m.id) {
                    state.fillValues[item.id] = val;
                }
            });
        }
    });
};





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
  width: 320px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.panel-header {
    padding: 0 16px;
    border-bottom: 1.5px solid #f1f5f9;
    height: 36px;
    display: flex;
    align-items: center;
    margin-bottom: 0;
}

.selection-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 12px; /* Internal padding for content */
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.section-title {
    font-size: 11px;
    font-weight: 800;
    color: #1e293b; /* Match Editor */
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.section-desc { display: none; }

.config-group-card {
    /* Flatten style - no more card */
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
}

.global-vars-card {
    border: none;
    background: transparent;
}

.group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
}

.group-tag {
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 800;
    color: white;
    background: #6366f1;
    padding: 2px 6px;
    border-radius: 4px;
}

.global-vars-card .group-tag {
    background: #4f46e5;
}

.group-name {
    font-size: 14px;
    font-weight: 800;
    color: #1e293b;
}

.tree-container {
    display: flex;
    flex-direction: column;
}

.config-item {
  margin-bottom: 20px;
  position: relative;
}

.config-item.is-hidden {
    display: none;
}

.config-item:last-child {
    margin-bottom: 0;
}

.var-name-hint {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 500;
}

.tree-guide {
    position: absolute;
    left: -12px;
    top: 0;
    bottom: -20px;
    width: 1.5px;
    background: #f1f5f9;
}


.item-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
}

.item-header label {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
}

.var-badge {
    background: #eef2ff;
    color: #4f46e5;
    padding: 0 4px;
    border-radius: 4px;
    font-weight: 800;
    font-family: monospace;
    border: 1px solid #e0e7ff;
}

.fixed-text-preview {
  font-size: 11px;
  color: #94a3b8;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  line-height: 1.5;
  word-break: break-all;
}

.config-item.is-fixed {
    opacity: 0.9;
}

/* RESTORED STYLES */
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
  gap: 6px;
  margin-top: 4px;
}

.chip {
  padding: 4px 10px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
}

.chip:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.chip.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #3b82f6;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.input-wrapper input, .input-wrapper textarea {
    width: 100%;
    padding: 8px 12px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 12px;
    font-family: inherit;
    transition: all 0.2s;
}

.input-wrapper textarea {
    resize: vertical;
    min-height: 40px;
}

.input-wrapper input:focus, .input-wrapper textarea:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

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
    transition: all 0.2;
}

.btn-clear-date:hover {
    background: #fee2e2;
    color: #ef4444;
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
  padding: 0 16px;
  height: 36px;
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

.header-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.header-dot {
    width: 4px;
    height: 4px;
    background: #4f46e5;
    border-radius: 50%;
}

/* Ensure panel-header aligns correctly */

</style>
