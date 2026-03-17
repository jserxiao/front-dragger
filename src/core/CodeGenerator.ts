import { ComponentNode } from '@/types';

/**
 * 代码生成器
 * 将组件树转换为 React TypeScript 代码
 */
export class CodeGenerator {
  /**
   * 生成完整组件代码
   */
  generateCode(components: ComponentNode[]): string {
    const imports = this.generateImports(components);
    const jsx = this.generateJSX(components, 0);
    const interfaces = this.generateInterfaces(components);

    return `${imports}

${interfaces}
export default function GeneratedPage() {
  return (
${jsx}
  );
}
`;
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
  private generateJSX(components: ComponentNode[], indent: number): string {
    const spaces = '  '.repeat(indent + 1);
    const childSpaces = '  '.repeat(indent + 2);

    if (components.length === 0) {
      return `${spaces}<div />`;
    }

    const jsx = components.map((component) => {
      return this.componentToJSX(component, indent + 1);
    }).join('\n');

    return `${spaces}<div style={{ padding: 24 }}>\n${jsx}\n${spaces}</div>`;
  }

  /**
   * 单个组件转 JSX
   */
  private componentToJSX(component: ComponentNode, indent: number): string {
    const spaces = '  '.repeat(indent);
    const type = this.getComponentType(component.type);
    const props = this.generateProps(component);
    const style = this.generateStyle(component);

    const allProps = { ...props, ...style };
    const propsStr = this.propsToString(allProps);

    if (component.children?.length) {
      const childrenJSX = component.children
        .map((child) => this.componentToJSX(child, indent + 1))
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
   * 生成样式对象
   */
  private generateStyle(component: ComponentNode): Record<string, any> {
    const style: Record<string, any> = {};
    const { size } = component;

    // 尺寸样式（仅保留宽高，不包含位置信息）
    if (size.width !== 'auto' && size.width !== undefined) {
      style.width = size.width;
    }
    if (size.height !== 'auto' && size.height !== undefined) {
      style.height = size.height;
    }

    // 合并自定义样式
    if (component.style) {
      Object.assign(style, component.style);
    }

    return Object.keys(style).length > 0 ? { style } : {};
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
      if (typeof value === 'object') {
        return `${key}={${JSON.stringify(value)}}`;
      }
      return `${key}={${value}}`;
    });

    return ' ' + propsStr.join(' ');
  }

  /**
   * 生成接口定义
   */
  private generateInterfaces(components: ComponentNode[]): string {
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
