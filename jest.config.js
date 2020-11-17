const vue = process.argv[2].includes('vue-3') ? 'vue3' : 'vue';

module.exports = {
	transform: {
		'\\.js$': 'babel-jest',
	},
	moduleNameMapper: {
		'^vue$': 'vue/dist/vue.common',
		'vue-2-3': '<rootDir>/src/vue-2-3',
	},
};
