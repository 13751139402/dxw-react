import {
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import { HostComponent, HostRoot, HostText } from './warkTags';
import { NoFlags } from './fiberFlags';

// - 对于Host类型fiberNode：构建离屏DOM树
// - 标记Update flag(TODO)
export const completeWork = (wip: FiberNode) => {
	// 递归中的归
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// stateNode上次已经有DOM了,说明是update阶段,需要更新DOM
				// update
			} else {
				// 1.构建DOM
				const instance = createInstance(wip.type, newProps); // 创建宿主环境的实例，对应浏览器环境的dom
				// 2.将DOM插入到DOM树中
				// 因为是归操作，所以instance就是整颗离屏Dom树最考上的一个dom，所以将剩下的离屏dom挂载到instance上
				appendInitialChild(instance, wip);
				wip.stateNode = instance;
			}
			// 因为completeWork是向上遍历的过程，所以遍历到的每一个节点都是当前最靠上的一个节点
			// 每次都执行一下bubbleProperties,就能将这个节点的子节点以及子节点的兄弟节点中包含的flags全都冒泡到当前节点的subtreeFlags上
			// 这样一直冒泡到根节点，那么根节点就能拿到整颗树的subtreeFlags,如果根节点的subtreeFlags包含了副作用，就代表子树中存在插入、更新或者删除等副作用，那么就要向下遍历找到具体的fiber包含了副作用
			// 如果某颗子树的根节点的subtreeFlags是NoFlags,就代表这颗子树中没有副作用，就不需要继续向下遍历了，可以直接跳过这颗子树
			// 通过向上遍历的过程中不断冒泡，就能知道当前子树存不存在副作用
			bubbleProperties(wip);
			return null;
		case HostText:
			if (current !== null && wip.stateNode) {
				// stateNode上次已经有DOM了,说明是update阶段,需要更新DOM
				// update
			} else {
				// 1.构建DOM
				const instance = createTextInstance(newProps.content); // 创建文本节点
				// 不需要执行appendInitialChild。因为文本节点没有子节点，所以instance就是整颗离屏Dom树最靠上的一个dom，所以直接将instance挂载到wip上就行了
				// appendInitialChild(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		case HostRoot:
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
function appendAllChildren(parent: FiberNode, wip: FiberNode) {
	let node = wip.child;

	while (node !== null) {
		// 如果找到HostComponent和HostText对于着原生组件和文本，可以直接插入
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node.stateNode);
		} else if (node.child !== null) {
			// child
			// 复杂的情况:函数组件等没有对应DOM节点的fiberNode,需要继续向下寻找
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
function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags;
	let child = wip.child;

	while (child !== null) {
		// 只要child存在，就用按位或的操作将child的subtreeFlags附加在当前wip的subtreeFlags上
		subtreeFlags |= child.subtreeFlags;
		// 同时还要包含当前child的flags，因为child本身也可能有副作用
		subtreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}
	// 最后将子树的副作用和当前wip的副作用合并在一起，赋值给当前wip的subtreeFlags
	wip.subtreeFlags |= subtreeFlags;
}
