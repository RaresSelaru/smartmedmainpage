const bucharestTimeZone = "Europe/Bucharest";

function parseDateKey(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(key);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day, 12));

  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}

export function civilDateFromKey(key: string) {
  return parseDateKey(key);
}

export function civilDateKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCivilDays(key: string, amount: number) {
  const value = parseDateKey(key);

  if (!value || !Number.isInteger(amount)) {
    return null;
  }

  value.setUTCDate(value.getUTCDate() + amount);
  return civilDateKey(value);
}

export function addCivilMonths(key: string, amount: number) {
  const value = parseDateKey(key);

  if (!value || !Number.isInteger(amount)) {
    return null;
  }

  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + amount);
  return civilDateKey(value);
}

export function monthStartKey(key: string) {
  return parseDateKey(key) ? `${key.slice(0, 7)}-01` : null;
}

export function calendarGridKeys(monthKey: string) {
  const monthStart = parseDateKey(monthKey);

  if (!monthStart || monthStart.getUTCDate() !== 1) {
    return [];
  }

  const leadingDays = (monthStart.getUTCDay() + 6) % 7;
  monthStart.setUTCDate(monthStart.getUTCDate() - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(monthStart);
    day.setUTCDate(day.getUTCDate() + index);
    return civilDateKey(day);
  });
}

export function bucharestDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: bucharestTimeZone,
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function bucharestWallTimeToIso(dayKey: string, time: string) {
  const day = parseDateKey(dayKey);
  const timeMatch = /^(\d{2}):(\d{2})$/u.exec(time);

  if (!day || !timeMatch) {
    return null;
  }

  const year = day.getUTCFullYear();
  const month = day.getUTCMonth() + 1;
  const dayOfMonth = day.getUTCDate();
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (hour > 23 || minute > 59) {
    return null;
  }

  const desiredWallTime = Date.UTC(
    year,
    month - 1,
    dayOfMonth,
    hour,
    minute,
  );
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: bucharestTimeZone,
    year: "numeric",
  });

  let candidate = desiredWallTime;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const representedWallTime = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
    );
    candidate += desiredWallTime - representedWallTime;
  }

  const finalParts = formatter.formatToParts(new Date(candidate));
  const finalValue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(finalParts.find((part) => part.type === type)?.value ?? 0);

  if (
    finalValue("year") !== year ||
    finalValue("month") !== month ||
    finalValue("day") !== dayOfMonth ||
    finalValue("hour") !== hour ||
    finalValue("minute") !== minute
  ) {
    return null;
  }

  return new Date(candidate).toISOString();
}
