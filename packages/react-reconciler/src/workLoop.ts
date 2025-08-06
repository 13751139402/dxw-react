import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './warkTags';

// 深度优先遍历
let workInProgress: FiberNode | null;

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
			console.warn('workLoop发生错误', e);
			workInProgress = null;
		}
	} while (true);
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
	fiber.memoizedProps = fiber.pendingProps;
	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		const next = completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		node = node.return;
		workInProgress = null;
	} while (node !== null);
}
