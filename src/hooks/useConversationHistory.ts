import { useState, useEffect } from "react";
import type { ConversationItem } from "../types/translation";

const STORAGE_KEY = "voice-bridge-history";

export function useConversationHistory() {
  const [history, setHistory] = useState<ConversationItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addItem = (item: ConversationItem) => {
    setHistory((prev) => [item, ...prev]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return { history, addItem, clearHistory };
}
