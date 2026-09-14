import { CircleHelp, Gauge, Moon, RefreshCw, Sun, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { CORRIDORS } from "@/lib/railblock/service";

export function TopBar({
  corridorId,
  setCorridorId,
  loading,
  onRefresh,
  windowOffset,
  setWindowOffset,
  windowLabel,
  onOpenGuide,
}: {
  corridorId: string;
  setCorridorId: (id: string) => void;
  loading: boolean;
  onRefresh: () => void;
  windowOffset: number;
  setWindowOffset: (v: number) => void;
  windowLabel: string;
  onOpenGuide: () => void;
}) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 bg-navy px-6 text-navy-foreground">
      {/* Wordmark */}
      <div className="flex shrink-0 items-center gap-2">
        <TrainFront className="size-5 text-navy-foreground" />
        <span className="text-sm font-bold tracking-tight">
          RailBlock
        </span>
      </div>

      <span className="h-6 w-px shrink-0 bg-navy-line" />

      {/* Corridor selector */}
      <Select value={corridorId} onValueChange={setCorridorId}>
        <SelectTrigger className="w-52 border-navy-line bg-navy-soft text-sm text-navy-foreground shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CORRIDORS.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Refresh */}
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={onRefresh}
        className="h-8 gap-1.5 border-navy-line bg-transparent text-sm text-navy-foreground shadow-none hover:bg-navy-soft hover:text-navy-foreground"
      >
        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Loading…" : "Refresh"}
      </Button>

      {/* Time window slider + time + badge: fixed snug cluster, pinned right */}
      <div className="ml-auto flex w-80 shrink-0 items-center gap-2">
        <Gauge className="size-4 shrink-0 text-navy-text" />
        <Slider
          value={[windowOffset]}
          onValueChange={(v) => setWindowOffset(v[0] ?? 0)}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="num w-20 shrink-0 text-right text-xs text-navy-foreground">
          {windowLabel}
        </span>
      </div>

      {/* Official campaign mark — white badge so its colours read on navy */}
      <img
        src="/emblems/akam-logo.png"
        alt="Azadi Ka Amrit Mahotsav"
        title="Azadi Ka Amrit Mahotsav logo (CC BY-SA 4.0, Wikimedia Commons) — shown for demo familiarity only"
        className="h-12 w-auto shrink-0 rounded bg-white px-2 py-0.5 object-contain"
      />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-navy-text transition-colors hover:bg-navy-soft hover:text-white"
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      {/* Help */}
      <button
        onClick={onOpenGuide}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-navy-text transition-colors hover:bg-navy-soft hover:text-white"
      >
        <CircleHelp className="size-4" />
        How this works
      </button>
    </div>
  );
}
