import { Container } from 'react-dom/src/hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './warkTags';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

// 先创建当前宿主HostRootNode，再创建FiberRootNode，并把FiberRootNode.current指向HostRootNode
// reactDom.createRoot(root).render(<App/>)的createRoot函数
export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}

// 创建update,并将update enqueue updateQueue中,将[首屏渲染]与[触发机制]连接起来
// 触发更新的机制是保存在updateQueue中的
// reactDom.createRoot(root).render(<App/>)的render函数
export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	const hostRootFiber = root.current;
	const update = createUpdate<ReactElementType | null>(element);
	// 将update插入updateQueue中以后,用于beginWork中的reconcilerChildren时计算
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
		update
	);
	// 开始调度
	scheduleUpdateOnFiber(hostRootFiber);
	return element;
}
