/**
 * IndexedDB 存储服务
 * 用于持久化存储导入的自定义组件
 */

const DB_NAME = 'FrontDraggerDB';
const DB_VERSION = 1;
const STORE_NAME = 'customComponents';

export interface StoredCustomComponent {
  id: string;
  name: string;
  tsxContent: string;
  styleContent: string;
  styleType: 'css' | 'less' | 'scss';
  config: {
    type: string;
    name: string;
    category: string;
    defaultProps: Record<string, any>;
    defaultStyle: Record<string, any>;
    defaultSize: { width: number | string; height: number | string };
    allowChildren: boolean;
    icon?: string;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * IndexedDB 操作服务
 */
class StorageServiceImpl {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('无法打开 IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建存储对象
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 获取事务和存储对象
   */
  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
  }

  /**
   * 保存自定义组件
   */
  async saveComponent(component: StoredCustomComponent): Promise<void> {
    const store = await this.getStore('readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(component);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('保存组件失败'));
    });
  }

  /**
   * 获取所有自定义组件
   */
  async getAllComponents(): Promise<StoredCustomComponent[]> {
    const store = await this.getStore('readonly');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('获取组件列表失败'));
    });
  }

  /**
   * 根据 ID 获取组件
   */
  async getComponent(id: string): Promise<StoredCustomComponent | undefined> {
    const store = await this.getStore('readonly');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('获取组件失败'));
    });
  }

  /**
   * 删除组件
   */
  async deleteComponent(id: string): Promise<void> {
    const store = await this.getStore('readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('删除组件失败'));
    });
  }

  /**
   * 检查组件名是否已存在
   */
  async componentNameExists(name: string, excludeId?: string): Promise<boolean> {
    const components = await this.getAllComponents();
    return components.some(c => c.name === name && c.id !== excludeId);
  }

  /**
   * 清空所有组件
   */
  async clearAll(): Promise<void> {
    const store = await this.getStore('readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('清空组件失败'));
    });
  }
}

export const StorageService = new StorageServiceImpl();
