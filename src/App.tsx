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
  DragOverlay,
} from '@dnd-kit/core';
import { v4 as uuidv4 } from 'uuid';
import { ConfigProvider } from 'antd';
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
  const { addComponent, setDragging, setDragOverCanvas, canvas, components, setDragPreview } =
    useEditorStore();

  // 当前拖拽的组件配置
  const [activeConfig, setActiveConfig] = useState<ReturnType<typeof ComponentRegistry.getComponent>>(null);
  const [activeComponent, setActiveComponent] = useState<typeof components[0] | null>(null);
  
  // 拖拽起始位置
  const dragStartPos = useRef({ x: 0, y: 0 });
  const activatorEventRef = useRef<PointerEvent | null>(null);

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
      activatorEventRef.current = event.activatorEvent as PointerEvent;

      // 新建组件拖拽
      if (activeData?.type === 'new') {
        const config = ComponentRegistry.getComponent(activeData.componentType);
        setActiveConfig(config);
        setActiveComponent(null);
        
        // 初始化拖拽预览
        const startEvent = event.activatorEvent as PointerEvent;
        dragStartPos.current = { x: startEvent.clientX, y: startEvent.clientY };
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
        setActiveConfig(null);
        
        // 设置拖拽预览
        if (component) {
          setDragPreview({
            position: { ...component.position },
            size: {
              width: typeof component.size.width === 'number' ? component.size.width : 100,
              height: typeof component.size.height === 'number' ? component.size.height : 40,
            },
            draggingId: component.id,
          });
        }
      }
    },
    [setDragging, components, setDragPreview]
  );

  // 拖拽移动中 - 实时更新预览位置
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { delta } = event;
      const startEvent = activatorEventRef.current;
      if (!startEvent) return;

      // 计算当前鼠标位置
      const currentX = startEvent.clientX + delta.x;
      const currentY = startEvent.clientY + delta.y;

      // 计算画布坐标
      const position = calculateCanvasPosition(currentX, currentY);

      if (activeConfig) {
        // 新建组件
        const size = {
          width: typeof activeConfig.defaultSize.width === 'number' ? activeConfig.defaultSize.width : 100,
          height: typeof activeConfig.defaultSize.height === 'number' ? activeConfig.defaultSize.height : 40,
        };
        
        if (position) {
          setDragPreview({
            position,
            size,
            draggingId: 'new',
          });
        }
      } else if (activeComponent) {
        // 移动已有组件
        const newX = Math.max(0, activeComponent.position.x + delta.x / canvas.scale);
        const newY = Math.max(0, activeComponent.position.y + delta.y / canvas.scale);
        
        setDragPreview({
          position: { x: newX, y: newY },
          size: {
            width: typeof activeComponent.size.width === 'number' ? activeComponent.size.width : 100,
            height: typeof activeComponent.size.height === 'number' ? activeComponent.size.height : 40,
          },
          draggingId: activeComponent.id,
        });
      }
    },
    [activeConfig, activeComponent, calculateCanvasPosition, canvas.scale, setDragPreview]
  );

  // 拖拽经过
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      setDragOverCanvas(over?.id === 'canvas');
    },
    [setDragOverCanvas]
  );

  // 拖拽结束
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, activatorEvent, delta } = event;

      setDragging(false);
      setDragOverCanvas(false);
      setActiveConfig(null);
      setActiveComponent(null);
      setDragPreview({ position: null, size: null, draggingId: null });
      activatorEventRef.current = null;

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

        // 计算拖拽结束时的鼠标位置 (起始位置 + delta)
        const startEvent = activatorEvent as PointerEvent;
        const endX = startEvent.clientX + delta.x;
        const endY = startEvent.clientY + delta.y;

        // 检查结束位置是否在画布范围内
        const isOverCanvas =
          endX >= canvasRect.left &&
          endX <= canvasRect.right &&
          endY >= canvasRect.top &&
          endY <= canvasRect.bottom;

        if (!isOverCanvas && !over) return;

        // 计算相对于画布的位置
        let x = (endX - canvasRect.left - canvas.offset.x) / canvas.scale;
        let y = (endY - canvasRect.top - canvas.offset.y) / canvas.scale;

        // 确保位置非负
        x = Math.max(0, x);
        y = Math.max(0, y);

        const newComponent = {
          id: uuidv4(),
          type: config.type,
          name: config.name,
          props: { ...config.defaultProps },
          style: { ...config.defaultStyle },
          children: [],
          position: { x, y },
          size: { ...config.defaultSize },
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
        if (component) {
          // 计算新位置
          const newX = Math.max(
            0,
            component.position.x + delta.x / canvas.scale
          );
          const newY = Math.max(
            0,
            component.position.y + delta.y / canvas.scale
          );

          useEditorStore.getState().moveComponent(componentId, {
            x: newX,
            y: newY,
          });
        }
      }
    },
    [addComponent, setDragging, setDragOverCanvas, setDragPreview, canvas, components]
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
        <DragOverlay dropAnimation={null}>
          {activeConfig && (
            <DragItem config={activeConfig} />
          )}
          {activeComponent && (
            <DragItem component={activeComponent} />
          )}
        </DragOverlay>
      </DndContext>
    </ConfigProvider>
  );
};

export default App;
