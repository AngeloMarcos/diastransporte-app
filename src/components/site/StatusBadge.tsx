import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_META, type StatusAgendamento } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as StatusAgendamento];
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        meta?.badgeClass ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {meta?.label ?? status}
    </Badge>
  );
}
