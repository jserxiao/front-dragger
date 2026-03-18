import { useMemo, useState, useEffect } from 'react';
import {
  Input,
  InputNumber,
  Select,
  Switch,
  ColorPicker,
  Collapse,
  Empty,
  Button,
  Tabs,
  Upload,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import { DeleteOutlined, SettingOutlined, PictureOutlined, UploadOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { ComponentRegistry } from '@/core';
import { PropSchema, CanvasStyle } from '@/types';
import styles from './PropertyPanel.module.css';

/**
 * 属性配置面板
 */
const PropertyPanel: React.FC = () => {
  const { components, canvas, updateComponent, deleteComponents, setCanvasStyle, selectComponent, clearSelection } =
    useEditorStore();
  const { selectedIds, canvasStyle } = canvas;

  // JSON 输入框的本地状态
  const [jsonInputValue, setJsonInputValue] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');

  // 获取选中的组件
  const selectedComponent = useMemo(() => {
    if (selectedIds.length !== 1) return null;

    const findComponent = (
      comps: typeof components,
      id: string
    ): typeof components[0] | null => {
      for (const comp of comps) {
        if (comp.id === id) return comp;
        if (comp.children) {
          const found = findComponent(comp.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    return findComponent(components, selectedIds[0]);
  }, [components, selectedIds]);

  // 获取组件配置
  const componentConfig = useMemo(() => {
    if (!selectedComponent) return null;
    return ComponentRegistry.getComponent(selectedComponent.type);
  }, [selectedComponent]);

  // 处理属性变更
  const handlePropChange = (propName: string, value: unknown) => {
    if (!selectedComponent) return;

    updateComponent(selectedComponent.id, {
      props: {
        ...selectedComponent.props,
        [propName]: value,
      },
    });
  };

  // 同步 extraProps 到本地 JSON 输入状态
  useEffect(() => {
    if (selectedComponent?.extraProps) {
      setJsonInputValue(JSON.stringify(selectedComponent.extraProps, null, 2));
    } else {
      setJsonInputValue('');
    }
    setJsonError('');
  }, [selectedComponent?.id, selectedComponent?.extraProps]);

  // 处理样式变更
  const handleStyleChange = (styleProp: string, value: unknown) => {
    if (!selectedComponent) return;

    updateComponent(selectedComponent.id, {
      style: {
        ...selectedComponent.style,
        [styleProp]: value,
      },
    });
  };

  // 处理位置变更
  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    if (!selectedComponent) return;

    updateComponent(selectedComponent.id, {
      position: {
        ...selectedComponent.position,
        [axis]: value,
      },
    });
  };

  // 处理尺寸变更
  const handleSizeChange = (dimension: 'width' | 'height', value: number | string) => {
    if (!selectedComponent) return;

    updateComponent(selectedComponent.id, {
      size: {
        ...selectedComponent.size,
        [dimension]: value,
      },
    });
  };

  // 渲染属性编辑器
  const renderPropEditor = (schema: PropSchema) => {
    const value = selectedComponent?.props[schema.name] ?? schema.defaultValue;

    switch (schema.type) {
      case 'string':
        return (
          <Input
            value={value as string}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePropChange(schema.name, e.target.value)}
            placeholder={`请输入${schema.label}`}
          />
        );

      case 'number':
        return (
          <InputNumber
            value={value as number}
            onChange={(v: number | null) => handlePropChange(schema.name, v)}
            min={schema.min}
            max={schema.max}
            style={{ width: '100%' }}
          />
        );

      case 'boolean':
        return (
          <Switch
            checked={value as boolean}
            onChange={(v: boolean) => handlePropChange(schema.name, v)}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onChange={(v: unknown) => handlePropChange(schema.name, v)}
            options={schema.options}
            style={{ width: '100%' }}
            allowClear
          />
        );

      case 'color':
        return (
          <ColorPicker
            value={value as string}
            onChange={(color: Color) => handlePropChange(schema.name, color.toHexString())}
            showText
          />
        );

      default:
        return (
          <Input
            value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handlePropChange(schema.name, parsed);
              } catch {
                handlePropChange(schema.name, e.target.value);
              }
            }}
          />
        );
    }
  };

  // 处理画布样式变更
  const handleCanvasStyleChange = (key: keyof CanvasStyle, value: unknown) => {
    setCanvasStyle({ [key]: value });
  };

  // 处理图片上传
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleCanvasStyleChange('backgroundImage', e.target?.result as string);
    };
    reader.readAsDataURL(file);
    return false;
  };

  // 渲染画布设置面板
  const renderCanvasSettings = () => (
    <div className={styles.canvasSettings}>
      <Collapse
        defaultActiveKey={['尺寸', '背景']}
        ghost
        items={[
          {
            key: '尺寸',
            label: '尺寸',
            children: (
              <div className={styles.propGroup}>
                <div className={styles.propItem}>
                  <label className={styles.label}>宽度</label>
                  <InputNumber
                    value={canvasStyle.width}
                    onChange={(v) => handleCanvasStyleChange('width', v ?? 1920)}
                    min={100}
                    max={10000}
                    style={{ width: '100%' }}
                    suffix="px"
                  />
                </div>
                <div className={styles.propItem}>
                  <label className={styles.label}>高度</label>
                  <InputNumber
                    value={canvasStyle.height}
                    onChange={(v) => handleCanvasStyleChange('height', v ?? 1080)}
                    min={100}
                    max={10000}
                    style={{ width: '100%' }}
                    suffix="px"
                  />
                </div>
              </div>
            ),
          },
          {
            key: '背景',
            label: '背景',
            children: (
              <div className={styles.propGroup}>
                <div className={styles.propItem}>
                  <label className={styles.label}>背景颜色</label>
                  <ColorPicker
                    value={canvasStyle.backgroundColor}
                    onChange={(color: Color) => handleCanvasStyleChange('backgroundColor', color.toHexString())}
                    showText
                    allowClear
                  />
                </div>
                <div className={styles.propItem}>
                  <label className={styles.label}>背景图片</label>
                  <div className={styles.imageUpload}>
                    {canvasStyle.backgroundImage ? (
                      <div className={styles.imagePreview}>
                        <img src={canvasStyle.backgroundImage} alt="背景" />
                        <Button
                          size="small"
                          danger
                          onClick={() => handleCanvasStyleChange('backgroundImage', '')}
                        >
                          移除
                        </Button>
                      </div>
                    ) : (
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={handleImageUpload}
                      >
                        <Button icon={<UploadOutlined />} block>
                          上传图片
                        </Button>
                      </Upload>
                    )}
                  </div>
                </div>
                {canvasStyle.backgroundImage && (
                  <>
                    <div className={styles.propItem}>
                      <label className={styles.label}>背景尺寸</label>
                      <Select
                        value={canvasStyle.backgroundSize}
                        onChange={(v) => handleCanvasStyleChange('backgroundSize', v)}
                        options={[
                          { value: 'cover', label: '覆盖' },
                          { value: 'contain', label: '包含' },
                          { value: 'auto', label: '原始' },
                        ]}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className={styles.propItem}>
                      <label className={styles.label}>背景位置</label>
                      <Select
                        value={canvasStyle.backgroundPosition}
                        onChange={(v) => handleCanvasStyleChange('backgroundPosition', v)}
                        options={[
                          { value: 'center', label: '居中' },
                          { value: 'top', label: '顶部' },
                          { value: 'bottom', label: '底部' },
                          { value: 'left', label: '左侧' },
                          { value: 'right', label: '右侧' },
                          { value: 'top left', label: '左上' },
                          { value: 'top right', label: '右上' },
                          { value: 'bottom left', label: '左下' },
                          { value: 'bottom right', label: '右下' },
                        ]}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className={styles.propItem}>
                      <label className={styles.label}>背景重复</label>
                      <Select
                        value={canvasStyle.backgroundRepeat}
                        onChange={(v) => handleCanvasStyleChange('backgroundRepeat', v)}
                        options={[
                          { value: 'no-repeat', label: '不重复' },
                          { value: 'repeat', label: '重复' },
                          { value: 'repeat-x', label: '水平重复' },
                          { value: 'repeat-y', label: '垂直重复' },
                        ]}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );

  // 按分组组织属性
  const groupedProps = useMemo(() => {
    if (!componentConfig) return {};

    const groups: Record<string, PropSchema[]> = {};

    componentConfig.propSchema.forEach((schema) => {
      const group = schema.group || '基础';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(schema);
    });

    return groups;
  }, [componentConfig]);

  // 构建 Collapse items
  const collapseItems = useMemo(() => {
    const items = [];

    // 布局属性
    items.push({
      key: '布局',
      label: '布局',
      children: (
        <div className={styles.propGroup}>
          <div className={styles.propItem}>
            <label className={styles.label}>X 坐标</label>
            <InputNumber
              value={selectedComponent?.position.x}
              onChange={(v: number | null) => handlePositionChange('x', v ?? 0)}
              style={{ width: '100%' }}
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>Y 坐标</label>
            <InputNumber
              value={selectedComponent?.position.y}
              onChange={(v: number | null) => handlePositionChange('y', v ?? 0)}
              style={{ width: '100%' }}
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>宽度</label>
            <Input
              value={selectedComponent?.size.width as string}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;
                handleSizeChange('width', v === '' ? 'auto' : isNaN(Number(v)) ? v : Number(v));
              }}
              placeholder="auto"
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>高度</label>
            <Input
              value={selectedComponent?.size.height as string}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;
                handleSizeChange('height', v === '' ? 'auto' : isNaN(Number(v)) ? v : Number(v));
              }}
              placeholder="auto"
            />
          </div>
        </div>
      ),
    });

    // 样式属性
    items.push({
      key: '样式',
      label: '样式',
      children: (
        <div className={styles.propGroup}>
          <div className={styles.propItem}>
            <label className={styles.label}>背景色</label>
            <ColorPicker
              value={selectedComponent?.style?.backgroundColor as string}
              onChange={(color: Color) => handleStyleChange('backgroundColor', color.toHexString())}
              showText
              allowClear
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>边框颜色</label>
            <ColorPicker
              value={selectedComponent?.style?.borderColor as string}
              onChange={(color: Color) => handleStyleChange('borderColor', color.toHexString())}
              showText
              allowClear
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>边框宽度</label>
            <InputNumber
              value={selectedComponent?.style?.borderWidth as number}
              onChange={(v: number | null) => handleStyleChange('borderWidth', v)}
              min={0}
              suffix="px"
              style={{ width: '100%' }}
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>圆角</label>
            <InputNumber
              value={selectedComponent?.style?.borderRadius as number}
              onChange={(v: number | null) => handleStyleChange('borderRadius', v)}
              min={0}
              suffix="px"
              style={{ width: '100%' }}
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>透明度</label>
            <InputNumber
              value={selectedComponent?.style?.opacity as number}
              onChange={(v: number | null) => handleStyleChange('opacity', v)}
              min={0}
              max={1}
              step={0.1}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      ),
    });

    // 组件属性
    Object.entries(groupedProps).forEach(([group, props]) => {
      items.push({
        key: group,
        label: group,
        children: (
          <div className={styles.propGroup}>
            {props.map((schema) => (
              <div key={schema.name} className={styles.propItem}>
                <label className={styles.label}>{schema.label}</label>
                {renderPropEditor(schema)}
              </div>
            ))}
          </div>
        ),
      });
    });

    // 自定义属性面板（放在最后）
    items.push({
      key: 'extraProps',
      label: '自定义属性',
      children: (
        <div className={styles.propGroup}>
          <div className={styles.propItem} style={{ flexDirection: 'column' }}>
            <label className={styles.label}>JSON 属性</label>
            <Input.TextArea
              value={jsonInputValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const value = e.target.value;
                setJsonInputValue(value);
                
                const trimmedValue = value.trim();
                if (!trimmedValue) {
                  // 清空时删除 extraProps
                  setJsonError('');
                  if (selectedComponent) {
                    updateComponent(selectedComponent.id, { extraProps: undefined });
                  }
                  return;
                }
                
                try {
                  const parsed = JSON.parse(trimmedValue);
                  setJsonError('');
                  if (selectedComponent) {
                    updateComponent(selectedComponent.id, { extraProps: parsed });
                  }
                } catch {
                  // JSON 格式错误时只显示错误提示，不清空输入框，也不更新 extraProps
                  setJsonError('JSON 格式错误');
                }
              }}
              placeholder='{"data-testid": "my-button", "aria-label": "提交"}'
              autoSize={{ minRows: 3, maxRows: 10 }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              status={jsonError ? 'error' : undefined}
            />
            {jsonError && <span className={styles.error}>{jsonError}</span>}
            <span className={styles.hint}>输入 JSON 格式的额外属性，将直接映射到组件上</span>
          </div>
        </div>
      ),
    });

    return items;
  }, [selectedComponent, groupedProps, jsonInputValue, jsonError]);

  // Tab 状态管理
  const [activeTab, setActiveTab] = useState<string>(selectedComponent ? 'component' : 'canvas');

  // 处理 tab 切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // 切换到画布设置时清除选中状态
    if (key === 'canvas') {
      clearSelection();
    }
  };

  // 当选中组件时自动切换到组件属性 tab
  useEffect(() => {
    if (selectedComponent) {
      setActiveTab('component');
    }
  }, [selectedComponent]);

  // 当取消选中（点击画布空白处）时切换到画布设置 tab
  useEffect(() => {
    if (selectedIds.length === 0 && activeTab === 'component') {
      setActiveTab('canvas');
    }
  }, [selectedIds.length, activeTab]);

  // 获取扁平化的组件列表（用于显示）
  const flattenedComponents = useMemo(() => {
    const result: Array<{ id: string; name: string; type: string; depth: number }> = [];
    
    const flatten = (comps: typeof components, depth: number = 0) => {
      comps.forEach((comp) => {
        result.push({
          id: comp.id,
          name: comp.name,
          type: comp.type,
          depth,
        });
        if (comp.children && comp.children.length > 0) {
          flatten(comp.children, depth + 1);
        }
      });
    };
    
    flatten(components);
    return result;
  }, [components]);

  // 处理组件列表项点击
  const handleComponentItemClick = (id: string, multi: boolean = false) => {
    selectComponent(id, multi);
  };

  // 处理组件列表项删除
  const handleComponentItemDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteComponents([id]);
  };

  // Tabs 配置
  const tabItems = [
    {
      key: 'component',
      label: '组件属性',
      icon: <SettingOutlined />,
      children: selectedComponent ? (
        <>
          <div className={styles.componentInfoBar}>
            <span className={styles.componentType}>{componentConfig?.name}</span>
            <span className={styles.componentId}>ID: {selectedComponent.id.slice(0, 8)}</span>
          </div>
          <div className={styles.content}>
            <Collapse
              defaultActiveKey={['布局', '样式', ...Object.keys(groupedProps)]}
              ghost
              items={collapseItems}
            />
          </div>
          <div className={styles.footer}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteComponents(selectedIds)}
              block
            >
              删除组件
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择组件或在画布设置中查看组件列表"
          />
        </div>
      ),
    },
    {
      key: 'canvas',
      label: '画布设置',
      icon: <PictureOutlined />,
      children: (
        <>
          {/* 画布设置 */}
          {renderCanvasSettings()}
          {/* 组件列表 */}
          <div className={styles.componentListSection}>
            <div className={styles.componentListHeader}>
              <AppstoreOutlined />
              <span>组件列表</span>
              <span className={styles.componentCount}>({flattenedComponents.length})</span>
            </div>
            <div className={styles.componentList}>
              {flattenedComponents.length > 0 ? (
                flattenedComponents.map((comp) => {
                  const config = ComponentRegistry.getComponent(comp.type);
                  const displayName = comp.name || config?.name || comp.type;
                  return (
                    <div
                      key={comp.id}
                      className={`${styles.componentListItem} ${selectedIds.includes(comp.id) ? styles.selected : ''}`}
                      style={{ paddingLeft: 12 + comp.depth * 16 }}
                      onClick={() => handleComponentItemClick(comp.id)}
                    >
                      <span className={styles.componentListItemName}>{displayName}</span>
                      <div className={styles.componentListItemActions}>
                        <span className={styles.componentListItemType}>{comp.type}</span>
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          className={styles.deleteBtn}
                          onClick={(e: React.MouseEvent) => handleComponentItemDelete(comp.id, e)}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyList}>
                  暂无组件
                </div>
              )}
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>属性配置</h3>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        className={styles.tabs}
        destroyOnHidden
      />
    </div>
  );
};

export default PropertyPanel;
