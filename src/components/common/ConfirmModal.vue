<template>
  <BaseDialog 
    :show="!!state" 
    :close-on-overlay="true"
    :close-on-esc="true"
    width="400px"
    @close="cancel"
  >
    <template #header>
      <div class="confirm-header-content">
        <div class="warning-icon">
          <lucide-alert-triangle :size="20" />
        </div>
        <h3>{{ state?.title }}</h3>
      </div>
    </template>

    <div class="confirm-body-text">
      <p>{{ state?.message }}</p>
    </div>

    <template #footer>
      <button class="btn-cancel" @click="cancel">取消</button>
      <button class="btn-confirm" @click="confirm">确定执行</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../../store/projectStore';
import { AlertTriangle as LucideAlertTriangle } from 'lucide-vue-next';
import BaseDialog from './BaseDialog.vue';

const store = useProjectStore();
const state = computed(() => store.confirmState);

const cancel = () => {
  if (state.value?.onCancel) state.value.onCancel();
  store.confirmState = null;
};

const confirm = () => {
  if (state.value?.onConfirm) state.value.onConfirm();
  store.confirmState = null;
};
</script>

<style scoped>
.confirm-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.warning-icon {
  width: 36px;
  height: 36px;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-header-content h3 {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.confirm-body-text p {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

.btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.btn-confirm {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #ef4444;
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.btn-confirm:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
}
</style>

