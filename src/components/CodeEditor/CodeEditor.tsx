import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Button, message, Tooltip, Space } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  FormatPainterOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store';
import { codeGenerator, codeParser } from '@/core';
import styles from './CodeEditor.module.css';

/**
 * 代码编辑器组件
 */
const CodeEditor: React.FC = () => {
  const { components, replaceComponents } = useEditorStore();
  const [code, setCode] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFormatLoading, setIsFormatLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const isExternalUpdate = useRef(false);

  // 配置 Monaco 编辑器支持 JSX
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
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

    // 快捷键：Ctrl+S 应用代码
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleApplyCode();
    });
  };

  // 生成代码
  const generatedCode = useMemo(() => {
    return codeGenerator.generateCode(components);
  }, [components]);

  // 更新代码（来自画布变化）
  useEffect(() => {
    isExternalUpdate.current = true;
    setCode(generatedCode);
  }, [generatedCode]);

  // 格式化代码
  const handleFormat = useCallback(async () => {
    setIsFormatLoading(true);
    try {
      const formatted = await codeGenerator.formatCode(code);
      setCode(formatted);
      message.success('格式化成功');
    } catch (error) {
      message.error('格式化失败');
    } finally {
      setIsFormatLoading(false);
    }
  }, [code]);

  // 复制代码
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      message.success('已复制到剪贴板');
    });
  }, [code]);

  // 下载代码
  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'GeneratedPage.tsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('下载成功');
  }, [code]);

  // 应用代码到画布
  const handleApplyCode = useCallback(() => {
    setIsApplying(true);
    try {
      const parsedComponents = codeParser.parseCode(code);
      if (parsedComponents.length > 0) {
        replaceComponents(parsedComponents);
        message.success('代码已应用到画布');
      } else {
        message.warning('未解析到有效组件');
      }
    } catch (error) {
      message.error('代码解析失败');
      console.error('解析错误:', error);
    } finally {
      setIsApplying(false);
    }
  }, [code, replaceComponents]);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 处理代码变化
  const handleCodeChange = useCallback((value: string | undefined) => {
    // 忽略外部更新触发的变化
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    setCode(value || '');
  }, []);

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>生成的代码</h3>
        <Space size="small">
          <Tooltip title="应用到画布 (Ctrl+S)">
            <Button
              size="small"
              type="primary"
              icon={<SyncOutlined />}
              onClick={handleApplyCode}
              loading={isApplying}
            />
          </Tooltip>
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

      <div className={styles.editor}>
        <Editor
          height="100%"
          defaultLanguage="typescript"
          language="typescript"
          path="file:///GeneratedPage.tsx"
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
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

      <div className={styles.footer}>
        <span className={styles.stats}>
          {components.length} 个组件 | {code.split('\n').length} 行代码
        </span>
      </div>
    </div>
  );
};

export default CodeEditor;
