import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SetDraft = {
  weight: string;
  repetitions: string;
  rpe: string;
  setType: "warmup" | "working" | "dropset" | "failure";
};

type ActiveWorkoutState = {
  sessionId: string | null;
  drafts: Record<string, SetDraft>;
  setSession: (sessionId: string | null) => void;
  updateDraft: (key: string, draft: Partial<SetDraft>) => void;
  clear: () => void;
};

const emptyDraft: SetDraft = {
  weight: "",
  repetitions: "",
  rpe: "",
  setType: "working"
};

export const useActiveWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set) => ({
      sessionId: null,
      drafts: {},
      setSession: (sessionId) => set({ sessionId }),
      updateDraft: (key, draft) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: { ...(state.drafts[key] ?? emptyDraft), ...draft }
          }
        })),
      clear: () => set({ sessionId: null, drafts: {} })
    }),
    {
      name: "forge.activeWorkout",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
