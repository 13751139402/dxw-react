export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText;

export const FunctionComponent = 0; // ‌函数组件
export const HostRoot = 3; // ‌宿主根节点
export const HostComponent = 5; // 宿主组件,平台原生组件
export const HostText = 6; // 文本组件
