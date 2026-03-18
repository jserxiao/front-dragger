import React, { useState, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Upload,
  Button,
  Select,
  InputNumber,
  message,
  Space,
  Alert,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { StorageService, ComponentRegistry, ComponentMapManager } from '@/core';
import type { StoredCustomComponent } from '@/core/StorageService';
import { v4 as uuidv4 } from 'uuid';
import styles from './ImportComponentModal.module.css';

interface ImportComponentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FileContent {
  tsx: { content: string; name: string } | null;
  style: { content: string; name: string; type: 'css' | 'less' | 'scss' } | null;
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
const createPlaceholderComponent = (name: string, _tsxContent: string, styleContent?: string): React.FC<any> => {
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
 * 导入组件弹窗
 */
const ImportComponentModal: React.FC<ImportComponentModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileContent, setFileContent] = useState<FileContent>({
    tsx: null,
    style: null,
  });
  const [loading, setLoading] = useState(false);

  // 验证文件后缀
  const validateFileExtension = useCallback((filename: string): 'tsx' | 'css' | 'less' | 'scss' | null => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'tsx' || ext === 'jsx') return 'tsx';
    if (ext === 'css') return 'css';
    if (ext === 'less') return 'less';
    if (ext === 'scss' || ext === 'sass') return 'scss';
    return null;
  }, []);

  // 读取文件内容
  const readFileContent = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  }, []);

  // 处理文件变化
  const handleFileChange = useCallback(async (info: { fileList: UploadFile[] }) => {
    const newFileList = info.fileList.slice(-3); // 最多3个文件
    setFileList(newFileList);

    const newFileContent: FileContent = { tsx: null, style: null };

    for (const file of newFileList) {
      if (file.originFileObj) {
        try {
          const content = await readFileContent(file.originFileObj);
          const fileType = validateFileExtension(file.name);

          if (fileType === 'tsx') {
            newFileContent.tsx = { content, name: file.name };
          } else if (fileType) {
            newFileContent.style = {
              content,
              name: file.name,
              type: fileType,
            };
          }
        } catch (error) {
          console.error('读取文件失败:', error);
        }
      }
    }

    setFileContent(newFileContent);
  }, [readFileContent, validateFileExtension]);

  // 移除文件
  const handleRemoveFile = useCallback((file: UploadFile) => {
    const newFileList = fileList.filter((f) => f.uid !== file.uid);
    setFileList(newFileList);
    
    const fileType = validateFileExtension(file.name);
    if (fileType === 'tsx') {
      setFileContent((prev) => ({ ...prev, tsx: null }));
    } else if (fileType) {
      setFileContent((prev) => ({ ...prev, style: null }));
    }
  }, [fileList, validateFileExtension]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (!fileContent.tsx) {
        message.error('请上传 TSX 组件文件');
        return;
      }

      setLoading(true);

      // 检查组件名是否已存在
      const exists = await StorageService.componentNameExists(values.name);
      if (exists) {
        message.error('组件名称已存在，请使用其他名称');
        setLoading(false);
        return;
      }

      // 创建存储的组件对象
      const componentId = uuidv4();
      const componentType = `Custom.${values.name}`;

      const storedComponent: StoredCustomComponent = {
        id: componentId,
        name: values.name,
        tsxContent: fileContent.tsx.content,
        styleContent: fileContent.style?.content || '',
        styleType: fileContent.style?.type || 'css',
        config: {
          type: componentType,
          name: values.name,
          category: values.category || 'basic',
          defaultProps: {},
          defaultStyle: {},
          defaultSize: values.defaultSize || { width: 200, height: 100 },
          allowChildren: values.allowChildren ?? true,
          icon: values.icon,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 保存到 IndexedDB
      await StorageService.saveComponent(storedComponent);

      // 创建占位符组件（因为浏览器无法直接执行 TSX）
      const PlaceholderComponent = createPlaceholderComponent(
        values.name,
        fileContent.tsx.content,
        fileContent.style?.content
      );

      // 注册到 ComponentMapManager
      ComponentMapManager.register(componentType, PlaceholderComponent);

      // 注册到组件库
      ComponentRegistry.importComponent({
        name: values.name,
        path: `./custom/${values.name}`,
        config: {
          type: componentType,
          name: values.name,
          icon: <span className={styles.customIcon}>{values.name.charAt(0).toUpperCase()}</span>,
          category: (values.category || 'basic') as any,
          defaultProps: {},
          defaultStyle: {},
          propSchema: [],
          allowChildren: values.allowChildren ?? true,
          defaultSize: values.defaultSize || { width: 200, height: 100 },
        },
      });

      message.success('组件导入成功');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('导入组件失败:', error);
      message.error('导入组件失败');
    } finally {
      setLoading(false);
    }
  }, [fileContent, form, onSuccess]);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    form.resetFields();
    setFileList([]);
    setFileContent({ tsx: null, style: null });
    onClose();
  }, [form, onClose]);

  return (
    <Modal
      title="导入自定义组件"
      open={visible}
      onCancel={handleClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          disabled={!fileContent.tsx}
        >
          导入组件
        </Button>,
      ]}
    >
      <Alert
        message="导入说明"
        description={
          <ul className={styles.tips}>
            <li>必须上传 TSX/JSX 组件文件</li>
            <li>可选上传 CSS/Less/SCSS 样式文件</li>
            <li>组件名必填且不能重复</li>
            <li>导入后可在左侧组件库中找到</li>
            <li>自定义组件将以占位符形式显示在画布上</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="组件名称"
          rules={[
            { required: true, message: '请输入组件名称' },
            { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '组件名必须以字母开头，只能包含字母、数字和下划线' },
          ]}
        >
          <Input placeholder="例如: MyButton" />
        </Form.Item>

        <Form.Item label="组件文件">
          <Upload.Dragger
            multiple
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleFileChange}
            onRemove={handleRemoveFile}
            accept=".tsx,.jsx,.css,.less,.scss,.sass"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域</p>
            <p className="ant-upload-hint">
              支持 .tsx/.jsx 组件文件 和 .css/.less/.scss 样式文件
            </p>
          </Upload.Dragger>
        </Form.Item>

        <Form.Item name="category" label="组件分类" initialValue="basic">
          <Select>
            <Select.Option value="basic">基础组件</Select.Option>
            <Select.Option value="form">表单组件</Select.Option>
            <Select.Option value="layout">布局组件</Select.Option>
            <Select.Option value="display">展示组件</Select.Option>
            <Select.Option value="feedback">反馈组件</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="defaultSize" label="默认尺寸">
          <Space>
            <Form.Item name={['defaultSize', 'width']} noStyle>
              <InputNumber
                placeholder="宽度"
                min={20}
                max={2000}
                suffix="px"
              />
            </Form.Item>
            <Form.Item name={['defaultSize', 'height']} noStyle>
              <InputNumber
                placeholder="高度"
                min={20}
                max={2000}
                suffix="px"
              />
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item name="allowChildren" label="允许子组件" valuePropName="checked" initialValue={true}>
          <Select>
            <Select.Option value={true}>是</Select.Option>
            <Select.Option value={false}>否</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ImportComponentModal;
