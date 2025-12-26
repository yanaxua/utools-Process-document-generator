import type { Project, LayoutItem, FixedMaterial, FillMaterial } from '../types/project';
import { addDays, format } from 'date-fns';

export interface GenerationState {
  selectedOptions: Record<string, string[]>; // materialId -> picked values
  fillValues: Record<string, string>; // instanceKey -> string (instanceKey is path or materialId)
}

/**
 * 核心生成函数：
 * 1. 顶层 LayoutItem 之间按换行符连接。
 * 2. 嵌套关系生成笛卡尔积组合。
 */
export function generateText(project: Project, state: GenerationState): string {
  let finalLines = project.layout
    .map(item => processLayoutItem(item, project, state).join('\n'))
    .filter(s => s.length > 0)
    .join('\n');

  // 2. Second Pass: Variable Substitution {{varName}}
  // We collect all available values from the state to build a global variable map
  const varMap: Record<string, string> = {};
  
  // Fill values by material varName
  project.materials.forEach(m => {
      const val = state.fillValues[m.id]; // We'll simplify state to use materialId where possible for sync
      if (m.varName && val !== undefined) {
          varMap[m.varName] = val;
      }
      // Also support name-based matching if varName is empty
      if (m.name && val !== undefined && !varMap[m.name]) {
          varMap[m.name] = val;
      }
  });

  // Perform replacement
  return finalLines.replace(/\{\{(.*?)\}\}/g, (match, key) => {
      const k = key.trim();
      return varMap[k] !== undefined ? varMap[k] : match;
  });
}


function processLayoutItem(item: LayoutItem, project: Project, state: GenerationState): string[] {
  const material = project.materials.find(m => m.id === item.materialId);
  if (!material) return [];

  // 1. Get current item's base values
  let currentValues: string[] = [];
  
  if (material.type === 'fixed') {
    currentValues = [(material as FixedMaterial).content];
  } else if (material.type === 'fill') {
    // Priority: 
    // 1. Instance-specific value (item.id)
    // 2. Material-specific value (material.id) for sync/global
    const val = state.fillValues[item.id] || state.fillValues[material.id] || (material as FillMaterial).defaultValue || '';
    currentValues = [val];
  } else if (material.type === 'option') {
    currentValues = state.selectedOptions[material.id] || [];
  }



  if (currentValues.length === 0) return [];

  // 2. If no children, return current values with numbering if enabled
  if (item.children.length === 0) {
    return applyNumbering(item, currentValues);
  }

  // 3. Recursive processing
  // Collect all results from children
  const childrenResults = item.children
    .map(child => processLayoutItem(child, project, state))
    .filter(res => res.length > 0);

  if (childrenResults.length === 0) {
    // If no children produced results, just return current values
    return applyNumbering(item, currentValues);
  }

  let allCombinations: string[] = [];
  const childCombinations = cartesianProduct(childrenResults);

  for (const val of currentValues) {
    for (const combo of childCombinations) {
      allCombinations.push(`${val}${combo.join('')}`.trim());
    }
  }

  // 4. Apply numbering to the FINAL combined results of this level
  return applyNumbering(item, allCombinations);
}

function applyNumbering(item: LayoutItem, results: string[]): string[] {
  if (!item.showNumbering || results.length <= 1) return results;
  
  const style = item.numberingStyle || '1.';
  return results.map((val, idx) => {
    const num = (idx + 1).toString();
    const prefix = style.replace('1', num);
    return `${prefix} ${val}`;
  });
}

/**
 * 计算多个数组之间的笛卡尔积
 * @param arrays 二阶数组，如 [['a','b'], ['1','2']]
 * @returns [['a','1'], ['a','2'], ['b','1'], ['b','2']]
 */
function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]] as string[][]);
}

export function getDefaultState(project: Project): GenerationState {
  const state: GenerationState = { selectedOptions: {}, fillValues: {} };
  
  const scan = (layoutItems: LayoutItem[]) => {
    layoutItems.forEach(item => {
      const m = project.materials.find(mat => mat.id === item.materialId);
      if (!m) return;

      if (m.type === 'fill') {
        const fill = m as FillMaterial;
        if (fill.fillType === 'date' && !fill.defaultValue) {
          state.fillValues[item.id] = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        } else {
          state.fillValues[item.id] = fill.defaultValue || '';
        }
      } else if (m.type === 'option') {
        if (!state.selectedOptions[m.id]) {
            state.selectedOptions[m.id] = [];
        }
      }
      
      if (item.children) scan(item.children);
    });
  };

  scan(project.layout);
  return state;
}

