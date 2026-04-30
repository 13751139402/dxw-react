import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import { jsx } from './src/jsx';

export const useState: Dispatcher['useState'] = (initialState: any) => {
	// 从react到Dispatcher之间的连接
	// react中暴露出去的hooks函数，实际上调用的是Dispatcher中的实现
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};
// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher
};

export default {
	version: '0.0.0',
	createElement: jsx
};
