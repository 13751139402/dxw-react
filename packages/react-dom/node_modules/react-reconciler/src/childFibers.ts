import { ReactElementType } from 'shared/ReactTypes';
import { createFiberFormElement, FiberNode } from './fiber';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './warkTags';
import { Placement } from './fiberFlags';

function ChildReconciler(shouldTrackEffects: boolean) {
	const reconcilerSingleElement = (
		returnFiber: FiberNode, // 父级fiber
		currentFiber: FiberNode | null,
		element: ReactElementType
	) => {
		// 根据element创建fiber
		const fiber = createFiberFormElement(element);
		fiber.return = returnFiber;
		return fiber;
	};
	const reconcilerSingleTextNode = (
		returnFiber: FiberNode, // 父级fiber
		currentFiber: FiberNode | null,
		content: string | number
	) => {
		// 根据element创建fiber
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	};

	function placeSingleChild(fiber: FiberNode) {
		// 需要标记flags且没有current fiber的情况下才标记Placement
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	return function reconcilerChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		// 判断当前fiber的类型
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcilerSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('未实现的reconcile类型', newChild);
					}
					break;
			}
		}
		// TODO 多节点的情况 ul > li*3
		// HostText
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcilerSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}
		if (__DEV__) {
			console.warn('未实现的reconcile类型', newChild);
		}
		// return fiberNode
		return null;
	};
}

// reconcilerChildFibers需要添加flags
export const reconcilerChildFibers = ChildReconciler(true);
// 增加优化策略：mountChildFibers不需要添加placement flags
// 依靠本就有的hostRootFiber这个placement flags单次插入就够了
// 将已经离屏构建好的整颗dom树插入到页面中
export const mountChildFibers = ChildReconciler(false);
