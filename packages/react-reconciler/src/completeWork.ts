import {
	appendInitialChild,
	Container,
	createInstance,
	createTextInstance
} from 'react-dom/src/hostConfig';
import { FiberNode } from './fiber';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './warkTags';
import { NoFlags } from './fiberFlags';
// 在 React 协调过程中的位置
// completeWork 函数是"归"阶段的核心，与"递"阶段的 beginWork 函数配合：
// 	1. beginWork 向下遍历 Fiber 树，创建或更新节点
// 	2. 当到达叶节点时，开始 completeWork 的"归"过程
// 	3. completeWork 向上遍历，完成节点处理（创建或更新DOM并附加子节点）并冒泡副作用
// 	4. 最终回到根节点，完成整个协调过程
// 技术意义
// 	1. DOM 操作 ：负责将虚拟 DOM 转换为实际 DOM
// 	2. 副作用管理 ：通过冒泡机制高效管理副作用
// 	3. 性能优化 ：只处理有副作用的节点，避免不必要的操作
// 	4. 协调流程 ：确保协调过程的完整性和正确性
// React 能够高效更新 UI 的关键部分，它确保了虚拟 DOM 到实际 DOM 的正确转换，同时通过副作用冒泡机制优化了更新过程
// - 对于Host类型fiberNode：构建离屏DOM树
// - 标记Update flag(TODO)
export const completeWork = (wip: FiberNode) => {
	console.log('completeWork', wip);
	// 递归中的归
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	// 处理不同类型的 Fiber 节点
	switch (wip.tag) {
		// HostComponent （DOM 元素）
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// 如果是更新阶段（已有 DOM 实例），准备更新 DOM
				// update
			} else {
				// 如果是创建阶段（无 DOM 实例），创建 DOM 实例并将子节点附加到其上
				// 1.构建DOM
				const instance = createInstance(wip.type); // 创建宿主环境的实例，对应浏览器环境的dom
				// 2.将DOM插入到DOM树中
				// 因为是归操作，所以instance就是整颗离屏Dom树最靠上的一个dom，所以将剩下的离屏dom挂载到instance上
				appendAllChildren(instance, wip);
				wip.stateNode = instance;
			}
			// 因为completeWork是向上遍历的过程，所以遍历到的每一个节点都是当前最靠上的一个节点
			// 每次都执行一下bubbleProperties,就能将这个节点的子节点以及子节点的兄弟节点中包含的flags全都冒泡到当前节点的subtreeFlags上
			// 这样一直冒泡到根节点，那么根节点就能拿到整颗树的subtreeFlags,如果根节点的subtreeFlags包含了副作用，就代表子树中存在插入、更新或者删除等副作用，那么就要向下遍历找到具体的fiber包含了副作用
			// 如果某颗子树的根节点的subtreeFlags是NoFlags,就代表这颗子树中没有副作用，就不需要继续向下遍历了，可以直接跳过这颗子树
			// 通过向上遍历的过程中不断冒泡，就能知道当前子树存不存在副作用
			// 调用 bubbleProperties 将子节点的副作用标志冒泡到当前节点
			// 这样在commit阶段，React 可以只处理有副作用的部分，提高性能
			bubbleProperties(wip);
			return null;
		// 类似 HostComponent，创建或更新文本节点
		case HostText:
			if (current !== null && wip.stateNode) {
				// stateNode上次已经有DOM了,说明是update阶段,需要更新DOM
				// update
			} else {
				// 1.构建DOM
				const instance = createTextInstance(newProps.content); // 创建文本节点
				// 不需要执行appendInitialChild。因为文本节点没有子节点，所以直接将instance挂载到wip上就行了
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		// HostRoot （根节点）：处理根节点的完成逻辑
		case HostRoot:
			// 走完整个流程会生成<div>hello</div>的离屏dom，但是依然没有挂载到根dom中，需要等到commit阶段再插入到dom树
			bubbleProperties(wip);
			return null;
		// DFS中，子节点会先进行completeWork，所以子节点如果是HostComponent或者HostText，会先完成创建且带上subtreeFlags,
		// 等到FC completeWork时，子节点都已经执行完毕了，FC只需要向上冒泡subtreeFlags即可
		case FunctionComponent:
			bubbleProperties(wip);
			return null;

		default:
			if (__DEV__) {
				console.warn('未处理的completeWork情况', wip);
			}
	}
};
// function A(){
// 	return <div>111</div>
// }
// <h3><A/></h3>
// 难度在于，对于h3这个dom节点来说，虽然它的子节点是a函数组件，但是对于dom树来说，h3的子节点是div

// 更复杂的情况在于A还有一个兄弟节点,对于h3来说不仅要插入A的子节点div，同时也要插入A的兄弟节点，另一个A的子节点div
// <h3>
// 	<A/>
// 	<A/>
// </h3>

// 我们希望在parent这个节点下插入wip这个节点，但是wip可能不是一个dom节点，所以对于wip我们还需要一个递归的流程
// 寻找里面的HostComponent或者HostText节点
// 整个流程就是跟beginWork和completeWork一样的递归流程，DFS

// DFS: 先下后右
// appendAllChildren 函数的作用是将 Fiber 节点的所有子节点（包括函数组件等非 DOM 节点）中实际的 DOM 节点附加到父 DOM 节点上
// ## 核心功能
// 1. 深度优先遍历 ：通过 DFS 算法遍历 Fiber 树
// 2. DOM 节点过滤 ：只处理 HostComponent （DOM 元素）和 HostText （文本节点）
// 3. 非 DOM 节点跳过 ：跳过函数组件等没有对应 DOM 的 Fiber 节点，继续向下查找
// 4. 构建 DOM 树 ：将找到的所有 DOM 节点按顺序附加到父节点
//
// 这个函数解决了 React Fiber 树与实际 DOM 树结构不一致的问题：
// 1. Fiber 树 ：包含所有节点（函数组件、类组件、DOM 节点等）
// 2. DOM 树 ：只包含实际的 DOM 元素和文本节点
function appendAllChildren(parent: Container, wip: FiberNode) {
	let node = wip.child;

	while (node !== null) {
		// 如果是 DOM 元素或文本节点，直接附加到父节点
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node.stateNode);
		} else if (node.child !== null) {
			// 如果是非 DOM 节点但有子节点，继续向下遍历
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}

		// 走到这里就代表往下遍历没找到子节点，也没找到兄弟节点，需要往上归
		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node.return;
		}

		// sibling
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

// flags冒泡
// bubbleProperties 函数的作用是将子节点的副作用标志（flags）冒泡到当前节点，使父节点能够了解整个子树的副作用情况。

// ## 核心功能
// 1. 副作用收集 ：收集所有子节点的副作用标志
// 2. 向上冒泡 ：通过按位或操作将子节点的副作用合并到父节点
// 3. 性能优化 ：使根节点能够快速判断子树是否需要处理

// ### 位运算的优势
// - 使用按位或（ |= ）操作可以高效地合并多个副作用标志
// - 每个位代表一种特定的副作用（如更新、插入、删除等）
// - 位运算比传统的对象属性访问更高效

// ### 性能优化
// 通过这个冒泡机制：
// - 快速判断 ：根节点的 subtreeFlags 可以快速告诉我们是否需要处理子树
// - 跳过无副作用的子树 ：如果某个节点的 subtreeFlags 是 NoFlags ，可以直接跳过该子树的处理
// - 只处理必要部分 ：在 commit 阶段，只需要处理有副作用标记的节点

// ## 在 React 协调过程中的作用
// 这个函数是 React 能够高效更新 UI 的关键机制之一：
// 1. 在 "归" 阶段（completeWork）中调用
// 2. 使副作用信息从下往上流动
// 3. 为 commit 阶段的高效处理奠定基础
// 4. 确保 React 只执行必要的 DOM 操作

// ### 按位或操作符（|）
// 按位或会对两个数的二进制位进行操作：

// - 只要有一个位是 1，结果就是 1
// - 只有当两个位都是 0 时，结果才是 0

function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags;
	let child = wip.child;

	while (child !== null) {
		// 按位或操作 11=1 00=0 01=1 10=1，重复的flags会被合并
		// 合并子节点的 subtreeFlags （子节点的子树副作用）
		subtreeFlags |= child.subtreeFlags;
		// 合并子节点的 flags （子节点自身的副作用）
		subtreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}
	// 将收集到的所有副作用合并到当前节点的 subtreeFlags 中
	wip.subtreeFlags |= subtreeFlags;
}
