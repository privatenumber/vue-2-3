module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				loose: true,
			},
		],
	],
	env: {
		test: {
			presets: [
				[
					'@babel/preset-env',
					{
						useBuiltIns: 'usage',
						corejs: 3,
					},
				],
			],
		},
	},
};
