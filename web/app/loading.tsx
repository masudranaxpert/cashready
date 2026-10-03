export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true">
      <div className="h-28 bg-slate-800/60 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-slate-800/60 rounded-2xl" />
        <div className="h-32 bg-slate-800/60 rounded-2xl" />
        <div className="h-32 bg-slate-800/60 rounded-2xl" />
      </div>
      <div className="h-64 bg-slate-800/60 rounded-2xl" />
    </div>
  );
}
