import { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>;
}
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
}

// 更新对应的数据结构update
export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action
	};
};

// 保存update的数据结构updateQueue
export const createUpdateQueue = <State>() => {
	return {
		// shared之所以是对象是因为能在currentFiber和workInProgress中共用同一个对象
		shared: {
			pending: null
		}
	} as UpdateQueue<State>;
};

// 将update插入到updateQueue中
export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	updateQueue.shared.pending = update;
};

// 如何消费updateQueue
// 基于一个基础数据baseState以及pendingUpdate,经过计算得到memoizedState
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null // setState的传入参数
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};
	if (pendingUpdate !== null) {
		const action = pendingUpdate.action;
		if (action instanceof Function) {
			// base 1 update (x)=>4x -> memoizedState 4
			result.memoizedState = action(baseState);
		} else {
			// baseState 1 update 2 -> memoizedState 2
			result.memoizedState = action;
		}
	}
	return result;
};
