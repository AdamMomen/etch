import { immer } from "zustand/middleware/immer";
import { components } from "@/openapi";

type State = {
  authToken: string | null;
  user: components["schemas"]["PrivateUser"] | null;
  teammates: components["schemas"]["BaseUser"][] | null;
};

type Actions = {
  setUser: (user: components["schemas"]["PrivateUser"] | null) => void;
  setTeammates: (teammates: components["schemas"]["BaseUser"][] | null) => void;
  setAuthToken: (token: string | null) => void;
};

const initialState: State = {
  user: null,
  teammates: null,
  authToken: null,
};

export const createStateSlice = immer<State & Actions>((set) => ({
  // State
  ...initialState,
  // Actions
  setUser: (user) =>
    set((state) => {
      state.user = user;
    }),
  setAuthToken: (token) =>
    set((state) => {
      state.authToken = token;
    }),
  setTeammates: (teammates) =>
    set((state) => {
      state.teammates = teammates;
    }),
}));

export type StateSlice = State & Actions;
