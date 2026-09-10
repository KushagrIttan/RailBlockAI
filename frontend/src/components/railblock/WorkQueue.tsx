import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Info, ListChecks, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conflict, ScheduleRecommendation } from "@/lib/railblock/types";

export function WorkQueue({
  conflicts,
  recommendations,
  selectedId,
  onSelect,
  onOpenGuide,
}: {
  conflicts: Conflict[];
  recommendations: ScheduleRecommendation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenGuide: () => void;
}) {
  const pending = conflicts.filter((c) => !c.resolved);
  const cleared = conflicts.filter((c) => c.resolved);
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="panel-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
        <ListChecks className="size-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground tracking-tight">Work Queue</h2>
        {pending.length > 0 && (
          <span className="ml-auto rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-warning">
            {pending.length} pending
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* Onboarding tip */}
        {showBanner && (
          <div className="relative bg-blue-50/60 px-4 py-3">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground/60 hover:bg-card hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
            <div className="flex items-start gap-2 pr-5">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-foreground">Start here</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Pick a request below, review the suggested time, then accept or reject.
                </p>
                <Button
                  variant="link"
                  className="mt-1 h-auto px-0 text-xs font-medium text-primary"
                  onClick={onOpenGuide}
                >
                  Show me how →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pending items */}
        {pending.map((conflict) => {
          const rec = recommendations.find((r) => r.conflictId === conflict.id);
          const active = selectedId === conflict.id;
          const critical = conflict.severity === "critical";
          return (
            <button
              key={conflict.id}
              onClick={() => onSelect(conflict.id)}
              className={`w-full px-4 py-3.5 text-left transition-colors ${
                active
                  ? "bg-accent shadow-[inset_3px_0_0_#2563eb]"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className={`mt-0.5 size-4 shrink-0 ${critical ? "text-destructive" : "text-warning"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">Maintenance decision</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        critical
                          ? "bg-red-50 text-destructive"
                          : "bg-amber-50 text-warning"
                      }`}
                    >
                      {conflict.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {rec?.strategy ?? "Operating plan required"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Clock3 className="size-3" />
                    Ready for review
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* Cleared items */}
        {cleared.length > 0 && (
          <div className="border-t border-border bg-muted/60 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
            Resolved by engine
          </div>
        )}
        {cleared.map((conflict) => {
          const rec = recommendations.find((r) => r.conflictId === conflict.id);
          return (
            <button
              key={conflict.id}
              onClick={() => onSelect(conflict.id)}
              className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted ${
                selectedId === conflict.id ? "bg-accent shadow-[inset_3px_0_0_#16a34a]" : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Maintenance decision
                    </span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      resolved
                    </span>
                  </div>
                  {rec && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70 line-clamp-2">
                      {rec.strategy}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/50">
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                      {conflict.sector}
                    </span>
                    {rec && (
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        {rec.confidence >= 0.75 ? "High confidence" : "Moderate confidence"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {!conflicts.length && (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            No maintenance requests need review.
          </p>
        )}
      </div>
    </div>
  );
}
