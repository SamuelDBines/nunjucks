import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

process.env.NODE_ENV = 'test';
export default defineConfig({
	test: {
		browser: {
			enabled: true,
			provider: playwright(),
			// https://vitest.dev/config/browser/playwright
			instances: [{ browser: 'chromium' }],
		},
	},
});
