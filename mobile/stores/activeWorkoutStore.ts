import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { SetType, WeightUnit } from "@/types/api";

export type SetDraft = {
  weight: string;
  repetitions: string;
  rpe: string;
  note: string;
  setType: SetType;
  unit: WeightUnit | null;
};

export type PendingSet = SetDraft & {
  clientMutationId: string;
  sessionId: string;
  sessionExerciseId: string;
  status: "pending" | "failed";
  errorMessage: string | null;
  createdAt: number;
};

export type RestTimerState = {
  sessionId: string;
  sessionExerciseId: string;
  startedAt: number;
  endsAt: number;
  durationSeconds: number;
};

type ActiveWorkoutState = {
  sessionId: string | null;
  drafts: Record<string, SetDraft>;
  pendingSets: Record<string, PendingSet>;
  restTimer: RestTimerState | null;
  setSession: (sessionId: string | null) => void;
  updateDraft: (key: string, draft: Partial<SetDraft>) => void;
  queueSet: (set: PendingSet) => void;
  markSetPending: (clientMutationId: string) => void;
  markSetFailed: (clientMutationId: string, errorMessage: string) => void;
  markSetSynced: (clientMutationId: string) => void;
  reconcileSyncedSets: (sessionId: string, clientMutationIds: string[]) => void;
  startRestTimer: (sessionId: string, sessionExerciseId: string, durationSeconds: number) => void;
  adjustRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  clear: () => void;
};

export const emptyDraft: SetDraft = {
  weight: "",
  repetitions: "",
  rpe: "",
  note: "",
  setType: "working",
  unit: null
};

export function createClientMutationId(prefix = "set"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function restTimerRemainingSeconds(timer: RestTimerState | null, now = Date.now()): number {
  if (!timer) return 0;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export const useActiveWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set) => ({
      sessionId: null,
      drafts: {},
      pendingSets: {},
      restTimer: null,
      setSession: (sessionId) => set({ sessionId }),
      updateDraft: (key, draft) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: { ...(state.drafts[key] ?? emptyDraft), ...draft }
          }
        })),
      queueSet: (queuedSet) =>
        set((state) => ({
          pendingSets: {
            ...state.pendingSets,
            [queuedSet.clientMutationId]: queuedSet
          }
        })),
      markSetPending: (clientMutationId) =>
        set((state) => {
          const pending = state.pendingSets[clientMutationId];
          if (!pending) return state;
          return {
            pendingSets: {
              ...state.pendingSets,
              [clientMutationId]: { ...pending, status: "pending", errorMessage: null }
            }
          };
        }),
      markSetFailed: (clientMutationId, errorMessage) =>
        set((state) => {
          const pending = state.pendingSets[clientMutationId];
          if (!pending) return state;
          return {
            pendingSets: {
              ...state.pendingSets,
              [clientMutationId]: { ...pending, status: "failed", errorMessage }
            }
          };
        }),
      markSetSynced: (clientMutationId) =>
        set((state) => {
          const pendingSets = { ...state.pendingSets };
          delete pendingSets[clientMutationId];
          return { pendingSets };
        }),
      reconcileSyncedSets: (sessionId, clientMutationIds) =>
        set((state) => {
          const synced = new Set(clientMutationIds);
          const pendingSets = Object.fromEntries(
            Object.entries(state.pendingSets).filter(
              ([clientMutationId, pending]) => pending.sessionId !== sessionId || !synced.has(clientMutationId)
            )
          );
          return { pendingSets };
        }),
      startRestTimer: (sessionId, sessionExerciseId, durationSeconds) => {
        const now = Date.now();
        set({
          restTimer: {
            sessionId,
            sessionExerciseId,
            startedAt: now,
            endsAt: now + durationSeconds * 1000,
            durationSeconds
          }
        });
      },
      adjustRestTimer: (seconds) =>
        set((state) => {
          if (!state.restTimer) return state;
          return {
            restTimer: {
              ...state.restTimer,
              endsAt: Math.max(Date.now(), state.restTimer.endsAt + seconds * 1000)
            }
          };
        }),
      stopRestTimer: () => set({ restTimer: null }),
      clear: () => set({ sessionId: null, drafts: {}, pendingSets: {}, restTimer: null })
    }),
    {
      name: "forge.activeWorkout",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
