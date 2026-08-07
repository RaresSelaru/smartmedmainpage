export default function EventsLoading() {
  return (
    <section
      aria-label="Se încarcă evenimentele SmartMed"
      className="relative min-h-[760px] overflow-hidden bg-smart-dark px-5 pb-44 pt-36 sm:px-7 lg:px-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(156,206,208,0.18),transparent_34%),linear-gradient(135deg,#03111c_0%,#071b29_58%,#061622_100%)]" />
      <div className="relative z-10 mx-auto grid max-w-[var(--smart-content-max)] animate-pulse gap-12 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="h-3 w-40 rounded-full bg-smart-gold/30" />
          <div className="h-16 max-w-xl rounded-2xl bg-white/8" />
          <div className="h-16 max-w-lg rounded-2xl bg-white/6" />
          <div className="h-5 max-w-md rounded-full bg-white/6" />
          <div className="h-14 w-48 rounded-xl bg-smart-gold/20" />
        </div>
        <div className="min-h-[420px] rounded-[2.75rem] border border-white/10 bg-white/6" />
      </div>
    </section>
  );
}
