export type RegistrationFlow = "centru" | "simulare";

export type RegistrationContext = {
  flow: RegistrationFlow;
  grade: "10" | "11" | "12" | null;
  source: string | null;
};

const safeSourcePattern = /^[a-z0-9-]{1,80}$/u;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRegistrationContext(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): RegistrationContext {
  const requestedFlow = firstValue(searchParams?.flow);
  const requestedGrade = firstValue(searchParams?.clasa);
  const requestedSource = firstValue(searchParams?.source);

  return {
    flow: requestedFlow === "simulare" ? "simulare" : "centru",
    grade:
      requestedGrade === "10" || requestedGrade === "11" || requestedGrade === "12"
        ? requestedGrade
        : null,
    source:
      requestedSource && safeSourcePattern.test(requestedSource)
        ? requestedSource
        : null,
  };
}

export function centerRegistrationHeadline(grade: RegistrationContext["grade"]) {
  switch (grade) {
    case "10":
      return {
        eyebrow: "Clasa a X-a · un început cu avantaj",
        title: "Ai timp să construiești temeinic. Hai să-l folosim bine.",
        description:
          "Spune-ne unde vrei să ajungi, iar echipa SmartMed îți propune un ritm sănătos pentru primii ani de pregătire.",
      };
    case "11":
      return {
        eyebrow: "Clasa a XI-a · momentul pentru progres",
        title: "Transformă materia într-un plan clar pentru Medicină.",
        description:
          "Îți aflăm obiectivul, nivelul și programul, apoi găsim formula SmartMed care te ajută să avansezi constant.",
      };
    case "12":
      return {
        eyebrow: "Clasa a XII-a · pregătire pentru examen",
        title: "Ultimul an merită un plan precis și o echipă aproape.",
        description:
          "Completează câteva detalii, iar noi te ajutăm să alegi pregătirea, testările și ritmul potrivite pentru admitere.",
      };
    default:
      return {
        eyebrow: "Înscriere la Centrul SmartMed",
        title: "Începem cu tine, nu cu un pachet standard.",
        description:
          "Ne spui unde ești și unde vrei să ajungi. Noi revenim cu direcția de pregătire potrivită pentru drumul tău spre Medicină.",
      };
  }
}
