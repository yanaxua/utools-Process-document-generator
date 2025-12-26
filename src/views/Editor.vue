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
            <div class="material-item" :class="[element.type, { 'has-var': element.varName }]" @click="handleStartEdit(element)">
              <lucide-grip-vertical :size="12" class="m-grip" />
              
              <BasePopover position="right" :delay="300">
                <template #trigger>
                  <div class="m-item-content">
                    <span class="m-icon">
                      <lucide-type v-if="element.type === 'fixed' || (element.type === 'fill' && element.fillType === 'text')" :size="13" />
                      <lucide-list v-else-if="element.type === 'option'" :size="13" />
                      <lucide-calendar v-else-if="element.type === 'fill' && element.fillType === 'date'" :size="13" />
                      <span v-if="element.varName" class="var-dot">V</span>
                    </span>
                    <span class="m-name">{{ element.name }}</span>
                  </div>
                </template>
                <MaterialInfoCard :material="element" />
              </BasePopover>

              <button class="del-small" @click.stop="handleRemoveMaterial(element)">
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
            <div class="header-group">
               <span class="header-dot"></span>
               <span class="section-title">排版布局</span>
            </div>
          </div>
          
          <div class="canvas-viewport">
            <div class="layout-list">
                <LayoutNode 
                  v-for="element in currentProject.layout"
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

    <!-- Unified Material Modal using Extracted Component -->
    <MaterialDialog
      v-model="editingMaterial"
      :is-new="isNewMaterial"
      @confirm="handleMaterialConfirm"
    />

    <!-- Unified Confirm Modal -->
    <ConfirmModal />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, provide } from 'vue';
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
  X as LucideX,
  Calendar as LucideCalendar,
  Plus as LucidePlus,
  GripVertical as LucideGripVertical
} from 'lucide-vue-next';
import LayoutNode from '../components/editor/LayoutNode.vue';
import { nanoid } from 'nanoid';
import type { Material, LayoutItem } from '../types/project';
import ConfirmModal from '../components/common/ConfirmModal.vue';
import MaterialDialog from '../components/common/MaterialDialog.vue';
import BasePopover from '../components/common/BasePopover.vue';
import MaterialInfoCard from '../components/common/MaterialInfoCard.vue';




const props = defineProps<{ id: string }>();
const router = useRouter();
const store = useProjectStore();
const { currentProject } = storeToRefs(store);

const editingMaterial = ref<Material | null>(null);
const isNewMaterial = ref(false);
const filterType = ref('all');


const handleStartCreate = () => {
  isNewMaterial.value = true;
  editingMaterial.value = {
    id: nanoid(),
    name: '',
    type: 'fixed',
    content: ''
  } as any;
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

provide('openMaterialEditor', handleStartEdit);

const cancelEdit = () => {
  editingMaterial.value = null;
};

const handleMaterialConfirm = (m: Material) => {
  if (!currentProject.value) return;
  
  if (isNewMaterial.value) {
    currentProject.value.materials.push(m);
  } else {
    const idx = currentProject.value.materials.findIndex(item => item.id === m.id);
    if (idx !== -1) {
      currentProject.value.materials[idx] = m;
    }
  }
  cancelEdit();
};

const filteredMaterials = computed({
  get() {
    if (!currentProject.value) return [];
    if (filterType.value === 'all') return currentProject.value.materials;
    return currentProject.value.materials.filter(m => m.type === filterType.value);
  },
  set(newVal) {
    if (!currentProject.value) return;
    if (filterType.value === 'all') {
      currentProject.value.materials = newVal;
    } else {
      const others = currentProject.value.materials.filter(m => m.type !== filterType.value);
      currentProject.value.materials = [...newVal, ...others];
    }
  }
});

onMounted(async () => {
  await store.selectProject(props.id);
});

const handleRemoveMaterial = (m: Material) => {
    const isUsed = currentProject.value?.layout.some(item => {
        const check = (node: any): boolean => {
            if (node.materialId === m.id) return true;
            if (node.children) return node.children.some(check);
            return false;
        };
        return check(item);
    });

    const msg = isUsed 
        ? `素材“${m.name}”正被布局引用，删除后对应的布局节点也会消失。`
        : `你确定要彻底删除素材“${m.name}”吗？此操作不可撤销。`;

    store.confirmState = {
        title: '删除素材',
        message: msg,
        onConfirm: () => {
            store.removeMaterial(m.id);
            (window as any).utoolsUtils.showNotification('素材已删除');
        }
    };
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
  
  store.confirmState = {
      title: '移除节点',
      message: '确定要从排版中移除此节点吗？相关的子节点也将被一并移除。',
      onConfirm: () => {
          const filter = (items: LayoutItem[]): LayoutItem[] => {
            return items.filter(i => i.id !== id).map(i => ({
              ...i,
              children: i.children ? filter(i.children) : []
            }));
          };
          if (currentProject.value) {
            currentProject.value.layout = filter(currentProject.value.layout);
          }
      }
  };
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
  padding: 0 16px;
  background: white;
  border-bottom: 1.5px solid #f1f5f9;
  height: 36px;
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
  padding: 0 8px;
  height: 36px;
  margin-bottom: 14px;
  border-bottom: 1.5px solid #f1f5f9;
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
  gap: 8px;
  padding: 8px 10px;
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  user-select: none;
  margin-bottom: 4px;
}

.m-grip {
    color: #cbd5e1;
    cursor: grab;
    opacity: 0;
    transition: opacity 0.2s;
}

.material-item:hover .m-grip {
    opacity: 1;
}

.material-item:active {
    cursor: grabbing;
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

/* Popover Custom Styles */
.m-popover-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 180px;
}

.m-pop-header {
    margin-bottom: 4px;
}

.m-pop-title {
    font-size: 13px;
    font-weight: 800;
    color: #1e293b;
}

.m-pop-body .row {
    font-size: 11px;
    color: #64748b;
    margin-bottom: 8px;
}

.row-label {
    font-size: 10px;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    margin-bottom: 4px;
}

.v-tag {
    background: #eef2ff;
    color: #4f46e5;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: monospace;
    font-weight: 800;
}

.row-preview {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    font-size: 11px;
    color: #475569;
    line-height: 1.4;
    white-space: pre-wrap;
}

.pop-opt-full-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 4px;
}

/* Custom Scrollbar for Popover List */
.pop-opt-full-list::-webkit-scrollbar {
  width: 4px;
}
.pop-opt-full-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.pop-opt-full-item {
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 6px;
  padding: 8px;
}

.opt-full-label {
  font-size: 10px;
  font-weight: 800;
  color: #166534;
  text-transform: uppercase;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(22, 101, 52, 0.1);
  padding-bottom: 2px;
}

.opt-full-content {
  font-size: 11px;
  color: #166534;
  line-height: 1.4;
  white-space: pre-wrap;
}


.var-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #6366f1;
    color: white;
    font-size: 8px;
    font-weight: 900;
    width: 12px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1.5px solid white;
}

.m-item-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
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
.var-input-box {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 0 12px;
}
.var-input-box input {
    border: none !important;
    background: transparent !important;
    padding: 8px 4px !important;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: #4f46e5;
}
.var-input-box .prefix, .var-input-box .suffix {
    color: #94a3b8;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
}
.field-hint {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}
</style>

