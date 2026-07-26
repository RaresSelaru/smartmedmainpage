"use client";

import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import styles from "./centru-fizic-faq.module.css";

const questions = [
  {
    question: "Unde se află centrul fizic?",
    answer:
      "Adresa exactă nu este încă definitivată în conținutul site-ului. Ea va fi afișată în secțiunea de localizare și comunicată clar la confirmarea vizitei, împreună cu indicațiile de acces.",
  },
  {
    question: "Cum aleg grupa potrivită?",
    answer:
      "Pornim de la obiectivul tău, nivelul actual și timpul disponibil. Discuția de orientare ne ajută să recomandăm o grupă cu ritm și structură potrivite, fără alegeri făcute la întâmplare.",
  },
  {
    question: "Cum sunt formate grupele?",
    answer:
      "Grupele sunt gândite pentru interacțiune reală, întrebări și feedback. Configurația finală va ține cont de materie, nivel și disponibilitate, iar detaliile sunt confirmate înainte de înscriere.",
  },
  {
    question: "Ce materii pot studia în centru?",
    answer:
      "Pagina este pregătită pentru programe de biologie, chimie și disciplinele relevante admiterii. Oferta exactă și seriile active vor fi completate pe măsură ce programul centrului este confirmat.",
  },
  {
    question: "Pot combina pregătirea fizică și online?",
    answer:
      "Da, experiența este concepută ca un parcurs coerent. Resursele și recapitularea online pot completa întâlnirile din sală, astfel încât continuitatea să nu depindă doar de prezența la curs.",
  },
  {
    question: "Cum programez o vizită?",
    answer:
      "Alege o zi și un interval orientativ în calendarul paginii, apoi continuă către formularul de contact. Echipa SmartMed va confirma separat disponibilitatea, ora și toate detaliile vizitei.",
  },
] as const;

export function CentruFizicFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={styles.faqLayout}>
      <aside className={styles.faqAside}>
        <div>
          <MessageCircleQuestion aria-hidden="true" />
        </div>
        <p>Nu ai găsit răspunsul potrivit?</p>
        <h3>Scrie-ne, iar echipa SmartMed te ajută cu toate detaliile.</h3>
        <Link href="/contact">Mergi la contact</Link>
      </aside>

      <div className={styles.accordion}>
        {questions.map((item, index) => {
          const open = openIndex === index;
          const contentId = `centru-fizic-faq-panel-${index}`;
          const triggerId = `centru-fizic-faq-trigger-${index}`;

          return (
            <article className={`${styles.item} ${open ? styles.itemOpen : ""}`} key={item.question}>
              <h3>
                <button
                  aria-controls={contentId}
                  aria-expanded={open}
                  id={triggerId}
                  onClick={() => setOpenIndex(open ? null : index)}
                  type="button"
                >
                  <span>
                    <i>{String(index + 1).padStart(2, "0")}</i>
                    {item.question}
                  </span>
                  <ChevronDown aria-hidden="true" />
                </button>
              </h3>
              <div
                aria-labelledby={triggerId}
                className={styles.answerGrid}
                id={contentId}
                role="region"
              >
                <div>
                  <p>{item.answer}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
