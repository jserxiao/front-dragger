import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import {
  ComponentNode,
  CanvasState,
  HistoryState,
  ActionType,
  GuideLine,
  CanvasStyle,
} from '@/types';

// 本地存储键名
const STORAGE_KEY = 'front-dragger-state';

// 需要持久化的状态
interface PersistedState {
  components: ComponentNode[];
  canvasStyle: CanvasStyle;
}

// 从本地存储读取状态
const loadFromStorage = (): PersistedState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PersistedState;
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }
  return null;
};

// 保存状态到本地存储
const saveToStorage = (state: PersistedState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// 初始化状态
const savedState = loadFromStorage();
const initialCanvasStyle: CanvasStyle = savedState?.canvasStyle || {
  width: 1920,
  height: 1080,
  backgroundColor: 'transparent',
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

interface EditorState {
  // 组件树
  components: ComponentNode[];

  // 画布状态
  canvas: CanvasState;

  // 辅助线
  guideLines: GuideLine[];

  // 历史记录
  history: HistoryState[];
  historyIndex: number;

  // 剪贴板
  clipboard: ComponentNode[];

  // 拖拽状态
  isDragging: boolean;
  dragOverCanvas: boolean;

  // 拖拽预览信息（用于对齐线计算）
  dragPreview: {
    position: { x: number; y: number } | null;
    size: { width: number; height: number } | null;
    draggingId: string | null;
  };
}

interface EditorActions {
  // 组件操作
  addComponent: (component: ComponentNode, parentId?: string) => void;
  deleteComponents: (ids: string[]) => void;
  updateComponent: (id: string, updates: Partial<ComponentNode>) => void;
  moveComponent: (id: string, position: { x: number; y: number }) => void;
  resizeComponent: (id: string, size: { width: number | string; height: number | string }) => void;
  duplicateComponents: (ids: string[]) => void;
  replaceComponents: (components: ComponentNode[]) => void;

  // 选择操作
  selectComponent: (id: string, multi?: boolean) => void;
  selectComponents: (ids: string[]) => void;
  clearSelection: () => void;
  setHoveredId: (id?: string) => void;

  // 画布操作
  setScale: (scale: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  setCanvasStyle: (style: Partial<import('@/types').CanvasStyle>) => void;

  // 辅助线操作
  addGuideLine: (line: Omit<GuideLine, 'id'>) => void;
  removeGuideLine: (id: string) => void;
  updateGuideLine: (id: string, position: number) => void;

  // 历史记录
  undo: () => void;
  redo: () => void;
  saveHistory: (actionType: ActionType, description: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 剪贴板
  copyComponents: () => void;
  pasteComponents: () => void;
  cutComponents: () => void;

  // 拖拽状态
  setDragging: (isDragging: boolean) => void;
  setDragOverCanvas: (over: boolean) => void;
  setDragPreview: (preview: EditorState['dragPreview']) => void;

  // 清空画布
  clearCanvas: () => void;

  // 导入导出
  loadComponents: (components: ComponentNode[]) => void;
  exportComponents: () => ComponentNode[];
}

const MAX_HISTORY_SIZE = 50;

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set, get) => ({
    // 初始状态 - 从本地存储恢复
    components: savedState?.components || [],
    canvas: {
      scale: 1,
      offset: { x: 0, y: 0 },
      gridSize: 20,
      showGrid: true,
      showRuler: true,
      snapToGrid: true,
      selectedIds: [],
      hoveredId: undefined,
      canvasStyle: initialCanvasStyle,
    },
    guideLines: [],
    history: [{
      id: uuidv4(),
      timestamp: Date.now(),
      actionType: 'init',
      description: '初始状态',
      snapshot: [],
      selectedIds: [],
    }],
    historyIndex: 0,
    clipboard: [],
    isDragging: false,
    dragOverCanvas: false,
    dragPreview: {
      position: null,
      size: null,
      draggingId: null,
    },

    // 组件操作
    addComponent: (component, parentId) => {
      let newComponentName = '';
      set((state) => {
        const newComponent = {
          ...component,
          id: component.id || uuidv4(),
        };
        newComponentName = newComponent.name;

        if (parentId) {
          const addToParent = (components: ComponentNode[]): boolean => {
            for (let i = 0; i < components.length; i++) {
              if (components[i].id === parentId) {
                if (!components[i].children) {
                  components[i].children = [];
                }
                components[i].children.push(newComponent);
                newComponent.parentId = parentId;
                return true;
              }
              if (components[i].children && addToParent(components[i].children)) {
                return true;
              }
            }
            return false;
          };
          addToParent(state.components);
        } else {
          state.components.push(newComponent);
        }

        state.canvas.selectedIds = [newComponent.id];
      });
      get().saveHistory('add', `添加组件: ${newComponentName}`);
    },

    deleteComponents: (ids) => {
      set((state) => {
        const deleteFromTree = (components: ComponentNode[]): ComponentNode[] => {
          return components.filter((c) => {
            if (ids.includes(c.id)) {
              return false;
            }
            if (c.children) {
              c.children = deleteFromTree(c.children);
            }
            return true;
          });
        };

        state.components = deleteFromTree(state.components);
        state.canvas.selectedIds = state.canvas.selectedIds.filter(
          (id) => !ids.includes(id)
        );
      });
      get().saveHistory('delete', `删除 ${ids.length} 个组件`);
    },

    updateComponent: (id, updates) => {
      set((state) => {
        const updateInTree = (components: ComponentNode[]): boolean => {
          for (let i = 0; i < components.length; i++) {
            if (components[i].id === id) {
              Object.assign(components[i], updates);
              return true;
            }
            if (components[i].children && updateInTree(components[i].children)) {
              return true;
            }
          }
          return false;
        };
        updateInTree(state.components);
      });
      get().saveHistory('update', `更新组件属性`);
    },

    moveComponent: (id, position) => {
      set((state) => {
        const findAndMove = (components: ComponentNode[]): boolean => {
          for (let i = 0; i < components.length; i++) {
            if (components[i].id === id) {
              components[i].position = position;
              return true;
            }
            if (components[i].children && findAndMove(components[i].children)) {
              return true;
            }
          }
          return false;
        };
        findAndMove(state.components);
      });
      get().saveHistory('move', '移动组件');
    },

    resizeComponent: (id, size) => {
      set((state) => {
        const findAndResize = (components: ComponentNode[]): boolean => {
          for (let i = 0; i < components.length; i++) {
            if (components[i].id === id) {
              components[i].size = size;
              return true;
            }
            if (components[i].children && findAndResize(components[i].children)) {
              return true;
            }
          }
          return false;
        };
        findAndResize(state.components);
      });
      get().saveHistory('resize', `调整组件大小`);
    },

    duplicateComponents: (ids) => {
      let newCount = 0;
      set((state) => {
        const newComponents: ComponentNode[] = [];

        const duplicateNode = (node: ComponentNode, offset = 20): ComponentNode => {
          const newNode: ComponentNode = {
            ...node,
            id: uuidv4(),
            name: `${node.name} (副本)`,
            position: {
              x: node.position.x + offset,
              y: node.position.y + offset,
            },
            children: node.children?.map((child) => duplicateNode(child, 0)) || [],
          };
          return newNode;
        };

        const findAndDuplicate = (components: ComponentNode[]) => {
          components.forEach((c) => {
            if (ids.includes(c.id)) {
              newComponents.push(duplicateNode(c));
            }
            if (c.children) {
              findAndDuplicate(c.children);
            }
          });
        };

        findAndDuplicate(state.components);
        state.components.push(...newComponents);
        state.canvas.selectedIds = newComponents.map((c) => c.id);
        newCount = newComponents.length;
      });
      get().saveHistory('add', `复制 ${newCount} 个组件`);
    },

    replaceComponents: (components) => {
      set((state) => {
        state.components = components;
        state.canvas.selectedIds = [];
      });
      get().saveHistory('add', '从代码更新组件');
    },

    // 选择操作
    selectComponent: (id, multi = false) => {
      set((state) => {
        if (multi) {
          const index = state.canvas.selectedIds.indexOf(id);
          if (index > -1) {
            state.canvas.selectedIds.splice(index, 1);
          } else {
            state.canvas.selectedIds.push(id);
          }
        } else {
          state.canvas.selectedIds = [id];
        }
      });
    },

    selectComponents: (ids) => {
      set((state) => {
        state.canvas.selectedIds = ids;
      });
    },

    clearSelection: () => {
      set((state) => {
        state.canvas.selectedIds = [];
      });
    },

    setHoveredId: (id) => {
      set((state) => {
        state.canvas.hoveredId = id;
      });
    },

    // 画布操作
    setScale: (scale) => {
      set((state) => {
        state.canvas.scale = Math.max(0.1, Math.min(3, scale));
      });
    },

    setOffset: (offset) => {
      set((state) => {
        state.canvas.offset = offset;
      });
    },

    toggleGrid: () => {
      set((state) => {
        state.canvas.showGrid = !state.canvas.showGrid;
      });
    },

    toggleSnapToGrid: () => {
      set((state) => {
        state.canvas.snapToGrid = !state.canvas.snapToGrid;
      });
    },

    setGridSize: (size) => {
      set((state) => {
        state.canvas.gridSize = size;
      });
    },

    setCanvasStyle: (style) => {
      set((state) => {
        state.canvas.canvasStyle = {
          ...state.canvas.canvasStyle,
          ...style,
        };
      });
    },

    // 辅助线操作
    addGuideLine: (line) => {
      set((state) => {
        state.guideLines.push({
          ...line,
          id: uuidv4(),
        });
      });
    },

    removeGuideLine: (id) => {
      set((state) => {
        state.guideLines = state.guideLines.filter((l) => l.id !== id);
      });
    },

    updateGuideLine: (id, position) => {
      set((state) => {
        const line = state.guideLines.find((l) => l.id === id);
        if (line) {
          line.position = position;
        }
      });
    },

    // 历史记录
    saveHistory: (actionType, description) => {
      set((state) => {
        // 如果不是在最新状态，删除后面的历史
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }

        // 添加新历史记录
        state.history.push({
          id: uuidv4(),
          timestamp: Date.now(),
          actionType,
          description,
          snapshot: JSON.parse(JSON.stringify(state.components)),
          selectedIds: [...state.canvas.selectedIds],
        });

        // 限制历史记录大小
        if (state.history.length > MAX_HISTORY_SIZE) {
          state.history = state.history.slice(-MAX_HISTORY_SIZE);
        }

        state.historyIndex = state.history.length - 1;
      });
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex > 0) {
        set((state) => {
          state.historyIndex = historyIndex - 1;
          const historyState = history[state.historyIndex];
          state.components = JSON.parse(JSON.stringify(historyState.snapshot));
          state.canvas.selectedIds = historyState.selectedIds;
        });
      }
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex < history.length - 1) {
        set((state) => {
          state.historyIndex = historyIndex + 1;
          const historyState = history[state.historyIndex];
          state.components = JSON.parse(JSON.stringify(historyState.snapshot));
          state.canvas.selectedIds = historyState.selectedIds;
        });
      }
    },

    canUndo: () => {
      const { historyIndex } = get();
      return historyIndex > 0;
    },

    canRedo: () => {
      const { historyIndex, history } = get();
      return historyIndex < history.length - 1;
    },

    // 剪贴板
    copyComponents: () => {
      set((state) => {
        const selectedIds = state.canvas.selectedIds;
        const copyFromTree = (components: ComponentNode[]): ComponentNode[] => {
          const result: ComponentNode[] = [];
          components.forEach((c) => {
            if (selectedIds.includes(c.id)) {
              result.push(JSON.parse(JSON.stringify(c)));
            }
            if (c.children) {
              result.push(...copyFromTree(c.children));
            }
          });
          return result;
        };
        state.clipboard = copyFromTree(state.components);
      });
    },

    pasteComponents: () => {
      let pasteCount = 0;
      set((state) => {
        if (state.clipboard.length === 0) return;

        const offset = 20;
        const pasteNode = (node: ComponentNode): ComponentNode => ({
          ...JSON.parse(JSON.stringify(node)),
          id: uuidv4(),
          name: `${node.name} (粘贴)`,
          position: {
            x: node.position.x + offset,
            y: node.position.y + offset,
          },
        });

        const newComponents = state.clipboard.map(pasteNode);
        state.components.push(...newComponents);
        state.canvas.selectedIds = newComponents.map((c) => c.id);
        pasteCount = newComponents.length;
      });
      if (pasteCount > 0) {
        get().saveHistory('add', `粘贴 ${pasteCount} 个组件`);
      }
    },

    cutComponents: () => {
      const { canvas } = get();
      get().copyComponents();
      get().deleteComponents(canvas.selectedIds);
    },

    // 拖拽状态
    setDragging: (isDragging) => {
      set((state) => {
        state.isDragging = isDragging;
      });
    },

    setDragOverCanvas: (over) => {
      set((state) => {
        state.dragOverCanvas = over;
      });
    },

    setDragPreview: (preview) => {
      set((state) => {
        state.dragPreview = preview;
      });
    },

    // 清空画布
    clearCanvas: () => {
      set((state) => {
        state.components = [];
        state.canvas.selectedIds = [];
      });
      get().saveHistory('clear', '清空画布');
    },

    // 导入导出
    loadComponents: (components) => {
      set((state) => {
        state.components = components;
        state.canvas.selectedIds = [];
        state.history = [];
        state.historyIndex = -1;
      });
      get().saveHistory('add', '导入组件');
    },

    exportComponents: () => {
      return JSON.parse(JSON.stringify(get().components));
    },
  }))
);

// 订阅状态变化，自动保存到本地存储（防抖处理）
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

useEditorStore.subscribe((state) => {
  // 清除之前的定时器
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // 延迟保存，避免频繁写入
  saveTimeout = setTimeout(() => {
    saveToStorage({
      components: state.components,
      canvasStyle: state.canvas.canvasStyle,
    });
  }, 500);
});
