// eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
// --- ✨ CHANGE IMPORT ✨ ---
// import pluginReactConfig from "eslint-plugin-react/configs/recommended.js"; // <-- REMOVE THIS
import reactPlugin from "eslint-plugin-react"; // <-- IMPORT THE PLUGIN ITSELF
// --- END CHANGE ---
import { fixupConfigRules } from "@eslint/compat"; // Keep if needed for compatibility

export default [
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.serviceworker
      }
    }
  },
  pluginJs.configs.recommended,
  // --- ✨ CHANGE USAGE ✨ ---
  // ...fixupConfigRules(pluginReactConfig), // <-- REMOVE THIS
  { // <-- START NEW CONFIG OBJECT for React rules
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"], // Apply React rules to these files
    plugins: {
      react: reactPlugin // Register the plugin
    },
    rules: {
      ...reactPlugin.configs.recommended.rules, // Spread the recommended rules
      ...reactPlugin.configs['jsx-runtime'].rules, // Add rules for new JSX runtime (React 17+)
      // --- Your other rules ---
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX runtime
      'react/prop-types': 'off', // Disable prop-types if not using them
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      // Add any other custom rules here
    },
    settings: {
      react: {
        version: 'detect' // Automatically detect React version
      }
    }
  }, // <-- END NEW CONFIG OBJECT
  // --- END CHANGE ---
  {
    ignores: ["dist/", "node_modules/", "*.config.js", "*.config.mjs"]
  }
];