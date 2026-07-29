export type AdminActionErrorCode =
  | "archived"
  | "channel-disabled"
  | "conflict"
  | "configuration"
  | "forbidden"
  | "invalid-input"
  | "not-found"
  | "references-unavailable"
  | "slug-conflict"
  | "unauthenticated"
  | "unavailable";

export type AdminActionResult<T> =
  | {
      data: T;
      ok: true;
    }
  | {
      code: AdminActionErrorCode;
      fieldErrors?: Record<string, string[]>;
      message: string;
      ok: false;
    };
