import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { getSettings, saveSettings } from "@/data/repository";
import type { AppSettings } from "@/domain/types";

export function useSettings() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getSettings(db).then((value) => {
        if (active) setSettings(value);
      }).catch((error) => {
        console.error("Failed to load settings:", error);
      }).finally(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }, [db]),
  );

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    if (!settings) return false;
    const next = { ...settings, ...patch };
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings(db, next);
      setSettings(next);
      setSaved(true);
      return true;
    } catch (error) {
      console.error("Failed to save settings:", error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [db, settings]);

  return { settings, loading, saving, saved, update };
}
