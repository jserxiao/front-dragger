import { ComponentNode } from '@/types';
import * as babelParser from '@babel/parser';
// @ts-ignore
import _traverse from '@babel/traverse';
import * as t from '@babel/types';

// 处理 ESM/CJS 兼容性
const traverse = (_traverse as any).default || _traverse;

/**
 * 代码解析器
 * 将 TSX 代码解析为组件树
 */
export class CodeParser {
  /**
   * 解析 TSX 代码为组件树
   */
  parseCode(code: string): ComponentNode[] {
    const components: ComponentNode[] = [];

    try {
      const ast = babelParser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });

      traverse(ast, {
        JSXElement: (path: any) => {
          // 处理 return 语句中的 JSX
          if (t.isReturnStatement(path.parent)) {
            const component = this.parseJSXElement(path.node);
            if (component) {
              // 如果是容器 div，提取其子组件
              if (component.type === 'div' && component.children) {
                components.push(...component.children);
              } else {
                components.push(component);
              }
            }
          }
        },
      });
    } catch (error) {
      console.error('解析代码失败:', error);
    }

    return components;
  }

  /**
   * 解析单个 JSX 元素
   */
  private parseJSXElement(element: t.JSXElement): ComponentNode | null {
    const openingElement = element.openingElement;
    const tagName = this.getTagName(openingElement.name);

    if (!tagName) {
      return null;
    }

    // 允许解析 div 元素（作为容器）和 Antd 组件
    if (tagName !== 'div' && !this.isAntdComponent(tagName)) {
      return null;
    }

    const props = this.parseAttributes(openingElement.attributes);
    const children = this.parseChildren(element.children);
    const { style, ...restProps } = this.extractStyle(props);

    // 从 style 中提取位置和尺寸
    const position = { x: 0, y: 0 };
    const size: { width: number | string; height: number | string } = {
      width: 'auto',
      height: 'auto',
    };

    if (style) {
      if (style.width !== undefined) {
        size.width = style.width;
      }
      if (style.height !== undefined) {
        size.height = style.height;
      }
    }

    return {
      id: this.generateId(),
      type: tagName,
      name: this.getComponentName(tagName),
      props: restProps,
      style: style || {},
      children,
      position,
      size,
    };
  }

  /**
   * 获取标签名
   */
  private getTagName(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string | null {
    if (t.isJSXIdentifier(name)) {
      return name.name;
    }
    if (t.isJSXMemberExpression(name)) {
      const object = t.isJSXIdentifier(name.object) ? name.object.name : '';
      const property = t.isJSXIdentifier(name.property) ? name.property.name : '';
      return `${object}.${property}`;
    }
    return null;
  }

  /**
   * 检查是否是 Antd 组件
   */
  private isAntdComponent(tagName: string): boolean {
    const antdComponents = [
      'Button', 'Input', 'Select', 'Checkbox', 'Switch', 'DatePicker',
      'Upload', 'Card', 'Divider', 'Image', 'Statistic', 'Descriptions',
      'Typography.Text', 'Typography.Title', 'Typography.Paragraph',
    ];
    return antdComponents.includes(tagName);
  }

  /**
   * 解析属性
   */
  private parseAttributes(attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[]): Record<string, any> {
    const props: Record<string, any> = {};

    attributes.forEach((attr) => {
      if (t.isJSXAttribute(attr)) {
        const name = t.isJSXIdentifier(attr.name) ? attr.name.name : '';
        const value = this.parseAttributeValue(attr.value);
        props[name] = value;
      }
    });

    return props;
  }

  /**
   * 解析属性值
   */
  private parseAttributeValue(value: t.JSXAttributeValue | t.JSXEmptyExpression | null): any {
    if (value === null) return true;

    if (t.isStringLiteral(value)) {
      return value.value;
    }

    if (t.isJSXExpressionContainer(value)) {
      const expression = value.expression;

      if (t.isNumericLiteral(expression)) {
        return expression.value;
      }

      if (t.isBooleanLiteral(expression)) {
        return expression.value;
      }

      if (t.isNullLiteral(expression)) {
        return null;
      }

      if (t.isArrayExpression(expression)) {
        return expression.elements
          .filter((el): el is t.Expression => el !== null && !t.isSpreadElement(el))
          .map((el) => this.parseExpression(el));
      }

      if (t.isObjectExpression(expression)) {
        return this.parseObjectExpression(expression);
      }

      if (t.isIdentifier(expression)) {
        return expression.name === 'undefined' ? undefined : expression.name;
      }

      if (t.isTemplateLiteral(expression)) {
        if (expression.quasis.length === 1) {
          return expression.quasis[0].value.cooked || '';
        }
      }
    }

    return undefined;
  }

  /**
   * 解析对象表达式
   */
  private parseObjectExpression(node: t.ObjectExpression): Record<string, any> {
    const obj: Record<string, any> = {};

    node.properties.forEach((prop) => {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : 
                   t.isStringLiteral(prop.key) ? prop.key.value : '';
        if (key) {
          obj[key] = this.parseExpression(prop.value);
        }
      }
    });

    return obj;
  }

  /**
   * 解析表达式
   */
  private parseExpression(node: t.Expression): any {
    if (t.isStringLiteral(node)) return node.value;
    if (t.isNumericLiteral(node)) return node.value;
    if (t.isBooleanLiteral(node)) return node.value;
    if (t.isNullLiteral(node)) return null;
    if (t.isArrayExpression(node)) {
      return node.elements
        .filter((el): el is t.Expression => el !== null && !t.isSpreadElement(el))
        .map((el) => this.parseExpression(el));
    }
    if (t.isObjectExpression(node)) {
      return this.parseObjectExpression(node);
    }
    return undefined;
  }

  /**
   * 解析子元素
   */
  private parseChildren(children: (t.JSXText | t.JSXExpressionContainer | t.JSXSpreadChild | t.JSXElement | t.JSXFragment)[]): ComponentNode[] {
    const result: ComponentNode[] = [];

    children.forEach((child) => {
      if (t.isJSXElement(child)) {
        const component = this.parseJSXElement(child);
        if (component) {
          result.push(component);
        }
      }
    });

    return result;
  }

  /**
   * 从 props 中提取 style
   */
  private extractStyle(props: Record<string, any>): { style: Record<string, any> | null; [key: string]: any } {
    const { style, ...restProps } = props;
    return { style: style || null, ...restProps };
  }

  /**
   * 获取组件名称
   */
  private getComponentName(type: string): string {
    const nameMap: Record<string, string> = {
      'Button': '按钮',
      'Input': '输入框',
      'Select': '下拉选择',
      'Checkbox': '复选框',
      'Switch': '开关',
      'DatePicker': '日期选择',
      'Upload': '上传',
      'Card': '卡片',
      'Divider': '分割线',
      'Image': '图片',
      'Statistic': '统计数值',
      'Descriptions': '描述列表',
      'Typography.Text': '文本',
      'Typography.Title': '标题',
      'Typography.Paragraph': '段落',
    };
    return nameMap[type] || type;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const codeParser = new CodeParser();
