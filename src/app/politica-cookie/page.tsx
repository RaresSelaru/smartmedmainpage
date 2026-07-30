import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Cookie,
  LockKeyhole,
  Play,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { ConsentSettingsButton } from "@/components/consent/consent-settings-button";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Politica de cookies",
  description:
    "Află simplu ce cookie-uri folosește SmartMed și cum îți poți schimba oricând alegerea.",
  alternates: {
    canonical: "/politica-cookie",
  },
};

const essentials = [
  "ține minte alegerea ta privind cookie-urile;",
  "păstrează sesiunea activă atunci când te autentifici;",
  "ajută la funcționarea sigură a site-ului.",
] as const;

const quickFacts = [
  {
    icon: <LockKeyhole aria-hidden="true" className="size-5" />,
    title: "Site-ul funcționează",
    description:
      "Folosim doar cookie-urile de care avem nevoie pentru funcțiile de bază și siguranță.",
  },
  {
    icon: <ShieldCheck aria-hidden="true" className="size-5" />,
    title: "Opțiunile extra sunt oprite",
    description:
      "Videoclipurile externe și orice funcție opțională pornesc numai dacă îți dai acordul.",
  },
  {
    icon: <SlidersHorizontal aria-hidden="true" className="size-5" />,
    title: "Tu rămâi în control",
    description:
      "Poți refuza, accepta sau modifica alegerea în orice moment, fără complicații.",
  },
] as const;

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-smart-cream text-smart-ink">
      <section className="relative overflow-hidden bg-smart-abyss px-4 pb-16 pt-32 text-smart-white sm:px-6 sm:pb-20 sm:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(156,206,208,0.18),transparent_32%),radial-gradient(circle_at_88%_15%,rgba(200,168,117,0.14),transparent_28%)]" />
        <div className="grain-overlay" />

        <div className="relative mx-auto grid max-w-6xl items-end gap-12 lg:grid-cols-[1fr_0.62fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-smart-aqua/25 bg-smart-aqua/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.17em] text-smart-aqua">
              <Cookie aria-hidden="true" className="size-4" />
              Simplu și transparent
            </div>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[0.95] sm:text-7xl lg:text-8xl">
              Cookie-uri, pe înțelesul tuturor
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-smart-muted sm:text-lg">
              Folosim strictul necesar pentru ca SmartMed să funcționeze bine.
              Orice opțiune în plus pornește doar dacă alegi tu.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ConsentSettingsButton className="min-h-12 justify-center rounded-full bg-smart-aqua px-6 text-sm font-extrabold text-smart-abyss hover:brightness-110">
                Deschide setările
              </ConsentSettingsButton>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/6 px-6 text-sm font-bold text-smart-cream transition hover:border-smart-aqua/45 hover:text-smart-aqua"
                href="/confidentialitate"
              >
                Despre datele tale
              </Link>
            </div>
          </div>

          <aside className="rounded-[30px] border border-white/12 bg-white/[0.07] p-6 backdrop-blur-sm sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-smart-aqua">
              Pe scurt
            </p>
            <p className="mt-4 font-serif text-3xl font-semibold leading-tight">
              Alegerea ta contează.
            </p>
            <p className="mt-3 text-sm leading-7 text-smart-muted">
              Poți folosi site-ul chiar dacă refuzi toate opțiunile
              suplimentare.
            </p>
            <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5 text-sm font-bold text-smart-cream">
              <span className="flex size-8 items-center justify-center rounded-full bg-smart-aqua text-smart-abyss">
                <Check aria-hidden="true" className="size-4" />
              </span>
              Poți reveni oricând asupra deciziei
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <section>
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-smart-teal">
              Esențialul
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Ce trebuie să știi
            </h2>
            <p className="mt-5 text-base leading-8 text-smart-ink/68">
              Un cookie ajută site-ul să-și amintească anumite alegeri. De
              exemplu, dacă ai acceptat sau refuzat opțiunile suplimentare, ca
              să nu te întrebăm la fiecare pagină.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {quickFacts.map((fact) => (
              <article
                className="rounded-[28px] border border-smart-ink/10 bg-white/45 p-6"
                key={fact.title}
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-smart-ink text-smart-aqua">
                  {fact.icon}
                </span>
                <h3 className="mt-5 font-serif text-2xl font-semibold">
                  {fact.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-smart-ink/64">
                  {fact.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-[34px] bg-smart-cream-deep sm:mt-20">
          <div className="grid lg:grid-cols-2">
            <article className="p-7 sm:p-10 lg:p-12">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-smart-gold/20 text-smart-ink">
                  <LockKeyhole aria-hidden="true" className="size-5" />
                </span>
                <span className="rounded-full bg-smart-gold/20 px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-smart-ink/65">
                  Mereu active
                </span>
              </div>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight">
                Cookie-uri necesare
              </h2>
              <p className="mt-4 text-sm leading-7 text-smart-ink/68">
                Acestea fac parte din funcționarea normală a site-ului și nu
                pot fi oprite din setări.
              </p>
              <ul className="mt-6 space-y-4">
                {essentials.map((item) => (
                  <li
                    className="flex gap-3 text-sm leading-6 text-smart-ink/75"
                    key={item}
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-smart-teal"
                    />
                    <span className="first-letter:uppercase">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-7 text-smart-ink/58">
                Alegerea privind cookie-urile este păstrată cel mult 6 luni.
                O poți schimba mai devreme, oricând dorești.
              </p>
            </article>

            <article className="bg-smart-ink p-7 text-smart-cream sm:p-10 lg:p-12">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-smart-aqua text-smart-abyss">
                  <Play aria-hidden="true" className="size-5" />
                </span>
                <span className="rounded-full border border-smart-aqua/25 bg-smart-aqua/10 px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-smart-aqua">
                  Doar dacă accepți
                </span>
              </div>
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight">
                Videoclipuri externe
              </h2>
              <p className="mt-4 text-sm leading-7 text-smart-muted">
                Unele articole pot conține videoclipuri YouTube. Acestea nu se
                încarcă până când nu accepți categoria „Conținut extern”.
              </p>
              <p className="mt-5 text-sm leading-7 text-smart-muted">
                Dacă alegi să le vezi, YouTube poate primi informații obișnuite
                despre conexiune și dispozitiv. Refuzul nu blochează restul
                articolului.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-16 grid items-center gap-8 rounded-[34px] border border-smart-teal/18 bg-smart-teal/[0.07] p-7 sm:mt-20 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-smart-teal">
              Fără surprize
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Nu folosim momentan cookie-uri de analiză sau publicitate.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-smart-ink/68">
              Dacă vom adăuga astfel de servicii pe viitor, ele vor rămâne
              oprite până când îți cerem acordul. Alegerea nu va fi făcută în
              locul tău.
            </p>
          </div>
          <ConsentSettingsButton className="min-h-12 w-full justify-center rounded-full bg-smart-teal px-6 text-sm font-extrabold text-white hover:brightness-110 sm:w-auto">
            Schimbă alegerea
          </ConsentSettingsButton>
        </section>

        <section className="mt-16 border-t border-smart-ink/12 pt-9 sm:mt-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-smart-teal">
                Mai ai întrebări?
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold">
                Suntem aici să te ajutăm.
              </h2>
            </div>
            <p className="text-sm leading-7 text-smart-ink/68">
              Scrie-ne la{" "}
              <a
                className="font-bold text-smart-teal underline underline-offset-4"
                href={`mailto:${siteConfig.contact.email}`}
              >
                {siteConfig.contact.email}
              </a>{" "}
              sau consultă{" "}
              <Link
                className="font-bold text-smart-teal underline underline-offset-4"
                href="/confidentialitate"
              >
                Politica de confidențialitate
              </Link>
              . Ultima actualizare: 29 iulie 2026.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
