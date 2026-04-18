type DiscountBadgeProps = {
  percent: number | null | undefined;
  className?: string;
};

export default function DiscountBadge({ percent, className }: DiscountBadgeProps) {
  const value = Number(percent ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;

  return (
    <div
      className={
        className ||
        "absolute right-0 top-5 z-10 flex h-5 w-15 items-center justify-center rounded-l-full rounded-r-none border-2 border-red-500 bg-red-500 text-sm font-extrabold text-white"
      }
      aria-label={`Хямдрал -${value}%`}
      title={`Хямдрал -${value}%`}
    >
      -{value}%
    </div>
  );
}
