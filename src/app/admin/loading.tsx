import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="w-full p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-9 w-52" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <div className="mb-5 rounded-2xl bg-white p-4 shadow">
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
        <div className="overflow-hidden rounded-xl border">
          <div className="grid grid-cols-6 gap-3 border-b bg-gray-50 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
          <div className="space-y-3 p-3">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((__, colIndex) => (
                  <Skeleton key={colIndex} className="h-12 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
