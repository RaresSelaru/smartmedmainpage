export function slugifyEditorialTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 160)
    .replace(/-+$/u, "");
}

export function parsePositiveIdList(value: string) {
  const ids = value
    .split(",")
    .map((candidate) => Number(candidate.trim()))
    .filter((candidate) => Number.isSafeInteger(candidate) && candidate > 0);

  return [...new Set(ids)].slice(0, 100);
}

export type StrictPositiveIdListResult =
  | { ids: number[]; ok: true }
  | { ids: []; ok: false };

export function parseStrictPositiveIdList(
  value: string,
): StrictPositiveIdListResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ids: [], ok: true };
  }

  const candidates = trimmed.split(",").map((candidate) => candidate.trim());

  if (
    candidates.length > 100 ||
    candidates.some(
      (candidate) =>
        !/^[1-9][0-9]*$/u.test(candidate) ||
        !Number.isSafeInteger(Number(candidate)),
    )
  ) {
    return { ids: [], ok: false };
  }

  return {
    ids: [...new Set(candidates.map(Number))],
    ok: true,
  };
}

export function formatPositiveIdList(ids: number[]) {
  return ids.join(", ");
}

export function parseOptionalPositiveId(value: string) {
  if (!value.trim()) {
    return null;
  }

  const candidate = Number(value);
  return Number.isSafeInteger(candidate) && candidate > 0 ? candidate : null;
}
