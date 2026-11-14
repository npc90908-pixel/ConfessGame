"use client";

import { useMemo } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { makeT } from "@/lib/i18n";

/** Returns the UI translation function for the currently selected language. */
export function useT() {
  const language = useSettingsStore((s) => s.language);
  return useMemo(() => makeT(language), [language]);
}
