import { defineConfig } from 'vitest/config';

// File riêng cho test (vitest ưu tiên file này thay vì vite.config.js) —
// nhờ vậy test không phải nạp plugin React/Tailwind, chạy nhanh và nhẹ.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    globalSetup: ['./vitest.global-setup.js'],
  },
});
