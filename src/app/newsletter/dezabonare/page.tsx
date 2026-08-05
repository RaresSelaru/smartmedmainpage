import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MailMinus, ShieldCheck } from "lucide-react";

import { unsubscribeNewsletterAction } from "@/app/newsletter/dezabonare/actions";

export const metadata: Metadata = {
  title: "Dezabonare newsletter",
  robots: { follow: false, index: false },
};

type NewsletterUnsubscribePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: NewsletterUnsubscribePageProps) {
  const params = await searchParams;
  const token = firstQueryValue(params?.token);
  const status = firstQueryValue(params?.status);

  const done = status === "done";
  const unavailable = status === "unavailable";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-smart-dark px-5 py-24 text-smart-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(200,168,117,0.18),transparent_32%),radial-gradient(circle_at_82%_72%,rgba(156,206,208,0.16),transparent_34%),linear-gradient(135deg,#03111c_0%,#071b29_58%,#061622_100%)]" />
      <div className="grain-overlay" />

      <section className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/12 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl sm:p-11">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-smart-aqua/25 bg-smart-aqua/10 text-smart-aqua">
          {done ? (
            <CheckCircle2 aria-hidden="true" className="size-7" />
          ) : (
            <MailMinus aria-hidden="true" className="size-7" />
          )}
        </div>

        <p className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-smart-gold-light">
          Preferințele tale
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
          {done
            ? "Dezabonarea a fost înregistrată"
            : "Nu mai dorești noutăți SmartMed?"}
        </h1>

        <p className="mt-5 leading-7 text-smart-muted">
          {done
            ? "Adresa asociată acestui link nu va mai primi newsletterul SmartMed. Mesajele strict necesare pentru înscrieri sau cont rămân separate."
            : unavailable
              ? "Serviciul nu este disponibil momentan. Te rugăm să încerci din nou peste câteva minute."
              : "Confirmă mai jos și vom opri newsletterul pentru toate preferințele asociate acestui link."}
        </p>

        {!done ? (
          token ? (
            <form action={unsubscribeNewsletterAction} className="mt-8">
              <input name="token" type="hidden" value={token} />
              <button
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-6 py-3 text-sm font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.2)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold"
                type="submit"
              >
                Confirmă dezabonarea
                <MailMinus aria-hidden="true" className="size-4" />
              </button>
            </form>
          ) : (
            <p className="mt-7 rounded-xl border border-white/12 bg-white/5 px-5 py-4 text-sm text-smart-muted">
              Linkul nu este complet. Deschide linkul exact așa cum apare în email.
            </p>
          )
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
          <Link
            className="inline-flex items-center gap-2 text-sm font-bold text-smart-aqua transition hover:text-smart-white"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Înapoi pe site
          </Link>
          <span className="inline-flex items-center gap-2 text-xs text-smart-muted">
            <ShieldCheck aria-hidden="true" className="size-4 text-smart-aqua" />
            Link securizat
          </span>
        </div>
      </section>
    </main>
  );
}
