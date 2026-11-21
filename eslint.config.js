import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/', 'reports/', 'coverage/', 'assets/'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // The sim must be deterministic: no ambient randomness or wall-clock time.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng in src/sim/rng.ts.' },
        { object: 'Date', property: 'now', message: 'The sim must not read wall-clock time.' },
      ],
    },
  },
  prettier,
);
