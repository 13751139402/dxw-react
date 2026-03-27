import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './warkTags';
import { mountChildFibers, reconcilerChildFibers } from './childFibers';

// 递归中的递阶段
// 创建wip fibers
// beginWork 在"递"阶段的核心职责是 生成下一个子 Fiber 节点
// 1.根据 Fiber 节点类型进行差异化处理
// 	 a.根据 wip.tag 判断节点类型（HostRoot、HostComponent、HostText 等）对不同类型的节点执    行不同的处理逻辑
// 2.处理更新和创建子 Fiber 节点
// 	 a.HostRoot ：处理根节点的更新队列，计算新的状态，生成子 Fiber 树
// 	 b.HostComponent ：处理原生 DOM 元素，根据 props.children 生成子 Fiber 树
// 	 c.HostText ：文本节点没有子节点，直接返回 null 结束"递"阶段
// 3.协调子节点（Reconciliation）
// 	 a.通过 reconcilerChildren 函数对比子节点
// 	 b.更新阶段：使用 reconcilerChildFibers 进行 Diff 算法
// 	 c.挂载阶段：使用 mountChildFibers 创建新的子 Fiber 节点
// 4.返回下一个工作单元
// 	 a.返回子 Fiber 节点，让 performUnitOfWork 继续向下遍历
// 	 b.如果没有子节点（如 HostText），返回 null，进入"归"阶段
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
	// 取出待处理的更新（ pending ）
	const pending = updateQueue.shared.pending;
	// 清空更新队列的 pending 字段，避免重复处理
	updateQueue.shared.pending = null;
	// 调用 processUpdateQueue 计算新的状态
	const { memoizedState } = processUpdateQueue(baseState, pending); // pending是等待的state
	// reactDom.createRoot(root).render(<App/>)
	// render时会创建HostRootFiber,memoizedState对应的就是<App/>这个ReactElement
	// 更新根节点的状态
	wip.memoizedState = memoizedState;

	// 调用 reconcilerChildren 将 子ReactElment 生成或更新成 子Fiber
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
		// 增加优化策略：
		// 调用ReactDOM.createRoot()，会生成current Tree的hostRootFiber，wip tree也会生成hostRootFiber
		// 因为wip.alternate===current,所以会走reconcilerChildFibers流程给hostRootFiber添加flags=Placement
		// current下面的fiber因为没有alternate，所以不会被添加flags=Placement，走mountChildFibers流程
		// 这样就可以避免在初次渲染时，hostRootFiber下面的fiber都被添加flags=Placement，导致性能问题
		// update
		wip.child = reconcilerChildFibers(wip, current?.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}
