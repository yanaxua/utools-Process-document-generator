<template>
  <Transition name="fade">
    <div v-if="show" class="dialog-overlay" @click.self="handleOverlayClick">
      <div 
        class="dialog-content animate-in" 
        :style="{ maxWidth: width }"
        role="dialog"
        aria-modal="true"
      >
        <!-- Header -->
        <div v-if="title || $slots.header" class="dialog-header">
          <slot name="header">
            <h3>{{ title }}</h3>
          </slot>
          <button v-if="showClose" class="close-btn" @click="close">
            <lucide-x :size="18" />
          </button>
        </div>

        <!-- Body -->
        <div class="dialog-body">
          <slot></slot>
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="dialog-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { X as LucideX } from 'lucide-vue-next';

const props = defineProps<{
  show: boolean;
  title?: string;
  width?: string;
  showClose?: boolean;
  closeOnEsc?: boolean;
  closeOnOverlay?: boolean;
}>();

const emit = defineEmits(['update:show', 'close']);

const close = () => {
  emit('update:show', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay !== false) {
    close();
  }
};

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show && props.closeOnEsc !== false) {
    close();
  }
};

// Use watch to add/remove listener only when shown
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
  } else {
    window.removeEventListener('keydown', handleEsc);
    document.body.style.overflow = '';
  }
}, { immediate: true });

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc);
  document.body.style.overflow = '';
});

</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.dialog-content {
  width: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-header h3 {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.animate-in {
  animation: modalZoomIn 0.2s ease-out;
}

@keyframes modalZoomIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
