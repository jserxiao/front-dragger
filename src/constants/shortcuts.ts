/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
}

export const SHORTCUTS: ShortcutConfig[] = [
  // 历史操作
  { key: 'z', ctrl: true, action: 'undo', description: '撤销' },
  { key: 'y', ctrl: true, action: 'redo', description: '重做' },
  { key: 'z', ctrl: true, shift: true, action: 'redo', description: '重做' },

  // 编辑操作
  { key: 'c', ctrl: true, action: 'copy', description: '复制' },
  { key: 'v', ctrl: true, action: 'paste', description: '粘贴' },
  { key: 'x', ctrl: true, action: 'cut', description: '剪切' },
  { key: 'd', ctrl: true, action: 'duplicate', description: '复制并粘贴' },
  { key: 'Delete', action: 'delete', description: '删除' },
  { key: 'Backspace', action: 'delete', description: '删除' },

  // 选择操作
  { key: 'a', ctrl: true, action: 'selectAll', description: '全选' },
  { key: 'Escape', action: 'clearSelection', description: '取消选择' },

  // 文件操作
  { key: 's', ctrl: true, action: 'save', description: '保存' },
  { key: 'e', ctrl: true, shift: true, action: 'export', description: '导出代码' },

  // 视图操作
  { key: '=', ctrl: true, action: 'zoomIn', description: '放大' },
  { key: '-', ctrl: true, action: 'zoomOut', description: '缩小' },
  { key: '0', ctrl: true, action: 'resetZoom', description: '重置缩放' },
];

/**
 * 获取快捷键显示文本
 */
export const getShortcutText = (shortcut: ShortcutConfig): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
};
