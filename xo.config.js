module.exports = {
	envs: [
		'browser',
	],
	rules: {
		'comma-dangle': [
			'error',
			'always-multiline',
		],
		'guard-for-in': 'off',
	},
	overrides: [
		{
			files: 'test/*',
			env: 'jest',
		},
	],
};
