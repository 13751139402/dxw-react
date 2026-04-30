import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPackageJSON('react-dom');

// react-dom包的路径
const pkgPath = resolvePkgPath(name);
// react-dom产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react-dom
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgDistPath}/index.js`,
				name: 'index.js',
				format: 'umd'
			},
			{
				file: `${pkgDistPath}/client.js`,
				name: 'client.js',
				format: 'umd'
			}
		],
		// 对于react-dom来说，react是外部的包，外部的包的代码就不会打包进react-dom的产物里
		// 这样react-dom和react就能共用一个数据共享层
		external: [...Object.keys(peerDependencies)],
		plugins: [
			...getBaseRollupPlugins(),
			// webpack resolve alias
			alias({
				entries: {
					// 把react-dom/src/hostConfig.ts替换成hostConfig
					hostConfig: `${pkgPath}/src/hostConfig.ts`
				}
			}),
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					peerDependencies: {
						// 让react的version和react-dom保持一致
						react: version
					},
					main: 'index.js'
				})
			})
		]
	}
	// react-test-utils
	// {
	// 	input: `${pkgPath}/test-utils.ts`,
	// 	output: [
	// 		{
	// 			file: `${pkgDistPath}/test-utils.js`,
	// 			name: 'testUtils',
	// 			format: 'umd'
	// 		}
	// 	],
	// 	external: ['react-dom', 'react'],
	// 	plugins: getBaseRollupPlugins()
	// }
];
