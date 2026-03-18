import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Button, Input, Select, Card, Checkbox, Switch, DatePicker, Upload, Divider, Image, Statistic, Typography, Descriptions, Modal, Drawer, message, notification, Alert, Progress, Spin, Tag, Badge, Avatar, Rate, Slider, Radio, Table } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { ComponentRegistry } from '@/core';
import { ComponentNode, AlignmentLine } from '@/types';
import CanvasItem from './CanvasItem';
import AlignmentGuides from './AlignmentGuides';
import styles from './Canvas.module.css';

const { Text } = Typography;

// Message 组件封装
const MessageComponent: React.FC<{ type: string; content: string }> = ({ type, content }) => {
  const iconMap: Record<string, React.ReactNode> = {
    info: '💡',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    loading: '⏳',
  };
  return (
    <div style={{
      padding: '10px 16px',
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span>{iconMap[type] || '💡'}</span>
      <span>{content}</span>
    </div>
  );
};

// Notification 组件封装
const NotificationComponent: React.FC<{ type: string; message: string; description: string }> = ({ type, message: msg, description }) => {
  const colorMap: Record<string, string> = {
    info: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
  };
  return (
    <div style={{
      padding: '16px 24px',
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      width: 384,
      borderLeft: `4px solid ${colorMap[type] || '#1890ff'}`,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{msg}</div>
      <div style={{ color: '#666', fontSize: 13 }}>{description}</div>
    </div>
  );
};

/**
 * 网格数值标注组件
 */
interface GridLabelsProps {
  offset: { x: number; y: number };
  scale: number;
  gridSize: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

const GridLabels: React.FC<GridLabelsProps> = ({ offset, scale, gridSize, containerRef }) => {
  // 容器尺寸状态
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // 监听容器尺寸变化
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);
  
  // 计算需要显示的网格线标注
  const labels = useMemo(() => {
    const result: Array<{ type: 'x' | 'y'; position: number; value: number; screenPos: number }> = [];
    
    // 如果容器尺寸为0，使用备用的窗口尺寸
    const visibleWidth = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 0);
    const visibleHeight = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight : 0);
    
    if (visibleWidth === 0 || visibleHeight === 0) return result;
    
    // 计算网格在画布坐标系中的实际尺寸
    const scaledGridSize = gridSize * scale;
    
    // 计算可见区域内的网格线
    // X 方向
    const startX = Math.floor(-offset.x / scaledGridSize) * gridSize;
    const endX = Math.ceil((visibleWidth - offset.x) / scaledGridSize) * gridSize;
    
    for (let value = startX; value <= endX; value += gridSize) {
      const screenPos = value * scale + offset.x;
      // 每5格显示一个标签，避免过于密集
      if (value % (gridSize * 5) === 0 && value !== 0) {
        result.push({ type: 'x', position: value, value, screenPos });
      }
    }
    
    // Y 方向
    const startY = Math.floor(-offset.y / scaledGridSize) * gridSize;
    const endY = Math.ceil((visibleHeight - offset.y) / scaledGridSize) * gridSize;
    
    for (let value = startY; value <= endY; value += gridSize) {
      const screenPos = value * scale + offset.y;
      // 每5格显示一个标签，避免过于密集
      if (value % (gridSize * 5) === 0 && value !== 0) {
        result.push({ type: 'y', position: value, value, screenPos });
      }
    }
    
    return result;
  }, [offset, scale, gridSize, containerSize]);
  
  return (
    <g>
      {labels.map((label, index) => {
        if (label.type === 'x') {
          return (
            <g key={`x-${index}`}>
              {/* 垂直参考线 */}
              <line
                x1={label.screenPos}
                y1={0}
                x2={label.screenPos}
                y2="100%"
                stroke="#d9d9d9"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              {/* 数值标签 */}
              <text
                x={label.screenPos + 4}
                y={Math.max(16, -offset.y + 16)}
                fontSize="11"
                fill="#8c8c8c"
                fontFamily="Arial, sans-serif"
              >
                {label.value}
              </text>
            </g>
          );
        } else {
          return (
            <g key={`y-${index}`}>
              {/* 水平参考线 */}
              <line
                x1={0}
                y1={label.screenPos}
                x2="100%"
                y2={label.screenPos}
                stroke="#d9d9d9"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              {/* 数值标签 */}
              <text
                x={Math.max(4, -offset.x + 4)}
                y={label.screenPos + 14}
                fontSize="11"
                fill="#8c8c8c"
                fontFamily="Arial, sans-serif"
              >
                {label.value}
              </text>
            </g>
          );
        }
      })}
    </g>
  );
};

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
  // 反馈组件
  Modal: (props: any) => (
    <Modal {...props} style={{ position: 'relative' }}>
      {props.children}
    </Modal>
  ),
  Drawer: (props: any) => (
    <Drawer {...props} style={{ position: 'relative' }}>
      {props.children}
    </Drawer>
  ),
  Message: MessageComponent,
  Notification: NotificationComponent,
  Alert,
  Progress,
  Spin,
  // 展示组件
  Tag,
  Badge,
  Avatar,
  // 表单组件
  Rate,
  Slider,
  Radio: (props: any) => <Radio.Group {...props}><Radio value="a">选项A</Radio><Radio value="b">选项B</Radio><Radio value="c">选项C</Radio></Radio.Group>,
  // 数据展示
  Table,
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
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const {
    components,
    canvas,
    guideLines,
    setScale,
    setOffset,
    selectComponent,
    setAlignmentSnap,
    clearSelection,
    setHoveredId,
    addComponent,
    setDragOverCanvas,
    dragPreview,
    alignmentSnap,
  } = useEditorStore();

  const { scale, offset, gridSize, showGrid, snapToGrid, selectedIds, canvasStyle } = canvas;

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
      // 计算鼠标在画布坐标系中的位置
      const canvasEl = canvasRef.current;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left - offset.x) / scale);
        const y = Math.round((e.clientY - rect.top - offset.y) / scale);
        setMousePosition({ x: Math.max(0, x), y: Math.max(0, y) });
      }
      
      if (isPanning) {
        setOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart, setOffset, offset, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setMousePosition(null);
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

      // 吸附偏移
      let offsetX: number | null = null;
      let offsetY: number | null = null;

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

        // position 是 DragOverlay 左上角，组件中心是 position + size/2
        const dragLeft = position.x;
        const dragRight = position.x + dragWidth;
        const dragTop = position.y;
        const dragBottom = position.y + dragHeight;
        const dragCenterX = position.x + dragWidth / 2;
        const dragCenterY = position.y + dragHeight / 2;

        // 左对齐
        if (Math.abs(dragLeft - compLeft) < threshold) {
          const diff = dragLeft - compLeft;
          lines.push({
            type: 'vertical',
            position: compLeft,
            start: Math.min(dragTop, compTop),
            end: Math.max(dragBottom, compBottom),
            difference: diff,
          });
          // 吸附到左边
          if (offsetX === null || Math.abs(diff) < Math.abs(offsetX)) {
            offsetX = -diff;
          }
        }

        // 右对齐
        if (Math.abs(dragRight - compRight) < threshold) {
          const diff = dragRight - compRight;
          lines.push({
            type: 'vertical',
            position: compRight,
            start: Math.min(dragTop, compTop),
            end: Math.max(dragBottom, compBottom),
            difference: diff,
          });
          // 吸附到右边
          if (offsetX === null || Math.abs(diff) < Math.abs(offsetX)) {
            offsetX = -diff;
          }
        }

        // 顶部对齐
        if (Math.abs(dragTop - compTop) < threshold) {
          const diff = dragTop - compTop;
          lines.push({
            type: 'horizontal',
            position: compTop,
            start: Math.min(dragLeft, compLeft),
            end: Math.max(dragRight, compRight),
            difference: diff,
          });
          // 吸附到顶部
          if (offsetY === null || Math.abs(diff) < Math.abs(offsetY)) {
            offsetY = -diff;
          }
        }

        // 底部对齐
        if (Math.abs(dragBottom - compBottom) < threshold) {
          const diff = dragBottom - compBottom;
          lines.push({
            type: 'horizontal',
            position: compBottom,
            start: Math.min(dragLeft, compLeft),
            end: Math.max(dragRight, compRight),
            difference: diff,
          });
          // 吸附到底部
          if (offsetY === null || Math.abs(diff) < Math.abs(offsetY)) {
            offsetY = -diff;
          }
        }

        // 水平居中对齐
        if (Math.abs(dragCenterX - compCenterX) < threshold) {
          const diff = dragCenterX - compCenterX;
          lines.push({
            type: 'vertical',
            position: compCenterX,
            start: Math.min(dragTop, compTop),
            end: Math.max(dragBottom, compBottom),
            difference: diff,
          });
          // 吸附到居中
          if (offsetX === null || Math.abs(diff) < Math.abs(offsetX)) {
            offsetX = -diff;
          }
        }

        // 垂直居中对齐
        if (Math.abs(dragCenterY - compCenterY) < threshold) {
          const diff = dragCenterY - compCenterY;
          lines.push({
            type: 'horizontal',
            position: compCenterY,
            start: Math.min(dragLeft, compLeft),
            end: Math.max(dragRight, compRight),
            difference: diff,
          });
          // 吸附到居中
          if (offsetY === null || Math.abs(diff) < Math.abs(offsetY)) {
            offsetY = -diff;
          }
        }
      });

      setAlignmentLines(lines);
      // 更新吸附偏移到 store
      setAlignmentSnap({ offsetX, offsetY });
    },
    [components, scale, setAlignmentSnap]
  );

  // 清除对齐线
  const clearAlignmentLines = useCallback(() => {
    setAlignmentLines([]);
    setAlignmentSnap({ offsetX: null, offsetY: null });
  }, [setAlignmentSnap]);

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

  // 监听 alignmentSnap 变化，当都为 null 时确保清除对齐线
  useEffect(() => {
    if (alignmentSnap.offsetX === null && alignmentSnap.offsetY === null) {
      setAlignmentLines([]);
    }
  }, [alignmentSnap]);

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
      onMouseLeave={handleMouseLeave}
    >
      {/* 鼠标坐标显示 */}
      {mousePosition && (
        <div className={styles.mousePosition}>
          X: {mousePosition.x} | Y: {mousePosition.y}
        </div>
      )}
      
      {/* 滚动容器 */}
      <div className={styles.scrollContainer}>
        {/* 网格背景 */}
        {showGrid && (
          <svg
            className={styles.gridBackgroundSvg}
            style={{
              width: canvasStyle.width * scale + 200,
              height: canvasStyle.height * scale + 200,
            }}
          >
            <defs>
              <pattern
                id="gridPattern"
                width={gridSize * scale}
                height={gridSize * scale}
                patternUnits="userSpaceOnUse"
                x={offset.x % (gridSize * scale)}
                y={offset.y % (gridSize * scale)}
              >
                <path
                  d={`M ${gridSize * scale} 0 L 0 0 0 ${gridSize * scale}`}
                  fill="none"
                  stroke="#ebebeb"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridPattern)" />
            {/* 网格数值标注 */}
            <GridLabels
              offset={offset}
              scale={scale}
              gridSize={gridSize}
              containerRef={canvasRef}
            />
          </svg>
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
            width: canvasStyle.width,
            height: canvasStyle.height,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            backgroundColor: canvasStyle.backgroundColor,
            backgroundImage: canvasStyle.backgroundImage ? `url(${canvasStyle.backgroundImage})` : undefined,
            backgroundSize: canvasStyle.backgroundSize,
            backgroundPosition: canvasStyle.backgroundPosition,
            backgroundRepeat: canvasStyle.backgroundRepeat,
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
      </div>

      {/* 缩放指示器 */}
      <div className={styles.zoomIndicator}>
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export default Canvas;
