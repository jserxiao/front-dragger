import { ComponentConfig, ComponentCategory, ImportedComponent } from '@/types';
import { PRESET_COMPONENTS, CATEGORIES } from '@/constants';

/**
 * 组件注册中心
 * 管理所有可用组件的配置信息
 */
class ComponentRegistryImpl {
  private components: Map<string, ComponentConfig> = new Map();
  private importedComponents: Map<string, ImportedComponent> = new Map();

  constructor() {
    // 注册预设组件
    PRESET_COMPONENTS.forEach((config) => {
      this.register(config);
    });
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
