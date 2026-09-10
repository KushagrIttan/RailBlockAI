import { SendHorizonal } from "lucide-react";
import type { DemoIssueConstraint } from "@/lib/railblock/types";

const URGENCY_STYLE: Record<DemoIssueConstraint["urgency"], string> = {
  emergency: "bg-red-50 text-destructive border-red-200",
  urgent: "bg-amber-50 text-warning border-amber-200",
  planned: "bg-sky-50 text-sky-700 border-sky-200",
};

/**
 * Shows the hardcoded dummy issue constraints the demo SENDS to the backend
 * on every /generate call. The Gantt below visualises the optimizer output
 * for exactly these constraints (appended to the frozen 3 replay cases).
 */
export function IssueConstraintsPanel({ issues }: { issues: DemoIssueConstraint[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="panel-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <SendHorizonal className="size-4 text-primary" />
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Demo issue constraints → backend
        </h2>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
          {issues.length} extra issue{issues.length !== 1 ? "s" : ""} sent on every plan
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Hardcoded dummy issues appended to the frozen 3 replay cases. The optimizer
        schedules them into real timetable gaps — the Gantt below shows the result.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {issues.map((issue) => (
          <div
            key={issue.case_id}
            className="rounded-lg border border-border bg-gray-50/60 px-3.5 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-xs font-semibold text-foreground">
                {issue.case_id}
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${URGENCY_STYLE[issue.urgency]}`}
              >
                {issue.urgency}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/70">
                {issue.estimated_work_minutes}m · {issue.procedure_profile_id}
              </span>
            </div>
            <p className="mt-1 text-xs text-foreground/80">{issue.description}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {issue.department} · {issue.section_id} · {issue.location_reference} ·{" "}
              {issue.required_resources.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
