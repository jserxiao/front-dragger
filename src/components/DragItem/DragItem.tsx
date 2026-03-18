import React from 'react';
import {
  Button,
  Input,
  Select,
  Checkbox,
  Switch,
  DatePicker,
  Upload,
  Card,
  Divider,
  Image,
  Statistic,
  Typography,
  Descriptions,
  Modal,
  Drawer,
  Alert,
  Progress,
  Spin,
  Tag,
  Badge,
  Avatar,
  Rate,
  Slider,
  Radio,
  Table,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { ComponentConfig, ComponentNode } from '@/types';
import styles from './DragItem.module.css';

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
