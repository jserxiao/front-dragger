# 自定义组件示例

本目录包含可导入到拖拽编辑器的自定义组件示例。

## 使用方法

1. 在工具栏点击 **"导入组件"** 按钮
2. 拖拽或点击上传组件文件（.tsx/.jsx）
3. 可选上传样式文件（.css/.less/.scss）
4. 填写表单：
   - **组件名称**（必填）：如 `ColorButton`
   - **组件分类**：选择基础/表单/布局/展示/反馈
   - **默认尺寸**：设置宽度和高度
   - **允许子组件**：是否可拖入子元素
5. 点击 **"导入组件"** 完成

## 示例组件

### 1. ColorButton - 彩色按钮

一个支持多种颜色和尺寸的按钮组件。

**文件：**
- `ColorButton.tsx` - 组件代码
- `ColorButton.module.css` - 样式文件（可选）

**属性：**
- `color`: 颜色（blue/green/red/purple/orange）
- `size`: 尺寸（small/middle/large）
- `children`: 按钮文字

### 2. InfoCard - 信息卡片

一个带图标的信息展示卡片。

**文件：**
- `InfoCard.tsx` - 组件代码

**属性：**
- `title`: 标题
- `description`: 描述文字
- `icon`: 图标（emoji）
- `variant`: 变体（default/primary/success/warning/error）

## 注意事项

1. **组件名要求**：必须以字母开头，只能包含字母、数字和下划线
2. **组件导出**：使用 `export default` 导出组件
3. **样式隔离**：建议使用内联样式或 CSS Modules
4. **Props 类型**：建议定义 TypeScript 接口
5. **文件大小**：建议组件代码不超过 50KB

## 组件模板

```tsx
import React from 'react';

interface MyComponentProps {
  children?: React.ReactNode;
  // 添加更多属性...
}

const MyComponent: React.FC<MyComponentProps> = ({ children }) => {
  return (
    <div className="my-component">
      {children}
    </div>
  );
};

export default MyComponent;
```

## 存储说明

导入的组件会存储在浏览器的 IndexedDB 中：
- 数据库名：`FrontDraggerDB`
- 存储对象：`customComponents`

清除浏览器数据会删除已导入的自定义组件。
