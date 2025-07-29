import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// ---------------------------------------------------------------------------
//  ESLint flat‑config for the whole monorepo (root level)
//  Only the plugins you explicitly wanted: JS base, TypeScript‑ESLint,
//  React Hooks and Vite React‑Refresh – nothing extra.
// ---------------------------------------------------------------------------

export default tseslint.config(
    // -------------------------------------------------
    // Global ignores
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            'eslint.config.*',
        ],
    },

    // -------------------------------------------------
    // Base JS rules (apply everywhere unless overridden)
    js.configs.recommended,

    // -------------------------------------------------
    // ▶ Server  – Node  (TypeScript + CommonJS modules)
    {
        files: ['server/**/*.{ts,tsx,js,cjs,mjs}'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: globals.node,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                project: './server/tsconfig.json',
            },
        },
        extends: [
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
        ],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
        },
    },

    // -------------------------------------------------
    // ▶ Client – React (TypeScript + Vite/HMR)
    {
        files: ['client/**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                project: './client/tsconfig.app.json',
            },
        },
        plugins: {
            reactHooks,
            reactRefresh,
        },
        extends: [
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite,
        ],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            'react-refresh/only-export-components': 'warn',
        },
    },

    // -------------------------------------------------
    // ▶ Plain JS files without TS type‑checking (optional)
    {
        files: ['**/*.{js,mjs,cjs}'],
        extends: [tseslint.configs.disableTypeChecked],
    },
);
