<template>
  <div class="m-popover-info">
    <div class="m-pop-header">
      <span class="m-pop-title">{{ material?.name || '未知素材' }}</span>
    </div>
    <div class="m-pop-body" v-if="material">
      <div v-if="material.varName" class="row">变量标识: <span class="v-tag">{{ material.varName }}</span></div>

      <!-- Fixed Text Type -->
      <template v-if="material.type === 'fixed'">
        <div class="row-label">内容预览:</div>
        <div class="row-preview">{{ (material as any).content }}</div>
        
        <!-- Extracted Variables -->
        <div v-if="extractedVars.length" class="row-label mt-2">涉及变量:</div>
        <div v-if="extractedVars.length" class="pop-chip-list">
          <span v-for="v in extractedVars" :key="v" class="v-chip">{{ v }}</span>
        </div>
      </template>

      <!-- Fill Type -->
      <template v-if="material.type === 'fill'">
        <div class="row-label">默认值:</div>
        <div class="row-preview">{{ (material as any).defaultValue || '(无)' }}</div>
      </template>

      <!-- Option Type -->
      <template v-if="material.type === 'option'">
        <div class="row-label">包含选项:</div>
        <div class="pop-chip-list">
          <span v-for="opt in (material as any).options" :key="opt.id" class="pop-opt-tag">{{ opt.value }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Material } from '../../types/project';

const props = defineProps<{
  material?: Material;
}>();

const extractedVars = computed(() => {
  if (props.material?.type !== 'fixed' || !(props.material as any).content) return [];
  const content = (props.material as any).content;
  const matches = content.matchAll(/\{\{(.*?)\}\}/g);
  return Array.from(new Set(Array.from(matches).map((m: any) => m[1].trim())));
});
</script>

<style scoped>
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
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 6px;
  margin-bottom: 6px;
  display: block;
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

.mt-2 {
  margin-top: 8px;
}

/* Chips for variables */
.pop-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.v-chip {
  background: #eef2ff;
  color: #6366f1;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid #e0e7ff;
}

/* Option Tags */
.pop-opt-tag {
  background: #f0fdf4;
  color: #166534;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #dcfce7;
}
</style>
