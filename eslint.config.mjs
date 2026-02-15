import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config({
    files: ['**/*.ts'],
    extends: [
        eslint.configs.recommended,
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
        ecmaVersion: 2022,
        globals: {
            ...globals.browser,
            ...globals.node,
        },
        parserOptions: {
            project: ['./tsconfig.json'],
            tsconfigRootDir: import.meta.dirname,
        },
    },
    rules: {
        // Override specific rules if needed, but aim for strict compliance
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off', // Inferred return types are fine
        'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }], // Allow log for now as it's a CLI tool style extension
    },
}, {
    // Disable type-checked rules for JS config files
    files: ['**/*.config.js', '**/*.config.mjs', 'vite.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
});
