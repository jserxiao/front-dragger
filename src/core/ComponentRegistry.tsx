import { ComponentConfig, ComponentCategory, ImportedComponent } from '@/types';
import { PRESET_COMPONENTS, CATEGORIES } from '@/constants';
import { StorageService } from './StorageService';
import { ComponentMapManager } from './ComponentMap';
import React from 'react';

// 组件变更事件类型
export type ComponentChangeListener = () => void;
const componentChangeListeners: Set<ComponentChangeListener> = new Set();

/**
 * 监听组件变更
 */
export function onComponentChange(listener: ComponentChangeListener): () => void {
  componentChangeListeners.add(listener);
  return () => componentChangeListeners.delete(listener);
}

/**
 * 触发组件变更通知
 */
function notifyComponentChange(): void {
  componentChangeListeners.forEach(listener => listener());
}

/**
 * 动态注入样式
 */
const injectStyle = (cssContent: string, componentId: string): void => {
  // 检查是否已存在该组件的样式
  const existingStyle = document.getElementById(`custom-component-style-${componentId}`);
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = `custom-component-style-${componentId}`;
  styleElement.textContent = cssContent;
  document.head.appendChild(styleElement);
};

/**
 * 创建占位符组件（用于无法动态解析的情况）
 */
const createPlaceholderComponent = (name: string, styleContent?: string): React.FC<any> => {
  return (props: any) => {
    // 注入样式
    React.useEffect(() => {
      if (styleContent) {
        injectStyle(styleContent, name);
      }
    }, []);
    
    return (
      <div 
        style={{ 
          padding: '12px',
          border: '2px dashed #1890ff',
          borderRadius: '4px',
          background: '#e6f7ff',
          textAlign: 'center',
          color: '#1890ff',
          ...props.style 
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📦 {name}</div>
        <div style={{ fontSize: 12, color: '#666' }}>自定义组件</div>
      </div>
    );
  };
};

/**
 * 组件注册中心
 * 管理所有可用组件的配置信息
 */
class ComponentRegistryImpl {
  private components: Map<string, ComponentConfig> = new Map();
  private importedComponents: Map<string, ImportedComponent> = new Map();
  private initialized: boolean = false;

  constructor() {
    // 注册预设组件
    PRESET_COMPONENTS.forEach((config) => {
      this.register(config);
    });
  }

  /**
   * 从 IndexedDB 加载自定义组件
   */
  async loadCustomComponents(): Promise<void> {
    if (this.initialized) return;

    try {
      const customComponents = await StorageService.getAllComponents();
      
      customComponents.forEach((stored) => {
        const config: ComponentConfig = {
          type: stored.config.type,
          name: stored.config.name,
          icon: this.createCustomIcon(stored.name),
          category: stored.config.category as ComponentCategory,
          defaultProps: stored.config.defaultProps || {},
          defaultStyle: stored.config.defaultStyle || {},
          propSchema: [],
          allowChildren: stored.config.allowChildren ?? true,
          defaultSize: stored.config.defaultSize || { width: 200, height: 100 },
        };

        const importedComponent: ImportedComponent = {
          name: stored.name,
          path: `./custom/${stored.name}`,
          config,
        };

        this.importedComponents.set(stored.name, importedComponent);
        this.register(config);
        
        // 注册到 ComponentMapManager
        const PlaceholderComponent = createPlaceholderComponent(
          stored.name,
          stored.styleContent
        );
        ComponentMapManager.register(stored.config.type, PlaceholderComponent);
      });

      this.initialized = true;
    } catch (error) {
      console.error('加载自定义组件失败:', error);
    }
  }

  /**
   * 创建自定义组件图标
   */
  private createCustomIcon(name: string): React.ReactNode {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        background: '#1890ff',
        color: '#fff',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
      }}>
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  /**
   * 注册组件
   */
  register(config: ComponentConfig): void {
    this.components.set(config.type, config);
  }

  /**
   * 获取组件配置
   */
  getComponent(type: string): ComponentConfig | undefined {
    return this.components.get(type);
  }

  /**
   * 获取所有组件
   */
  getAllComponents(): ComponentConfig[] {
    return Array.from(this.components.values());
  }

  /**
   * 按分类获取组件
   */
  getComponentsByCategory(category: ComponentCategory): ComponentConfig[] {
    return this.getAllComponents().filter((c) => c.category === category);
  }

  /**
   * 获取所有分类
   */
  getCategories() {
    return CATEGORIES.sort((a, b) => a.order - b.order);
  }

  /**
   * 导入自定义组件
   */
  importComponent(component: ImportedComponent): void {
    this.importedComponents.set(component.name, component);
    this.register(component.config);
    // 重置初始化标记，允许重新加载
    this.initialized = false;
    // 触发变更通知
    notifyComponentChange();
  }

  /**
   * 获取导入的组件
   */
  getImportedComponents(): ImportedComponent[] {
    return Array.from(this.importedComponents.values());
  }

  /**
   * 移除导入的组件
   */
  removeImportedComponent(name: string): void {
    const component = this.importedComponents.get(name);
    if (component) {
      this.components.delete(component.config.type);
      this.importedComponents.delete(name);
    }
  }

  /**
   * 检查组件是否存在
   */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * 搜索组件
   */
  searchComponents(keyword: string): ComponentConfig[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAllComponents().filter(
      (c) =>
        c.name.toLowerCase().includes(lowerKeyword) ||
        c.type.toLowerCase().includes(lowerKeyword)
    );
  }
}

export const ComponentRegistry = new ComponentRegistryImpl();
