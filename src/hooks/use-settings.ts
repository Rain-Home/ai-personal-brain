"use client";

import { useState, useCallback, useEffect } from "react";

export interface AISettings {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

const STORAGE_KEY = "kb-ai-settings";

const DEFAULT_SETTINGS: AISettings = {
  apiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY ?? "",
  baseUrl: "https://api.deepseek.com",
  modelName: "deepseek-chat",
};

function loadSettings(): AISettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setIsHydrated(true);
  }, []);

  const updateSettings = useCallback((partial: Partial<AISettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings, isHydrated };
}
