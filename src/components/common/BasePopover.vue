<template>
  <div class="popover-wrapper" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <div ref="triggerRef" class="popover-trigger">
      <slot name="trigger"></slot>
    </div>

    <Teleport to="body">
      <Transition name="pop">
        <div 
          v-if="isVisible" 
          ref="popoverRef"
          class="popover-content"
          :style="popoverStyle"
          @mouseenter="clearTimer"
          @mouseleave="handleMouseLeave"
          @click="close"
        >
          <div class="popover-inner">
            <div v-if="title" class="popover-title">{{ title }}</div>
            <slot></slot>
            <div class="popover-arrow" :style="arrowStyle"></div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps<{
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}>();

const isVisible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const popoverStyle = reactive<Record<string, string>>({
  top: '0px',
  left: '0px',
  position: 'fixed',
});
const arrowStyle = reactive<Record<string, string>>({
  left: '50%',
  top: 'auto',
  bottom: '-5px',
});

let timer: any = null;

const handleMouseEnter = () => {
  if (isDragging.value) return;
  clearTimer();
  timer = setTimeout(() => {
    isVisible.value = true;
    nextTick(updatePosition);
  }, props.delay || 100);
};

const handleMouseLeave = () => {
  clearTimer();
  timer = setTimeout(() => {
    isVisible.value = false;
  }, 150);
};

const close = () => {
  isVisible.value = false;
  clearTimer();
};

const clearTimer = () => {
  if (timer) clearTimeout(timer);
};

const isDragging = ref(false);
const handleGlobalDragStart = () => {
  isDragging.value = true;
  close();
};
const handleGlobalDragEnd = () => {
  isDragging.value = false;
};

onMounted(() => {
  window.addEventListener('dragstart', handleGlobalDragStart, true);
  window.addEventListener('dragend', handleGlobalDragEnd, true);
});

onUnmounted(() => {
  clearTimer();
  window.removeEventListener('dragstart', handleGlobalDragStart, true);
  window.removeEventListener('dragend', handleGlobalDragEnd, true);
});

const updatePosition = () => {
  if (!triggerRef.value || !popoverRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const popoverRect = popoverRef.value.getBoundingClientRect();
  const pos = props.position || 'top';
  
  let top = 0;
  let left = 0;

  if (pos === 'top') {
    top = triggerRect.top - popoverRect.height - 10;
    left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);
    arrowStyle.left = '50%';
    arrowStyle.top = 'auto';
    arrowStyle.bottom = '-5px';
    arrowStyle.transform = 'translateX(-50%) rotate(45deg)';
  } else if (pos === 'bottom') {
    top = triggerRect.bottom + 10;
    left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);
    arrowStyle.left = '50%';
    arrowStyle.bottom = 'auto';
    arrowStyle.top = '-5px';
    arrowStyle.transform = 'translateX(-50%) rotate(45deg)';
  } else if (pos === 'right') {
    top = triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2);
    left = triggerRect.right + 10;
    arrowStyle.left = '-5px';
    arrowStyle.top = '50%';
    arrowStyle.bottom = 'auto';
    arrowStyle.transform = 'translateY(-50%) rotate(45deg)';
  }

  // Prevent overflow
  const margin = 10;
  if (left < margin) left = margin;
  if (left + popoverRect.width > window.innerWidth - margin) {
    left = window.innerWidth - popoverRect.width - margin;
  }

  popoverStyle.top = `${top}px`;
  popoverStyle.left = `${left}px`;
};

onUnmounted(clearTimer);
</script>

<style scoped>
.popover-wrapper {
  display: inline-block;
}

.popover-content {
  z-index: 11000;
  pointer-events: none;
}

.popover-inner {
  pointer-events: auto;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f5f9;
  padding: 12px;
  position: relative;
  min-width: 150px;
  max-width: 280px;
}

.popover-title {
  font-size: 12px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.popover-arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border-left: 1px solid #f1f5f9;
  border-top: 1px solid #f1f5f9;
}

.pop-enter-active, .pop-leave-active {
  transition: opacity 0.15s ease;
}
.pop-enter-from, .pop-leave-to {
  opacity: 0;
}
</style>
