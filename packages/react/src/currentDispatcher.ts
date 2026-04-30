import { Action } from 'shared/ReactTypes';

export type Dispatch<State> = (action: Action<State>) => void;
// 0对应泛型状态
// const [num, updateNum] = useState(0);
// (num) => num + 1对应() => T
// const [str, updateStr] = useState((num) => num + 1);
// 数组第一项返回泛型类型，第二项返回泛型类型的dispatch函数
// dispatch函数接受一个action,action可以是状态或者改变状态的函数
export interface Dispatcher {
	useState: <T>(initialState: () => T | T) => [T, Dispatch<T>];
	useEffect: (effect: () => void, dependencies?: any[]) => void;
}

// 当前使用的hooks集合
const currentDispatcher: { current: Dispatcher | null } = {
	current: null
};

export const resolveDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current;
	// 不在函数组件的上下文中,dispatcher应该是没有被赋值的
	// 没有在上下文中，reconciler的hooks实现应该不会指向「当前使用的hooks集合」dispatcher
	if (dispatcher === null) {
		throw new Error('hook只能在函数组件中执行');
	}
	return dispatcher;
};

export default currentDispatcher;
