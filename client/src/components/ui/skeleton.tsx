import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative overflow-hidden rounded-lg bg-muted/70 after:absolute after:inset-0 after:shimmer", className)}
      {...props}
    />
  )
}

export { Skeleton }
