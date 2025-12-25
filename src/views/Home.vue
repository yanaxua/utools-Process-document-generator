<template>
  <div class="home-page">
    <header class="header">
      <div class="logo">
        <span class="icon">🚀</span>
        <h1>发布文档生成器</h1>
      </div>
      <div class="actions">
        <button class="btn-demo" @click="createDemoProject">
          <lucide-sparkles :size="18" />
          示例项目
        </button>
        <button class="btn-primary" @click="showCreateDialog = true">
          <lucide-plus :size="18" />
          新建项目
        </button>
        <button class="btn-secondary" @click="importProject">
          <lucide-upload :size="18" />
          导入
        </button>
      </div>
    </header>

    <main class="project-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="projects.length === 0" class="empty">
        <div class="empty-icon">📂</div>
        <p>暂无项目，创建一个开始吧</p>
        <button class="btn-primary mt-4" @click="createDemoProject">点此导入示例模版</button>
      </div>
      <div v-else class="grid">
        <div v-for="p in projects" :key="p.id" class="project-card premium-card animate-scale-in">
          <div class="card-content">
            <h3>{{ p.name }}</h3>
            <p>{{ p.description || '无描述' }}</p>
            <div class="time">更新于: {{ formatDate(p.updatedAt) }}</div>
          </div>
          <div class="card-actions">
            <button @click="router.push(`/generate/${p.id}`)" class="btn-icon text-primary" title="行文">
              <lucide-file-text :size="20" />
            </button>
            <button @click="router.push(`/editor/${p.id}`)" class="btn-icon text-muted" title="编辑">
              <lucide-edit :size="20" />
            </button>
            <button @click="exportProject(p)" class="btn-icon text-muted" title="导出">
              <lucide-download :size="20" />
            </button>
            <button @click="confirmDelete(p)" class="btn-icon text-danger" title="删除">
              <lucide-trash-2 :size="20" />
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Dialog using BaseDialog -->
    <BaseDialog
      :show="showCreateDialog"
      title="✨ 新建配置项目"
      width="400px"
      :show-close="true"
      @close="showCreateDialog = false"
    >
      <div class="modal-intro">
        <p>创建一个新的发版模版配置</p>
      </div>
      
      <div class="prop-form">
        <div class="form-item">
          <label>项目名称</label>
          <div class="input-container">
            <lucide-type :size="16" class="icon" />
            <input v-model="newProjectName" placeholder="例如：新零售线发版邮件" ref="nameInput" />
          </div>
        </div>
        
        <div class="form-item">
          <label>描述信息</label>
          <textarea v-model="newProjectDesc" placeholder="简要描述该项目的使用场景..." rows="3"></textarea>
        </div>
      </div>
      
      <template #footer>
        <button class="btn-ghost" @click="showCreateDialog = false">取消</button>
        <button class="btn-primary" @click="handleCreate" :disabled="!newProjectName">
            立即创建
        </button>
      </template>
    </BaseDialog>

    <!-- Unified Confirm Modal -->
    <ConfirmModal />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../store/projectStore';
import { 
  Plus as LucidePlus, 
  Upload as LucideUpload, 
  Pencil as LucideEdit, 
  FileText as LucideFileText, 
  Trash2 as LucideTrash2, 
  Download as LucideDownload,
  Sparkles as LucideSparkles
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { storeToRefs } from 'pinia';
import type { Project } from '../types/project';
import { nanoid } from 'nanoid';
import BaseDialog from '../components/common/BaseDialog.vue';
import ConfirmModal from '../components/common/ConfirmModal.vue';


const router = useRouter();
const store = useProjectStore();
const { projects, loading } = storeToRefs(store);

const showCreateDialog = ref(false);
const newProjectName = ref('');
const newProjectDesc = ref('');

onMounted(() => {
  store.fetchProjects();
});

const handleCreate = async () => {
  if (!newProjectName.value) return;
  await store.createProject(newProjectName.value, newProjectDesc.value);
  showCreateDialog.value = false;
  newProjectName.value = '';
  newProjectDesc.value = '';
};

const createDemoProject = async () => {
  const demo: Project = {
    id: nanoid(),
    name: '示例：多环境动态配置手册',
    description: '演示：客户 > 环境 > 模块 > 版本 的深度嵌套与动态配置同步',
    updatedAt: Date.now(),
    materials: [
      { id: 'm1', name: '邮件页眉', type: 'fixed', content: '各位好，本日发版任务如下：' },
      { id: 'm2', name: '选择客户', type: 'option', options: [
          { id: 'c1', value: '【字节跳动】' },
          { id: 'c2', value: '【美团点评】' }
      ]},
      { id: 'm3', name: '所属环境', type: 'option', options: [
          { id: 'e1', value: '👉 生产 PROD' },
          { id: 'e2', value: '🧪 预发 STAGE' }
      ]},
      { id: 'm4', name: '具体模块', type: 'option', options: [
          { id: 'a1', value: '核心网关' },
          { id: 'a2', value: '支付服务' },
          { id: 'a3', value: '监控组件' }
      ]},
      { id: 'm5', name: '同步版本号', type: 'fill', fillType: 'text', varName: 'target_ver', defaultValue: 'v2.4.0' },
      { id: 'm6', name: '生效日期', type: 'fill', fillType: 'date', varName: 'pub_date', defaultValue: format(new Date(), 'yyyy-MM-dd') },
      { id: 'm7', name: '责任确认', type: 'fixed', content: '\n以上内容计划于 {{pub_date}} 正式发布，版本号统一为 {{target_ver}}，请各方注意流量切换。' }
    ],
    layout: [
      { id: 'l1', materialId: 'm1', children: [] },
      { 
        id: 'l2', 
        materialId: 'm2', 
        children: [
          { 
            id: 'l3', 
            materialId: 'm3', 
            children: [
              { 
                id: 'l4', 
                materialId: 'm4', 
                children: [
                  { id: 'l5', materialId: 'm5', children: [] }
                ] 
              }
            ] 
          }
        ] 
      },
      { id: 'l6', materialId: 'm6', children: [] },
      { id: 'l7', materialId: 'm7', children: [] }
    ]
  };
  await store.updateProject(demo);
  (window as any).utoolsUtils.showNotification('深度嵌套示例已生成，请进入行文模式体验');
};



const formatDate = (ts: number) => format(ts, 'yyyy-MM-dd HH:mm');

const confirmDelete = (p: any) => {
  store.confirmState = {
    title: '删除项目',
    message: `确定要彻底删除项目 "${p.name}" 吗？此操作无法撤销。`,
    onConfirm: async () => {
      await store.deleteProject(p.id);
      (window as any).utoolsUtils.showNotification('项目已删除');
    }
  };
};

const exportProject = (p: any) => {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${p.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const importProject = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.id && data.name) {
          await store.updateProject(data);
        }
      } catch (err) {
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};
</script>

<style scoped>
.home-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  background: #f8fafc;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo .icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.logo h1 {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.01em;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  font-size: 13px;
  color: #64748b;
  border-radius: 10px;
}

.btn-demo {
  background: #eff6ff;
  color: #2563eb;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.project-card {
  padding: 16px;
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
}

.project-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1);
}

.card-content h3 {
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.card-content p {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
}

.time {
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.btn-icon {
  width: 32px;
  height: 32px;
  background: #f8fafc;
  color: #64748b;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon.text-primary { color: #4f46e5; background: #eef2ff; }
.btn-icon.text-danger { color: #ef4444; background: #fef2f2; }

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.modal {
  width: 360px;
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
    text-align: center;
    margin-bottom: 20px;
}

.title-icon {
    font-size: 32px;
    margin-bottom: 8px;
}

.modal-header h2 {
    font-size: 18px;
    font-weight: 800;
    color: #1e293b;
}

.modal-header p {
    color: #94a3b8;
    font-size: 12px;
}

.form-item {
    margin-bottom: 16px;
}

.form-item label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 6px;
}

.input-container {
    position: relative;
    display: flex; align-items: center;
}

.input-container .icon {
    position: absolute;
    left: 12px;
    color: #cbd5e1;
}

.input-container input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    font-size: 13px;
    border-radius: 10px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
}

textarea {
    width: 100%;
    font-size: 13px;
    border-radius: 10px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    padding: 10px;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
}

.btn-ghost {
    background: transparent;
    color: #94a3b8;
    font-weight: 600;
    padding: 10px 20px;
}

/* Animations */
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.animate-pop-in {
    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
