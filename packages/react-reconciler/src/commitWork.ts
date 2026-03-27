// hostConfig不报错
// 1.ts：tsconfig.json中配置路径别名path
// 2.打包流程：react-dom.config.js中配置alias来指定hostConfig别名的路径
import { appendChildToContainer, Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { MutationMask, NoFlags, Placement } from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './warkTags';
let nextEffect: FiberNode | null = null;

// commitMutationEffects 函数是 React commit 阶段中 mutation 子阶段的核心函数，负责执行实际的 DOM 操作。
// ## 核心功能
// 1. 深度优先遍历 ：使用 DFS 算法遍历 Fiber 树
// 2. 性能优化 ：利用 subtreeFlags 快速跳过无副作用的子树
// 3. 副作用执行 ：调用 commitMutationEffectsOnFiber 执行实际的 DOM 操作

// ## 遍历策略
// ### 与协调阶段的区别
// 协调阶段（beginWork/completeWork） ：
// - 完整的 DFS 遍历
// - 一直遍历到叶子节点
// - 处理所有节点

// Mutation 阶段（commitMutationEffects） ：
// - 优化的 DFS 遍历
// - 遇到第一个无副作用的节点就停止向下
// - 只处理有副作用的节点

// ## 完整示例
// 假设有以下 Fiber 树：
// A (有副作用)
// ├── B (无副作用)
// │   ├── B1 (无副作用)
// │   └── B2 (无副作用)
// └── C (有副作用)
//     └── C1 (有副作用)

// ### 遍历顺序：
// 1. 从 A 开始，检查有副作用，向下到 B
// 2. 检查 B，无副作用，不向下到 B1
// 3. 检查有兄弟 C，切换到 C
// 4. 检查 C，有副作用，向下到 C1
// 6. 执行 C1 的副作用，无兄弟，向上到 C
// 7. 执行 C 的副作用，无兄弟，向上到 A
// 8. 执行 A 的副作用，结束

// 递阶段负责遍历，归阶段负责执行副作用

export const commitMutationEffects = (finishedWork: FiberNode) => {
	console.log('[============= commitMutationEffects:');
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;

		// &:按位与操作，判断某个 flag 是否被包含在flags中
		// 只要subtreeFlags中包含了MutationMask中指定的flags，就代表子节点或自己有可能存在mutation的操作
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			// else的情况：
			// 1.找到底了
			// 2.当前节点的subtreeFlags不包含MutationMask，但是可能flags包含MutationMask
			// 接下来就要向上遍历。reconciler阶段已经实现了一次了，就是DFS深度优先遍历，有下则下，无下则右，无右则上，每一个节点都会归一次
			// 区别在于这里最深的节点不一定是叶子节点，可能是遇到的第一个不存在subtreeFlags的节点

			// 当无法继续向下时：
			// 1. 执行当前节点的 mutation 副作用
			// 2. 检查是否有兄弟节点
			// 3. 如果有兄弟节点，切换到兄弟节点并跳出内层循环
			// 4. 如果没有兄弟节点，向上回到父节点
			// 使用标签循环可以精确控制跳出哪个循环，这是处理复杂遍历逻辑的常用技巧
			up: while (nextEffect !== null) {
				// 走进这，说明当前的某个兄弟节点有副作用，逐个调用commitMutationEffectsOnFiber检查flags是否有副作用并执行
				// DFS会保证归阶段时，当前节点的子节点已经执行完毕
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

// commitMutationEffectsOnFiber 函数是 React commit 阶段中 mutation 子阶段的核心函数，负责执行单个 Fiber 节点的 mutation 副作用。
// ## 核心功能
// 1. 检查副作用 ：检查 Fiber 节点是否有副作用
// 2. 执行 DOM 操作 ：调用 commitPlacement 函数执行实际的 DOM 插入
// 3. 清理标志 ：执行完副作用后，从 Fiber 节点的 flags 中移除 Placement 标志
const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	// 将副作用检查和执行逻辑分离，使代码更清晰
	const flags = finishedWork.flags;
	// 使用按位与操作检查是否有 副作用。
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
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

// commitPlacement 函数是 React commit 阶段中负责执行 DOM 插入操作的核心函数。
// ## 核心功能
// 1. 获取宿主父节点 ：找到 Fiber 节点对应的 DOM 应该插入到哪个父 DOM 节点中
// 2. 执行插入操作 ：将 Fiber 节点对应的 DOM 节点插入到正确的位置

// 如果是新增dom可以在completeWork阶段执行，更新阶段必须要在commit阶段执行，防止页面渲染不一致
const commitPlacement = (finishedWork: FiberNode) => {
	// 插入操作需要知道些什么：1.父节点 2.finishedWork对应的DOM节点
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}
	// 获取宿主父节点
	const hostParent = getHostParent(finishedWork);
	// 找到finishedWork-DOM append parent-DOM
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
};

// getHostParent 函数的作用是找到 Fiber 节点对应的宿主父节点（即实际的 DOM 父节点
// ## 核心功能
// 1. 向上遍历 Fiber 树 ：从当前 Fiber 节点开始向上遍历
// 2. 识别宿主节点 ：找到第一个 HostComponent 或 HostRoot 节点
// 3. 返回宿主父节点 ：返回对应的 DOM 节点或容器
function getHostParent(fiber: FiberNode): Container | null {
	let parent = fiber.return;

	while (parent) {
		const parentTag = parent.tag;
		// 哪几种情况下parentTag才对应着宿主环境下的父级节点呢
		if (parentTag === HostComponent) {
			// 对于HostComponent的fiber节点来说，对应的宿主环境节点是保存在stateNode中的
			return parent.stateNode as Container;
		}
		if (parentTag === HostRoot) {
			// HostRoot的原生节点是保存在FiberRootNode中的container属性中
			// HostRoot.stateNode指向了FiberRootNode
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}

	if (__DEV__) {
		console.warn('未找到host parent', fiber);
	}
	return null;
}

// appendPlacementNodeIntoContainer 函数是 React commit 阶段中负责将 DOM 节点插入到容器中的核心函数。
// ## 核心功能
// 1. 处理不同类型的 Fiber 节点 ：
//    - 如果是 HostComponent 或 HostText 类型，直接插入到容器中
//    - 如果是非宿主节点（如函数组件、类组件），递归向下查找宿主节点
// 2. 递归遍历子节点 ：
//    - 对于非宿主节点，递归向下查找第一层宿主节点
//    - 插入当前节点的所有子节点和兄弟节点
function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	// 传进来的finishedWork不一定是HostComponent类型的fiber节点
	// 通过finishedWork向下遍历找到对应的宿主环境，也就是HostComponent类型的fiber
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		appendChildToContainer(hostParent, finishedWork.stateNode);
		return;
	}

	//	如果是非宿主节点，递归向下处理子节点和兄弟节点。
	// ## 技术细节
	// ### 为什么需要递归处理？
	// 在 React 中，Fiber 树可能包含非宿主节点（如函数组件、类组件），而我们需要找到实际的 DOM 节点来插入

	// 递归向下DFS，把当前节点的所有子节点和兄弟节点，都执行appendChildToContainer操作

	// 理论上来说DF遍历，函数组件的子节点会先执行归阶段的appendChildToContainer操作，先插入到DOM中
	// 这里的给函数组件的子节点再进行递归插入，其实会重复插入，导致bug
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
