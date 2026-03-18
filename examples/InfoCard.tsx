/**
 * 自定义组件示例：信息卡片
 * 
 * 一个带图标和标题的信息展示卡片组件
 */

import React from 'react';

interface InfoCardProps {
  title?: string;
  description?: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

const InfoCard: React.FC<InfoCardProps> = ({
  title = '信息卡片',
  description = '这是卡片的描述内容',
  icon = '📋',
  variant = 'default',
}) => {
  const variantStyles = {
    default: {
      borderColor: '#d9d9d9',
      backgroundColor: '#fff',
      iconBg: '#f5f5f5',
    },
    primary: {
      borderColor: '#1890ff',
      backgroundColor: '#e6f7ff',
      iconBg: '#1890ff',
    },
    success: {
      borderColor: '#52c41a',
      backgroundColor: '#f6ffed',
      iconBg: '#52c41a',
    },
    warning: {
      borderColor: '#faad14',
      backgroundColor: '#fffbe6',
      iconBg: '#faad14',
    },
    error: {
      borderColor: '#ff4d4f',
      backgroundColor: '#fff2f0',
      iconBg: '#ff4d4f',
    },
  };

  const style = variantStyles[variant];

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    border: `1px solid ${style.borderColor}`,
    borderLeftWidth: 4,
    borderRadius: 8,
    backgroundColor: style.backgroundColor,
    minWidth: 200,
  };

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: style.iconBg,
    fontSize: 20,
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  };

  const descStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 13,
    color: '#666',
    lineHeight: 1.5,
  };

  return (
    <div style={cardStyle}>
      <div style={iconStyle}>{icon}</div>
      <div style={contentStyle}>
        <h4 style={titleStyle}>{title}</h4>
        <p style={descStyle}>{description}</p>
      </div>
    </div>
  );
};

export default InfoCard;
