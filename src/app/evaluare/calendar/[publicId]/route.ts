import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { getOwnEvaluationByPublicId } from "@/lib/evaluations/repository";
import { siteConfig } from "@/lib/site-config";

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

function escapeCalendarText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function formatCalendarDate(value: string) {
  return new Date(value)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/u, "Z");
}

function calendarResponse(body: string, fileName: string) {
  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getCurrentSmartMedSession();

  if (!session) {
    return NextResponse.json({ message: "Autentificare necesară." }, { status: 401 });
  }

  const parsedId = z.uuid().safeParse((await context.params).publicId);

  if (!parsedId.success) {
    return NextResponse.json({ message: "Programare invalidă." }, { status: 400 });
  }

  const appointment = await getOwnEvaluationByPublicId(parsedId.data);

  if (!appointment) {
    return NextResponse.json({ message: "Programarea nu a fost găsită." }, { status: 404 });
  }

  const isOnline = appointment.deliveryMode === "online";
  const location = isOnline
    ? "Online — detaliile sunt în confirmarea SmartMed"
    : [appointment.locationName, appointment.locationAddress, appointment.locationCity]
        .filter(Boolean)
        .join(", ");
  const managementUrl = `${siteConfig.url}/evaluare#programare`;
  const description = [
    "Evaluarea inițială SmartMed.",
    isOnline
      ? "Vei primi detaliile apelului de la echipa SmartMed."
      : "Te așteptăm cu câteva minute înainte de ora programată.",
    `Gestionează programarea: ${managementUrl}`,
  ].join("\n");
  const now = formatCalendarDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SmartMed Academy//Evaluare initiala//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.publicId}@smartmed.ro`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatCalendarDate(appointment.startsAt)}`,
    `DTEND:${formatCalendarDate(appointment.endsAt)}`,
    `SUMMARY:${escapeCalendarText("Evaluare inițială SmartMed")}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    `URL:${managementUrl}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];

  return calendarResponse(lines.join("\r\n"), "evaluare-smartmed.ics");
}
