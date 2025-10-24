const isTest = !!process.env.VITEST;
const config = isTest
  ? {}
  : {
      plugins: ['@tailwindcss/postcss', 'autoprefixer']
    };

export default config;
