export default function BlogPostLoading() {
  return (
    <div className="min-h-[70svh] bg-smart-abyss px-5 pt-36 text-smart-white sm:px-7 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-10 w-36 rounded-full bg-white/10" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="h-8 w-32 rounded-full bg-white/10" />
            <div className="mt-6 h-20 max-w-2xl rounded-3xl bg-white/10" />
            <div className="mt-4 h-20 max-w-xl rounded-3xl bg-white/8" />
          </div>
          <div className="aspect-[1.32] rounded-[32px] bg-white/10" />
        </div>
      </div>
    </div>
  );
}
