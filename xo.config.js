module.exports = {
	envs: [
		'browser',
	],
	rules: {
		'comma-dangle': [
			'error',
			'always-multiline',
		],
	},
	overrides: [
		{
			files: 'test/*',
			env: 'jest',
		},
	],
};
