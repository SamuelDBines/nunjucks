import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';
export default defineConfig({
	test: {
		// browser: {
		// 	enabled: true,
		// 	provider: playwright(),
		// 	// https://vitest.dev/config/browser/playwright
		// 	instances: [{ browser: 'chromium' }],
		// },
		exclude: ['vitest-example', 'testsold', 'tests-now-old', 'node_modules'],
	},
});
