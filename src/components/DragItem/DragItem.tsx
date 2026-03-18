import React from 'react';
import { ComponentConfig, ComponentNode } from '@/types';
import { ComponentMap } from '@/core';
import styles from './DragItem.module.css';

interface DragItemProps {
  config?: ComponentConfig | null;
  component?: ComponentNode | null;
}

/**
 * 获取尺寸样式
 */
const getSizeStyle = (size: { width: number | string; height: number | string }) => {
  const style: React.CSSProperties = {};

  if (typeof size.width === 'number') {
    style.width = size.width;
    style.minWidth = size.width;
  } else if (typeof size.width === 'string') {
    style.width = size.width;
  }

  if (typeof size.height === 'number') {
    style.height = size.height;
    style.minHeight = size.height;
  } else if (typeof size.height === 'string') {
    style.height = size.height;
  }

  return style;
};

/**
 * 拖拽预览组件
 */
const DragItem: React.FC<DragItemProps> = ({ config, component }) => {
  if (config) {
    // 新建组件的预览
    const Component = ComponentMap[config.type];
    
    // Drawer 和 Modal 使用特殊的拖拽预览尺寸和样式
    const isOverlapComponent = config.requiresOverlap;
    const size = isOverlapComponent && config.dragPreviewSize 
      ? config.dragPreviewSize 
      : config.defaultSize;
    const sizeStyle = getSizeStyle(size);

    // Drawer 和 Modal 显示虚线透明框
    if (isOverlapComponent) {
      return (
        <div className={styles.previewDashed} style={sizeStyle}>
          <span className={styles.previewName}>{config.name}</span>
        </div>
      );
    }

    if (!Component) {
      return (
        <div className={styles.preview} style={sizeStyle}>
          <span className={styles.name}>{config.name}</span>
        </div>
      );
    }

    return (
      <div className={styles.preview} style={sizeStyle}>
        <Component {...config.defaultProps} style={sizeStyle} />
      </div>
    );
  }

  if (component) {
    // 已有组件的预览 - 使用组件实际尺寸
    const Component = ComponentMap[component.type];
    const sizeStyle = getSizeStyle(component.size);

    if (!Component) {
      return (
        <div className={styles.preview} style={sizeStyle}>
          <span className={styles.name}>{component.name}</span>
        </div>
      );
    }

    return (
      <div className={styles.preview} style={sizeStyle}>
        <Component {...component.props} style={sizeStyle} />
      </div>
    );
  }

  return null;
};

export default DragItem;
