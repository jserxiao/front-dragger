import { useState, useMemo } from 'react';
import { Input, Collapse, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ComponentRegistry } from '@/core';
import { ComponentConfig, ComponentCategory } from '@/types';
import styles from './ComponentPanel.module.css';

interface DraggableComponentItemProps {
  config: ComponentConfig;
}

/**
 * 可拖拽的组件项
 */
const DraggableComponentItem: React.FC<DraggableComponentItemProps> = ({
  config,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `new-${config.type}`,
      data: {
        type: 'new',
        componentType: config.type,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={styles.componentItem}
    >
      <div className={styles.componentIcon}>{config.icon}</div>
      <div className={styles.componentName}>{config.name}</div>
    </div>
  );
};

/**
 * 控件选择面板
 */
const ComponentPanel: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const categories = ComponentRegistry.getCategories();

  // 过滤组件
  const filteredComponents = useMemo(() => {
    if (!searchKeyword.trim()) {
      return null;
    }
    return ComponentRegistry.searchComponents(searchKeyword);
  }, [searchKeyword]);

  // 按分类获取组件
  const getComponentsByCategory = (category: ComponentCategory) => {
    return ComponentRegistry.getComponentsByCategory(category);
  };

  // 渲染组件列表
  const renderComponentList = (components: ComponentConfig[]) => {
    return (
      <div className={styles.componentGrid}>
        {components.map((config) => (
          <DraggableComponentItem key={config.type} config={config} />
        ))}
      </div>
    );
  };

  // 构建 Collapse items
  const collapseItems = categories
    .filter((category) => getComponentsByCategory(category.key).length > 0)
    .map((category) => ({
      key: category.key,
      label: category.name,
      children: renderComponentList(getComponentsByCategory(category.key)),
    }));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>组件库</h3>
        <Input
          placeholder="搜索组件..."
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          allowClear
          size="small"
        />
      </div>

      <div className={styles.content}>
        {filteredComponents ? (
          // 搜索结果
          <div className={styles.searchResults}>
            {filteredComponents.length > 0 ? (
              <>
                <div className={styles.searchResultTitle}>
                  搜索结果 ({filteredComponents.length})
                </div>
                {renderComponentList(filteredComponents)}
              </>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="未找到组件"
              />
            )}
          </div>
        ) : (
          // 分类列表
          <Collapse
            defaultActiveKey={categories.map((c) => c.key)}
            ghost
            className={styles.collapse}
            items={collapseItems}
          />
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.tip}>拖拽组件到画布开始设计</div>
      </div>
    </div>
  );
};

export default ComponentPanel;
