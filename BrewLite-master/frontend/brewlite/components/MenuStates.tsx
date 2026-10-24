export function MenuSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Đang tải menu" className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <div className="size-20 rounded-xl bg-line" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-line" />
            <div className="h-3 w-full rounded bg-line" />
            <div className="h-4 w-1/4 rounded bg-line" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ query, onReset }: { query: string; onReset?: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 py-16 text-center">
      <span aria-hidden className="text-5xl">🫗</span>
      <p className="font-semibold text-espresso">
        {query ? `Không tìm thấy "${query}"` : "Chưa có món nào trong menu"}
      </p>
      <p className="max-w-xs text-sm text-muted">
        {query ? "Thử từ khoá khác hoặc xem tất cả món." : "Vui lòng quay lại sau nhé."}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 rounded-full border border-espresso px-4 py-2 text-sm font-medium text-espresso hover:bg-espresso hover:text-cream"
        >
          Xem tất cả món
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-16 text-center">
      <span aria-hidden className="text-5xl">⚠️</span>
      <p className="font-semibold text-espresso">Không tải được menu</p>
      <p className="max-w-xs text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-full bg-espresso px-5 py-2 text-sm font-medium text-cream hover:bg-caramel-dark"
      >
        Thử lại
      </button>
    </div>
  );
}
