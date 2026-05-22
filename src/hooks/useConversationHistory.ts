import { useState, useCallback } from "react";
import type { ConversationItem } from "../types/translation";

const STORAGE_KEY = "voice-bridge-history";
const MAX_ITEMS = 50;

function loadFromStorage(): ConversationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConversationItem[]) : [];
  } catch {
    return [];
  }
}

export function useConversationHistory() {
  const [history, setHistory] = useState<ConversationItem[]>(loadFromStorage);

  const addItem = useCallback(
    (item: Omit<ConversationItem, "id" | "createdAt">) => {
      const newItem: ConversationItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setHistory((prev) => {
        const next = [newItem, ...prev].slice(0, MAX_ITEMS);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // storage full — continue without saving
        }
        return next;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addItem, clearHistory };
}
