import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // Playwright specs in e2e/ run with `npm run test:e2e`, not under vitest.
  test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
});
