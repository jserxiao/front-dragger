import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Tooltip,
  Space,
  Dropdown,
  Modal,
  Input,
  message,
  Switch,
  InputNumber,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  ClearOutlined,
  DownloadOutlined,
  UploadOutlined,
  SettingOutlined,
  SaveOutlined,
  CopyOutlined,
  SnippetsOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  AppstoreAddOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { ComponentRegistry } from '@/core';
import { SHORTCUTS, getShortcutText } from '@/constants';
import { ComponentNode } from '@/types';
import { BatchAddModal, TreeNodeData } from '@/components/BatchAddModal';
import { ImportComponentModal } from '@/components/ImportComponentModal';
import styles from './Toolbar.module.css';

/**
 * 工具栏组件
 */
const Toolbar: React.FC = () => {
  const {
    canvas,
    undo,
    redo,
    deleteComponents,
    clearCanvas,
    copyComponents,
    pasteComponents,
    cutComponents,
    duplicateComponents,
    setScale,
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    loadComponents,
    exportComponents,
    saveHistory,
  } = useEditorStore();

  // 直接订阅历史状态，而不是通过函数
  const historyIndex = useEditorStore((state) => state.historyIndex);

  const { selectedIds, scale, showGrid, snapToGrid, gridSize } = canvas;
  
  // 处理撤销/重做
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      undo();
    }
  }, [historyIndex, undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  // 导入 JSON 的 Modal
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJson, setImportJson] = useState('');

  // 批量添加组件的 Modal
  const [batchAddModalVisible, setBatchAddModalVisible] = useState(false);

  // 导入自定义组件的 Modal
  const [importComponentModalVisible, setImportComponentModalVisible] = useState(false);

  // 获取 addComponent 方法
  const addComponent = useEditorStore((state) => state.addComponent);

  // 删除选中
  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      deleteComponents(selectedIds);
    }
  }, [selectedIds, deleteComponents]);

  // 复制
  const handleCopy = useCallback(() => {
    if (selectedIds.length > 0) {
      copyComponents();
      message.success('已复制');
    }
  }, [selectedIds, copyComponents]);

  // 粘贴
  const handlePaste = useCallback(() => {
    pasteComponents();
  }, [pasteComponents]);

  // 剪切
  const handleCut = useCallback(() => {
    if (selectedIds.length > 0) {
      cutComponents();
      message.success('已剪切');
    }
  }, [selectedIds, cutComponents]);

  // 复制并粘贴
  const handleDuplicate = useCallback(() => {
    if (selectedIds.length > 0) {
      duplicateComponents(selectedIds);
    }
  }, [selectedIds, duplicateComponents]);

  // 缩放
  const handleZoomIn = useCallback(() => {
    setScale(scale + 0.1);
  }, [scale, setScale]);

  const handleZoomOut = useCallback(() => {
    setScale(scale - 0.1);
  }, [scale, setScale]);

  const handleResetZoom = useCallback(() => {
    setScale(1);
  }, [setScale]);

  // 导出
  const handleExport = useCallback(() => {
    const data = exportComponents();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'canvas-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('导出成功');
  }, [exportComponents]);

  // 导入
  const handleImport = useCallback(() => {
    try {
      const data = JSON.parse(importJson);
      loadComponents(data);
      setImportModalVisible(false);
      setImportJson('');
      message.success('导入成功');
    } catch (error) {
      message.error('导入失败，请检查 JSON 格式');
    }
  }, [importJson, loadComponents]);

  // 保存到本地存储
  const handleSave = useCallback(() => {
    const data = exportComponents();
    localStorage.setItem('front-dragger-data', JSON.stringify(data));
    saveHistory('update', '保存项目');
    message.success('已保存到本地');
  }, [exportComponents, saveHistory]);

  // 将 TreeNodeData 转换为 ComponentNode
  const convertTreeNodeToComponent = useCallback((
    node: TreeNodeData,
    parentId: string | null = null,
    parentPosition: { x: number; y: number } = { x: 0, y: 0 }
  ): ComponentNode => {
    const config = ComponentRegistry.getComponent(node.componentType);
    if (!config) {
      throw new Error(`Unknown component type: ${node.componentType}`);
    }

    // 计算绝对位置：根节点为 (0, 0)，子节点为父节点位置 + 相对偏移
    const absolutePosition = {
      x: parentPosition.x + node.relativeX,
      y: parentPosition.y + node.relativeY,
    };

    // 子节点的相对位置（用于 CanvasItem 渲染）
    const relativePosition = parentId ? { x: node.relativeX, y: node.relativeY } : undefined;

    const componentNode: ComponentNode = {
      id: node.id,
      type: node.componentType,
      name: node.componentName,
      props: {},
      style: { ...config.defaultStyle },
      children: [], // 不再嵌套子组件，保持为空
      position: absolutePosition,
      relativePosition,
      size: { ...config.defaultSize },
      parentId: parentId || undefined,
      extraProps: { ...config.defaultProps, className: node.componentType.toLowerCase() },
    };

    return componentNode;
  }, []);

  // 扁平化节点树，收集所有节点
  const flattenNodes = useCallback((nodes: TreeNodeData[], result: ComponentNode[] = []): ComponentNode[] => {
    nodes.forEach(node => {
      const config = ComponentRegistry.getComponent(node.componentType);
      if (!config) return;

      // 找到父节点的位置
      let parentPosition = { x: 0, y: 0 };
      if (node.parentId) {
        const parent = result.find(n => n.id === node.parentId);
        if (parent) {
          parentPosition = parent.position;
        }
      }

      const componentNode = convertTreeNodeToComponent(node, node.parentId, parentPosition);
      result.push(componentNode);

      // 递归处理子节点
      if (node.children.length > 0) {
        flattenNodes(node.children, result);
      }
    });
    return result;
  }, [convertTreeNodeToComponent]);

  // 处理批量添加确认
  const handleBatchAddConfirm = useCallback((nodes: TreeNodeData[]) => {
    // 扁平化所有节点
    const allComponents = flattenNodes(nodes);
    
    // 按顺序添加所有组件（先添加父节点，再添加子节点）
    allComponents.forEach(componentNode => {
      addComponent(componentNode);
    });
    
    message.success(`成功添加 ${allComponents.length} 个组件`);
  }, [addComponent, flattenNodes]);

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // 撤销
      if (ctrl && e.key === 'z' && !shift) {
        e.preventDefault();
        handleUndo();
      }

      // 重做
      if (ctrl && (e.key === 'y' || (e.key === 'z' && shift))) {
        e.preventDefault();
        handleRedo();
      }

      // 复制
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }

      // 粘贴
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }

      // 剪切
      if (ctrl && e.key === 'x') {
        e.preventDefault();
        handleCut();
      }

      // 复制并粘贴
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      }

      // 删除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }

      // 全选
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        // TODO: 全选实现
      }

      // 保存
      if (ctrl && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // 缩放
      if (ctrl && e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }

      if (ctrl && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }

      if (ctrl && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleUndo,
    handleRedo,
    handleCopy,
    handlePaste,
    handleCut,
    handleDuplicate,
    handleDelete,
    handleSave,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  ]);

  // 设置菜单
  const settingsMenu: MenuProps['items'] = [
    {
      key: 'grid',
      label: (
        <div className={styles.menuItem}>
          <span>显示网格</span>
          <Switch
            size="small"
            checked={showGrid}
            onChange={toggleGrid}
          />
        </div>
      ),
    },
    {
      key: 'snap',
      label: (
        <div className={styles.menuItem}>
          <span>吸附到网格</span>
          <Switch
            size="small"
            checked={snapToGrid}
            onChange={toggleSnapToGrid}
          />
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'gridSize',
      label: (
        <div className={styles.menuItem}>
          <span>网格大小</span>
          <InputNumber
            size="small"
            min={10}
            max={100}
            value={gridSize}
            onChange={(v) => setGridSize(v || 20)}
            style={{ width: 60 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <Space size={4}>
          {/* 历史操作 */}
          <Tooltip title={`撤销 (${getShortcutText(SHORTCUTS[0])})`}>
            <Button
              type="text"
              icon={<UndoOutlined />}
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            />
          </Tooltip>
          <Tooltip title={`重做 (${getShortcutText(SHORTCUTS[1])})`}>
            <Button
              type="text"
              icon={<RedoOutlined />}
              onClick={handleRedo}
            />
          </Tooltip>

          <div className={styles.divider} />

          {/* 编辑操作 */}
          <Tooltip title={`复制 (${getShortcutText(SHORTCUTS[3])})`}>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopy}
              disabled={selectedIds.length === 0}
            />
          </Tooltip>
          <Tooltip title={`粘贴 (${getShortcutText(SHORTCUTS[4])})`}>
            <Button
              type="text"
              icon={<SnippetsOutlined />}
              onClick={handlePaste}
            />
          </Tooltip>
          <Tooltip title={`删除 (${getShortcutText(SHORTCUTS[7])})`}>
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              disabled={selectedIds.length === 0}
              danger
            />
          </Tooltip>
        </Space>
      </div>

      <div className={styles.center}>
        <Space size={4}>
          {/* 按钮组 */}
          <Tooltip title="批量增加组件">
            <Button
              type="text"
              icon={<AppstoreAddOutlined />}
              onClick={() => setBatchAddModalVisible(true)}
            >
              批量添加
            </Button>
          </Tooltip>
          <Tooltip title="导入自定义组件">
            <Button
              type="text"
              icon={<ImportOutlined />}
              onClick={() => setImportComponentModalVisible(true)}
            >
              导入组件
            </Button>
          </Tooltip>

          <div className={styles.divider} />

          {/* 缩放 */}
          <Tooltip title="放大 (Ctrl + =)">
            <Button
              type="text"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
            />
          </Tooltip>
          <span className={styles.zoomValue}>{Math.round(scale * 100)}%</span>
          <Tooltip title="缩小 (Ctrl + -)">
            <Button
              type="text"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
            />
          </Tooltip>
          <Tooltip title="重置缩放 (Ctrl + 0)">
            <Button
              type="text"
              onClick={handleResetZoom}
            >
              100%
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div className={styles.right}>
        <Space size={4}>
          {/* 设置 */}
          <Dropdown
            menu={{ items: settingsMenu }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<SettingOutlined />}
            />
          </Dropdown>

          <div className={styles.divider} />

          {/* 文件操作 */}
          <Tooltip title="清空画布">
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={clearCanvas}
            />
          </Tooltip>
          <Tooltip title={`保存 (Ctrl + S)`}>
            <Button
              type="text"
              icon={<SaveOutlined />}
              onClick={handleSave}
            />
          </Tooltip>
          <Tooltip title="导入配置">
            <Button
              type="text"
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
            />
          </Tooltip>
          <Tooltip title="导出配置">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 导入配置 Modal */}
      <Modal
        title="导入配置"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => {
          setImportModalVisible(false);
          setImportJson('');
        }}
        width={600}
      >
        <Input.TextArea
          rows={10}
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder="请粘贴 JSON 配置..."
        />
      </Modal>

      {/* 批量添加组件 Modal */}
      <BatchAddModal
        visible={batchAddModalVisible}
        onCancel={() => setBatchAddModalVisible(false)}
        onConfirm={handleBatchAddConfirm}
      />

      {/* 导入自定义组件 Modal */}
      <ImportComponentModal
        visible={importComponentModalVisible}
        onClose={() => setImportComponentModalVisible(false)}
        onSuccess={() => {
          setImportComponentModalVisible(false);
        }}
      />
    </div>
  );
};

export default Toolbar;
