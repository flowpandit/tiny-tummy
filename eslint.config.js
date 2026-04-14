import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src-tauri/target/**",
      "src-tauri/gen/**",
      "landing/**",
      "affinity-assets/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
    },
  },
  {
    files: [
      "src/components/ui/toast.tsx",
      "src/contexts/*.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "src/hooks/useAlertEngine.ts",
      "src/hooks/useAlerts.ts",
      "src/hooks/useBreastfeedingTimerState.ts",
      "src/hooks/useCaregiverNote.ts",
      "src/hooks/useChildrenState.ts",
      "src/hooks/useCreateChildAction.ts",
      "src/hooks/useDiaperLogFormState.ts",
      "src/hooks/useDiaperLogs.ts",
      "src/hooks/useDietLogFormState.ts",
      "src/hooks/useEditDiaperSheetState.ts",
      "src/hooks/useEditMealSheetState.ts",
      "src/hooks/useEditPoopSheetState.ts",
      "src/hooks/useEditSleepSheetState.ts",
      "src/hooks/useEliminationPreference.ts",
      "src/hooks/useEpisodeSheetState.ts",
      "src/hooks/useEpisodes.ts",
      "src/hooks/useFeedPageState.ts",
      "src/hooks/useFeedingLogs.ts",
      "src/hooks/useGrowthLogSheetState.ts",
      "src/hooks/useGrowthLogs.ts",
      "src/hooks/useHistoryPageState.ts",
      "src/hooks/useHomeBreastfeedingState.ts",
      "src/hooks/useHomeEffects.ts",
      "src/hooks/useLogFormState.ts",
      "src/hooks/useMilestoneLogSheetState.ts",
      "src/hooks/useMilestoneLogs.ts",
      "src/hooks/usePoopLogs.ts",
      "src/hooks/usePoopPageState.ts",
      "src/hooks/useReportPageState.ts",
      "src/hooks/useSettingsActions.ts",
      "src/hooks/useSleepLogSheetState.ts",
      "src/hooks/useSleepLogs.ts",
      "src/hooks/useSleepTimerPreview.ts",
      "src/hooks/useStats.ts",
      "src/hooks/useSymptomSheetState.ts",
      "src/hooks/useSymptoms.ts",
      "src/hooks/useThemePreferences.ts",
      "src/hooks/useUnitsState.ts",
      "src/pages/AllKids.tsx",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: ["e2e/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.mocha,
        browser: "readonly",
        $: "readonly",
        expect: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
