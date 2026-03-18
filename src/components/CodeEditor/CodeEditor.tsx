import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import Editor, { Monaco, OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Button, message, Tooltip, Space, Tabs } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  FormatPainterOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { codeGenerator } from '@/core';
import styles from './CodeEditor.module.css';

// 配置 Monaco 使用国内 CDN 加速
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

/**
 * 代码编辑器组件
 */
const CodeEditor = () => {
  const { components } = useEditorStore();
  const [tsxCode, setTsxCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFormatLoading, setIsFormatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tsx');
  const tsxEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const cssEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const isExternalUpdate = useRef(false);

  // 配置 Monaco 编辑器支持 JSX
  const handleTsxEditorMount: OnMount = (editor, monaco) => {
    tsxEditorRef.current = editor;
    monacoRef.current = monaco;

    // 配置 TypeScript 编译器选项以支持 JSX
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      reactNamespace: 'React',
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: false,
      noEmit: true,
    });

    // 添加 React 类型定义
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module 'react' {
        export = React;
        export as namespace React;
      }
      declare namespace React {
        function createElement(type: any, props?: any, ...children: any[]): any;
        function useState<T>(initial: T): [T, (value: T | ((prev: T) => T)) => void];
        function useEffect(effect: () => void | (() => void), deps?: any[]): void;
        function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
        function useMemo<T>(factory: () => T, deps: any[]): T;
        function useRef<T>(initial: T): { current: T };
        interface FC<P = {}> {
          (props: P & { children?: React.ReactNode }): React.ReactElement | null;
        }
        type ReactNode = string | number | boolean | null | undefined | React.ReactElement | React.ReactNode[];
        interface ReactElement {
          type: any;
          props: any;
          key: any;
        }
      }
    `, 'react.d.ts');

    // 添加 react/jsx-runtime 类型定义
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module 'react/jsx-runtime' {
        export function jsx(type: any, props: any, key?: any): any;
        export function jsxs(type: any, props: any, key?: any): any;
        export const Fragment: any;
      }
    `, 'react-jsx-runtime.d.ts');

    // 添加 antd 类型定义
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module 'antd' {
        export const Button: React.FC<any>;
        export const Input: React.FC<any>;
        export const Select: React.FC<any>;
        export const Checkbox: React.FC<any>;
        export const Switch: React.FC<any>;
        export const DatePicker: React.FC<any>;
        export const Upload: React.FC<any>;
        export const Card: React.FC<any>;
        export const Divider: React.FC<any>;
        export const Image: React.FC<any>;
        export const Statistic: React.FC<any>;
        export const Descriptions: React.FC<any>;
        export const Typography: {
          Text: React.FC<any>;
          Title: React.FC<any>;
          Paragraph: React.FC<any>;
        };
        export const Form: React.FC<any>;
        export const Table: React.FC<any>;
        export const Modal: React.FC<any>;
        export const message: {
          success: (content: string) => void;
          error: (content: string) => void;
          warning: (content: string) => void;
          info: (content: string) => void;
        };
      }
    `, 'antd.d.ts');

    // 添加 CSS Module 类型定义
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module '*.module.css' {
        const classes: { [key: string]: string };
        export default classes;
      }
      declare module './GeneratedPage.module.css' {
        const classes: { [key: string]: string };
        export default classes;
      }
    `, 'css-modules.d.ts');
  };

  // 配置 CSS 编辑器
  const handleCssEditorMount: OnMount = (editor) => {
    cssEditorRef.current = editor;
  };

  // 生成代码
  const generatedCode = useMemo(() => {
    return codeGenerator.generateCode(components);
  }, [components]);

  // 更新代码（来自画布变化），自动格式化
  useEffect(() => {
    const formatAndUpdate = async () => {
      isExternalUpdate.current = true;
      try {
        const formattedTsx = await codeGenerator.formatCode(generatedCode.tsx);
        setTsxCode(formattedTsx);
      } catch {
        setTsxCode(generatedCode.tsx);
      }
      setCssCode(generatedCode.css);
    };
    formatAndUpdate();
  }, [generatedCode]);

  // 格式化代码
  const handleFormat = useCallback(async () => {
    setIsFormatLoading(true);
    try {
      const formattedTsx = await codeGenerator.formatCode(tsxCode);
      setTsxCode(formattedTsx);
      message.success('格式化成功');
    } catch (error) {
      message.error('格式化失败');
    } finally {
      setIsFormatLoading(false);
    }
  }, [tsxCode]);

  // 复制代码
  const handleCopy = useCallback(() => {
    const code = activeTab === 'tsx' ? tsxCode : cssCode;
    navigator.clipboard.writeText(code).then(() => {
      message.success('已复制到剪贴板');
    });
  }, [activeTab, tsxCode, cssCode]);

  // 下载代码
  const handleDownload = useCallback(() => {
    // 下载 TSX 文件
    const tsxBlob = new Blob([tsxCode], { type: 'text/typescript' });
    const tsxUrl = URL.createObjectURL(tsxBlob);
    const tsxLink = document.createElement('a');
    tsxLink.href = tsxUrl;
    tsxLink.download = 'GeneratedPage.tsx';
    document.body.appendChild(tsxLink);
    tsxLink.click();
    document.body.removeChild(tsxLink);
    URL.revokeObjectURL(tsxUrl);

    // 下载 CSS 文件
    const cssBlob = new Blob([cssCode], { type: 'text/css' });
    const cssUrl = URL.createObjectURL(cssBlob);
    const cssLink = document.createElement('a');
    cssLink.href = cssUrl;
    cssLink.download = 'GeneratedPage.css';
    document.body.appendChild(cssLink);
    cssLink.click();
    document.body.removeChild(cssLink);
    URL.revokeObjectURL(cssUrl);

    message.success('下载成功');
  }, [tsxCode, cssCode]);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 切换收起/展开
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  // 处理 TSX 代码变化
  const handleTsxCodeChange = useCallback((value: string | undefined) => {
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    setTsxCode(value || '');
  }, []);

  // 处理 CSS 代码变化
  const handleCssCodeChange = useCallback((value: string | undefined) => {
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    setCssCode(value || '');
  }, []);

  return (
    <>
      {/* 收起状态下显示在底部的展开按钮 */}
      {isCollapsed && !isFullscreen && (
        <div className={styles.collapsedToggleButton}>
          <Tooltip title="展开代码面板">
            <Button
              size="small"
              icon={<UpOutlined />}
              onClick={toggleCollapsed}
            />
          </Tooltip>
        </div>
      )}
      
      <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.header}>
        {/* 收起/展开按钮 - 放在 header 左侧 */}
        <Tooltip title={isCollapsed ? '展开代码面板' : '收起代码面板'}>
          <Button
            size="small"
            icon={isCollapsed ? <UpOutlined /> : <DownOutlined />}
            onClick={toggleCollapsed}
          />
        </Tooltip>
        <h3 className={styles.title}>生成的代码</h3>
        <div className={styles.headerActions}>
          <Space size="small">
            <Tooltip title="格式化">
              <Button
                size="small"
                icon={<FormatPainterOutlined />}
                onClick={handleFormat}
                loading={isFormatLoading}
              />
            </Tooltip>
            <Tooltip title="复制">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopy}
              />
            </Tooltip>
            <Tooltip title="下载">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
              />
            </Tooltip>
            <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
              <Button
                size="small"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      <div className={styles.editorContainer}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className={styles.tabs}
          destroyOnHidden
          items={[
            {
              key: 'tsx',
              label: 'TSX',
              children: (
                <div className={styles.editor}>
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    language="typescript"
                    path="file:///GeneratedPage.tsx"
                    theme="vs-dark"
                    value={tsxCode}
                    onChange={handleTsxCodeChange}
                    onMount={handleTsxEditorMount}
                    loading={
                      <div className={styles.loading}>
                        加载编辑器中...
                      </div>
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      folding: true,
                      readOnly: false,
                      quickSuggestions: true,
                      suggestOnTriggerCharacters: true,
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'css',
              label: 'CSS',
              children: (
                <div className={styles.editor}>
                  <Editor
                    height="100%"
                    defaultLanguage="css"
                    language="css"
                    path="file:///GeneratedPage.css"
                    theme="vs-dark"
                    value={cssCode}
                    onChange={handleCssCodeChange}
                    onMount={handleCssEditorMount}
                    loading={
                      <div className={styles.loading}>
                        加载编辑器中...
                      </div>
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      folding: true,
                      readOnly: false,
                      quickSuggestions: true,
                      suggestOnTriggerCharacters: true,
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.stats}>
          {components.length} 个组件 | TSX: {tsxCode.split('\n').length} 行 | CSS: {cssCode.split('\n').length} 行
        </span>
      </div>
      </div>
    </>
  );
};

export default CodeEditor;
