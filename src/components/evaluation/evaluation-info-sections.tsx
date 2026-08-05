import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  HelpCircle,
  MessagesSquare,
  Sparkles,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WaveSeparator } from "@/components/ui/WaveSeparator";

const outcomes = [
  {
    description:
      "Pornim de la etapa în care ești acum, nu de la un pachet prestabilit.",
    Icon: ClipboardCheck,
    title: "O imagine clară a nivelului",
  },
  {
    description:
      "Stabilim ce merită prioritate și ce poate aștepta, fără să complicăm planul.",
    Icon: Compass,
    title: "O direcție realistă",
  },
  {
    description:
      "Primești o recomandare sinceră: centru, online, modul sau un alt pas potrivit.",
    Icon: BookOpenCheck,
    title: "Un traseu potrivit pentru tine",
  },
] as const;

const questions = [
  {
    answer:
      "Evaluarea se poate desfășura într-un grup restrâns, online sau la centru. Discuția rămâne ghidată, iar recomandarea ține cont de obiectivul și etapa fiecărui student.",
    question: "Evaluarea este individuală sau în grup?",
  },
  {
    answer:
      "Nu. Evaluarea este o discuție de orientare. Ne ajută să îți înțelegem obiectivul și să îți recomandăm următorul pas potrivit, fără obligația de a cumpăra.",
    question: "Trebuie să mă înscriu la un program după evaluare?",
  },
  {
    answer:
      "Nu ai nevoie de o pregătire specială. E suficient să știi, pe scurt, pentru ce centru te pregătești și ce simți că te încetinește acum.",
    question: "Cum mă pregătesc pentru întâlnire?",
  },
  {
    answer:
      "Da. Programarea rămâne în contul tău, de unde poți alege un alt interval disponibil sau o poți anula.",
    question: "Pot schimba ziua sau ora?",
  },
  {
    answer:
      "Primești confirmarea în pagină și pe email. Pentru întâlnirile online, detaliile de acces sunt incluse în mesajul de confirmare.",
    question: "Cum primesc confirmarea?",
  },
] as const;

export function EvaluationInfoSections() {
  return (
    <>
      <section className="relative overflow-hidden bg-smart-teal px-5 pb-44 pt-20 text-smart-white sm:px-7 sm:pt-24 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(156,206,208,0.22),transparent_28%),linear-gradient(135deg,#1f6f78,#0d4351_76%)]" />
        <div className="grain-overlay" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <Reveal className="flex flex-wrap items-end justify-between gap-7">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-smart-gold-light">
                Cu ce pleci din evaluare
              </p>
              <h2 className="mt-4 max-w-4xl font-serif text-5xl font-semibold leading-[0.96] sm:text-6xl">
                Claritate suficientă cât să începi bine.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-smart-white/68 sm:text-base">
              Nu promitem o soluție universală. Construim primul pas din datele
              care contează pentru parcursul tău.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {outcomes.map(({ description, Icon, title }, index) => (
              <Reveal delay={index * 0.06} key={title}>
                <article className="h-full rounded-[2rem] border border-white/12 bg-smart-dark/30 p-6 backdrop-blur-sm sm:p-7">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-smart-aqua/18 bg-smart-aqua/10 text-smart-aqua">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-7 font-serif text-3xl font-semibold leading-none">
                    {title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-smart-white/65">
                    {description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <WaveSeparator fill="dark" />
      </section>

      <section className="relative overflow-hidden bg-smart-dark px-5 pb-28 pt-20 text-smart-white sm:px-7 sm:pb-32 sm:pt-24 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(31,111,120,0.24),transparent_34%)]" />
        <div className="grain-overlay" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <Reveal>
            <SectionLabel>Întrebări firești</SectionLabel>
            <h2 className="mt-5 font-serif text-5xl font-semibold leading-[0.96] sm:text-6xl">
              Tot ce trebuie să știi înainte.
            </h2>
            <div className="mt-7 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-smart-white/65">
              <div className="flex gap-3">
                <MessagesSquare
                  aria-hidden="true"
                  className="mt-1 size-5 shrink-0 text-smart-aqua"
                />
                <p>
                  Ai o situație aparte? O poți nota înainte de confirmare, iar
                  echipa o va vedea în programarea ta.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid gap-3">
              {questions.map(({ answer, question }, index) => (
                <details
                  className="group rounded-[1.6rem] border border-white/10 bg-white/[0.045] px-5 py-1 transition open:border-smart-aqua/24 open:bg-white/[0.07] sm:px-6"
                  key={question}
                  open={index === 0}
                >
                  <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-5 py-4 font-bold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua">
                    <span className="flex items-center gap-3">
                      <HelpCircle
                        aria-hidden="true"
                        className="size-5 shrink-0 text-smart-aqua"
                      />
                      {question}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-smart-gold-light transition group-open:rotate-90"
                    />
                  </summary>
                  <div className="border-t border-white/8 pb-5 pt-4 text-sm leading-7 text-smart-white/64">
                    <p className="flex gap-3">
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-smart-aqua"
                      />
                      {answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto mt-16 flex max-w-7xl items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-smart-white/38">
          <Sparkles aria-hidden="true" className="size-4 text-smart-gold-light" />
          SmartMed Academy · primul pas, ales cu sens
        </div>
      </section>
    </>
  );
}
