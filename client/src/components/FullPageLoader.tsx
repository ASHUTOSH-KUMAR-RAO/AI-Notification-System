import { Skeleton } from '@/components/ui/skeleton'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col" role="status" aria-label="Loading">
      <div className="h-14 border-b" />
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-9 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-1/2 max-w-sm" />
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    </div>
  )
}
