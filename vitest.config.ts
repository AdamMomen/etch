import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '**/test/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/vitest.*.ts',
        '**/dist/**',
        '**/*.config.ts',
        '**/*.config.js',
        '**/types/**',
        '**/main.tsx',
      ],
      thresholds: {
        lines: 60,
        branches: 60,
        functions: 60,
        statements: 60,
      },
    },
  },
})
