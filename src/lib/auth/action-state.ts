export type AuthFieldErrors = Record<string, string[] | undefined>;

export type AuthActionState = {
  fieldErrors?: AuthFieldErrors;
  message?: string;
  status: "idle" | "success" | "error";
};

export const initialAuthActionState: AuthActionState = {
  status: "idle",
};

export function getFirstFieldError(state: AuthActionState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}
