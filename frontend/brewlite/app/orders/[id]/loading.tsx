export default function LoadingOrderDetail() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-10 shadow-xl">
      <header className="bg-espresso px-4 pt-5 pb-4 text-cream">
        <div className="h-5 w-40 rounded bg-cream/20" />
      </header>
      <main className="flex-1 space-y-3 px-4 pt-4" aria-busy="true" aria-label="Đang tải đơn hàng">
        <div className="h-24 animate-pulse rounded-2xl bg-line" />
        <div className="h-40 animate-pulse rounded-2xl bg-line" />
      </main>
    </div>
  );
}