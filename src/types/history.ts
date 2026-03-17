import { ComponentNode } from './component';

/**
 * 操作类型
 */
export type ActionType =
  | 'add'
  | 'delete'
  | 'update'
  | 'move'
  | 'resize'
  | 'batch'
  | 'clear';

/**
 * 历史记录状态
 */
export interface HistoryState {
  id: string;
  timestamp: number;
  actionType: ActionType;
  description: string;
  snapshot: ComponentNode[];
  selectedIds: string[];
}

/**
 * 历史记录管理器配置
 */
export interface HistoryManagerConfig {
  maxSize: number;
}

/**
 * 历史记录变更
 */
export interface HistoryChange {
  type: ActionType;
  componentId?: string;
  componentIds?: string[];
  oldValue?: any;
  newValue?: any;
}
