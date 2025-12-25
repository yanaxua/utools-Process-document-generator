export type MaterialType = 'fixed' | 'option' | 'fill'

export interface MaterialBase {
  id: string;
  name: string;
  type: MaterialType;
  varName?: string; // NEW: used for variable substitution like {{varName}}
  description?: string;
}

export interface FixedMaterial extends MaterialBase {
  type: 'fixed';
  content: string;
}

export interface OptionItem {
  id: string;
  value: string;
  label?: string;
}

export interface OptionMaterial extends MaterialBase {
  type: 'option';
  options: OptionItem[];
}

export interface FillMaterial extends MaterialBase {
  type: 'fill';
  fillType: 'text' | 'date';
  defaultValue: string;
}

export type Material = FixedMaterial | OptionMaterial | FillMaterial;

export interface LayoutItem {
  id: string; // Unique ID for this layout instance
  materialId: string;
  children: LayoutItem[]; // Nested items (for Cartesian product of options)
  showNumbering?: boolean;
  numberingStyle?: '1.' | '1)' | '(1)';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  materials: Material[];
  layout: LayoutItem[];
  updatedAt: number;
}

export interface ProjectDoc {
  _id: string;
  _rev?: string;
  data: Project;
}
