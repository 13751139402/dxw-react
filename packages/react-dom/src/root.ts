import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { Container } from './hostConfig';
import { ReactElementType } from 'shared/ReactTypes';

// ReactDOM.createRoot(root).render(<App/>);
// fiberReconciler是不依赖宿主环境的抽象函数，react-dom才是浏览器宿主环境的实现
export function createRoot(container: Container) {
	const root = createContainer(container);

	return {
		render(element: ReactElementType) {
			updateContainer(element, root);
		}
	};
}
