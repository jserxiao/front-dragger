import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '@/store';
import { ComponentNode } from '@/types';
import styles from './Canvas.module.css';

interface CanvasItemProps {
  component: ComponentNode;
  isSelected: boolean;
  onSelect: (id: string, multi?: boolean) => void;
  onHover: (id?: string) => void;
  // onCalculateAlignment 和 onClearAlignment 暂时未使用，保留供后续扩展
  onCalculateAlignment?: (id: string, position: { x: number; y: number }, size: { width: number; height: number }) => void;
  onClearAlignment?: () => void;
  children: React.ReactNode;
}

/**
 * 画布上的组件项
 */
const CanvasItem: React.FC<CanvasItemProps> = ({
  component,
  isSelected,
  onSelect,
  onHover,
  // onCalculateAlignment, // 暂未使用
  // onClearAlignment, // 暂未使用
  children,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });

  const { moveComponent, resizeComponent, canvas } = useEditorStore();
  const { snapToGrid, gridSize } = canvas;

  // 拖拽功能
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `move-${component.id}`,
      data: {
        type: 'move',
        componentId: component.id,
      },
    });

  // 处理选择
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(component.id, e.shiftKey || e.ctrlKey);
    },
    [component.id, onSelect]
  );

  // 处理鼠标悬停
  const handleMouseEnter = useCallback(() => {
    onHover(component.id);
  }, [component.id, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover(undefined);
  }, [onHover]);

  // 吸附到网格
  const snapToGridValue = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  // 开始调整大小
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.stopPropagation();
      e.preventDefault();

      if (!itemRef.current) return;

      const rect = itemRef.current.getBoundingClientRect();
      setIsResizing(true);
      setResizeHandle(handle);
      setInitialSize({
        width: rect.width,
        height: rect.height,
      });
      setInitialPos({ ...component.position });
      setInitialMousePos({ x: e.clientX, y: e.clientY });
    },
    [component.position]
  );

  // 调整大小中
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - initialMousePos.x;
      const deltaY = e.clientY - initialMousePos.y;

      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      let newX = initialPos.x;
      let newY = initialPos.y;

      // 根据不同的控制点调整大小
      if (resizeHandle.includes('e')) {
        newWidth = snapToGridValue(initialSize.width + deltaX);
      }
      if (resizeHandle.includes('w')) {
        newWidth = snapToGridValue(initialSize.width - deltaX);
        newX = snapToGridValue(initialPos.x + deltaX);
      }
      if (resizeHandle.includes('s')) {
        newHeight = snapToGridValue(initialSize.height + deltaY);
      }
      if (resizeHandle.includes('n')) {
        newHeight = snapToGridValue(initialSize.height - deltaY);
        newY = snapToGridValue(initialPos.y + deltaY);
      }

      // 最小尺寸限制
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(30, newHeight);

      // 更新位置和大小
      if (newX !== component.position.x || newY !== component.position.y) {
        moveComponent(component.id, { x: newX, y: newY });
      }

      resizeComponent(component.id, {
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle('');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isResizing,
    resizeHandle,
    initialSize,
    initialPos,
    initialMousePos,
    component.id,
    component.position,
    snapToGridValue,
    moveComponent,
    resizeComponent,
  ]);

  const style: React.CSSProperties = {
    position: 'absolute',
    // 所有组件都使用绝对位置（包括子组件）
    // 子组件的 position 已经是相对于父组件的偏移量计算后的绝对坐标
    left: component.position.x,
    top: component.position.y,
    width: component.size.width,
    height: component.size.height,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isSelected ? 10 : (component.parentId ? 5 : 1),
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (itemRef as any).current = node;
      }}
      data-component-id={component.id}
      style={style}
      className={`${styles.canvasItem} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...listeners}
      {...attributes}
    >
      {children}

      {/* 选中框 */}
      {isSelected && (
        <>
          <div className={styles.selectionBorder} />
          {/* 调整大小的控制点 */}
          {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
            <div
              key={handle}
              className={`${styles.resizeHandle} ${styles[`handle-${handle}`]}`}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default CanvasItem;
