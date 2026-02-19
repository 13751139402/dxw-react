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
		key,
		ref,
		props,
		__mark: 'KaSong'
	};
	return element;
};

// v18的jsx函数就是v17的createReactElement
export const jsx = (type: ElementType, config: any, ...maybeChildren: any) => {
	let reactKey: Key = null;
	const props: Props = {};
	let ref: Ref = null;

	Object.entries(config).forEach(([key, val]) => {
		switch (key) {
			case 'key':
				reactKey = '' + val;
				break;
			case 'ref':
				ref = val;
				break;
			default:
				props[key] = val;
				break;
		}
	});

	const maybeChildrenLength = maybeChildren.length;
	if (maybeChildrenLength === 1) {
		props.children = maybeChildren[0];
	} else {
		props.children = maybeChildren;
	}

	return ReactElement(type, reactKey, ref, props);
};

// React开发环境和生产环境的jsx是不一样的，开发环境会做更多的检查
export const jsxDEV = jsx;
