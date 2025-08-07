import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './warkTags';

// 深度优先遍历
let workInProgress: FiberNode | null;

// 词意：准备新鲜的堆栈
// 创建wip hostRootFiber
function prepareFreshStack(root: FiberRootNode) {
	// 根据(root.current，即hostRootFiber生成对应的workInProgress
	workInProgress = createWorkInProgress(root.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// TODO 调度功能
	// 通过当前setState触发的fiber向上遍历找到fiberRootNode
	const root = markUpdateFormFiberToRoot(fiber);
	renderRoot(root);
}

// 找到FiberRootNode
function markUpdateFormFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if ((node.tag = HostRoot)) {
		return node.stateNode;
	}
	return null;
}

// 从根节点开始diff
function renderRoot(root: FiberRootNode) {
	// 初始化生成wip树的hostRootFiber
	prepareFreshStack(root);

	// 更新流程，递归流程
	// 向下递:beginWork
	// 向上归:completeWork
	do {
		try {
			workLoop();
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop发生错误', e);
			}
			workInProgress = null;
		}
	} while (true);
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}
// 词意：执行工作单元
function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
	// 等待的props变为当前props
	fiber.memoizedProps = fiber.pendingProps;
	if (next === null) {
		// 到底开始“归”阶段
		completeUnitOfWork(fiber);
	} else {
		// 没到底就继续“递”
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		const next = completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			// 有sibling就结束当前completeUnitOfWork，开始执行sibling的"递"
			workInProgress = sibling;
			return;
		}
		// "归"完成就回到父级
		node = node.return;
		workInProgress = null;
	} while (node !== null); // 一直"归"到HostRootFiber
}
