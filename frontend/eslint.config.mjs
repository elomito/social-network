import nextPlugin from '@next/eslint-plugin-next';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default [
  // Global file ignores
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'dist/',
      'public/js/',
      'public/css/',
    ],
  },
  // Unified JavaScript Codebase Configuration
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      '@next/next': nextPlugin,
      'react': reactPlugin,
      'react-hooks': hooksPlugin,
      'prettier': prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Core Next.js recommended rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      
      // Essential React & Hooks baseline behaviors
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      
      // Custom overrides and adjustments
      'react/react-in-jsx-scope': 'off', // Not required in modern Next.js
      'react/prop-types': 'off',          // Disabled since we are not enforcing prop types
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      
      // Prettier integration enforcement
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      ...prettierConfig.rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];