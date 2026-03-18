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

  // 对齐吸附偏移（用于拖拽结束时吸附）
  alignmentSnap: {
    offsetX: number | null;
    offsetY: number | null;
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
  // 父子级关系操作
  setParentComponent: (componentId: string, parentId: string | null, relativePosition?: { x: number; y: number }) => void;
  addChildComponent: (parentId: string, component: ComponentNode) => void;
  getComponentById: (id: string) => ComponentNode | null;
  getAllComponents: () => ComponentNode[];

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
  setAlignmentSnap: (snap: EditorState['alignmentSnap']) => void;

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
    alignmentSnap: {
      offsetX: null,
      offsetY: null,
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
          // 扁平化架构：将子组件直接添加到顶级数组
          const parent = state.components.find(c => c.id === parentId);
          if (parent) {
            newComponent.parentId = parentId;
            // 计算绝对位置：父组件位置 + 相对位置
            if (newComponent.relativePosition) {
              newComponent.position = {
                x: parent.position.x + newComponent.relativePosition.x,
                y: parent.position.y + newComponent.relativePosition.y,
              };
            } else {
              // 如果没有相对位置，默认放在父组件的 (0, 0) 位置
              newComponent.position = { ...parent.position };
              newComponent.relativePosition = { x: 0, y: 0 };
            }
          }
        }

        state.components.push(newComponent);
        state.canvas.selectedIds = [newComponent.id];
      });
      get().saveHistory('add', `添加组件: ${newComponentName}`);
    },

    deleteComponents: (ids) => {
      set((state) => {
        // 扁平化架构：直接从顶级数组过滤
        // 同时删除子组件（如果删除的是父组件）
        const idsToDelete = new Set(ids);
        
        // 找到所有需要删除的子组件
        const addChildIdsToDelete = (parentId: string) => {
          state.components.forEach(c => {
            if (c.parentId === parentId && !idsToDelete.has(c.id)) {
              idsToDelete.add(c.id);
              addChildIdsToDelete(c.id);
            }
          });
        };
        
        ids.forEach(id => addChildIdsToDelete(id));
        
        state.components = state.components.filter(c => !idsToDelete.has(c.id));
        state.canvas.selectedIds = state.canvas.selectedIds.filter(
          (id) => !idsToDelete.has(id)
        );
      });
      get().saveHistory('delete', `删除 ${ids.length} 个组件`);
    },

    updateComponent: (id, updates) => {
      set((state) => {
        const component = state.components.find(c => c.id === id);
        if (component) {
          Object.assign(component, updates);
        }
      });
      get().saveHistory('update', `更新组件属性`);
    },

    moveComponent: (id, position) => {
      set((state) => {
        const component = state.components.find(c => c.id === id);
        if (component) {
          // 更新位置
          component.position = position;
          
          // 如果有父级，同时更新相对位置
          if (component.parentId) {
            const parent = state.components.find(c => c.id === component.parentId);
            if (parent) {
              component.relativePosition = {
                x: position.x - parent.position.x,
                y: position.y - parent.position.y,
              };
            }
          }
        }
      });
      get().saveHistory('move', '移动组件');
    },

    resizeComponent: (id, size) => {
      set((state) => {
        const component = state.components.find(c => c.id === id);
        if (component) {
          component.size = size;
        }
      });
      get().saveHistory('resize', `调整组件大小`);
    },

    // 设置组件的父级
    setParentComponent: (componentId, parentId, relativePosition) => {
      set((state) => {
        // 扁平化架构：直接从顶级数组查找组件
        const targetComponent = state.components.find(c => c.id === componentId);
        
        if (!targetComponent) return;
        
        // 不能将自己设置为自己的子级
        if (componentId === parentId) return;
        
        // 如果 parentId 为 null，解除父级关系
        if (!parentId) {
          // 计算在画布上的绝对位置（使用当前相对位置 + 父组件位置）
          if (targetComponent.parentId) {
            const oldParent = state.components.find(c => c.id === targetComponent.parentId);
            if (oldParent) {
              targetComponent.position = {
                x: (targetComponent.relativePosition?.x || 0) + oldParent.position.x,
                y: (targetComponent.relativePosition?.y || 0) + oldParent.position.y,
              };
            }
          }
          targetComponent.parentId = undefined;
          targetComponent.relativePosition = undefined;
          return;
        }
        
        // 找到新的父级组件
        const newParent = state.components.find(c => c.id === parentId);
        if (!newParent) return;
        
        // 检查是否会形成循环引用（目标组件不能是新父级的祖先）
        const isAncestorOf = (ancestorId: string, descendantId: string): boolean => {
          let currentId: string | undefined = descendantId;
          while (currentId) {
            if (currentId === ancestorId) return true;
            const current = state.components.find(c => c.id === currentId);
            currentId = current?.parentId;
          }
          return false;
        };
        
        if (isAncestorOf(componentId, parentId)) return;
        
        // 设置父级关系
        targetComponent.parentId = parentId;
        targetComponent.relativePosition = relativePosition || { x: 0, y: 0 };
        
        // 计算新的绝对位置
        targetComponent.position = {
          x: newParent.position.x + targetComponent.relativePosition.x,
          y: newParent.position.y + targetComponent.relativePosition.y,
        };
      });
      get().saveHistory('update', '设置组件父级');
    },

    // 为组件添加子级
    addChildComponent: (parentId, component) => {
      const newComponent: ComponentNode = {
        ...component,
        id: component.id || uuidv4(),
        parentId,
        relativePosition: component.relativePosition || { x: 0, y: 0 },
      };
      
      set((state) => {
        const findAndAdd = (components: ComponentNode[]): boolean => {
          for (const comp of components) {
            if (comp.id === parentId) {
              if (!comp.children) {
                comp.children = [];
              }
              comp.children.push(newComponent);
              return true;
            }
            if (comp.children && findAndAdd(comp.children)) {
              return true;
            }
          }
          return false;
        };
        
        findAndAdd(state.components);
        state.canvas.selectedIds = [newComponent.id];
      });
      get().saveHistory('add', `添加子组件: ${newComponent.name}`);
    },

    // 根据 ID 获取组件
    getComponentById: (id) => {
      const state = get();
      return state.components.find(c => c.id === id) || null;
    },

    // 获取所有组件（扁平化列表）
    getAllComponents: () => {
      const state = get();
      return [...state.components];
    },

    duplicateComponents: (ids) => {
      let newCount = 0;
      set((state) => {
        const newComponents: ComponentNode[] = [];
        const idMapping = new Map<string, string>(); // 旧 ID -> 新 ID 的映射

        // 第一遍：复制所有选中的组件，创建 ID 映射
        ids.forEach(id => {
          const node = state.components.find(c => c.id === id);
          if (node) {
            const newId = uuidv4();
            idMapping.set(id, newId);
            
            const newNode: ComponentNode = {
              ...node,
              id: newId,
              name: `${node.name} (副本)`,
              position: {
                x: node.position.x + 20,
                y: node.position.y + 20,
              },
              children: [], // 扁平化架构，children 为空
            };
            newComponents.push(newNode);
          }
        });

        // 第二遍：复制子组件（如果有选中的组件的子组件）
        state.components.forEach(node => {
          if (node.parentId && ids.includes(node.parentId)) {
            // 如果父组件被复制，子组件也需要复制
            const newParentId = idMapping.get(node.parentId);
            if (newParentId) {
              const newId = uuidv4();
              idMapping.set(node.id, newId);
              
              const newNode: ComponentNode = {
                ...node,
                id: newId,
                name: `${node.name} (副本)`,
                position: {
                  x: node.position.x + 20,
                  y: node.position.y + 20,
                },
                parentId: newParentId,
                children: [],
              };
              newComponents.push(newNode);
            }
          }
        });

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

    setAlignmentSnap: (snap) => {
      set((state) => {
        state.alignmentSnap = snap;
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

