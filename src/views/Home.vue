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
    name: '示例：线灵系统发版邮件v6',
    description: '演示：发布步骤深度定制，包含动态服务器IP与SQL附件',
    updatedAt: Date.now(),
    materials: [
      // 1. Opening
      { id: 'm_dear', name: '称呼前缀', type: 'fixed', content: 'Dear ' },
      { id: 'opt_receiver', name: '收件人', type: 'option', options: [
          { id: 'r1', value: 'James' },
          { id: 'r2', value: 'Wentao' },
          { id: 'r3', value: 'All' }
      ]},
      { id: 'm_comma', name: '称呼后缀', type: 'fixed', content: ',\n' },

      // Global Options
      { id: 'opt_tenant', name: '发布租户', type: 'option', options: [
          { id: 't1', value: 'DEMO' },
          { id: 't2', value: 'HKMU' },
          { id: 't3', value: 'EL' },
          { id: 't4', value: 'GMITEC' }
      ]},
      { id: 'opt_env', name: '发布环境', type: 'option', options: [
          { id: 'e1', value: 'PROD' },
          { id: 'e2', value: 'UAT' }
      ]},

      // 2. Summary
      { id: 'sum_pre', name: '概览前缀', type: 'fixed', content: '线灵系统-' },
      { id: 'sum_apply', name: '概览动作', type: 'fixed', content: '申请发布' },
      { id: 'sum_env_suf', name: '环境后缀', type: 'fixed', content: '环境，版本 ' },
      { id: 'v_ver', name: '版本号', type: 'fill', fillType: 'text', defaultValue: 'release_1.0.0' },
      { id: 'sum_end', name: '概览结束', type: 'fixed', content: '；' },

      // 3. Transition
      { id: 'trans_1', name: '提交说明', type: 'fixed', content: '\n相关代码已提交，现申请 ' },
      { id: 'v_date', name: '发布日期', type: 'fill', fillType: 'date', varName: 'pub_date', defaultValue: format(new Date(), 'yyyy-MM-dd') },
      { id: 'trans_2', name: '审批申请', type: 'fixed', content: ' 发布，请审批。' },

      // 4. Content
      { id: 'content_title', name: '内容标题', type: 'fixed', content: '\n本次发布内容：\n' },
      { id: 'v_content', name: '发布内容', type: 'fill', fillType: 'text', defaultValue: '1.      上传文件名称过长问题优化' },
      
      // 5. Steps Details
      { id: 'step_header', name: '步骤总标题', type: 'fixed', content: '\n本次发布步骤\n' },
      { id: 'stp_und', name: '连接符', type: 'fixed', content: '_' },
      { id: 'stp_suf', name: '租户后缀', type: 'fixed', content: '本次发布步骤：\n' },
      
      { id: 'stp_srv_lbl', name: '服务器标签', type: 'fixed', content: '服务器：' },
      { id: 'v_srv_ip', name: '服务器IP', type: 'fill', fillType: 'text', defaultValue: '192.168.1.5' },
      
      { id: 'stp_sql_lbl', name: 'SQL步骤', type: 'fixed', content: '\n1) 执行附件SQL: ' },
      { id: 'v_sql', name: 'SQL附件', type: 'fill', fillType: 'text', varName: 'sql_file', defaultValue: '20251128上线_all_release.sql' },
      
      { id: 'stp_jenk_1', name: 'Jenkins步骤前缀', type: 'fixed', content: '；\n2) 执行' },
      { id: 'stp_jenk_2', name: 'Jenkins步骤连接', type: 'fixed', content: '环境的Jenkins任务, tag: ' },
      { id: 'stp_end', name: '步骤结束', type: 'fixed', content: '；' },

      // 6. Footer
      { id: 'footer', name: '邮件落款', type: 'fixed', content: '\nBest Regards\nWentao Yan' }
    ],
    layout: [
      // 1. Opening
      { 
        id: 'l_root_1', materialId: 'm_dear', children: [
          { id: 'l_rec', materialId: 'opt_receiver', children: [
             { id: 'l_com', materialId: 'm_comma', children: [] }
          ]}
        ]
      },

      // 2. Summary
      { 
        id: 'l_sum_pre', materialId: 'sum_pre', children: [
          { 
            id: 'l_sum_tn', materialId: 'opt_tenant', children: [
              { 
                id: 'l_sum_app', materialId: 'sum_apply', children: [
                  { 
                    id: 'l_sum_env', materialId: 'opt_env', children: [
                      { 
                        id: 'l_sum_sf', materialId: 'sum_env_suf', children: [
                          { 
                            id: 'l_sum_ver', materialId: 'v_ver', children: [
                               { id: 'l_sum_end', materialId: 'sum_end', children: [] }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },

      // 3. Transition
      { id: 'l_tr_1', materialId: 'trans_1', children: [
         { id: 'l_tr_d', materialId: 'v_date', children: [
            { id: 'l_tr_2', materialId: 'trans_2', children: [] }
         ]}
      ]},

      // 4. Content
      { id: 'l_ct_1', materialId: 'content_title', children: [
         { id: 'l_ct_v', materialId: 'v_content', children: [] }
      ]},

      // 5. Steps
      { id: 'l_stp_h', materialId: 'step_header', children: [] },
      { 
        id: 'l_stp_env1', materialId: 'opt_env', children: [
          { 
             id: 'l_stp_und', materialId: 'stp_und', children: [
               { 
                 id: 'l_stp_tn', materialId: 'opt_tenant', children: [
                   { 
                     id: 'l_stp_sf', materialId: 'stp_suf', children: [
                        // Server IP Line
                        { 
                          id: 'l_stp_srv', materialId: 'stp_srv_lbl', children: [
                             { id: 'l_stp_rip', materialId: 'v_srv_ip', children: [] }
                          ]
                        },
                        // SQL Line
                        { 
                          id: 'l_stp_sql1', materialId: 'stp_sql_lbl', children: [
                             { id: 'l_stp_sqlv', materialId: 'v_sql', children: [] }
                          ]
                        },
                        // Jenkins Line
                        { 
                          id: 'l_stp_jk1', materialId: 'stp_jenk_1', children: [
                            { 
                              id: 'l_stp_env2', materialId: 'opt_env', children: [
                                { 
                                  id: 'l_stp_jk2', materialId: 'stp_jenk_2', children: [
                                     { 
                                        id: 'l_stp_ver', materialId: 'v_ver', children: [
                                           { id: 'l_stp_end', materialId: 'stp_end', children: [] }
                                        ]
                                     }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                     ]
                   }
                 ]
               }
             ]
          }
        ]
      },

      // 6. Footer
      { id: 'l_ft', materialId: 'footer', children: [] }
    ]
  };
  await store.updateProject(demo);
  (window as any).utoolsUtils.showNotification('深度定制版 v6 已生成');
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

.empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    height: 100%;
    min-height: 300px;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 24px;
    opacity: 0.8;
}

.empty p {
    font-size: 15px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 24px;
}

.mt-4 { margin-top: 16px; }

</style>
