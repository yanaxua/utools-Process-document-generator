<template>
  <div v-if="currentProject" class="editor-page">
    <header class="editor-header glass">
      <div class="header-left">
        <button class="btn-back" @click="router.push('/')" title="返回首页">
          <lucide-chevron-left :size="22" />
        </button>
        <div class="header-divider"></div>
        <div class="header-info">
          <h1 class="project-name">{{ currentProject.name }}</h1>
          <div class="mode-badge editor">
            <span class="dot"></span>
            编辑配置
          </div>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-secondary ghost" @click="save">
          <lucide-save :size="18" />
          <span>保存配置</span>
        </button>
        <button class="btn-primary" @click="router.push(`/generate/${currentProject.id}`)">
          <span>进入行文</span>
          <lucide-arrow-right :size="18" />
        </button>
      </div>
    </header>

    <div class="editor-body">
      <!-- Left: Material Library -->
      <aside class="material-sidebar premium-card">
        <div class="sidebar-header">
          <div class="header-group">
            <span class="header-dot"></span>
            <span class="section-title">素材库</span>
          </div>
          <button @click="handleStartCreate" class="add-btn-minimal" title="创建新素材">
            <lucide-plus :size="14" />
          </button>
        </div>
        
        <div class="filter-box">
          <div class="filter-inner">
            <select v-model="filterType" class="premium-filter" :class="{ 'is-filtered': filterType !== 'all' }">
              <option value="all">🔍 全部</option>
              <option value="fixed">📌 固定字段</option>
              <option value="option">🌿 选项层级</option>
              <option value="fill">✍️ 填空录入</option>
            </select>
            <button v-if="filterType !== 'all'" class="filter-clear" @click="filterType = 'all'" title="清除筛选">
              <lucide-x :size="10" />
            </button>
          </div>
        </div>

        <draggable 
          v-model="filteredMaterials" 
          item-key="id" 
          class="material-list"
          :group="{ name: 'materials', pull: 'clone', put: false }"
          :clone="cloneMaterial"
          @start="(e: any) => store.draggingItem = filteredMaterials[e.oldIndex]"
          @end="store.draggingItem = null"
        >
          <template #item="{ element }">
            <div class="material-item" :class="[element.type]" @click="handleStartEdit(element)">
              <span class="m-icon">
                <lucide-type v-if="element.type === 'fixed'" :size="13" />
                <lucide-list v-else-if="element.type === 'option'" :size="13" />
                <lucide-calendar v-else-if="element.type === 'fill'" :size="13" />
              </span>
              <span class="m-name">{{ element.name }}</span>
              <button class="del-small" @click.stop="store.removeMaterial(element.id)">
                <lucide-x :size="12" />
              </button>
            </div>
          </template>
        </draggable>


      </aside>

      <!-- Center: Layout Area -->
      <main class="layout-area">
        <div class="canvas premium-card">
          <div class="canvas-header">
            <div class="header-title">
              <h3>排版布局</h3>
            </div>
          </div>
          
          <div class="canvas-viewport">
            <div class="layout-list">
                <LayoutNode 
                  v-for="(element, idx) in currentProject.layout"
                  :key="element.id"
                  :node="element" 
                  :project="currentProject" 
                  :parent-array="currentProject.layout"
                  @remove="removeItem(element.id)" 
                />
            </div>
              
            <div v-if="currentProject.layout.length === 0" class="layout-empty-state">
                <div class="empty-box">
                    <div class="empty-icon">🎨</div>
                    <p>排版区域还是空的</p>
                    <span class="sub-hint">从左侧素材库拖入素材开始创作</span>
                </div>
            </div>
          </div>
        </div>
      </main>
  </div>

    <!-- Unified Material Modal (Create & Edit) -->
    <div v-if="editingMaterial" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-content material-modal animate-in">
        <div class="modal-header">
          <h3>{{ isNewMaterial ? '✨ 新建素材' : '📝 编辑素材' }}</h3>
          <button class="close-btn" @click="cancelEdit"><lucide-x :size="18" /></button>
        </div>
        
        <div class="modal-body prop-form">
          <div class="form-group">
            <label>素材名称</label>
            <input v-model="editingMaterial.name" placeholder="请输入素材名称..." ref="nameInput" />
          </div>

          <div class="form-group">
            <label>素材类型</label>
            <select v-model="editingMaterial.type" :disabled="!isNewMaterial">
              <option value="fixed">固定字段 (静态文本)</option>
              <option value="option">选项层级 (单选/多选)</option>
              <option value="fill">填空录入 (动态输入)</option>
            </select>
          </div>

          <!-- Type Specific Fields -->
          <div v-if="editingMaterial.type === 'fixed'" class="form-group">
            <label>固定内容</label>
            <textarea v-model="editingMaterial.content" rows="3" placeholder="生成时直接使用的文本..."></textarea>
          </div>

          <div v-if="editingMaterial.type === 'option'" class="form-group">
            <label>选项管理</label>
            <div class="option-manager-box">
              <draggable v-model="editingMaterial.options" item-key="id" class="opt-list" handle=".opt-drag">
                <template #item="{ element, index }">
                  <div class="opt-edit-row">
                    <lucide-grip-vertical :size="14" class="opt-drag" />
                    <input v-model="element.value" placeholder="选项值" />
                    <button class="remove-opt" @click="removeOption(editingMaterial, index)">
                      <lucide-x :size="14" />
                    </button>
                  </div>
                </template>
              </draggable>
              <div class="opt-add-zone">
                <input v-model="newOptionVal" placeholder="输入新选项..." @keyup.enter="addOption(editingMaterial)" />
                <button class="add-opt-btn" @click="addOption(editingMaterial)">
                  <lucide-plus :size="16" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="editingMaterial.type === 'fill'" class="form-group">
            <label>输入类型</label>
            <select v-model="editingMaterial.fillType">
              <option value="text">普通文本</option>
              <option value="date">日期选择</option>
            </select>
            <label>默认值 (可选)</label>
            <textarea v-if="editingMaterial.fillType === 'text'" v-model="editingMaterial.defaultValue" placeholder="未输入时的默认填充内容..." rows="2"></textarea>
            <input v-else v-model="editingMaterial.defaultValue" type="date" @click="(e: any) => e.target.showPicker()" />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="cancelEdit">取消</button>
          <button class="btn-confirm" @click="confirmEdit">保存素材</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../store/projectStore';
import { storeToRefs } from 'pinia';
import draggable from 'vuedraggable';
import { 
  Save as LucideSave,
  ArrowRight as LucideArrowRight,
  ChevronLeft as LucideChevronLeft, 
  Type as LucideType, 
  List as LucideList, 
  Keyboard as LucideInput, 
  X as LucideX,
  Calendar as LucideCalendar,
  Plus as LucidePlus
} from 'lucide-vue-next';
import LayoutNode from '../components/editor/LayoutNode.vue';
import { nanoid } from 'nanoid';
import type { Material, LayoutItem } from '../types/project';


const props = defineProps<{ id: string }>();
const router = useRouter();
const store = useProjectStore();
const { currentProject } = storeToRefs(store);

const editingMaterial = ref<Material | null>(null);
const isNewMaterial = ref(false);
const newOptionVal = ref('');
const filterType = ref('all');
const nameInput = ref<HTMLInputElement | null>(null);

const handleStartCreate = () => {
  isNewMaterial.value = true;
  editingMaterial.value = {
    id: nanoid(),
    name: '',
    type: 'fixed',
    content: ''
  } as any;
  
  // 自动聚焦
  setTimeout(() => {
    nameInput.value?.focus();
  }, 100);
};

// 监听类型切换，自动补全默认属性
watch(() => editingMaterial.value?.type, (newType) => {
  if (!editingMaterial.value) return;
  const mat = editingMaterial.value as any;
  if (newType === 'fill' && !mat.fillType) {
    mat.fillType = 'text';
  }
  if (newType === 'option' && !mat.options) {
    mat.options = [];
  }
});

const handleStartEdit = (m: Material) => {
  isNewMaterial.value = false;
  // 深度克隆以支持取消操作
  editingMaterial.value = JSON.parse(JSON.stringify(m));
};

const cancelEdit = () => {
  editingMaterial.value = null;
  newOptionVal.value = '';
};

const confirmEdit = () => {
  if (!editingMaterial.value || !editingMaterial.value.name.trim()) return;
  
  if (isNewMaterial.value) {
    currentProject.value?.materials.push(editingMaterial.value);
  } else {
    const idx = currentProject.value?.materials.findIndex(m => m.id === editingMaterial.value?.id);
    if (idx !== undefined && idx !== -1 && currentProject.value) {
      currentProject.value.materials[idx] = editingMaterial.value;
    }
  }
  cancelEdit();
};

const filteredMaterials = computed(() => {
  if (!currentProject.value) return [];
  if (filterType.value === 'all') return currentProject.value.materials;
  return currentProject.value.materials.filter(m => m.type === filterType.value);
});

onMounted(async () => {
  await store.selectProject(props.id);
});

const addOption = (m: any) => {
  if (!newOptionVal.value.trim()) return;
  if (!m.options) m.options = [];
  m.options.push({ id: nanoid(), value: newOptionVal.value.trim(), label: newOptionVal.value.trim() });
  newOptionVal.value = '';
};

const removeOption = (m: any, idx: number) => {
  m.options.splice(idx, 1);
};

const save = async () => {
  if (currentProject.value) {
    await store.updateProject(currentProject.value);
    (window as any).utoolsUtils.showNotification('设置已保存');
  }
};

const cloneMaterial = (m: Material): LayoutItem => {
  return {
    id: nanoid(),
    materialId: m.id,
    children: [],
    showNumbering: true,
    numberingStyle: '1.'
  };
};

const removeItem = (id: string) => {
  if (!currentProject.value) return;
  const filter = (items: LayoutItem[]): LayoutItem[] => {
    return items.filter(i => i.id !== id).map(i => ({
      ...i,
      children: filter(i.children)
    }));
  };
  currentProject.value.layout = filter(currentProject.value.layout);
};




</script>

<style scoped>
.editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

/* --- Unified Header Style --- */
.editor-header {
  height: 48px; /* Compact but professional */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: white;
  border-bottom: 1.5px solid #f1f5f9;
  z-index: 1000;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-back {
  width: 32px;
  height: 32px;
  background: #f8fafc;
  border: 1.2px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.header-divider {
    width: 1px;
    height: 18px;
    background: #e2e8f0;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.project-name {
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mode-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.mode-badge.editor { background: #eef2ff; color: #4f46e5; border: 1px solid #e0e7ff; }
.mode-badge.generate { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }

.header-right {
  display: flex;
  gap: 8px;
}

.btn-primary {
  background: #4f46e5;
  color: white;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.btn-secondary {
  background: white;
  border: 1.2px solid #e2e8f0;
  padding: 6px 14px;
  font-size: 12px;
  color: #64748b;
  border-radius: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }
.btn-primary:hover { background: #4338ca; transform: translateY(-1px); }


.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 8px;
  gap: 8px;
}

/* Material Sidebar: Locked at 150px */
.material-sidebar {
  width: 150px;
  min-width: 150px;
  max-width: 150px;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  flex-shrink: 0;
  overflow: hidden;
}

/* Center: Layout Area */
.layout-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.canvas {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Header stays top */
}

.canvas-header {
  padding: 10px 16px;
  background: white;
  border-bottom: 1.5px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title h3 {
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.layout-empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    color: #94a3b8;
}

.empty-icon {
    font-size: 40px;
    margin-bottom: 12px;
}

.empty-box p {
    font-size: 14px;
    font-weight: 800;
    color: #475569;
    margin-bottom: 4px;
}

.sub-hint {
    font-size: 11px;
    font-weight: 600;
}


/* Center: Layout Area */
.layout-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.canvas {
  flex: 1;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-viewport {
    flex: 1;
    overflow: auto;
    background: #fdfdfd;
    background-image: radial-gradient(#cbd5e1 1.5px, transparent 0);
    background-size: 32px 32px;
}


.layout-list {
  padding: 20px;
  min-width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0; /* Totally zero vertical gap between root nodes */
  width: max-content;
}





.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  margin-bottom: 14px;
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

.section-title {
  font-size: 11px;
  font-weight: 800;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.add-btn-minimal {
    width: 20px;
    height: 20px;
    background: #f1f5f9;
    color: #4f46e5;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.add-btn-minimal:hover {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
    transform: scale(1.1);
}

.filter-box {
  margin-bottom: 16px;
  padding: 0 8px;
}

.filter-inner {
    position: relative;
    display: flex;
    align-items: center;
}

.premium-filter {
    width: 100%;
    height: 30px;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    border: 1.2px solid #e2e8f0;
    border-radius: 8px;
    padding: 0 8px;
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    cursor: pointer;
    transition: all 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 8px top 50%;
    background-size: 8px auto;
}

.premium-filter.is-filtered {
    padding-right: 24px;
    border-color: #6366f1;
    background-position: right 22px top 50%; /* Shift arrow left when X shows */
}

.filter-clear {
    position: absolute;
    right: 6px;
    width: 16px;
    height: 16px;
    background: #eef2ff;
    color: #6366f1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.filter-clear:hover {
    background: #4f46e5;
    color: white;
}


.premium-filter:hover {
    border-color: #cbd5e1;
}

.premium-filter:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

/* Scrollable lists to fit in 500px height */
.material-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 12px 8px; /* Added internal padding */
  min-height: 120px;
  margin-bottom: 8px;
}

/* 隐藏滚动条但保留功能 */
.material-list::-webkit-scrollbar { width: 4px; }
.material-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

/* Material Items: Compact */
.material-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: #fff;
  border: 1.5px solid #f1f5f9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  gap: 6px;
  margin-bottom: 4px;
}

.material-item:hover {
  border-color: #e2e8f0;
  background: #f8fafc;
  transform: translateX(2px);
}

.material-item.active {
    border-color: var(--primary);
    background: #eff6ff;
}

.m-icon {
    display: flex;
    align-items: center;
    color: #94a3b8;
}

.m-name {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.material-item.fixed { border-left: 3px solid #64748b; }
.material-item.option { border-left: 3px solid #10b981; }
.material-item.fill { border-left: 3px solid #3b82f6; }

.del-small {
  position: absolute;
  right: 8px;
  background: transparent;
  color: #cbd5e1;
  padding: 4px;
  opacity: 0;
}

.material-item:hover .del-small {
  opacity: 1;
}

.del-small:hover {
    color: #ef4444;
}

/* 隐藏侧边栏原本的属性编辑器 */
.material-props {
    display: none;
}




/* --- Unified Modal System --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.modal-content {
    background: white;
    width: 100%;
    max-width: 400px;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    animation: modal-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.modal-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f1f5f9;
}

.modal-header h3 {
    font-size: 16px;
    font-weight: 800;
    color: #1e293b;
    margin: 0;
}

.close-btn {
    background: transparent;
    color: #94a3b8;
    padding: 4px;
    display: flex;
}

.close-btn:hover { color: #1e293b; }

.modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 6px;
    text-transform: uppercase;
}

.form-group input, .form-group select, .form-group textarea {
    width: 100%;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    background: #f8fafc;
    transition: all 0.2s;
}

.form-group input:focus {
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Option Manager Style Improve */
.option-manager-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 8px;
}

.opt-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
}

.opt-edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
}

.opt-edit-row input {
    border: none !important;
    padding: 0 !important;
    background: transparent !important;
    font-weight: 600;
}

.opt-add-zone {
    display: flex;
    gap: 6px;
}

.add-opt-btn {
    width: 32px;
    height: 32px;
    background: #6366f1;
    color: white;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.btn-cancel {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 700;
    color: #64748b;
    background: #f1f5f9;
    border-radius: 8px;
}

.btn-confirm {
    padding: 8px 24px;
    font-size: 13px;
    font-weight: 700;
    color: white;
    background: #4f46e5;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
}
</style>
