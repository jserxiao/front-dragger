import { useMemo } from 'react';
import {
  Input,
  InputNumber,
  Select,
  Switch,
  ColorPicker,
  Collapse,
  Empty,
  Button,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import { DeleteOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { ComponentRegistry } from '@/core';
import { PropSchema } from '@/types';
import styles from './PropertyPanel.module.css';

/**
 * 属性配置面板
 */
const PropertyPanel: React.FC = () => {
  const { components, canvas, updateComponent, deleteComponents } =
    useEditorStore();
  const { selectedIds } = canvas;

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
              addonAfter="px"
              style={{ width: '100%' }}
            />
          </div>
          <div className={styles.propItem}>
            <label className={styles.label}>圆角</label>
            <InputNumber
              value={selectedComponent?.style?.borderRadius as number}
              onChange={(v: number | null) => handleStyleChange('borderRadius', v)}
              min={0}
              addonAfter="px"
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

    return items;
  }, [selectedComponent, groupedProps]);

  if (!selectedComponent) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>属性配置</h3>
        </div>
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={selectedIds.length > 1 ? '已选择多个组件' : '请选择组件'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>属性配置</h3>
        <div className={styles.componentInfo}>
          <span className={styles.componentType}>{componentConfig?.name}</span>
          <span className={styles.componentId}>ID: {selectedComponent.id.slice(0, 8)}</span>
        </div>
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
    </div>
  );
};

export default PropertyPanel;
