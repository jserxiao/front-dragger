import { ReactNode, CSSProperties } from 'react';

/**
 * 组件节点
 */
export interface ComponentNode {
  id: string;
  type: string;
  name: string;
  props: Record<string, any>;
  style: CSSProperties;
  children: ComponentNode[];
  position: Position;
  size: Size;
  // 父级组件 ID
  parentId?: string;
  // 相对于父级的位置（如果有父级）
  relativePosition?: Position;
  // Drawer/Modal 关联的触发组件 ID
  triggerComponentId?: string;
  // 用户自定义属性（通过 JSON 输入）
  extraProps?: Record<string, any>;
}

/**
 * 位置信息
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 尺寸信息
 */
export interface Size {
  width: number | string;
  height: number | string;
}

/**
 * 属性类型
 */
export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'size'
  | 'style'
  | 'event';

/**
 * 属性定义
 */
export interface PropSchema {
  name: string;
  label: string;
  type: PropType;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  required?: boolean;
  group?: string;
}

/**
 * 组件配置
 */
export interface ComponentConfig {
  type: string;
  name: string;
  icon: ReactNode;
  category: ComponentCategory;
  defaultProps: Record<string, any>;
  defaultStyle: CSSProperties;
  propSchema: PropSchema[];
  allowChildren: boolean;
  defaultSize: Size;
  // 是否需要释放在其他组件上（如 Drawer、Modal）
  requiresOverlap?: boolean;
  // 拖拽时的预览尺寸（用于需要特殊预览的组件如 Drawer、Modal）
  dragPreviewSize?: Size;
}

/**
 * 组件分类
 */
export type ComponentCategory = 'basic' | 'layout' | 'form' | 'display' | 'feedback';

/**
 * 组件分类配置
 */
export interface CategoryConfig {
  key: ComponentCategory;
  name: string;
  order: number;
}

/**
 * 拖拽数据
 */
export interface DragData {
  type: 'new' | 'move';
  componentType?: string;
  componentId?: string;
}

/**
 * 导入的组件配置
 */
export interface ImportedComponent {
  name: string;
  path: string;
  config: ComponentConfig;
}
