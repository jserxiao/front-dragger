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
  Modal,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import { DeleteOutlined, SettingOutlined, PictureOutlined, UploadOutlined, AppstoreOutlined, PlusOutlined, MinusCircleOutlined, LinkOutlined, DisconnectOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '@/store';
import { ComponentRegistry } from '@/core';
import { PropSchema, CanvasStyle, ComponentConfig } from '@/types';
import styles from './PropertyPanel.module.css';

/**
 * 属性配置面板
 */
const PropertyPanel: React.FC = () => {
  const { components, canvas, updateComponent, deleteComponents, setCanvasStyle, selectComponent, clearSelection, setParentComponent, getAllComponents, getComponentById, addComponent } =
    useEditorStore();
  const { selectedIds, canvasStyle } = canvas;

  // 选择父级弹框状态
  const [parentSelectVisible, setParentSelectVisible] = useState(false);
  // 选择子级弹框状态
  const [childSelectVisible, setChildSelectVisible] = useState(false);
  // 相对坐标输入状态
  const [relativePosInput, setRelativePosInput] = useState({ x: 0, y: 0 });

  // 自定义属性的本地状态（键值对数组形式）
  const [extraPropsList, setExtraPropsList] = useState<Array<{ key: string; value: string }>>([]);

  // 解析属性值：尝试转换为数字、布尔值、数组、对象，失败则返回原始字符串
  const parseValue = (value: string): any => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    
    // 尝试解析为 JSON（支持数字、布尔值、数组、对象）
    try {
      return JSON.parse(trimmed);
    } catch {
      // 不是有效的 JSON，返回原始字符串
      return value;
    }
  };

  // 将属性值转换为显示字符串
  const valueToString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  };

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

  // 同步 props 和 extraProps 到本地状态（合并显示）
  useEffect(() => {
    if (selectedComponent) {
      // 合并 props 和 extraProps
      const mergedProps: Record<string, any> = {
        ...selectedComponent.props,
        ...selectedComponent.extraProps,
      };
      
      // 过滤掉 children 属性（不显示）
      const { children: _, ...filteredProps } = mergedProps;
      
      const list = Object.entries(filteredProps).map(([key, value]) => ({
        key,
        value: valueToString(value),
      }));
      setExtraPropsList(list.length > 0 ? list : [{ key: '', value: '' }]);
    } else {
      setExtraPropsList([{ key: '', value: '' }]);
    }
  }, [selectedComponent?.id, selectedComponent?.props, selectedComponent?.extraProps]);

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

    // 布局属性（有父级的组件不显示X、Y坐标）
    items.push({
      key: '布局',
      label: '布局',
      children: (
        <div className={styles.propGroup}>
          {/* 无父级组件才显示X、Y坐标 */}
          {!selectedComponent?.parentId && (
            <>
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
            </>
          )}
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
          <div className={styles.propItem} style={{ flexDirection: 'column', gap: 8 }}>
            {extraPropsList.map((item, index) => (
              <div key={index} className={styles.extraPropsRow}>
                <Input
                  placeholder="属性名"
                  value={item.key}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newList = [...extraPropsList];
                    newList[index] = { ...newList[index], key: e.target.value };
                    setExtraPropsList(newList);
                  }}
                  onBlur={() => {
                    // 提交更新：将所有属性保存到 extraProps
                    const newExtraProps: Record<string, any> = {};
                    extraPropsList.forEach(p => {
                      if (p.key.trim()) {
                        newExtraProps[p.key.trim()] = parseValue(p.value);
                      }
                    });
                    if (selectedComponent) {
                      updateComponent(selectedComponent.id, {
                        extraProps: Object.keys(newExtraProps).length > 0 ? newExtraProps : undefined,
                      });
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <Input
                  placeholder="属性值（支持数字、数组、对象）"
                  value={item.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newList = [...extraPropsList];
                    newList[index] = { ...newList[index], value: e.target.value };
                    setExtraPropsList(newList);
                  }}
                  onBlur={() => {
                    // 提交更新：将所有属性保存到 extraProps
                    const newExtraProps: Record<string, any> = {};
                    extraPropsList.forEach(p => {
                      if (p.key.trim()) {
                        newExtraProps[p.key.trim()] = parseValue(p.value);
                      }
                    });
                    if (selectedComponent) {
                      updateComponent(selectedComponent.id, {
                        extraProps: Object.keys(newExtraProps).length > 0 ? newExtraProps : undefined,
                      });
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  type="text"
                  icon={<MinusCircleOutlined />}
                  onClick={() => {
                    const newList = extraPropsList.filter((_, i) => i !== index);
                    if (newList.length === 0) {
                      newList.push({ key: '', value: '' });
                    }
                    setExtraPropsList(newList);
                    // 提交更新：将所有属性保存到 extraProps
                    const newExtraProps: Record<string, any> = {};
                    newList.forEach(p => {
                      if (p.key.trim()) {
                        newExtraProps[p.key.trim()] = parseValue(p.value);
                      }
                    });
                    if (selectedComponent) {
                      updateComponent(selectedComponent.id, {
                        extraProps: Object.keys(newExtraProps).length > 0 ? newExtraProps : undefined,
                      });
                    }
                  }}
                  danger
                />
              </div>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                setExtraPropsList([...extraPropsList, { key: '', value: '' }]);
              }}
              style={{ width: '100%' }}
            >
              添加属性
            </Button>
            <span className={styles.hint}>属性值支持：数字(123)、布尔(true)、数组([1,2])、对象(&#123;...&#125;)</span>
          </div>
        </div>
      ),
    });

    // 父子级关系面板
    if (selectedComponent) {
      const parentComponent = selectedComponent.parentId ? getComponentById(selectedComponent.parentId) : null;
      
      items.push({
        key: 'parentChild',
        label: '父子级关系',
        children: (
          <div className={styles.propGroup}>
            {/* 父级设置 */}
            <div className={styles.propItem}>
              <label className={styles.label}>父级组件</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {parentComponent ? (
                  <>
                    <span className={styles.parentName}>{parentComponent.name}</span>
                    <span className={styles.parentId}>({parentComponent.id.slice(0, 8)}...)</span>
                    <Button
                      size="small"
                      icon={<DisconnectOutlined />}
                      onClick={() => {
                        setParentComponent(selectedComponent.id, null);
                      }}
                      danger
                    >
                      解除
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={styles.noParent}>无父级（独立组件）</span>
                    <Button
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => setParentSelectVisible(true)}
                    >
                      绑定父级
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* 相对父级位置 */}
            {selectedComponent.parentId && (
              <>
                <div className={styles.propItem}>
                  <label className={styles.label}>相对X坐标</label>
                  <InputNumber
                    value={selectedComponent.relativePosition?.x ?? 0}
                    onChange={(value) => {
                      const newX = value ?? 0;
                      const newY = selectedComponent.relativePosition?.y ?? 0;
                      // 获取父组件位置来计算新的绝对位置
                      const parent = selectedComponent.parentId ? getComponentById(selectedComponent.parentId) : null;
                      const parentPos = parent?.position ?? { x: 0, y: 0 };
                      updateComponent(selectedComponent.id, {
                        relativePosition: { x: newX, y: newY },
                        position: { x: parentPos.x + newX, y: parentPos.y + newY },
                      });
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className={styles.propItem}>
                  <label className={styles.label}>相对Y坐标</label>
                  <InputNumber
                    value={selectedComponent.relativePosition?.y ?? 0}
                    onChange={(value) => {
                      const newX = selectedComponent.relativePosition?.x ?? 0;
                      const newY = value ?? 0;
                      // 获取父组件位置来计算新的绝对位置
                      const parent = selectedComponent.parentId ? getComponentById(selectedComponent.parentId) : null;
                      const parentPos = parent?.position ?? { x: 0, y: 0 };
                      updateComponent(selectedComponent.id, {
                        relativePosition: { x: newX, y: newY },
                        position: { x: parentPos.x + newX, y: parentPos.y + newY },
                      });
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}
            
            {/* 子级列表 */}
            <div className={styles.propItem} style={{ flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className={styles.label} style={{ marginBottom: 0 }}>子级组件</label>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setChildSelectVisible(true)}
                >
                  添加子级
                </Button>
              </div>
              {/* 扁平化架构：从 components 中查找子组件 */}
              {(() => {
                const childComponents = components.filter(c => c.parentId === selectedComponent.id);
                return childComponents.length > 0 ? (
                  <div className={styles.childrenList}>
                    {childComponents.map((child) => (
                      <div key={child.id} className={styles.childItem}>
                        <span className={styles.childName}>{child.name}</span>
                        <span className={styles.childId}>({child.id.slice(0, 8)}...)</span>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => selectComponent(child.id)}
                        >
                          选中
                        </Button>
                        <Button
                          size="small"
                          type="text"
                          icon={<DisconnectOutlined />}
                          onClick={() => {
                            // 解除子级绑定
                            setParentComponent(child.id, null);
                          }}
                          danger
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className={styles.noChildren}>暂无子级组件</span>
                );
              })()}
            </div>
          </div>
        ),
      });
    }

    return items;
  }, [selectedComponent, groupedProps, extraPropsList, getAllComponents, getComponentById, setParentComponent, updateComponent, selectComponent]);

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
    const result: Array<{ id: string; name: string; type: string; depth: number; parentId?: string }> = [];
    
    const flatten = (comps: typeof components, depth: number = 0, parentId?: string) => {
      comps.forEach((comp) => {
        result.push({
          id: comp.id,
          name: comp.name,
          type: comp.type,
          depth,
          parentId: comp.parentId || parentId,
        });
        if (comp.children && comp.children.length > 0) {
          flatten(comp.children, depth + 1, comp.id);
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
              defaultActiveKey={['布局', '样式', ...Object.keys(groupedProps), 'extraProps', 'parentChild']}
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
                      <div className={styles.componentListItemInfo}>
                        <span className={styles.componentListItemName}>{displayName}</span>
                        <span className={styles.componentListItemId}>ID: {comp.id.slice(0, 8)}...</span>
                        {comp.parentId && (
                          <span className={styles.componentListItemParentId}>父级: {comp.parentId.slice(0, 8)}...</span>
                        )}
                      </div>
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
      
      {/* 选择父级组件弹框 */}
      <Modal
        title="选择父级组件"
        open={parentSelectVisible}
        onCancel={() => setParentSelectVisible(false)}
        footer={null}
        width={400}
      >
        {/* 相对坐标设置 */}
        <div className={styles.relativePosSection}>
          <div className={styles.relativePosItem}>
            <label>相对 X 坐标：</label>
            <InputNumber
              value={relativePosInput.x}
              onChange={(v) => setRelativePosInput({ ...relativePosInput, x: v ?? 0 })}
              style={{ width: 120 }}
            />
          </div>
          <div className={styles.relativePosItem}>
            <label>相对 Y 坐标：</label>
            <InputNumber
              value={relativePosInput.y}
              onChange={(v) => setRelativePosInput({ ...relativePosInput, y: v ?? 0 })}
              style={{ width: 120 }}
            />
          </div>
        </div>
        <div className={styles.parentSelectList}>
          {(() => {
            const allComponents = getAllComponents();
            // 过滤掉自己和自己的子级
            const availableParents = allComponents.filter((comp) => {
              if (comp.id === selectedComponent?.id) return false;
              // TODO: 还需要过滤掉自己的子级
              return true;
            });
            
            if (availableParents.length === 0) {
              return <div className={styles.emptyList}>没有可选的父级组件</div>;
            }
            
            return availableParents.map((comp) => (
              <div
                key={comp.id}
                className={styles.parentSelectItem}
                onClick={() => {
                  if (selectedComponent) {
                    setParentComponent(selectedComponent.id, comp.id, { x: relativePosInput.x, y: relativePosInput.y });
                    setParentSelectVisible(false);
                    setRelativePosInput({ x: 0, y: 0 });
                  }
                }}
              >
                <span className={styles.parentSelectName}>{comp.name}</span>
                <span className={styles.parentSelectType}>{comp.type}</span>
              </div>
            ));
          })()}
        </div>
      </Modal>
      
      {/* 选择子级组件弹框 - 从组件库选择 */}
      <Modal
        title="添加子级组件"
        open={childSelectVisible}
        onCancel={() => setChildSelectVisible(false)}
        footer={null}
        width={400}
      >
        {/* 相对坐标设置 */}
        <div className={styles.relativePosSection}>
          <div className={styles.relativePosItem}>
            <label>相对 X 坐标：</label>
            <InputNumber
              value={relativePosInput.x}
              onChange={(v) => setRelativePosInput({ ...relativePosInput, x: v ?? 0 })}
              style={{ width: 120 }}
            />
          </div>
          <div className={styles.relativePosItem}>
            <label>相对 Y 坐标：</label>
            <InputNumber
              value={relativePosInput.y}
              onChange={(v) => setRelativePosInput({ ...relativePosInput, y: v ?? 0 })}
              style={{ width: 120 }}
            />
          </div>
        </div>
        <div className={styles.parentSelectList}>
          {(() => {
            // 从组件库获取所有组件类型
            const componentLibrary = ComponentRegistry.getAllComponents();
            
            if (componentLibrary.length === 0) {
              return <div className={styles.emptyList}>组件库为空</div>;
            }
            
            return componentLibrary.map((config: ComponentConfig) => (
              <div
                key={config.type}
                className={styles.parentSelectItem}
                onClick={() => {
                  if (selectedComponent) {
                    // 创建新的子组件
                    const newComponent = {
                      id: uuidv4(),
                      type: config.type,
                      name: config.name,
                      props: {}, // props 保持空，所有属性放入 extraProps
                      style: { ...config.defaultStyle },
                      children: [],
                      position: { x: 0, y: 0 },
                      size: { ...config.defaultSize },
                      parentId: selectedComponent.id,
                      relativePosition: { x: relativePosInput.x, y: relativePosInput.y },
                      // 所有属性（包括 defaultProps 和 className）放入 extraProps
                      extraProps: { ...config.defaultProps, className: config.type.toLowerCase() },
                    };
                    addComponent(newComponent, selectedComponent.id);
                    setChildSelectVisible(false);
                    setRelativePosInput({ x: 0, y: 0 });
                  }
                }}
              >
                <span className={styles.parentSelectName}>{config.name}</span>
                <span className={styles.parentSelectType}>{config.type}</span>
              </div>
            ));
          })()}
        </div>
      </Modal>
    </div>
  );
};

export default PropertyPanel;
