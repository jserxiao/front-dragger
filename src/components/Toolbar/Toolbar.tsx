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
  DragOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { codeGenerator } from '@/core';
import { SHORTCUTS, getShortcutText } from '@/constants';
import styles from './Toolbar.module.css';

/**
 * 工具栏组件
 */
const Toolbar: React.FC = () => {
  const {
    components,
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
  
  // 计算撤销/重做是否可用
  // 撤销：有历史记录可以撤销
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const undoDisabled = historyIndex <= 0;
  // 重做：画布上有组件时就不禁用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const redoDisabled = components.length === 0;

  // 导入 JSON 的 Modal
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJson, setImportJson] = useState('');

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      undo();
    }
  }, [historyIndex, undo]);

  // 重做
  const handleRedo = useCallback(() => {
      redo();
  }, [historyIndex, redo]);

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

      {/* 导入 Modal */}
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
    </div>
  );
};

export default Toolbar;
