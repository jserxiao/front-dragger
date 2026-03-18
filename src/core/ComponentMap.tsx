import React from 'react';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Switch,
  DatePicker,
  TimePicker,
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
  Tabs,
  Collapse,
  Timeline,
  Tree,
  List,
  Empty,
  Result,
  Skeleton,
  Pagination,
  Calendar,
  QRCode,
  Segmented,
  Breadcrumb,
  Steps,
  Cascader,
  Transfer,
  Popover,
  Tooltip,
  Watermark,
  Form,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

// Form.Item 组件封装
const FormItemComponent: React.FC<any> = ({ children, label }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ marginBottom: 8, fontWeight: 500 }}>{label}</div>}
      <div>{children}</div>
    </div>
  );
};

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
 * 基础组件映射 - 包含所有预定义的 Antd 组件
 */
const baseComponentMap: Record<string, React.FC<any>> = {
  // 基础组件
  Button,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Switch,
  DatePicker,
  TimePicker,
  Upload: (props: any) => (
    <Upload {...props}>
      <Button icon={<UploadOutlined />}>点击上传</Button>
    </Upload>
  ),
  
  // 布局组件
  Card,
  Divider,
  Tabs,
  Collapse,
  Breadcrumb,
  Steps,
  Watermark,
  
  // 展示组件
  Image,
  Statistic,
  'Typography.Text': Text,
  'Typography.Title': Title,
  'Typography.Paragraph': Paragraph,
  Descriptions,
  Tag,
  Badge,
  Avatar,
  Table,
  Timeline,
  Tree,
  List,
  Empty,
  Result,
  Skeleton,
  Pagination,
  Calendar,
  QRCode,
  Popover,
  Tooltip,
  
  // 表单组件
  Form,
  'Form.Item': FormItemComponent,
  Rate,
  Slider,
  Radio: (props: any) => <Radio.Group {...props}><Radio value="a">选项A</Radio><Radio value="b">选项B</Radio><Radio value="c">选项C</Radio></Radio.Group>,
  Cascader,
  Transfer,
  Segmented,
  
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
  
  // 原生 HTML 元素
  'HTMLElement.div': (props: any) => <div {...props}>{props.children}</div>,
  'HTMLElement.span': (props: any) => <span {...props}>{props.children}</span>,
  'HTMLElement.p': (props: any) => <p {...props}>{props.children}</p>,
  'HTMLElement.h1': (props: any) => <h1 {...props}>{props.children}</h1>,
  'HTMLElement.h2': (props: any) => <h2 {...props}>{props.children}</h2>,
  'HTMLElement.h3': (props: any) => <h3 {...props}>{props.children}</h3>,
  'HTMLElement.img': (props: any) => <img {...props} alt={props.alt || ''} />,
  'HTMLElement.a': (props: any) => <a {...props}>{props.children}</a>,
  'HTMLElement.ul': (props: any) => {
    const { items, ...rest } = props;
    return (
      <ul {...rest}>
        {items ? items.map((item: string, index: number) => <li key={index}>{item}</li>) : props.children}
      </ul>
    );
  },
  'HTMLElement.ol': (props: any) => {
    const { items, ...rest } = props;
    return (
      <ol {...rest}>
        {items ? items.map((item: string, index: number) => <li key={index}>{item}</li>) : props.children}
      </ol>
    );
  },
  'HTMLElement.li': (props: any) => <li {...props}>{props.children}</li>,
  'HTMLElement.button': (props: any) => <button {...props}>{props.children}</button>,
  'HTMLElement.input': (props: any) => <input {...props} />,
  'HTMLElement.textarea': (props: any) => <textarea {...props} />,
  'HTMLElement.select': (props: any) => {
    const { options, ...rest } = props;
    return (
      <select {...rest}>
        {options ? options.map((opt: { label: string; value: string }, index: number) => (
          <option key={index} value={opt.value}>{opt.label}</option>
        )) : null}
      </select>
    );
  },
  'HTMLElement.form': (props: any) => <form {...props}>{props.children}</form>,
  'HTMLElement.table': (props: any) => <table {...props}>{props.children}</table>,
  'HTMLElement.code': (props: any) => <code {...props}>{props.children}</code>,
  'HTMLElement.pre': (props: any) => <pre {...props}>{props.children}</pre>,
};

/**
 * 自定义组件映射 - 存储运行时注册的自定义组件
 */
const customComponentMap: Record<string, React.FC<any>> = {};

/**
 * 组件变更监听器
 */
type ComponentChangeListener = () => void;
const listeners: Set<ComponentChangeListener> = new Set();

/**
 * 组件映射管理器
 */
export const ComponentMapManager = {
  /**
   * 获取组件
   */
  get(type: string): React.FC<any> | undefined {
    return baseComponentMap[type] || customComponentMap[type];
  },

  /**
   * 注册自定义组件
   */
  register(type: string, component: React.FC<any>): void {
    customComponentMap[type] = component;
    this.notifyChange();
  },

  /**
   * 移除自定义组件
   */
  unregister(type: string): void {
    delete customComponentMap[type];
    this.notifyChange();
  },

  /**
   * 检查组件是否存在
   */
  has(type: string): boolean {
    return type in baseComponentMap || type in customComponentMap;
  },

  /**
   * 获取所有组件类型
   */
  getAllTypes(): string[] {
    return [...Object.keys(baseComponentMap), ...Object.keys(customComponentMap)];
  },

  /**
   * 监听组件变更
   */
  onChange(listener: ComponentChangeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * 通知组件变更
   */
  notifyChange(): void {
    listeners.forEach(listener => listener());
  },

  /**
   * 获取基础组件映射（用于调试）
   */
  getBaseMap(): Record<string, React.FC<any>> {
    return { ...baseComponentMap };
  },

  /**
   * 获取自定义组件映射（用于调试）
   */
  getCustomMap(): Record<string, React.FC<any>> {
    return { ...customComponentMap };
  },
};

/**
 * 用于直接访问的组件映射对象（兼容旧代码）
 * 注意：这是一个 Proxy 对象，可以动态获取组件
 */
export const ComponentMap = new Proxy<Record<string, React.FC<any>>>(
  {},
  {
    get(_target, prop: string) {
      return ComponentMapManager.get(prop);
    },
    has(_target, prop: string) {
      return ComponentMapManager.has(prop);
    },
    ownKeys() {
      return ComponentMapManager.getAllTypes();
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (ComponentMapManager.has(prop)) {
        return {
          enumerable: true,
          configurable: true,
          value: ComponentMapManager.get(prop),
        };
      }
      return undefined;
    },
  }
);

export default ComponentMap;
