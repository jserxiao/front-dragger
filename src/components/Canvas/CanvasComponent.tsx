import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Button, Input, Select, Card, Checkbox, Switch, DatePicker, Upload, Divider, Image, Statistic, Typography, Descriptions, TypographyTextProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { ComponentRegistry } from '@/core';
import { ComponentNode, AlignmentLine } from '@/types';
import CanvasItem from './CanvasItem';
import AlignmentGuides from './AlignmentGuides';
import styles from './Canvas.module.css';

const { Text } = Typography;

/**
 * 组件渲染映射
 */
const ComponentMap: Record<string, React.FC<any>> = {
  Button,
  Input,
  Select,
  Checkbox,
  Switch,
  DatePicker,
  Upload: (props: any) => (
    <Upload {...props}>
      <Button icon={<UploadOutlined />}>点击上传</Button>
    </Upload>
  ),
  Card,
  Divider,
  Image,
  Statistic,
  'Typography.Text': Text,
  Descriptions,
};

interface CanvasProps {
  className?: string;
}

/**
 * 画布组件
 */
const Canvas: React.FC<CanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [alignmentLines, setAlignmentLines] = useState<AlignmentLine[]>([]);

  const {
    components,
    canvas,
    guideLines,
    setScale,
    setOffset,
    selectComponent,
    clearSelection,
    setHoveredId,
    addComponent,
    setDragOverCanvas,
    dragPreview,
  } = useEditorStore();

  const { scale, offset, gridSize, showGrid, snapToGrid, selectedIds } = canvas;

  // 设置画布为可放置区域
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
    data: {
      type: 'canvas',
    },
  });

  // 处理画布点击
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === contentRef.current || e.target === canvasRef.current) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // 处理鼠标滚轮缩放
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(scale + delta);
      }
    },
    [scale, setScale]
  );

  // 处理画布平移
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      }
    },
    [offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart, setOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 绑定滚轮事件
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      canvasEl.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        canvasEl.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);

  // 计算对齐线
  const calculateAlignmentLines = useCallback(
    (draggingId: string, position: { x: number; y: number }, size: { width: number; height: number }) => {
      const lines: AlignmentLine[] = [];
      const threshold = 5; // 对齐阈值

      // 获取画布内容区域
      const contentEl = contentRef.current;
      if (!contentEl) return;

      // 检查与其他组件的对齐
      components.forEach((comp) => {
        if (comp.id === draggingId) return;

        // 尝试从 DOM 获取实际尺寸
        const compEl = contentEl.querySelector(`[data-component-id="${comp.id}"]`);
        let compWidth: number;
        let compHeight: number;

        if (compEl) {
          const rect = compEl.getBoundingClientRect();
          // 将屏幕尺寸转换为画布坐标
          compWidth = rect.width / scale;
          compHeight = rect.height / scale;
        } else {
          // 回退到组件配置的尺寸
          compWidth = typeof comp.size.width === 'number' ? comp.size.width : 100;
          compHeight = typeof comp.size.height === 'number' ? comp.size.height : 40;
        }

        const compLeft = comp.position.x;
        const compRight = comp.position.x + compWidth;
        const compTop = comp.position.y;
        const compBottom = comp.position.y + compHeight;
        const compCenterX = comp.position.x + compWidth / 2;
        const compCenterY = comp.position.y + compHeight / 2;

        const dragWidth = typeof size.width === 'number' ? size.width : 100;
        const dragHeight = typeof size.height === 'number' ? size.height : 40;

        const dragLeft = position.x;
        const dragRight = position.x + dragWidth;
        const dragTop = position.y;
        const dragBottom = position.y + dragHeight;
        const dragCenterX = position.x + dragWidth / 2;
        const dragCenterY = position.y + dragHeight / 2;

        // 左对齐
        if (Math.abs(dragLeft - compLeft) < threshold) {
          lines.push({
            type: 'vertical',
            position: compLeft,
            start: Math.min(dragTop, compTop),
            end: Math.max(dragBottom, compBottom),
            difference: dragLeft - compLeft,
          });
        }

        // 右对齐
        if (Math.abs(dragRight - compRight) < threshold) {
          lines.push({
            type: 'vertical',
            position: compRight,
            start: Math.min(dragTop, compTop),
            end: Math.max(dragBottom, compBottom),
            difference: dragRight - compRight,
          });
        }

        // 顶部对齐
        if (Math.abs(dragTop - compTop) < threshold) {
          lines.push({
            type: 'horizontal',
            position: compTop,
            start: Math.min(dragLeft, compLeft),
            end: Math.max(dragRight, compRight),
            difference: dragTop - compTop,
          });
        }

        // 底部对齐
        if (Math.abs(dragBottom - compBottom) < threshold) {
          lines.push({
            type: 'horizontal',
            position: compBottom,
            start: Math.min(dragLeft, compLeft),
            end: Math.max(dragRight, compRight),
            difference: dragBottom - compBottom,
          });
        }

        // 水平居中对齐
        if (Math.abs(dragCenterX - compCenterX) < threshold) {
          lines.push({
            type: 'vertical',
            position: compCenterX,
            start: Math.min(dragTop, compTop),
            end: Math.max(dragBottom, compBottom),
            difference: dragCenterX - compCenterX,
          });
        }

        // 垂直居中对齐
        if (Math.abs(dragCenterY - compCenterY) < threshold) {
          lines.push({
            type: 'horizontal',
            position: compCenterY,
            start: Math.min(dragLeft, compLeft),
            end: Math.max(dragRight, compRight),
            difference: dragCenterY - compCenterY,
          });
        }
      });

      setAlignmentLines(lines);
    },
    [components, scale]
  );

  // 清除对齐线
  const clearAlignmentLines = useCallback(() => {
    setAlignmentLines([]);
  }, []);

  // 监听拖拽预览变化，实时计算对齐线
  useEffect(() => {
    if (dragPreview.position && dragPreview.size && dragPreview.draggingId) {
      calculateAlignmentLines(
        dragPreview.draggingId,
        dragPreview.position,
        dragPreview.size
      );
    } else {
      clearAlignmentLines();
    }
  }, [dragPreview, calculateAlignmentLines, clearAlignmentLines]);

  // 渲染组件
  const renderComponent = (component: ComponentNode): React.ReactNode => {
    const Component = ComponentMap[component.type];
    if (!Component) {
      return (
        <div className={styles.unknownComponent}>
          未知组件: {component.type}
        </div>
      );
    }

    const isSelected = selectedIds.includes(component.id);
    const config = ComponentRegistry.getComponent(component.type);

    // 构建组件属性
    const props: any = { ...component.props };

    // 添加尺寸样式，让组件撑满容器
    const sizeStyle: React.CSSProperties = {};
    if (component.size.width !== 'auto' && component.size.width !== undefined) {
      if (typeof component.size.width === 'string' && component.size.width.includes('%')) {
        sizeStyle.width = component.size.width;
      } else if (typeof component.size.width === 'number') {
        sizeStyle.width = component.size.width;
      }
    }
    if (component.size.height !== 'auto' && component.size.height !== undefined) {
      if (typeof component.size.height === 'string' && component.size.height.includes('%')) {
        sizeStyle.height = component.size.height;
      } else if (typeof component.size.height === 'number') {
        sizeStyle.height = component.size.height;
      }
    }
    props.style = { ...props.style, ...sizeStyle };

    // 处理特殊组件
    if (component.type === 'Typography.Text') {
      // Text 组件特殊处理
    }

    // 检查组件是否允许有子元素
    const hasChildren = component.children && component.children.length > 0;

    return (
      <CanvasItem
        key={component.id}
        component={component}
        isSelected={isSelected}
        onSelect={(id, multi) => selectComponent(id, multi)}
        onHover={(id) => setHoveredId(id)}
        onCalculateAlignment={calculateAlignmentLines}
        onClearAlignment={clearAlignmentLines}
      >
        {hasChildren ? (
          <Component {...props}>
            {component.children?.map(renderComponent)}
          </Component>
        ) : (
          <Component {...props} />
        )}
      </CanvasItem>
    );
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (canvasRef as any).current = node;
      }}
      data-canvas="true"
      className={`${styles.canvas} ${className || ''} ${isPanning ? styles.panning : ''} ${isOver ? styles.dragOver : ''}`}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 网格背景 */}
      {showGrid && (
        <div
          className={styles.gridBackground}
          style={{
            backgroundPosition: `${offset.x}px ${offset.y}px`,
            backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
          }}
        />
      )}

      {/* 辅助线 */}
      {guideLines.map((line) => (
        <div
          key={line.id}
          className={`${styles.guideLine} ${styles[line.type]}`}
          style={{
            [line.type === 'horizontal' ? 'top' : 'left']: line.position * scale + (line.type === 'horizontal' ? offset.y : offset.x),
          }}
        />
      ))}

      {/* 对齐参考线 */}
      <AlignmentGuides lines={alignmentLines} scale={scale} offset={offset} />

      {/* 画布内容 */}
      <div
        ref={contentRef}
        className={styles.content}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      >
        {components.map(renderComponent)}

        {components.length === 0 && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>🎨</div>
            <div className={styles.placeholderText}>
              从左侧拖拽组件到此处开始设计
            </div>
          </div>
        )}
      </div>

      {/* 缩放指示器 */}
      <div className={styles.zoomIndicator}>
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export default Canvas;
