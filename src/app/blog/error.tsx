"use client";

export default function BlogError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <section className="bg-smart-cream px-5 py-32 text-smart-ink">
      <div
        className="smart-container rounded-[32px] border border-smart-abyss/10 bg-white/70 p-8 text-center shadow-[0_22px_70px_rgba(3,17,28,0.12)] sm:p-12"
        role="alert"
      >
        <h1 className="font-serif text-5xl font-semibold">
          Articolul nu poate fi încărcat
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-8 text-smart-ink/68">
          Serviciul editorial este indisponibil momentan. Nu afișăm o copie locală
          care ar putea fi depășită.
        </p>
        <button
          className="mt-7 rounded-full bg-smart-teal px-6 py-3 text-sm font-bold text-white transition hover:bg-smart-abyss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
          onClick={unstable_retry}
          type="button"
        >
          Încearcă din nou
        </button>
      </div>
    </section>
  );
}
