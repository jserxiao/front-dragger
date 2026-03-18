import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Button,
  InputNumber,
  Space,
  Dropdown,
  Tooltip,
  Empty,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ComponentRegistry } from '@/core';
import { v4 as uuidv4 } from 'uuid';
import styles from './BatchAddModal.module.css';

/**
 * 节点树中的节点数据
 */
export interface TreeNodeData {
  id: string;
  componentType: string;
  componentName: string;
  relativeX: number;
  relativeY: number;
  children: TreeNodeData[];
  parentId: string | null;
}

interface BatchAddModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (nodes: TreeNodeData[]) => void;
}

/**
 * 批量添加组件弹窗
 */
const BatchAddModal: React.FC<BatchAddModalProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  // 节点树数据
  const [nodes, setNodes] = useState<TreeNodeData[]>([]);

  // 组件选项
  const componentOptions = useMemo(() => {
    try {
      const categories = ComponentRegistry.getCategories();
      if (!categories || !Array.isArray(categories)) {
        return [];
      }
      
      const options: { label: string; options: { label: string; value: string; icon: React.ReactNode }[] }[] = [];
      
      categories.forEach(category => {
        const comps = ComponentRegistry.getComponentsByCategory(category.key);
        if (comps && Array.isArray(comps) && comps.length > 0) {
          options.push({
            label: category.name,
            options: comps.map(c => ({
              label: c.name,
              value: c.type,
              icon: c.icon,
            })),
          });
        }
      });
      
      return options;
    } catch (e) {
      console.error('Failed to get component options:', e);
      return [];
    }
  }, []);

  // 创建新节点
  const createNode = useCallback((componentType: string, parentId: string | null = null): TreeNodeData => {
    const config = ComponentRegistry.getComponent(componentType);
    return {
      id: uuidv4(),
      componentType,
      componentName: config?.name || componentType,
      relativeX: 0,
      relativeY: 0,
      children: [],
      parentId,
    };
  }, []);

  // 添加根节点
  const handleAddRootNode = useCallback((componentType: string) => {
    const newNode = createNode(componentType, null);
    setNodes(prev => [...prev, newNode]);
  }, [createNode]);

  // 添加子节点
  const handleAddChildNode = useCallback((parentId: string, componentType: string) => {
    const newNode = createNode(componentType, parentId);
    
    const addChildToNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...node.children, newNode],
          };
        }
        if (node.children.length > 0) {
          return {
            ...node,
            children: addChildToNode(node.children),
          };
        }
        return node;
      });
    };
    
    setNodes(prev => addChildToNode(prev));
  }, [createNode]);

  // 删除节点
  const handleDeleteNode = useCallback((nodeId: string) => {
    const removeNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes
        .filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          children: removeNode(node.children),
        }));
    };
    
    setNodes(prev => removeNode(prev));
  }, []);

  // 更新节点位置
  const handleUpdatePosition = useCallback((nodeId: string, field: 'relativeX' | 'relativeY', value: number) => {
    const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, [field]: value };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setNodes(prev => updateNode(prev));
  }, []);

  // 确认
  const handleConfirm = useCallback(() => {
    onConfirm(nodes);
    setNodes([]);
    onCancel();
  }, [nodes, onConfirm, onCancel]);

  // 取消
  const handleCancel = useCallback(() => {
    setNodes([]);
    onCancel();
  }, [onCancel]);

  // 渲染节点卡片
  const renderNodeCard = (node: TreeNodeData, depth: number = 0) => {
    const config = ComponentRegistry.getComponent(node.componentType);
    
    // 子组件下拉菜单
    const childMenuItems: MenuProps['items'] = componentOptions.map(group => ({
      key: group.label,
      label: group.label,
      children: group.options.map(opt => ({
        key: opt.value,
        label: (
          <div className={styles.menuItemContent}>
            <span className={styles.menuItemIcon}>{opt.icon}</span>
            <span>{opt.label}</span>
          </div>
        ),
        onClick: () => handleAddChildNode(node.id, opt.value),
      })),
    }));

    return (
      <div key={node.id} className={styles.nodeWrapper}>
        <div className={styles.nodeCard} style={{ marginLeft: depth * 40 }}>
          {/* 组件缩略图 */}
          <div className={styles.nodeThumbnail}>
            <div className={styles.thumbnailIcon}>
              {config?.icon || <SettingOutlined />}
            </div>
            <div className={styles.thumbnailName}>{node.componentName}</div>
          </div>

          {/* 相对位置配置 */}
          <div className={styles.positionConfig}>
            <Space size={4}>
              <span className={styles.positionLabel}>X:</span>
              <InputNumber
                size="small"
                value={node.relativeX}
                onChange={(v) => handleUpdatePosition(node.id, 'relativeX', v || 0)}
                style={{ width: 60 }}
                disabled={node.parentId === null}
              />
              <span className={styles.positionLabel}>Y:</span>
              <InputNumber
                size="small"
                value={node.relativeY}
                onChange={(v) => handleUpdatePosition(node.id, 'relativeY', v || 0)}
                style={{ width: 60 }}
                disabled={node.parentId === null}
              />
            </Space>
          </div>

          {/* 操作按钮 */}
          <div className={styles.nodeActions}>
            {/* 添加子节点 */}
            <Dropdown
              menu={{ items: childMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Tooltip title="添加子组件">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  className={styles.actionBtn}
                />
              </Tooltip>
            </Dropdown>

            {/* 删除节点 */}
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className={styles.deleteBtn}
                onClick={() => handleDeleteNode(node.id)}
              />
            </Tooltip>
          </div>
        </div>

        {/* 连接线 */}
        {node.children.length > 0 && (
          <div className={styles.childrenContainer}>
            <div className={styles.connectionLine} />
            {node.children.map(child => renderNodeCard(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // 根节点下拉菜单
  const rootMenuItems: MenuProps['items'] = useMemo(() => {
    return componentOptions.map(group => ({
      key: group.label,
      label: group.label,
      children: group.options.map(opt => ({
        key: opt.value,
        label: (
          <div className={styles.menuItemContent}>
            <span className={styles.menuItemIcon}>{opt.icon}</span>
            <span>{opt.label}</span>
          </div>
        ),
        onClick: () => handleAddRootNode(opt.value),
      })),
    }));
  }, [componentOptions, handleAddRootNode]);

  return (
    <Modal
      title="批量添加组件"
      open={visible}
      onCancel={handleCancel}
      onOk={handleConfirm}
      width={800}
      okText="确认添加"
      cancelText="取消"
      okButtonProps={{ disabled: nodes.length === 0 }}
    >
      <div className={styles.container}>
        {/* 添加根节点按钮 */}
        <div className={styles.addNodeSection}>
          <Dropdown
            menu={{ items: rootMenuItems }}
            trigger={['click']}
          >
            <Button type="dashed" icon={<PlusOutlined />}>
              添加根节点组件
            </Button>
          </Dropdown>
        </div>

        {/* 节点树展示 */}
        <div className={styles.treeContainer}>
          {nodes.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请添加根节点组件开始构建"
            />
          ) : (
            <div className={styles.treeContent}>
              {nodes.map(node => renderNodeCard(node))}
            </div>
          )}
        </div>

        {/* 说明 */}
        <div className={styles.tips}>
          <p>• 根节点将放置在画布坐标 (0, 0) 位置</p>
          <p>• 子节点的 X、Y 是相对于父节点的偏移量</p>
          <p>• 点击 + 号可以添加子组件节点</p>
        </div>
      </div>
    </Modal>
  );
};

export default BatchAddModal;
