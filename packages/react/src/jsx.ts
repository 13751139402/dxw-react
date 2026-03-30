import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import {
	Type,
	Key,
	Ref,
	Props,
	ReactElementType,
	ElementType
} from 'shared/ReactTypes';

// ReactElement

// 与环境无关的共享函数
const ReactElement = function (type: Type, key: Key, ref: Ref, props: Props) {
	const element: ReactElementType = {
		$$typeof: REACT_ELEMENT_TYPE,
		// HostComponent 与 FunctionComponent 的 type 区别：
		// 1.值的类型不同
		//	HostComponent（原生 DOM 元素）：type 是 字符串 例如： 'div' 、 'span' 、 'input' 等
		//    JSX <div>Hello</div>
		//    编译后
		//    jsx('div', { children: 'Hello' })
		//    ReactElement.type = 'div'
		// 	FunctionComponent（函数组件）：type 是 函数 例如： App 、 Child 等
		//    JSX <App />
		//    编译后
		//    jsx(App, {})
		//    ReactElement.type = App
		type,
		key,
		ref,
		props,
		__mark: 'daixunwei'
	};
	return element;
};

// v18的jsx函数就是v17的createReactElement
export const jsx = (type: ElementType, config: any, ...maybeChildren: any) => {
	let key: Key = null;
	const props: Props = {};
	let ref: Ref = null;
	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val;
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			// 如果是自己的prop就赋值给props，如果是原型的prop就忽略
			props[prop] = val;
		}
	}

	const maybeChildrenLength = maybeChildren.length;
	if (maybeChildrenLength === 1) {
		props.children = maybeChildren[0];
	} else {
		props.children = maybeChildren;
	}

	return ReactElement(type, key, ref, props);
};

// babel转义jsx时开发环境和生成环境的maybeChildren传参不一样
export const jsxDEV = (type: ElementType, config: any) => {
	let key: Key = null;
	const props: Props = {};
	let ref: Ref = null;
	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val;
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			// 如果是自己的prop就赋值给props，如果是原型的prop就忽略
			props[prop] = val;
		}
	}
	return ReactElement(type, key, ref, props);
};
