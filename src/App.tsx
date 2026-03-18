import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { v4 as uuidv4 } from 'uuid';
import { ConfigProvider, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useEditorStore } from '@/store';
import { ComponentRegistry } from '@/core';
import { ComponentPanel } from '@/components/ComponentPanel';
import { Canvas } from '@/components/Canvas';
import { PropertyPanel } from '@/components/PropertyPanel';
import { CodeEditor } from '@/components/CodeEditor';
import { Toolbar } from '@/components/Toolbar';
import { DragItem } from '@/components/DragItem';
import styles from './App.module.css';

const App: React.FC = () => {
  const { 
    addComponent, 
    setDragging, 
    setDragOverCanvas, 
    canvas, 
    components, 
    setDragPreview, 
    dragPreview,
    alignmentSnap,
    moveComponent,
    setAlignmentSnap,
  } = useEditorStore();

  // 当前拖拽的组件配置
  const [activeConfig, setActiveConfig] = useState<ReturnType<typeof ComponentRegistry.getComponent> | undefined>(undefined);
  const [activeComponent, setActiveComponent] = useState<typeof components[0] | null>(null);
  
  // 鼠标实时位置（屏幕坐标）
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  
  // 拖拽起始位置
  const dragStartPos = useRef({ x: 0, y: 0 });
  const activatorEventRef = useRef<PointerEvent | null>(null);
  
  // 拖拽时鼠标相对于组件左上角的偏移
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    })
  );

  // 计算拖拽位置相对于画布的坐标
  const calculateCanvasPosition = useCallback((clientX: number, clientY: number) => {
    const canvasEl = document.querySelector('[data-canvas="true"]') as HTMLElement;
    if (!canvasEl) return null;

    const canvasRect = canvasEl.getBoundingClientRect();
    
    // 检查是否在画布范围内
    const isOverCanvas =
      clientX >= canvasRect.left &&
      clientX <= canvasRect.right &&
      clientY >= canvasRect.top &&
      clientY <= canvasRect.bottom;

    if (!isOverCanvas) return null;

    // 计算相对于画布的位置
    const x = (clientX - canvasRect.left - canvas.offset.x) / canvas.scale;
    const y = (clientY - canvasRect.top - canvas.offset.y) / canvas.scale;

    return { x: Math.max(0, x), y: Math.max(0, y) };
  }, [canvas]);

  // 拖拽开始
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setDragging(true);
      const activeData = event.active.data.current;
      const startEvent = event.activatorEvent as PointerEvent;
      activatorEventRef.current = startEvent;
      
      // 初始化鼠标位置
      setMousePosition({ x: startEvent.clientX, y: startEvent.clientY });

      // 新建组件拖拽
      if (activeData?.type === 'new') {
        const config = ComponentRegistry.getComponent(activeData.componentType);
        setActiveConfig(config);
        setActiveComponent(null);
        
        // 初始化拖拽预览
        dragStartPos.current = { x: startEvent.clientX, y: startEvent.clientY };
        
        // 设置预览尺寸（位置会在 handleDragMove 中更新）
        if (config) {
          // Drawer/Modal 使用 dragPreviewSize，其他组件使用 defaultSize
          const previewSize = config.requiresOverlap && config.dragPreviewSize 
            ? config.dragPreviewSize 
            : config.defaultSize;
          const width = typeof previewSize.width === 'number' ? previewSize.width : 100;
          const height = typeof previewSize.height === 'number' ? previewSize.height : 40;
          
          // 尝试计算画布坐标，如果鼠标在画布上则设置位置
          const canvasPos = calculateCanvasPosition(startEvent.clientX, startEvent.clientY);
          
          setDragPreview({
            position: canvasPos ? {
              x: canvasPos.x - width / 2,
              y: canvasPos.y - height / 2,
            } : null,
            size: { width, height },
            draggingId: 'new',
          });
        }
      }

      // 移动已有组件
      if (activeData?.type === 'move') {
        const findComponent = (
          comps: typeof components,
          id: string
        ): typeof components[0] | null => {
          for (const comp of comps) {
            if (comp.id === id) return comp;
            if (comp.children) {
              const found = findComponent(comp.children, id);
              if (found) return found;
            }
          }
          return null;
        };
        const component = findComponent(components, activeData.componentId);
        setActiveComponent(component);
        setActiveConfig(undefined);
        
        // 设置拖拽预览
        // 移动已有组件时，计算鼠标相对于组件左上角的偏移
        if (component) {
          const width = typeof component.size.width === 'number' ? component.size.width : 100;
          const height = typeof component.size.height === 'number' ? component.size.height : 40;
          
          // 计算鼠标相对于组件左上角的偏移
          // 获取画布元素用于计算
          const canvasEl = document.querySelector('[data-canvas="true"]') as HTMLElement;
          if (canvasEl) {
            const canvasRect = canvasEl.getBoundingClientRect();
            // 组件在屏幕上的位置
            const compScreenX = canvasRect.left + canvas.offset.x + component.position.x * canvas.scale;
            const compScreenY = canvasRect.top + canvas.offset.y + component.position.y * canvas.scale;
            // 鼠标相对于组件左上角的偏移
            dragOffsetRef.current = {
              x: startEvent.clientX - compScreenX,
              y: startEvent.clientY - compScreenY,
            };
          }
          
          setDragPreview({
            position: { 
              x: component.position.x,
              y: component.position.y,
            },
            size: {
              width,
              height,
            },
            draggingId: component.id,
          });
        }
      }
    },
    [setDragging, components, setDragPreview, calculateCanvasPosition]
  );

  // 拖拽移动中 - 实时更新预览位置
  // 注意：dnd-kit 的 DragMoveEvent 不提供实时鼠标位置
  // 我们通过 pointermove 事件监听器来更新 mousePosition
  // handleDragMove 已不需要，保留空函数以避免警告
  const handleDragMove = useCallback(
    (_event: DragMoveEvent) => {
      // 注意：dnd-kit 的 DragMoveEvent 不提供实时鼠标位置
      // 我们通过 pointermove 事件监听器来更新 mousePosition
      // 这里只处理画布坐标的更新
      
      if (!mousePosition) return;
      
      // 计算画布坐标
      const position = calculateCanvasPosition(mousePosition.x, mousePosition.y);

      if (activeConfig) {
        // 新建组件
        // Drawer/Modal 使用 dragPreviewSize，其他组件使用 defaultSize
        const previewSize = activeConfig.requiresOverlap && activeConfig.dragPreviewSize 
          ? activeConfig.dragPreviewSize 
          : activeConfig.defaultSize;
        const size = {
          width: typeof previewSize.width === 'number' ? previewSize.width : 100,
          height: typeof previewSize.height === 'number' ? previewSize.height : 40,
        };
        
        if (position) {
          // 新建组件：鼠标位置就是组件中心
          setDragPreview({
            position: {
              x: position.x - size.width / 2,
              y: position.y - size.height / 2,
            },
            size,
            draggingId: 'new',
          });
        }
      } else if (activeComponent) {
        // 移动已有组件 - 使用鼠标实时位置和偏移计算
        // 计算画布坐标
        const canvasEl = document.querySelector('[data-canvas="true"]') as HTMLElement;
        if (canvasEl) {
          const canvasRect = canvasEl.getBoundingClientRect();
          
          // 鼠标位置减去偏移，得到组件左上角应该在的屏幕位置
          const compScreenX = mousePosition.x - dragOffsetRef.current.x;
          const compScreenY = mousePosition.y - dragOffsetRef.current.y;
          
          // 转换为画布坐标
          const newX = Math.max(0, (compScreenX - canvasRect.left - canvas.offset.x) / canvas.scale);
          const newY = Math.max(0, (compScreenY - canvasRect.top - canvas.offset.y) / canvas.scale);
          
          const width = typeof activeComponent.size.width === 'number' ? activeComponent.size.width : 100;
          const height = typeof activeComponent.size.height === 'number' ? activeComponent.size.height : 40;
          
          setDragPreview({
            position: { 
              x: newX,
              y: newY,
            },
            size: {
              width,
              height,
            },
            draggingId: activeComponent.id,
          });
        }
      }
    },
    [activeConfig, activeComponent, calculateCanvasPosition, canvas.scale, setDragPreview, mousePosition]
  );

  // 监听鼠标移动事件，实时更新鼠标位置
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (activeConfig || activeComponent) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (activeConfig || activeComponent) {
      window.addEventListener('pointermove', handlePointerMove);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [activeConfig, activeComponent]);

  // 拖拽经过
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      setDragOverCanvas(over?.id === 'canvas');
    },
    [setDragOverCanvas]
  );

  // 查找鼠标位置下方的组件
  const findComponentAtPosition = useCallback((
    x: number,
    y: number,
    comps: typeof components,
    excludeId?: string
  ): typeof components[0] | null => {
    // 从后往前遍历，找到最上层的组件
    for (let i = comps.length - 1; i >= 0; i--) {
      const comp = comps[i];
      if (comp.id === excludeId) continue;
      
      const compWidth = typeof comp.size.width === 'number' ? comp.size.width : 100;
      const compHeight = typeof comp.size.height === 'number' ? comp.size.height : 40;
      
      // 检查点是否在组件范围内
      if (
        x >= comp.position.x &&
        x <= comp.position.x + compWidth &&
        y >= comp.position.y &&
        y <= comp.position.y + compHeight
      ) {
        return comp;
      }
      
      // 检查子组件
      if (comp.children && comp.children.length > 0) {
        const found = findComponentAtPosition(x, y, comp.children, excludeId);
        if (found) return found;
      }
    }
    return null;
  }, [components]);

  // 拖拽结束
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // 保存当前鼠标位置用于计算
      const currentMousePos = mousePosition;

      setDragging(false);
      setDragOverCanvas(false);
      setActiveConfig(undefined);
      setActiveComponent(null);
      setDragPreview({ position: null, size: null, draggingId: null });
      setMousePosition(null);
      activatorEventRef.current = null;
      // 清除对齐吸附状态
      setAlignmentSnap({ offsetX: null, offsetY: null });

      const activeData = active.data.current;

      // 新建组件
      if (activeData?.type === 'new') {
        const componentType = activeData.componentType;
        const config = ComponentRegistry.getComponent(componentType);

        if (!config) return;

        // 获取画布元素
        const canvasEl = document.querySelector('[data-canvas="true"]') as HTMLElement;
        if (!canvasEl) return;

        // 获取画布的位置信息
        const canvasRect = canvasEl.getBoundingClientRect();

        // 使用保存的鼠标实时位置
        if (!currentMousePos) return;
        const endX = currentMousePos.x;
        const endY = currentMousePos.y;

        // 检查结束位置是否在画布范围内
        const isOverCanvas =
          endX >= canvasRect.left &&
          endX <= canvasRect.right &&
          endY >= canvasRect.top &&
          endY <= canvasRect.bottom;

        if (!isOverCanvas && !over) return;

        // 计算相对于画布的位置
        // 鼠标在组件中间，需要计算组件左上角位置
        const size = config.defaultSize;
        const compWidth = typeof size.width === 'number' ? size.width : 100;
        const compHeight = typeof size.height === 'number' ? size.height : 40;
        
        let x = (endX - canvasRect.left - canvas.offset.x) / canvas.scale - compWidth / 2;
        let y = (endY - canvasRect.top - canvas.offset.y) / canvas.scale - compHeight / 2;

        // 应用对齐吸附偏移
        if (alignmentSnap.offsetX !== null) {
          x += alignmentSnap.offsetX;
        }
        if (alignmentSnap.offsetY !== null) {
          y += alignmentSnap.offsetY;
        }

        // 确保位置非负，并吸附到最近的整数坐标
        x = Math.max(0, Math.round(x));
        y = Math.max(0, Math.round(y));

        // 检查 Drawer 和 Modal 是否释放在其他组件上
        if (config.requiresOverlap) {
          // 查找是否有重叠的组件
          const centerX = x + compWidth / 2;
          const centerY = y + compHeight / 2;
          const targetComponent = findComponentAtPosition(centerX, centerY, components);
          
          if (!targetComponent) {
            // 没有释放在其他组件上，不创建
            message.warning(`${config.name} 必须释放在其他组件上`);
            return;
          }
          
          // 创建组件并关联到目标组件
          const newComponent = {
            id: uuidv4(),
            type: config.type,
            name: config.name,
            props: {}, // props 保持空，所有属性放入 extraProps
            style: { ...config.defaultStyle },
            children: [],
            position: { x, y },
            size: { ...config.defaultSize },
            // 关联的目标组件 ID
            triggerComponentId: targetComponent.id,
            // 所有属性（包括 defaultProps 和 className）放入 extraProps
            extraProps: { ...config.defaultProps, className: config.type.toLowerCase() },
          };

          addComponent(newComponent);
          return;
        }

        const newComponent = {
          id: uuidv4(),
          type: config.type,
          name: config.name,
          props: {}, // props 保持空，所有属性放入 extraProps
          style: { ...config.defaultStyle },
          children: [],
          position: { x, y },
          size: { ...config.defaultSize },
          // 所有属性（包括 defaultProps 和 className）放入 extraProps
          extraProps: { ...config.defaultProps, className: config.type.toLowerCase() },
        };

        addComponent(newComponent);
      }

      // 移动已有组件
      if (activeData?.type === 'move') {
        const componentId = activeData.componentId;

        // 找到组件当前位置
        const findComponent = (
          comps: typeof components,
          id: string
        ): typeof components[0] | null => {
          for (const comp of comps) {
            if (comp.id === id) return comp;
            if (comp.children) {
              const found = findComponent(comp.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const component = findComponent(components, componentId);
        if (component && currentMousePos) {
          // 使用鼠标位置和偏移计算最终位置
          const canvasEl = document.querySelector('[data-canvas="true"]') as HTMLElement;
          if (canvasEl) {
            const canvasRect = canvasEl.getBoundingClientRect();
            
            // 鼠标位置减去偏移，得到组件左上角应该在的屏幕位置
            const compScreenX = currentMousePos.x - dragOffsetRef.current.x;
            const compScreenY = currentMousePos.y - dragOffsetRef.current.y;
            
            // 转换为画布坐标
            let newX = Math.max(0, (compScreenX - canvasRect.left - canvas.offset.x) / canvas.scale);
            let newY = Math.max(0, (compScreenY - canvasRect.top - canvas.offset.y) / canvas.scale);

            // 如果组件有父级，需要计算相对于父级的位置
            if (component.parentId) {
              const parentComponent = findComponent(components, component.parentId);
              if (parentComponent) {
                newX = newX - parentComponent.position.x;
                newY = newY - parentComponent.position.y;
              }
            }

            // 应用对齐吸附偏移
            if (alignmentSnap.offsetX !== null) {
              newX += alignmentSnap.offsetX;
            }
            if (alignmentSnap.offsetY !== null) {
              newY += alignmentSnap.offsetY;
            }

            // 确保位置非负，并吸附到最近的整数坐标
            newX = Math.max(0, Math.round(newX));
            newY = Math.max(0, Math.round(newY));

            moveComponent(componentId, {
              x: newX,
              y: newY,
            });
          }
        }
      }
    },
    [addComponent, setDragging, setDragOverCanvas, setDragPreview, canvas, components, alignmentSnap, moveComponent, findComponentAtPosition, mousePosition]
  );

  // 清理
  useEffect(() => {
    return () => {
      setDragPreview({ position: null, size: null, draggingId: null });
    };
  }, [setDragPreview]);

  return (
    <ConfigProvider locale={zhCN}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.app}>
          {/* 工具栏 */}
          <Toolbar />

          {/* 主体内容 */}
          <div className={styles.main}>
            {/* 左侧：控件面板 */}
            <div className={styles.left}>
              <ComponentPanel />
            </div>

            {/* 中间：画布 */}
            <div className={styles.center}>
              <Canvas />
            </div>

            {/* 右侧：属性面板 */}
            <div className={styles.right}>
              <PropertyPanel />
            </div>
          </div>

          {/* 底部：代码编辑器 */}
          <div className={styles.bottom}>
            <CodeEditor />
          </div>
        </div>

        {/* 拖拽覆盖层 - 显示拖拽中的预览 */}
        {activeConfig && mousePosition && dragPreview.size && (
          <div
            style={{
              position: 'fixed',
              left: mousePosition.x - (typeof dragPreview.size.width === 'number' ? dragPreview.size.width : 100) / 2,
              top: mousePosition.y - (typeof dragPreview.size.height === 'number' ? dragPreview.size.height : 40) / 2,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <DragItem config={activeConfig} />
          </div>
        )}
        {activeComponent && mousePosition && dragPreview.size && (
          <div
            style={{
              position: 'fixed',
              left: mousePosition.x - dragOffsetRef.current.x,
              top: mousePosition.y - dragOffsetRef.current.y,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <DragItem component={activeComponent} />
          </div>
        )}
      </DndContext>
    </ConfigProvider>
  );
};

export default App;
