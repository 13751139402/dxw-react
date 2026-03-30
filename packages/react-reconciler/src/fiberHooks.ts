import { FiberNode } from './fiber';

export function renderWithHooks(wip: FiberNode) {
	const Component = wip.type; // 对于一个函数组件，函数保存在wip.type中
	const props = wip.pendingProps;
	const children = Component(props);
	return children;
}
