import { appendChildToContainer, Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { MutationMask, NoFlags, Placement } from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './warkTags';
let nextEffect: FiberNode | null = null;
export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;

		// &:按位与操作，判断某个 flag 是否被包含在flags中
		// 只要subtreeFlags中包含了MutationMask中指定的flags，就代表子节点有可能存在mutation的操作
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			// else的情况：
			// 1.找到底了
			// 2.当前节点的subtreeFlags不包含MutationMask，但是可能flags包含MutationMask
			// 接下来就要向上遍历。reconciler阶段已经实现了一次了，就是DFS深度优先遍历，先往下遍历到最深的节点，再往上遍历
			// 区别在于这里最深的节点不一定是叶子节点，可能是遇到的第一个不存在subtreeFlags的节点
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};

// 当前finishedWork就是真正存在flags的fiber节点
const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;
	// 代表fiber节点存在placement操作
	if ((flags & Placement) !== NoFlags) {
		commItPlacement(finishedWork);
		// 这个操作就是将Placement从flags中移除
		// 分步拆解计算过程：
		// 第一步：~Placement 对 Placement 取反
		// Placement 二进制：0000010 → 取反后：1111101（简化为 7 位，实际 JS 是 32 位，不影响核心逻辑）
		// 第二步：flags & ~Placement
		//    0000110 (原 flags：Placement + Update)
		//  & 1111101 (~Placement)
		//  ---------
		//    0000100 (结果：只剩 Update 标记，Placement 被移除)
		finishedWork.flags &= ~Placement;
	}
};

const commItPlacement = (finishedWork: FiberNode) => {
	// 插入操作需要知道些什么：1.父节点 2.finishedWork对应的DOM节点
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}
	// parent DOM
	const hostParent = getHostParent(finishedWork);
	// 找到finishedWork-DOM append parent-DOM
	appendPlacementNodeIntoContainer(finishedWork, hostParent);
};

// 获得宿主环境的parent节点，应该执行向上遍历的过程
function getHostParent(fiber: FiberNode) {
	let parent = fiber.return;

	while (parent) {
		const parentTag = parent.tag;
		// 哪几种情况下parentTag才对应着宿主环境下的父级节点呢
		if (parentTag === HostComponent) {
			// 对于HostComponent的fiber节点来说，对应的宿主环境节点是保存在stateNode中的
			return parent.stateNode as Container;
		}
		if (parentTag === HostRoot) {
			// HostRoot的原生节点保存在哪？
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}

	if (__DEV__) {
		console.warn('未找到host parent', fiber);
	}
}

// 将placement对应的DOM节点append到Container中
function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	// 传进来的finishedWork不一定是HostComponent类型的fiber节点
	// 通过finishedWork向下遍历找到对应的宿主环境，也就是HostComponent类型的fiber
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		appendChildToContainer(finishedWork.stateNode, hostParent);
		return;
	}
	// 递归向下DFS，直到找到第一层HostComponent或者HostText类型的fiber节点，将这个子节点及兄弟节点，都执行appendChildToContainer操作
	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
