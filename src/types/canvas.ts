import { ComponentNode } from './component';

/**
 * 画布状态
 */
export interface CanvasState {
  scale: number;
  offset: Position;
  gridSize: number;
  showGrid: boolean;
  showRuler: boolean;
  snapToGrid: boolean;
  selectedIds: string[];
  hoveredId?: string;
  // 画布样式设置
  canvasStyle: CanvasStyle;
}

/**
 * 画布样式设置
 */
export interface CanvasStyle {
  // 画布尺寸
  width: number;
  height: number;
  // 背景设置
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: 'cover' | 'contain' | 'auto';
  backgroundPosition: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right';
  backgroundRepeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
}

/**
 * 位置信息
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 辅助线
 */
export interface GuideLine {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  show: boolean;
}

/**
 * 对齐参考线
 */
export interface AlignmentLine {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  difference: number;
}

/**
 * 选中框信息
 */
export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 复制粘贴数据
 */
export interface ClipboardData {
  type: 'components';
  components: ComponentNode[];
  timestamp: number;
}

/**
 * 预览设备
 */
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

/**
 * 预览设备配置
 */
export interface DeviceConfig {
  key: PreviewDevice;
  name: string;
  width: number;
  height: number;
  icon: string;
}
