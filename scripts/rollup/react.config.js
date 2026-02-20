import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';

const { name, module } = getPackageJSON('react');
// react包的路径
const pkgPath = resolvePkgPath(name);
// react产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react
	{
		input: `${pkgPath}/${module}`,
		output: {
			file: `${pkgDistPath}/index.js`,
			name: 'index.js',
			format: 'umd'
		},
		plugins: [
			...getBaseRollupPlugins(),
			// 生成package.json
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					main: 'index.js' // 产物支持cjs和esm两种规范，main指向cjs规范的入口文件
					// 不希望把整个源码的package.json都暴露出去，因为源码的package.json.dependencies里有shared:workspace。不希望打包后的产物里存在shared模块，所以省略
				})
			})
		]
	},
	// jsx-runtime
	// babel的被调用规范：开发环境会调用打包后的文件jsx-dev-runtime.js的jsxDEV，生产环境会调用jsx-runtime.js的jsx
	{
		input: `${pkgPath}/src/jsx.ts`,
		output: [
			// jsx-runtime
			{
				file: `${pkgDistPath}/jsx-runtime.js`,
				name: 'index.js',
				format: 'umd'
			},
			// jsx-dev-runtime
			{
				file: `${pkgDistPath}/jsx-dev-runtime.js`,
				name: 'index.js',
				format: 'umd'
			}
		],
		plugins: [getBaseRollupPlugins()]
	}
];
