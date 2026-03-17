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
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { ComponentConfig, ComponentNode } from '@/types';
import styles from './DragItem.module.css';

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
    // 新建组件的预览 - 使用配置的默认尺寸
    const Component = ComponentMap[config.type];
    const sizeStyle = getSizeStyle(config.defaultSize);

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
