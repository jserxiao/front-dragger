import { ComponentConfig, CategoryConfig } from '@/types';
import {
  AppstoreOutlined,
  BorderOutlined,
  CheckSquareOutlined,
  FormOutlined,
  FileTextOutlined,
  PictureOutlined,
  SyncOutlined,
  CalendarOutlined,
  UploadOutlined,
  CreditCardOutlined,
  SplitCellsOutlined,
  ProfileOutlined,
  FundOutlined,
} from '@ant-design/icons';

/**
 * 组件分类配置
 */
export const CATEGORIES: CategoryConfig[] = [
  { key: 'basic', name: '基础组件', order: 1 },
  { key: 'form', name: '表单组件', order: 2 },
  { key: 'layout', name: '布局组件', order: 3 },
  { key: 'display', name: '展示组件', order: 4 },
];

/**
 * 预设组件配置
 */
export const PRESET_COMPONENTS: ComponentConfig[] = [
  // ============ 基础组件 ============
  {
    type: 'Button',
    name: '按钮',
    icon: <AppstoreOutlined />,
    category: 'basic',
    defaultProps: {
      children: '按钮',
      type: 'primary',
      size: 'middle',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'children',
        label: '按钮文字',
        type: 'string',
        defaultValue: '按钮',
        group: '基础',
      },
      {
        name: 'type',
        label: '按钮类型',
        type: 'select',
        defaultValue: 'primary',
        options: [
          { label: '主要按钮', value: 'primary' },
          { label: '默认按钮', value: 'default' },
          { label: '虚线按钮', value: 'dashed' },
          { label: '文字按钮', value: 'text' },
          { label: '链接按钮', value: 'link' },
        ],
        group: '基础',
      },
      {
        name: 'size',
        label: '尺寸',
        type: 'select',
        defaultValue: 'middle',
        options: [
          { label: '大', value: 'large' },
          { label: '中', value: 'middle' },
          { label: '小', value: 'small' },
        ],
        group: '基础',
      },
      {
        name: 'disabled',
        label: '禁用',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
      {
        name: 'block',
        label: '宽度撑满',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: true,
    defaultSize: { width: 'auto', height: 'auto' },
  },

  {
    type: 'Input',
    name: '输入框',
    icon: <FormOutlined />,
    category: 'basic',
    defaultProps: {
      placeholder: '请输入',
      size: 'middle',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'placeholder',
        label: '占位文本',
        type: 'string',
        defaultValue: '请输入',
        group: '基础',
      },
      {
        name: 'size',
        label: '尺寸',
        type: 'select',
        defaultValue: 'middle',
        options: [
          { label: '大', value: 'large' },
          { label: '中', value: 'middle' },
          { label: '小', value: 'small' },
        ],
        group: '基础',
      },
      {
        name: 'disabled',
        label: '禁用',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
      {
        name: 'allowClear',
        label: '允许清除',
        type: 'boolean',
        defaultValue: true,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 200, height: 'auto' },
  },

  {
    type: 'Select',
    name: '下拉选择',
    icon: <BorderOutlined />,
    category: 'basic',
    defaultProps: {
      placeholder: '请选择',
      size: 'middle',
      options: [
        { label: '选项一', value: '1' },
        { label: '选项二', value: '2' },
      ],
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'placeholder',
        label: '占位文本',
        type: 'string',
        defaultValue: '请选择',
        group: '基础',
      },
      {
        name: 'size',
        label: '尺寸',
        type: 'select',
        defaultValue: 'middle',
        options: [
          { label: '大', value: 'large' },
          { label: '中', value: 'middle' },
          { label: '小', value: 'small' },
        ],
        group: '基础',
      },
      {
        name: 'disabled',
        label: '禁用',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
      {
        name: 'allowClear',
        label: '允许清除',
        type: 'boolean',
        defaultValue: true,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 200, height: 'auto' },
  },

  // ============ 表单组件 ============
  {
    type: 'Checkbox',
    name: '复选框',
    icon: <CheckSquareOutlined />,
    category: 'form',
    defaultProps: {
      children: '复选框',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'children',
        label: '标签文字',
        type: 'string',
        defaultValue: '复选框',
        group: '基础',
      },
      {
        name: 'disabled',
        label: '禁用',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 'auto', height: 'auto' },
  },

  {
    type: 'Switch',
    name: '开关',
    icon: <SyncOutlined />,
    category: 'form',
    defaultProps: {
      checkedChildren: '开',
      unCheckedChildren: '关',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'checkedChildren',
        label: '选中文字',
        type: 'string',
        defaultValue: '开',
        group: '基础',
      },
      {
        name: 'unCheckedChildren',
        label: '未选中文字',
        type: 'string',
        defaultValue: '关',
        group: '基础',
      },
      {
        name: 'disabled',
        label: '禁用',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 'auto', height: 'auto' },
  },

  {
    type: 'DatePicker',
    name: '日期选择',
    icon: <CalendarOutlined />,
    category: 'form',
    defaultProps: {
      placeholder: '请选择日期',
      size: 'middle',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'placeholder',
        label: '占位文本',
        type: 'string',
        defaultValue: '请选择日期',
        group: '基础',
      },
      {
        name: 'size',
        label: '尺寸',
        type: 'select',
        defaultValue: 'middle',
        options: [
          { label: '大', value: 'large' },
          { label: '中', value: 'middle' },
          { label: '小', value: 'small' },
        ],
        group: '基础',
      },
      {
        name: 'disabled',
        label: '禁用',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 200, height: 'auto' },
  },

  {
    type: 'Upload',
    name: '上传',
    icon: <UploadOutlined />,
    category: 'form',
    defaultProps: {},
    defaultStyle: {},
    propSchema: [
      {
        name: 'disabled',
        label: '禁用',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 'auto', height: 'auto' },
  },

  // ============ 布局组件 ============
  {
    type: 'Card',
    name: '卡片',
    icon: <CreditCardOutlined />,
    category: 'layout',
    defaultProps: {
      title: '卡片标题',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'title',
        label: '标题',
        type: 'string',
        defaultValue: '卡片标题',
        group: '基础',
      },
      {
        name: 'bordered',
        label: '显示边框',
        type: 'boolean',
        defaultValue: true,
        group: '基础',
      },
      {
        name: 'hoverable',
        label: '悬停效果',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: true,
    defaultSize: { width: 300, height: 200 },
  },

  {
    type: 'Divider',
    name: '分割线',
    icon: <SplitCellsOutlined />,
    category: 'layout',
    defaultProps: {
      orientation: 'center',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'orientation',
        label: '文字位置',
        type: 'select',
        defaultValue: 'center',
        options: [
          { label: '居左', value: 'left' },
          { label: '居中', value: 'center' },
          { label: '居右', value: 'right' },
        ],
        group: '基础',
      },
      {
        name: 'dashed',
        label: '虚线',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: '100%', height: 'auto' },
  },

  // ============ 展示组件 ============
  {
    type: 'Typography.Text',
    name: '文本',
    icon: <FileTextOutlined />,
    category: 'display',
    defaultProps: {
      children: '这是一段文本',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'children',
        label: '文本内容',
        type: 'string',
        defaultValue: '这是一段文本',
        group: '基础',
      },
      {
        name: 'type',
        label: '文本类型',
        type: 'select',
        defaultValue: undefined,
        options: [
          { label: '默认', value: undefined },
          { label: '次要', value: 'secondary' },
          { label: '成功', value: 'success' },
          { label: '警告', value: 'warning' },
          { label: '危险', value: 'danger' },
        ],
        group: '基础',
      },
      {
        name: 'bold',
        label: '加粗',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
    ],
    allowChildren: true,
    defaultSize: { width: 'auto', height: 'auto' },
  },

  {
    type: 'Image',
    name: '图片',
    icon: <PictureOutlined />,
    category: 'display',
    defaultProps: {
      src: 'https://via.placeholder.com/200x150',
      alt: '图片',
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'src',
        label: '图片地址',
        type: 'string',
        defaultValue: 'https://via.placeholder.com/200x150',
        group: '基础',
      },
      {
        name: 'alt',
        label: '替代文本',
        type: 'string',
        defaultValue: '图片',
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 200, height: 150 },
  },

  {
    type: 'Statistic',
    name: '统计数值',
    icon: <FundOutlined />,
    category: 'display',
    defaultProps: {
      title: '活跃用户',
      value: 112893,
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'title',
        label: '标题',
        type: 'string',
        defaultValue: '活跃用户',
        group: '基础',
      },
      {
        name: 'value',
        label: '数值',
        type: 'number',
        defaultValue: 112893,
        group: '基础',
      },
      {
        name: 'prefix',
        label: '前缀',
        type: 'string',
        defaultValue: '',
        group: '基础',
      },
      {
        name: 'suffix',
        label: '后缀',
        type: 'string',
        defaultValue: '',
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: 'auto', height: 'auto' },
  },

  {
    type: 'Descriptions',
    name: '描述列表',
    icon: <ProfileOutlined />,
    category: 'display',
    defaultProps: {
      title: '描述列表',
      items: [
        { label: '姓名', children: '张三' },
        { label: '年龄', children: '25' },
        { label: '地址', children: '北京市朝阳区' },
      ],
    },
    defaultStyle: {},
    propSchema: [
      {
        name: 'title',
        label: '标题',
        type: 'string',
        defaultValue: '描述列表',
        group: '基础',
      },
      {
        name: 'bordered',
        label: '显示边框',
        type: 'boolean',
        defaultValue: false,
        group: '基础',
      },
      {
        name: 'column',
        label: '列数',
        type: 'number',
        defaultValue: 3,
        min: 1,
        max: 4,
        group: '基础',
      },
    ],
    allowChildren: false,
    defaultSize: { width: '100%', height: 'auto' },
  },
];
