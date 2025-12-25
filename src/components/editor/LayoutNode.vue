<template>
  <div class="mind-node-wrap">
    <!-- Top Sort Sensor (Trigger for inserting ABOVE this node) -->
    <div 
      class="drop-sensor top-sensor" 
      :class="{ 'is-active': dragOverPos === 'top', 'is-dragging-now': store.draggingItem }"
      @dragover.prevent="onDragOver('top')" 
      @dragleave="onDragLeave" 
      @drop="onDropSort('top')"
    >
      <div v-if="dragOverPos === 'top'" class="ghost-sort-preview">
          <div class="ghost-card-mini">{{ store.draggingItem?.name || '此处排序' }}</div>
      </div>
    </div>

    <div class="mind-node-item">
      <!-- Main Row: The Card and the Branch Out line -->
      <div class="node-bus-row">
        <div 
          class="node-card drag-handle" 
          :class="{ 
            'is-nesting': dragOverPos === 'nest', 
            'is-dragging': store.draggingItem?.id === node.id 
          }"
          draggable="true"
          @dragstart="onDragStart"
          @dragend="onDragEnd"
          @dragover.prevent.stop="onDragOver('nest')"
          @dragleave="onDragLeave"
          @drop.stop="onDropNest"
          @dblclick="onEdit"
        >
          <div class="node-inner">
            <span class="type-tag" :class="material?.type">{{ getTypeLabel(material?.type) }}</span>
            <div class="name-text" :title="material?.name">{{ material?.name || '未知素材' }}</div>
          </div>
          
          <!-- Actions: Placed inside node-card for inheritance-based hover -->
          <div class="node-actions">
            <button class="act-btn" :class="{active: node.showNumbering}" @click.stop="toggleNumbering" title="序号">
              <lucide-list-ordered :size="10" />
            </button>
            <button v-if="node.showNumbering" class="act-btn style-txt" @click.stop="cycleStyle">
              {{ node.numberingStyle }}
            </button>
            <button class="act-btn del" @click.stop="$emit('remove')">
              <lucide-trash-2 :size="10" />
            </button>
          </div>
        </div>

        <!-- The line that goes from THIS node to its children -->
        <div v-if="safeChildren.length > 0 || dragOverPos === 'nest'" class="line-to-children"></div>
      </div>

      <!-- Recursive Children -->
      <div v-if="safeChildren.length > 0 || dragOverPos === 'nest'" class="children-block" :class="{ 'has-multi': (safeChildren.length + (dragOverPos === 'nest' ? 1 : 0)) > 1 }">
          <LayoutNode 
            v-for="child in safeChildren" 
            :key="child.id"
            :node="child" 
            :project="project" 
            :parent-array="safeChildren"
            @remove="removeChild(child.id)" 
          />
          
          <!-- Nesting Preview -->
          <div v-if="dragOverPos === 'nest'" class="ghost-node">
            <span class="ghost-name">{{ store.draggingItem?.name }}</span>
          </div>
      </div>
    </div>

    <!-- Bottom Sensor (Only for last in array) -->
    <div 
      v-if="isLast"
      class="drop-sensor bottom-sensor" 
      :class="{ 'is-active': dragOverPos === 'bottom', 'is-dragging-now': store.draggingItem }"
      @dragover.prevent="onDragOver('bottom')" 
      @dragleave="onDragLeave" 
      @drop="onDropSort('bottom')"
    >
      <div v-if="dragOverPos === 'bottom'" class="ghost-sort-preview">
          <div class="ghost-card-mini">{{ store.draggingItem?.name || '此处排序' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Trash2 as LucideTrash2, ListOrdered as LucideListOrdered } from 'lucide-vue-next';
import { useProjectStore } from '../../store/projectStore';
import { nanoid } from 'nanoid';
import type { Project, LayoutItem } from '../../types/project';

const props = defineProps<{
  node: LayoutItem;
  project: Project;
  parentArray: LayoutItem[];
}>();

defineOptions({ name: 'LayoutNode' });
const emit = defineEmits(['remove']);
const store = useProjectStore();
const dragOverPos = ref<'top' | 'bottom' | 'nest' | null>(null);

const material = computed(() => {
  return props.project.materials.find(m => m.id === props.node.materialId);
});

const isLast = computed(() => props.parentArray.indexOf(props.node) === props.parentArray.length - 1);
const safeChildren = computed(() => props.node.children || []);

const getTypeLabel = (type?: string) => {
  switch(type) {
    case 'fixed': return '固定';
    case 'option': return '选项';
    case 'fill': return '填空';
    default: return '??';
  }
};

const onDragStart = (e: DragEvent) => { 
    store.draggingItem = props.node;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', props.node.id);
    }
};

const onDragEnd = () => {
    resetDrag();
};

// Circular dependency check: is target node a descendant of dragged node?
const isDescendant = (parent: LayoutItem, targetId: string): boolean => {
    if (!parent.children) return false;
    if (parent.children.some(c => c.id === targetId)) return true;
    return parent.children.some(c => isDescendant(c, targetId));
};

const onDragOver = (pos: 'top' | 'bottom' | 'nest') => {
  if (!store.draggingItem) return;
  
  // 1. Cannot drop on self
  if (store.draggingItem.id === props.node.id) return;
  
  // 2. Cannot drop parent into its own children (Circular reference)
  // Only check if dragging an existing layout item
  if (store.draggingItem.materialId !== undefined) {
      if (isDescendant(store.draggingItem, props.node.id)) return;
  }
  
  dragOverPos.value = pos;
};


const onDragLeave = () => { dragOverPos.value = null; };

const createNewItem = (dragged: any): LayoutItem => {
  if (dragged.materialId !== undefined) return JSON.parse(JSON.stringify(dragged));
  return { id: nanoid(), materialId: dragged.id, children: [], showNumbering: true, numberingStyle: '1.' };
};

const removeGlobally = (id: string) => {
  const scan = (items: LayoutItem[]) => {
    const idx = items.findIndex(i => i.id === id);
    if (idx > -1) { items.splice(idx, 1); return true; }
    for (const item of items) {
      if (item.children && scan(item.children)) return true;
    }
    return false;
  };
  scan(props.project.layout);
};

const onDropNest = (e: DragEvent) => {
  const dragged = store.draggingItem;
  if (!dragged || dragged.id === props.node.id) return;
  
  // Final safety check
  if (dragged.materialId !== undefined && isDescendant(dragged, props.node.id)) {
      resetDrag();
      return;
  }

  const newItem = createNewItem(dragged);
  if (dragged.materialId !== undefined) removeGlobally(dragged.id);
  
  if (!props.node.children) props.node.children = [];
  props.node.children.push(newItem);
  resetDrag();
  e.stopPropagation();
};

const onDropSort = (pos: 'top' | 'bottom') => {
  const dragged = store.draggingItem;
  if (!dragged || dragged.id === props.node.id) return;

  // Final safety check
  if (dragged.materialId !== undefined && isDescendant(dragged, props.node.id)) {
      resetDrag();
      return;
  }

  const newItem = createNewItem(dragged);
  if (dragged.materialId !== undefined) removeGlobally(dragged.id);
  
  const idx = props.parentArray.findIndex(i => i.id === props.node.id);
  const targetIdx = pos === 'top' ? idx : idx + 1;
  props.parentArray.splice(targetIdx, 0, newItem);
  resetDrag();
};


const resetDrag = () => {
  dragOverPos.value = null;
  store.draggingItem = null;
};

const removeChild = (id: string) => {
  const idx = props.node.children.findIndex(c => c.id === id);
  if (idx > -1) props.node.children.splice(idx, 1);
};

const toggleNumbering = () => { props.node.showNumbering = !props.node.showNumbering; };
const cycleStyle = () => {
    const s = ['1.', '(1)', '1)'] as const;
    const idx = s.indexOf(props.node.numberingStyle as any || '1.');
    props.node.numberingStyle = s[(idx + 1) % s.length];
};

const onEdit = () => {};

</script>

<style scoped>
/* REFINED CORE - 4PX VERTICAL BREATHING SPACE */
.mind-node-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  margin-bottom: 4px; /* The breathing gap */
}

.mind-node-wrap:last-child {
  margin-bottom: 0; /* FIX 1: Prevent vertical accumulation and line overflow */
}


.mind-node-item {
  display: flex;
  align-items: flex-start;
}

.node-bus-row {
  height: 44px; /* Total row height (Card 40px + some room) */
  display: flex;
  align-items: center;
  position: relative;
  z-index: 10;
}

.node-card {
  width: 100px;
  height: 40px; /* Card stays compact */
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 6px;
  transition: all 0.2s;
  cursor: grab;
}


.node-card.is-dragging {
    opacity: 0.4;
    border-style: dashed;
}

.node-card.is-nesting {
  border-color: #4f46e5;
  background: #f5f3ff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.node-inner { display: flex; flex-direction: column; }

.type-tag {
  font-size: 7px;
  font-weight: 800;
  padding: 0 3px;
  border-radius: 2px;
  width: fit-content;
  margin-bottom: 2px;
}
.type-tag.fixed { background: #f1f5f9; color: #64748b; }
.type-tag.option { background: #ecfdf5; color: #059669; }
.type-tag.fill { background: #eff6ff; color: #2563eb; }

.name-text {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* THE LINE SYSTEM - ALIGNED TO 22PX CENTER */
.line-to-children {
  width: 16px;
  height: 2px;
  background: #cbd5e1;
}

.children-block {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Entrance lines ALIGNED TO 22PX */
.children-block > * :deep(.node-bus-row)::before, 
.ghost-node::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 22px; /* New Center Axis */
  width: 16px;
  height: 2px;
  background: #cbd5e1;
}

/* Vertical trunk line ALIGNED TO 22PX start/end */
.children-block.has-multi::after {
  content: '';
  position: absolute;
  left: -16px;
  top: 22px;
  bottom: 22px;
  width: 2px;
  background: #cbd5e1;
}


/* THE DROP SENSORS - DYNAMIC INTERACTION */
.drop-sensor {
  position: absolute;
  left: 0;
  width: 100px;
  height: 20px;
  z-index: 100;
  background: transparent;
  /* FIX 2: Only intercept mouse when actually dragging */
  pointer-events: none;
}

/* Enable sensors ONLY during drag to avoid blocking hover buttons */
.drop-sensor.is-dragging-now {
    pointer-events: auto;
}


.top-sensor { top: -10px; }
.bottom-sensor { bottom: -10px; }

/* PROJECTIONS */
.ghost-sort-preview {
  position: absolute;
  left: 0;
  width: 100px;
  height: 40px;
  pointer-events: none;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -22px; 
}

.top-sensor > .ghost-sort-preview { top: 0; }
.bottom-sensor > .ghost-sort-preview { top: 100%; }

.ghost-card-mini {
  width: 100%;
  height: 100%;
  border: 1.5px dashed #4f46e5;
  background: rgba(79, 70, 229, 0.08);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #4f46e5;
  font-weight: 800;
  backdrop-filter: blur(2px);
}

.ghost-node {
  width: 100px;
  height: 40px;
  border: 1.5px dashed #4f46e5;
  background: rgba(79, 70, 229, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-bottom: 4px; /* Match node spacing */
}


.ghost-name { font-size: 9px; color: #4f46e5; font-weight: 800; }

.remove-x {
  position: absolute;
  top: -6px; right: -6px;
  width: 16px; height: 16px;
  background: white; border: 1px solid #fee2e2;
  color: #ef4444; border-radius: 50%; opacity: 0;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s;
}
.node-card:hover .remove-x { opacity: 1; }

/* Actions: Placed inside node-card for inheritance-based hover */
.node-actions {
  position: absolute;
  top: -10px;
  right: -4px;
  display: none;
  gap: 3px;
  z-index: 120; /* HIGH: Must be above sensors when visible */
}

.node-card:hover .node-actions {
  display: flex;
}

.act-btn {
  width: 20px;
  height: 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.1s;
}
.act-btn:hover { border-color: #cbd5e1; color: #1e293b; transform: scale(1.1); }
.act-btn.active { background: #4f46e5; color: white; border-color: #4f46e5; }
.act-btn.del { color: #ef4444; }
.act-btn.style-txt { width: auto; padding: 0 4px; font-size: 8px; font-weight: 800; font-family: monospace; }

</style>
