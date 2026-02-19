import { defineConfig } from 'vitest/config';
import { withScenario } from '@langwatch/scenario/integrations/vitest/config';
import { resolve } from 'path';

export default withScenario(
  defineConfig({
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@config': resolve(__dirname, 'src/config'),
        '@modules': resolve(__dirname, 'src/modules'),
        '@dto': resolve(__dirname, 'src/dto'),
        '@utils': resolve(__dirname, 'src/utils'),
      },
    },
    test: {
      testTimeout: 180_000,
      retry: 3,
      setupFiles: ['./test/setup.ts'],
      include: ['test/**/*.test.ts'],
      watch: false,
    },
  }),
);
