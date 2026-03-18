import { ComponentNode } from '@/types';

/**
 * 代码生成结果
 */
export interface GeneratedCodeResult {
  tsx: string;
  css: string;
}

/**
 * 收集 Drawer/Modal 关联信息
 */
interface OverlayRelation {
  overlayId: string;
  overlayType: 'Drawer' | 'Modal';
  overlayName: string;
  triggerId: string;
  stateName: string;
}

/**
 * 代码生成器
 * 将组件树转换为 React TypeScript 代码
 */
export class CodeGenerator {
  /**
   * 生成完整代码（TSX + CSS）
   */
  generateCode(components: ComponentNode[]): GeneratedCodeResult {
    const imports = this.generateImports(components);
    const relations = this.collectOverlayRelations(components);
    const stateHooks = this.generateStateHooks(relations);
    const jsx = this.generateJSX(components, 0, relations);
    const interfaces = this.generateInterfaces(components);
    const css = this.generateCSS(components);

    const tsx = `${imports}

import styles from './GeneratedPage.module.css';

${interfaces}
export default function GeneratedPage() {
${stateHooks}  return (
${jsx}
  );
}
`;

    return { tsx, css };
  }

  /**
   * 收集 Drawer/Modal 关联信息
   */
  private collectOverlayRelations(components: ComponentNode[]): OverlayRelation[] {
    const relations: OverlayRelation[] = [];
    let overlayIndex = 0;

    const processComponent = (component: ComponentNode) => {
      // 检查是否是 Drawer 或 Modal 且有关联的触发组件
      if ((component.type === 'Drawer' || component.type === 'Modal') && component.triggerComponentId) {
        overlayIndex++;
        relations.push({
          overlayId: component.id,
          overlayType: component.type,
          overlayName: component.name,
          triggerId: component.triggerComponentId,
          stateName: `${component.type.toLowerCase()}Open${overlayIndex}`,
        });
      }

      if (component.children?.length) {
        component.children.forEach(processComponent);
      }
    };

    components.forEach(processComponent);
    return relations;
  }

  /**
   * 生成 useState hooks
   */
  private generateStateHooks(relations: OverlayRelation[]): string {
    if (relations.length === 0) return '';

    const hooks = relations.map(relation => {
      return `  const [${relation.stateName}, set${relation.stateName.charAt(0).toUpperCase() + relation.stateName.slice(1)}] = React.useState(false);\n`;
    }).join('');

    return hooks + '\n';
  }

  /**
   * 生成导入语句
   */
  private generateImports(components: ComponentNode[]): string {
    const importSet = new Set<string>();
    importSet.add("import React from 'react';");

    const antdComponents = this.collectAntdComponents(components);
    if (antdComponents.size > 0) {
      importSet.add(
        `import { ${Array.from(antdComponents).join(', ')} } from 'antd';`
      );
    }

    if (antdComponents.has('Typography')) {
      importSet.add("import 'antd/dist/reset.css';");
    }

    return Array.from(importSet).join('\n');
  }

  /**
   * 收集使用的 Antd 组件
   */
  private collectAntdComponents(
    components: ComponentNode[],
    set = new Set<string>()
  ): Set<string> {
    components.forEach((component) => {
      const type = component.type;

      // 特殊处理 Typography
      if (type.startsWith('Typography.')) {
        set.add('Typography');
      } else {
        set.add(type);
      }

      if (component.children?.length) {
        this.collectAntdComponents(component.children, set);
      }
    });

    return set;
  }

  /**
   * 生成 JSX 代码
   */
  private generateJSX(components: ComponentNode[], indent: number, relations: OverlayRelation[] = []): string {
    const spaces = '  '.repeat(indent + 1);

    if (components.length === 0) {
      return `${spaces}<div />`;
    }

    const jsx = components.map((component) => {
      return this.componentToJSX(component, indent + 1, relations);
    }).join('\n');

    return `${spaces}<div style={{ padding: 24 }}>\n${jsx}\n${spaces}</div>`;
  }

  /**
   * 单个组件转 JSX
   */
  private componentToJSX(component: ComponentNode, indent: number, relations: OverlayRelation[] = []): string {
    const spaces = '  '.repeat(indent);
    const type = this.getComponentType(component.type);
    const props = this.generateProps(component);
    const style = this.generateStyle(component);

    // 检查是否是 Drawer/Modal 的触发组件
    const relation = relations.find(r => r.triggerId === component.id);
    if (relation) {
      // 添加 onClick 事件
      props.onClick = { __jsExpr: `() => set${relation.stateName.charAt(0).toUpperCase() + relation.stateName.slice(1)}(true)` };
    }

    // 检查是否是 Drawer/Modal 组件
    const overlayRelation = relations.find(r => r.overlayId === component.id);
    if (overlayRelation) {
      // 替换 open 属性为状态变量
      props.open = { __jsExpr: overlayRelation.stateName };
      // 添加 onClose 事件
      props.onClose = { __jsExpr: `() => set${overlayRelation.stateName.charAt(0).toUpperCase() + overlayRelation.stateName.slice(1)}(false)` };
    }

    // 合并用户自定义属性 (extraProps)
    if (component.extraProps) {
      Object.entries(component.extraProps).forEach(([key, value]) => {
        // 如果值是字符串且需要作为 JS 表达式（如事件处理函数），直接作为表达式
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('(') || value.startsWith('function'))) {
          props[key] = { __jsExpr: value };
        } else {
          props[key] = value;
        }
      });
    }

    const allProps = { ...props, ...style };
    const propsStr = this.propsToString(allProps);

    if (component.children?.length) {
      const childrenJSX = component.children
        .map((child) => this.componentToJSX(child, indent + 1, relations))
        .join('\n');
      return `${spaces}<${type}${propsStr}>\n${childrenJSX}\n${spaces}</${type}>`;
    }

    // 处理文本内容
    if (component.props.children && typeof component.props.children === 'string') {
      return `${spaces}<${type}${propsStr}>${component.props.children}</${type}>`;
    }

    // 自闭合标签
    return `${spaces}<${type}${propsStr} />`;
  }

  /**
   * 获取组件类型
   */
  private getComponentType(type: string): string {
    if (type.startsWith('Typography.')) {
      return type;
    }
    return type;
  }

  /**
   * 生成属性对象
   */
  private generateProps(component: ComponentNode): Record<string, any> {
    const props: Record<string, any> = {};

    Object.entries(component.props).forEach(([key, value]) => {
      // 跳过 children 和 undefined 值
      if (key === 'children' || value === undefined) return;

      // 跳过默认值
      if (key === 'size' && value === 'middle') return;
      if (key === 'type' && value === 'default') return;
      if (key === 'disabled' && value === false) return;
      if (key === 'block' && value === false) return;
      if (key === 'allowClear' && value === false) return;
      if (key === 'bordered' && value === true) return;
      if (key === 'hoverable' && value === false) return;
      if (key === 'dashed' && value === false) return;
      if (key === 'bold' && value === false) return;

      props[key] = value;
    });

    return props;
  }

  /**
   * 生成样式对象 - 使用 CSS Module 的 className
   */
  private generateStyle(component: ComponentNode): Record<string, any> {
    // 使用 CSS Module 方式: className={styles.componentXxx}
    const classNameKey = `component-${component.id.slice(0, 8)}`;
    // 返回一个特殊对象标记，表示这是 JS 表达式
    return { className: { __jsExpr: `styles['${classNameKey}']` } };
  }

  /**
   * 生成 CSS 代码
   */
  private generateCSS(components: ComponentNode[]): string {
    const cssRules: string[] = [];

    const processComponent = (component: ComponentNode) => {
      const className = `component-${component.id.slice(0, 8)}`;
      const rules: string[] = [];

      const { size, style } = component;

      // 尺寸样式
      if (size.width !== 'auto' && size.width !== undefined) {
        if (typeof size.width === 'number') {
          rules.push(`  width: ${size.width}px;`);
        } else {
          rules.push(`  width: ${size.width};`);
        }
      }
      if (size.height !== 'auto' && size.height !== undefined) {
        if (typeof size.height === 'number') {
          rules.push(`  height: ${size.height}px;`);
        } else {
          rules.push(`  height: ${size.height};`);
        }
      }

      // 自定义样式
      if (style) {
        Object.entries(style).forEach(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          if (typeof value === 'number' && !['opacity', 'zIndex', 'fontWeight', 'lineHeight'].includes(key)) {
            rules.push(`  ${cssKey}: ${value}px;`);
          } else {
            rules.push(`  ${cssKey}: ${value};`);
          }
        });
      }

      if (rules.length > 0) {
        cssRules.push(`.${className} {\n${rules.join('\n')}\n}`);
      }

      // 递归处理子组件
      if (component.children?.length) {
        component.children.forEach(processComponent);
      }
    };

    components.forEach(processComponent);

    if (cssRules.length === 0) {
      return '/* 暂无样式 */\n';
    }

    return cssRules.join('\n\n');
  }

  /**
   * 属性转字符串
   */
  private propsToString(props: Record<string, any>): string {
    const entries = Object.entries(props);

    if (entries.length === 0) return '';

    const propsStr = entries.map(([key, value]) => {
      if (value === true) {
        return key;
      }
      if (typeof value === 'string') {
        return `${key}="${value}"`;
      }
      if (typeof value === 'number') {
        return `${key}={${value}}`;
      }
      if (Array.isArray(value)) {
        return `${key}={${JSON.stringify(value)}}`;
      }
      if (typeof value === 'object' && value !== null) {
        // 检查是否是 JS 表达式标记
        if (value.__jsExpr) {
          return `${key}={${value.__jsExpr}}`;
        }
        return `${key}={${JSON.stringify(value)}}`;
      }
      return `${key}={${value}}`;
    });

    return ' ' + propsStr.join(' ');
  }

  /**
   * 生成接口定义
   */
  private generateInterfaces(_components: ComponentNode[]): string {
    // 可以根据需要生成 Props 接口
    return '';
  }

  /**
   * 格式化代码
   */
  async formatCode(code: string): Promise<string> {
    try {
      const prettier = await import('prettier/standalone');
      const parserBabel = await import('prettier/plugins/babel');
      const parserEstree = await import('prettier/plugins/estree');

      return await prettier.format(code, {
        parser: 'babel-ts',
        plugins: [parserBabel, parserEstree],
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 80,
        tabWidth: 2,
      });
    } catch {
      // 如果格式化失败，返回原始代码
      return code;
    }
  }
}

export const codeGenerator = new CodeGenerator();
