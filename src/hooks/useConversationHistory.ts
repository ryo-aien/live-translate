import { useState, useCallback } from "react";
import type { ConversationItem } from "../types/translation";

const STORAGE_KEY = "voice-bridge-history";
const MAX_ITEMS = 200;

export type SessionGroup = {
  sessionId: string;
  startedAt: string;
  items: ConversationItem[];
};

function loadFromStorage(): ConversationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConversationItem[]) : [];
  } catch {
    return [];
  }
}

export function groupBySessions(items: ConversationItem[]): SessionGroup[] {
  const map = new Map<string, SessionGroup>();
  for (const item of [...items].reverse()) {
    if (!map.has(item.sessionId)) {
      map.set(item.sessionId, { sessionId: item.sessionId, startedAt: item.createdAt, items: [] });
    }
    map.get(item.sessionId)!.items.push(item);
  }
  // return sessions newest-first, items within each session oldest-first
  return Array.from(map.values()).reverse();
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

  const deleteSession = useCallback((sessionId: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.sessionId !== sessionId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addItem, deleteSession, clearHistory };
}
