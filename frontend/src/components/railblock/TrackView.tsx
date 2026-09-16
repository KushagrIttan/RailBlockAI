import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Minus,
  Plus,
  ShieldCheck,
  TrainFront,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { SLOT_COUNT } from "@/lib/railblock/service";
import type { ShadowBlock, Train } from "@/lib/railblock/types";

const CLASS_STYLE: Record<Train["trainClass"], string> = {
  freight: "border-border bg-muted text-muted-foreground",
  express: "border-primary bg-tint-primary text-primary",
  suburban: "border-train-suburban bg-tint-primary text-train-suburban",
};

const ZOOM_LABEL = ["Fit", "150%", "220%"];

function sectionLabel(section: string) {
  if (section === "DLI-GZB-DN") return "Delhi → Ghaziabad";
  if (section === "NDLS-NDB-DN") return "New Delhi → Nizamuddin";
  return section;
}

function deptAbbr(department?: string) {
  if (!department) return null;
  const d = department.toLowerCase();
  if (d.includes("signal") || d.includes("s&t") || d.includes("telecom")) return "S&T";
  if (d.includes("traction") || d.includes("ohe") || d.includes("power")) return "TRD";
  if (d.includes("engineer")) return "ENG";
  return department.slice(0, 3).toUpperCase();
}

export function TrackView({
  sectors,
  trains,
  shadowBlocks,
  windowOffset,
  selectedTrain,
  onSelectTrain,
  selectedConflictId,
  onSelectConflict,
}: {
  sectors: string[];
  trains: Train[];
  shadowBlocks: ShadowBlock[];
  windowOffset: number;
  selectedTrain: string | null;
  onSelectTrain: (id: string | null) => void;
  selectedConflictId?: string | null;
  onSelectConflict?: (id: string | null) => void;
}) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => i);
  const nowSlot = Math.round((windowOffset / 100) * (SLOT_COUNT - 1));
  const [zoom, setZoom] = useState(0);

  const windowLabel = (() => {
    const totalSlots = SLOT_COUNT - 1;
    const slot = Math.round((windowOffset / 100) * totalSlots);
    const anchorHour = 8;
    const hours = anchorHour + Math.floor(slot / 4);
    const minutes = (slot % 4) * 15;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  })();

  // Include resolved blocks in the active selection so the callout bar still
  // shows what was resolved rather than jumping to the next unresolved item.
  const activeBlock =
    shadowBlocks.find((sb) => sb.conflictId === selectedConflictId) ??
    shadowBlocks.find((sb) => !sb.resolved) ??
    shadowBlocks[0] ??
    null;

  return (
    <div className="panel-surface overflow-hidden">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-5 py-3">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            Suggested maintenance times & track occupancy
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5" title="Chart zoom — widen the timeline to read dense blocks">
            <button onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40" aria-label="Zoom out">
              <Minus className="size-3" />
            </button>
            <span className="num w-10 text-center text-[10px] font-semibold text-muted-foreground">{ZOOM_LABEL[zoom]}</span>
            <button onClick={() => setZoom((z) => Math.min(2, z + 1))} disabled={zoom === 2} className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40" aria-label="Zoom in">
              <Plus className="size-3" />
            </button>
          </div>
          <span
            title="Weekly and Monthly horizons replay the Sept 14 saved-timetable snapshot (demo fixture — see DATA_REALITY_AND_MIGRATION.md)"
            className="rounded-full border border-success bg-tint-success px-2.5 py-0.5 text-[10px] font-medium text-ink-success"
          >
            {shadowBlocks.length} situations · saved timetable
          </span>
        </div>
      </div>

      {/* Scenario switcher — compact single-row strip so the chart sits near the fold */}
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-border bg-card px-5 py-1.5 text-xs">
        <span className="num shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {shadowBlocks.filter((sb) => !sb.resolved).length}/{shadowBlocks.length} open ·
        </span>
        {shadowBlocks.map((sb, idx) => {
          const isSelected = activeBlock?.id === sb.id;
          // Solid status boxes: full fill, white content. Revert to the
          // ledger style (white + status edge) if the team rejects this.
          const statusBadge = sb.resolved
            ? "border-border bg-muted text-muted-foreground line-through"
            : sb.status === "scheduled"
              ? "border-success bg-success text-success-foreground"
              : "border-destructive bg-destructive text-white";

          const icon = sb.resolved ? (
            <ShieldCheck className="size-3 text-muted-foreground" />
          ) : sb.status === "scheduled" ? (
            <CheckCircle2 className="size-3" />
          ) : sb.status === "blocked" ? (
            <AlertOctagon className="size-3" />
          ) : (
            <Clock3 className="size-3" />
          );

          return (
            <button
              key={sb.id}
              onClick={() => onSelectConflict?.(sb.conflictId)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium cursor-pointer ${
                isSelected
                  ? sb.resolved
                    ? "border-muted-foreground bg-muted text-muted-foreground"
                    : `${statusBadge} font-semibold shadow-xs ring-2 ring-foreground`
                  : `${statusBadge} hover:brightness-110`
              }`}
            >
              {icon}
              <span>
                Case {idx + 1}: {sb.label}
              </span>
              {sb.resolved && (
                <span className="ml-0.5 rounded border border-border bg-card px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground no-underline" style={{ textDecoration: "none" }}>
                  resolved
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart scroll region — zoom widens the timeline, the label column sticks */}
      <div className="overflow-x-auto">
        <div style={zoom > 0 ? { minWidth: `${100 + zoom * 60}%` } : undefined}>
      {/* Time axis */}
      <div className="flex border-b border-border bg-muted">
        <div className="sticky left-0 z-10 w-44 shrink-0 border-r border-border bg-muted px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Track section
        </div>
        <div
          className="relative grid flex-1"
          style={{ gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(0, 1fr))` }}
        >
          {slots.map((s) => (
            <div
              key={s}
              className="num border-r border-border py-2 text-center text-[9px] text-muted-foreground last:border-r-0"
            >
              {s % 4 === 0 ? `${String(8 + Math.floor(s / 4)).padStart(2, "0")}:00` : ""}
            </div>
          ))}
        </div>
      </div>

      {/* Track rows */}
      <div className="relative">
        {/* NOW marker */}
        <div
          className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-indigo-500"
          style={{
            left: `calc(11rem + ${((nowSlot + 0.5) / SLOT_COUNT) * 100}% - ${
              ((nowSlot + 0.5) / SLOT_COUNT) * 11
            }rem)`,
          }}
        >
          <span className="absolute -top-0.5 -translate-x-1/2 rounded bg-indigo-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs">
            {windowLabel}
          </span>
        </div>

        {sectors.map((sector, idx) => {
          const rowTrains = trains.filter((t) => t.sector === sector);
          // Include resolved blocks — they stay on the chart with a "resolved" style.
          const rowShadows = shadowBlocks.filter((sb) => sb.sector === sector);
          const unresolvedCount = rowShadows.filter((sb) => !sb.resolved).length;

          return (
            <div
              key={sector}
              className={`flex border-b border-border last:border-b-0 ${
                idx % 2 === 0 ? "" : "bg-muted"
              }`}
            >
              <div className={`sticky left-0 z-10 flex w-44 shrink-0 flex-col justify-center border-r border-border px-4 py-4 ${idx % 2 === 0 ? "bg-card" : "bg-muted"}`}>
                <span className="truncate text-xs font-semibold text-foreground" title={sectionLabel(sector)}>
                  {sectionLabel(sector)}
                </span>
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {unresolvedCount > 0
                    ? `${unresolvedCount} situation${unresolvedCount !== 1 ? "s" : ""}`
                    : rowShadows.length > 0
                      ? "all resolved"
                      : "no situations"}
                </span>
              </div>

              <div
                className="relative grid flex-1"
                style={{
                  gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(0, 1fr))`,
                  minHeight: "7rem",
                }}
              >
                {slots.map((s) => (
                  <div key={s} className="border-r border-border last:border-r-0" />
                ))}

                {/* Maintenance / Situation blocks on the timeline */}
                {rowShadows.map((sb) => {
                  const isSelected = activeBlock?.id === sb.id;

                  // ── Resolved: show a faded "solved" ghost on the chart ──────
                  if (sb.resolved) {
                    return (
                      <button
                        key={sb.id}
                        onClick={() => onSelectConflict?.(sb.conflictId)}
                        title={`${sb.label} · Resolved by the optimization engine`}
                        className={`absolute top-2 z-20 flex h-9.5 items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-[10px] font-semibold transition-all cursor-pointer
                          border border-border bg-muted text-muted-foreground opacity-70
                          ${isSelected ? "ring-2 ring-muted-foreground shadow-sm opacity-90" : "hover:opacity-85"}`}
                        style={{
                          left: `${(sb.startSlot / SLOT_COUNT) * 100}%`,
                          width: `${(sb.span / SLOT_COUNT) * 100}%`,
                        }}
                      >
                        <ShieldCheck className="size-3 shrink-0 text-ink-success" />
                        <div className="flex flex-col overflow-hidden leading-tight">
                          <span className="truncate line-through decoration-muted-foreground">{sb.label}</span>
                          <span className="text-[8.5px] font-semibold text-ink-success no-underline">
                            ✔ Resolved
                          </span>
                        </div>
                      </button>
                    );
                  }

                  // ── Active (unresolved) block ────────────────────────────────
                                    let styleClass = "";
                                    let icon = <AlertTriangle className="size-2.5 shrink-0" />;
                                    let statusTag = "";

                                    if (sb.status === "scheduled") {
                                      styleClass = isSelected
                                        ? "border-success bg-tint-success text-ink-success ring-2 ring-success shadow-md z-25"
                                        : "border-success bg-tint-success text-ink-success hover:border-success";
                                      icon = <CheckCircle2 className="size-3 shrink-0 text-ink-success" />;
                                      statusTag = "✅ Approved Window";
                                    } else if (sb.status === "blocked") {
                                      styleClass = isSelected
                                        ? "border-2 border-dashed border-destructive bg-tint-destructive text-ink-destructive ring-2 ring-destructive shadow-md z-25"
                                        : "border border-dashed border-destructive bg-tint-destructive text-ink-destructive hover:border-destructive";
                                      icon = <AlertOctagon className="size-3 shrink-0 text-ink-destructive" />;
                                      statusTag = "❌ Blocked by Peak Traffic";
                                    } else {
                                      styleClass = isSelected
                                        ? "border-2 border-dashed border-warning bg-tint-warning text-ink-warning ring-2 ring-warning shadow-md z-25"
                                        : "border border-dashed border-warning bg-tint-warning text-ink-warning hover:border-warning";
                                      icon = <Clock3 className="size-3 shrink-0 text-ink-warning" />;
                                      statusTag = "⏳ Deferred (Needs Longer Gap)";
                                    }

                                    return (
                                      <button
                                        key={sb.id}
                                        onClick={() => onSelectConflict?.(sb.conflictId)}
                                        title={`${sb.label} · ${sb.conflictReason ?? ""}`}
                                        className={`absolute top-2 z-20 flex h-9.5 min-w-28 items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-[10px] font-semibold transition-all cursor-pointer ${styleClass}`}
                      style={{
                        left: `${(sb.startSlot / SLOT_COUNT) * 100}%`,
                        width: `${(sb.span / SLOT_COUNT) * 100}%`,
                      }}
                    >
                      {icon}
                      {deptAbbr(sb.department) && (
                        <span className="shrink-0 rounded bg-black/15 px-1 py-px text-[8px] font-bold tracking-wide">
                          {deptAbbr(sb.department)}
                        </span>
                      )}
                      <div className="flex flex-col overflow-hidden leading-tight">
                        <span className="truncate">{sb.label}</span>
                        <span className="text-[8.5px] font-medium opacity-85 truncate">
                          {statusTag}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Train chips */}
                {rowTrains.map((t, i) => {
                  const style = CLASS_STYLE[t.trainClass];
                  const active = selectedTrain === t.id;
                  const isClashing = activeBlock?.blockingTrainNumbers?.includes(t.number);

                  let trainStyle = style;
                  if (isClashing) {
                    trainStyle =
                      "border-destructive bg-tint-destructive text-ink-destructive font-bold ring-2 ring-destructive shadow-sm";
                  }

                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTrain(active ? null : t.id)}
                      className={`absolute z-10 flex h-6.5 items-center gap-1.5 overflow-hidden rounded border px-2 text-left text-[9px] transition-all hover:opacity-100 hover:shadow-xs cursor-pointer ${trainStyle} ${isClashing && active ? "animate-pulse" : ""} ${
                        isClashing
                          ? "opacity-100 z-20"
                          : active
                            ? "opacity-100 ring-2 ring-primary"
                            : activeBlock
                              ? "opacity-80"
                              : "opacity-85"
                      }`}
                      style={{
                        left: `${(t.startSlot / SLOT_COUNT) * 100}%`,
                        width: `${(t.span / SLOT_COUNT) * 100}%`,
                        bottom: `${0.5 + (i % 2) * 1.5}rem`,
                      }}
                      title={
                        isClashing
                          ? `Train ${t.number} (${t.name}) conflicts with the requested maintenance window!`
                          : `Train ${t.number}: ${t.name}`
                      }
                    >
                      <TrainFront className="size-3 shrink-0" />
                      <span className="num font-semibold truncate">{t.number}</span>
                      {isClashing && (
                        <span className="rounded bg-destructive px-1 py-0.2 text-[8px] font-bold text-white shrink-0">
                          CLASH
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
        </div>
      </div>

      {/* Explainer Callout Bar for Active Situation */}
      {activeBlock && (
        <div
          className={`flex items-start gap-2.5 border-t px-5 py-2.5 text-xs transition-colors ${
            activeBlock.resolved
              ? "border-success bg-tint-success text-ink-success"
              : activeBlock.status === "scheduled"
                ? "border-success bg-tint-success text-ink-success"
                : activeBlock.status === "blocked"
                  ? "border-destructive bg-tint-destructive text-ink-destructive"
                  : "border-warning bg-tint-warning text-ink-warning"
          }`}
        >
          {activeBlock.resolved ? (
            <ShieldCheck className="size-4 shrink-0 text-ink-success mt-0.5" />
          ) : activeBlock.status === "scheduled" ? (
            <CheckCircle2 className="size-4 shrink-0 text-ink-success mt-0.5" />
          ) : activeBlock.status === "blocked" ? (
            <AlertOctagon className="size-4 shrink-0 text-ink-destructive mt-0.5" />
          ) : (
            <Clock3 className="size-4 shrink-0 text-ink-warning mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-semibold">{activeBlock.label}: </span>
            <span className="opacity-90">
              {activeBlock.resolved
                ? "Solution accepted — the optimization engine's suggested maintenance window has been confirmed. This block remains visible on the chart as a resolved decision."
                : activeBlock.status === "scheduled"
                  ? "Safe gap detected between 11:10 and 12:55. A 45-minute window is approved with 0 minutes train delay."
                  : activeBlock.status === "blocked"
                    ? "Attempted slot during morning rush (09:00). Blocked by dense EMU commuter traffic (Trains 64152 & 64414 highlighted with red CLASH tags)."
                    : "Requires 60 minutes continuous possession. Blocked by EMU Special 04942. Deferred to scheduled off-peak or overnight window."}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 border-t border-border bg-muted px-5 py-2 text-[10px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-success" />
            Approved Shadow Block
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm border border-dashed border-destructive bg-tint-destructive" />
            Blocked by Peak Traffic
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm border border-dashed border-warning bg-tint-warning" />
            Deferred (Needs Longer Gap)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm border border-border bg-muted" />
            <span className="text-ink-success font-semibold">✔</span>
            Resolved by Engine
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-destructive px-1 text-[8px] font-bold text-white">
              CLASH
            </span>
            Blocking Train
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1">
            <TrainFront className="size-3 text-train-freight" />
            Freight
          </span>
          <span className="flex items-center gap-1">
            <TrainFront className="size-3 text-train-express" />
            Express
          </span>
          <span className="flex items-center gap-1">
            <TrainFront className="size-3 text-train-suburban" />
            Suburban
          </span>
        </div>
      </div>
    </div>
  );
}
