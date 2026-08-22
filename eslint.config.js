import globals from "globals";
import { defineConfig } from "eslint/config";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
	{ files: ["**/*.{js,mjs,cjs,ts}"] },
	{
		files: ["src/base/**/*.{js,mjs,cjs,ts}"],
		languageOptions: { globals: globals.browser },
	},
	{
		files: ["src/process/**/*.{js,mjs,cjs,ts}"],
		languageOptions: { globals: globals.node },
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					caughtErrors: "none",
				},
			],
		},
	},
]);
