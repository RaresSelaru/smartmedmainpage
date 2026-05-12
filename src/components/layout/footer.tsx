import Link from "next/link";
import { HeartPulse, Mail, MapPin, Phone } from "lucide-react";

import { siteConfig } from "@/lib/site-config";

const siteLinks = [
  { label: "Centrul SmartMed", href: "/centru-online" },
  { label: "Lecții speciale", href: "/lectii-speciale" },
  { label: "Grile", href: "/grile" },
  { label: "Simulări", href: "/simulari-smart" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  // TODO: Replace with /pentru-parinti when that route exists.
  { label: "Pentru părinți", href: "/contact" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
] as const;

const legalLinks = [
  { label: "Termeni și condiții", href: "/termeni" },
  { label: "Politica de confidențialitate", href: "/confidentialitate" },
  // TODO: Split into dedicated legal routes when final policy copy is ready.
  { label: "Politica de livrare", href: "/termeni" },
  { label: "Politica de retur", href: "/termeni" },
  { label: "Politica cookie", href: "/confidentialitate" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-black text-smart-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(156,206,208,0.12),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(200,168,117,0.10),transparent_26%),linear-gradient(135deg,#000000_0%,#03111c_62%,#000000_100%)]" />
      <div className="grain-overlay" />
      <div className="smart-container relative z-10 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.12fr_0.72fr_0.82fr_0.92fr]">
          <div>
            <Link
              aria-label="SmartMed, mergi la pagina principală"
              className="inline-flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
              href="/"
            >
              <span className="flex size-[52px] items-center justify-center rounded-full border border-smart-gold/45 bg-white/6 text-smart-gold-light">
                <HeartPulse aria-hidden="true" className="size-6" strokeWidth={1.55} />
              </span>
              <span className="leading-none">
                <span className="block font-serif text-2xl font-semibold uppercase tracking-[0.18em]">
                  {siteConfig.name}
                </span>
                <span className="block font-serif text-sm uppercase tracking-[0.22em] text-smart-cream">
                  Academy
                </span>
              </span>
            </Link>
            <blockquote className="mt-8 max-w-sm font-serif text-2xl italic leading-8 text-smart-cream">
              „Nu există scurtături către niciun loc în care merită să mergi.”
            </blockquote>
            <address className="mt-8 grid gap-4 text-sm not-italic text-smart-muted">
              <p className="flex items-center gap-3">
                <MapPin aria-hidden="true" className="size-5 text-smart-aqua" />
                <span>{siteConfig.contact.location}</span>
              </p>
              <p className="flex items-center gap-3">
                <Phone aria-hidden="true" className="size-5 text-smart-aqua" />
                <a className="transition hover:text-smart-aqua" href={`tel:${siteConfig.contact.phone}`}>
                  {siteConfig.contact.phone}
                </a>
              </p>
              <p className="flex items-center gap-3">
                <Mail aria-hidden="true" className="size-5 text-smart-aqua" />
                <a className="transition hover:text-smart-aqua" href={`mailto:${siteConfig.contact.email}`}>
                  {siteConfig.contact.email}
                </a>
              </p>
            </address>
            <div className="mt-8 flex flex-wrap gap-3">
              {siteConfig.socialLinks.map((item) => (
                <a
                  aria-label={item.label}
                  className="flex size-12 items-center justify-center rounded-full border border-white/12 bg-white/8 text-xs font-bold text-smart-white/76 transition hover:border-smart-aqua/60 hover:text-smart-aqua"
                  href={item.href}
                  key={item.label}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.label.slice(0, 2)}
                </a>
              ))}
            </div>
          </div>

          <FooterColumn links={legalLinks} title="Link-uri utile" />
          <FooterColumn links={siteLinks} title="Navigare" />

          <div>
            <h2 className="font-serif text-3xl font-semibold italic">Protecția consumatorului</h2>
            <div className="mt-7 grid gap-5">
              <TrustPanel label="ANPC" title="Soluționarea alternativă a litigiilor" />
              <TrustPanel label="SOL" title="Soluționarea online a litigiilor" />
            </div>
            <div className="mt-8 rounded-[26px] border border-white/12 bg-white/[0.055] p-5">
              <h3 className="font-serif text-2xl font-semibold">Newsletter</h3>
              <p className="mt-3 text-sm leading-7 text-smart-muted">
                {siteConfig.newsletter.description}
              </p>
              <form className="mt-5 flex overflow-hidden rounded-full border border-white/14 bg-white/6 p-1 backdrop-blur-xl">
                <label className="sr-only" htmlFor="footer-newsletter-email">
                  {siteConfig.newsletter.placeholder}
                </label>
                <input
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-smart-white outline-none placeholder:text-smart-muted"
                  id="footer-newsletter-email"
                  placeholder={siteConfig.newsletter.placeholder}
                  type="email"
                />
                <button
                  className="rounded-full bg-smart-aqua px-4 text-sm font-bold text-smart-abyss transition hover:brightness-110"
                  type="button"
                >
                  Trimite
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 px-5 py-6 text-center font-serif text-xl italic tracking-[0.03em] text-smart-cream">
        {year} SmartMed Academy. Toate drepturile rezervate.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl font-semibold italic">{title}</h2>
      <div className="mt-6 grid gap-3">
        {links.map((item) => (
          <Link
            className="font-serif text-2xl font-semibold italic leading-none text-smart-cream/88 transition hover:text-smart-aqua"
            href={item.href}
            key={`${title}-${item.href}-${item.label}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function TrustPanel({ label, title }: { label: string; title: string }) {
  return (
    <Link
      className="grid grid-cols-[0.6fr_1fr] overflow-hidden rounded-[24px] border border-white/12 bg-smart-cream text-smart-ink shadow-[0_18px_44px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(0,0,0,0.26)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
      href="/termeni"
    >
      <span className="flex items-center justify-center border-r border-smart-ink/18 px-5 py-6 font-serif text-3xl font-semibold italic">
        {label}
      </span>
      <span className="flex flex-col items-center justify-center px-5 py-5 text-center">
        <span className="font-serif text-lg font-bold uppercase italic leading-5 tracking-[0.08em]">
          {title}
        </span>
        <span className="mt-3 rounded-full bg-smart-ink/70 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-smart-white">
          Detalii
        </span>
      </span>
    </Link>
  );
}
