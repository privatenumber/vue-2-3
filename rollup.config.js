import babel from 'rollup-plugin-babel';
import {terser} from 'rollup-plugin-terser';
import filesize from 'rollup-plugin-filesize';
import {nodeResolve} from '@rollup/plugin-node-resolve';

const isProd = process.env.NODE_ENV === 'production';

const rollupConfig = {
	input: 'src/vue-2-3.js',
	plugins: [
		nodeResolve(),
		babel(),
		isProd && terser(),
		isProd && filesize(),
	],
	external: ['vue', 'vue3'],
	output: [
		{
			format: 'umd',
			file: 'dist/vue-2-3.js',
			name: 'vue23',
			exports: 'named',
			globals: {
				// Check gloabls
			},
		},
		{
			format: 'es',
			file: 'dist/vue-2-3.esm.js',
		},
	],
};

export default rollupConfig;
