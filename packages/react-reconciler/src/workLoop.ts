import { beginWork } from './beginWork';
import { commitMutationEffects } from './commitWork';
import { completeWork } from './completeWork';
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber';
import { MutationMask, NoFlags } from './fiberFlags';
import { HostRoot } from './warkTags';

// 深度优先遍历
let workInProgress: FiberNode | null;

// 词意：准备新鲜的堆栈
// 创建wip hostRootFiber
function prepareFreshStack(root: FiberRootNode) {
	// 根据(root.current，即hostRootFiber生成对应的workInProgress（目前只有hostRootFiber）
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
	} while (workInProgress);

	// root=fiberRootNode, root.current=hostRootFiber, root.current.alternate=wipHostRootFiber
	// root.current.alternate就是执行workInProgress = createWorkInProgress(root.current, {})的时候创建的hostRootFiber对于的workInProgress Fiber
	// 当前这颗hostRootFiber下面已经生成了一颗完整的workInProgress树了，并且这棵树中的某些节点还包含了副作用标记
	const finishWork = root.current.alternate;
	root.finishWork = finishWork;

	// wip fiberNode树 树中的flags执行具体的DOM操作
	commitRoot(root);
}
// commitRoot 函数是 React 协调器中 commit 阶段（提交阶段）的入口函数，负责将协调阶段的结果提交到实际的 DOM 中。
// ## 核心功能
// 1. 提交阶段开始 ：启动 React 的 commit 阶段
// 2. 副作用判断 ：判断是否需要执行 DOM 操作
// 3. 执行副作用 ：执行 DOM 更新、插入、删除等操作
// 4. Fiber 树切换 ：完成新旧 Fiber 树的切换
function commitRoot(root: FiberRootNode) {
	const finishWork = root.finishWork;
	if (finishWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn('commit阶段开始', finishWork);
	}

	// 重置
	// root.finishWork已经不需要了，因为被保存在finishWork这个变量中了
	root.finishWork = null;

	// 判断是否存在3个子阶段需要执行的操作
	// 需要判断两项 root.flags和root.subtreeFlags
	// 问：有没有很简便的方式判断commit阶段需要执行呢？
	// 答：可以用flags-MutationMask来判断，包括子阶段判断是否需要执行，也可以用flags判断

	// 	### 性能优势
	// 1. 速度快 ：位运算比属性访问快得多
	// 2. 内存少 ：一个数字可以表示多个状态
	// 3. 组合灵活 ：可以用掩码一次性检查多个状态
	// 4. 代码简洁 ：一行代码就能完成复杂的状态检查

	// 使用 MutationMask 掩码检查是否有需要在 commit 阶段执行的副作用：
	// - 检查子树是否有副作用
	// - 检查根节点是否有副作用

	// 	### 按位与操作符（&）按位与会对两个数的二进制位进行操作：
	// - 只有当两个位都是 1 时，结果才是 1
	// - 只要有一个位是 0，结果就是 0
	// 比如：1&0=0，0&0=0，1&1=1
	// 比如：finishWork.subtreeFlags=0b0000010，MutationMask=0b0000111，那么完的结果就是0b0000010
	const subtreeHasEffect = (finishWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishWork.flags & MutationMask) !== NoFlags;
	if (subtreeHasEffect || rootHasEffect) {
		// beforeMutation
		// mutation,Flags在此阶段执行
		commitMutationEffects(finishWork);
		// fiber树的切换
		root.current = finishWork;
		// layout
	} else {
		// 即使没有更新发生的话也需要执行这个操作
		root.current = finishWork;
	}
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}
// 词意：执行工作单元
function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
	// ReactElement.props.child保存着子节点的ReactElement
	// beginWork会把ReactElement.props.child中的子节点的ReactElement转换为FiberNode，保存到fiber.child中
	// pendingProps转化完毕后，memoizedProps就会被更新为pendingProps
	fiber.memoizedProps = fiber.pendingProps;
	if (next === null) {
		// 到底开始“归”阶段
		completeUnitOfWork(fiber);
	} else {
		// 没到底就继续“递”
		workInProgress = next;
	}
}
// beginWork 负责"下" ：处理当前节点的子节点，向下遍历 Fiber 树
// completeWork 负责"右和上" ：处理当前节点的兄弟节点（右）和父节点（上）
function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		// 调用 completeWork 处理当前节点的完成工作
		completeWork(node);
		// 检查当前节点是否有兄弟节点（sibling）
		const sibling = node.sibling;
		if (sibling !== null) {
			// 如果有兄弟节点，将 workInProgress 指向兄弟节点并返回，开始处理兄弟节点的"递"阶段
			workInProgress = sibling;
			return;
		}
		// 如果没有兄弟节点，返回到父节点继续处理
		node = node.return;
		workInProgress = null;
	} while (node !== null); // 循环直到回到根节点（HostRootFiber）
}
