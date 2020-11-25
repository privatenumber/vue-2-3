import babel from 'rollup-plugin-babel';
import {terser} from 'rollup-plugin-terser';
import filesize from 'rollup-plugin-filesize';
import {nodeResolve} from '@rollup/plugin-node-resolve';

const isProd = process.env.NODE_ENV === 'production';

const rollupConfigs = [
	{
		name: 'toVue2',
		file: 'to-vue-2',
	},
	{
		name: 'toVue3',
		file: 'to-vue-3',
	},
].map(({name, file}) => ({
	input: `src/${file}.js`,
	plugins: [
		nodeResolve(),
		babel(),
		// isProd && terser(),
		isProd && filesize(),
	],
	external: ['vue', 'vue3'],
	output: [
		{
			format: 'umd',
			file: `${file}.js`,
			name,
			exports: 'default',
			globals: {
				vue: 'Vue',
				vue3: 'Vue3',
			},
		},
		{
			format: 'es',
			file: `${file}.esm.js`,
		},
	],
}));

export default rollupConfigs;
