import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './warkTags';
import { mountChildFibers, reconcilerChildFibers } from './childFibers';

// 递归中的递阶段
// 创建wip fibers
export const beginWork = (wip: FiberNode) => {
	// 比较，返回子FiberNode
	switch (wip.tag) {
		case HostRoot: // HostRootFiber
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			// 文本节点没有children，结束递阶段，开始归阶段
			return null;

		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
	}
	return null;
};

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending; // 参与计算的pending
	updateQueue.shared.pending = null;
	const { memoizedState } = processUpdateQueue(baseState, pending); // pending是等待的state
	// reactDom.createRoot(root).render(<App/>)
	// render时会创建HostRootFiber,memoizedState对应的就是<App/>这个ReactElement
	wip.memoizedState = memoizedState;

	const nextChildren = wip.memoizedState;
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children; // 子reactElement
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}
// 子阶段的current fiberNode和子节点的reactElement生成对应的wip fiberNode
function reconcilerChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;
	if (current !== null) {
		// update
		wip.child = reconcilerChildFibers(wip, current?.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}
