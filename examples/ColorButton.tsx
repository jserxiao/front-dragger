/**
 * 自定义组件示例：彩色按钮
 * 
 * 使用说明：
 * 1. 在工具栏点击"导入组件"按钮
 * 2. 上传此 TSX 文件
 * 3. 填写组件名称：ColorButton
 * 4. 选择分类和默认尺寸
 * 5. 点击导入
 */

import React from 'react';

interface ColorButtonProps {
  children?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  size?: 'small' | 'middle' | 'large';
  onClick?: () => void;
}

const ColorButton: React.FC<ColorButtonProps> = ({
  children = '按钮',
  color = 'blue',
  size = 'middle',
  onClick,
}) => {
  const colorMap = {
    blue: '#1890ff',
    green: '#52c41a',
    red: '#ff4d4f',
    purple: '#722ed1',
    orange: '#fa8c16',
  };

  const sizeMap = {
    small: { padding: '4px 12px', fontSize: '12px' },
    middle: { padding: '8px 16px', fontSize: '14px' },
    large: { padding: '12px 24px', fontSize: '16px' },
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorMap[color],
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.3s',
    ...sizeMap[size],
  };

  return (
    <button style={buttonStyle} onClick={onClick}>
      {children}
    </button>
  );
};

export default ColorButton;
