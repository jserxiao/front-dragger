/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css' {
  const content: string;
  export default content;
}

// 允许导入 .tsx 文件
declare module '*.tsx' {
  const component: React.ComponentType<any>;
  export default component;
}
