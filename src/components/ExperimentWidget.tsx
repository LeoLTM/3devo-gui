import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/store";
import { selectIsConnected } from "@/store/serialSlice";
import type { ExperimentFormData } from "@/store/experimentSlice";
import {
  FlaskConical,
  Play,
  Square,
  Loader2,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";

/**
 * Format seconds into HH:MM:SS
 */
function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ExperimentWidget() {
  const experimentStatus = useStore((s) => s.experimentStatus);
  const experimentStartTime = useStore((s) => s.experimentStartTime);
  const experimentName = useStore((s) => s.experimentName);
  const isExperimentLoading = useStore((s) => s.isExperimentLoading);
  const startExperiment = useStore((s) => s.startExperiment);
  const stopExperiment = useStore((s) => s.stopExperiment);
  const retryStopExperiment = useStore((s) => s.retryStopExperiment);
  const discardPendingStop = useStore((s) => s.discardPendingStop);
  const pendingStopData = useStore((s) => s.pendingStopData);
  const isTeableConnected = useStore((s) => s.isTeableConnected);
  const teableTableId = useStore((s) => s.teableTableId);
  const isConnected = useStore(selectIsConnected);
  const currentData = useStore((s) => s.currentData);
  const teableUserName = useStore((s) => s.teableUserName);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed time ticker
  useEffect(() => {
    if (experimentStatus !== "running" || !experimentStartTime) {
      setElapsed(0);
      return;
    }
    const tick = () =>
      setElapsed(Math.floor((Date.now() - experimentStartTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [experimentStatus, experimentStartTime]);

  // Form state
  const [formExperimentName, setFormExperimentName] = useState("");
  const [sourceMaterialId, setSourceMaterialId] = useState("");
  const [fanPercent, setFanPercent] = useState("");
  const [setDiameter, setSetDiameter] = useState("1.75");
  const [nozzleDiameter, setNozzleDiameter] = useState("3");
  const [density, setDensity] = useState("");
  const [color, setColor] = useState("");
  const [manufacturingLocation, setManufacturingLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFormExperimentName("");
    setSourceMaterialId("");
    setFanPercent("");
    setSetDiameter("1.75");
    setNozzleDiameter("3");
    setDensity("");
    setColor("");
    setManufacturingLocation("");
    setNotes("");
    setFormError(null);
  }, []);

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setDialogOpen(open);
  };

  const handleStart = async () => {
    setFormError(null);

    if (!formExperimentName.trim()) {
      setFormError("Experiment name is required.");
      return;
    }

    const fan = parseFloat(fanPercent);
    const dens = parseFloat(density);

    if (!fanPercent || isNaN(fan)) {
      setFormError("Fan percent is required and must be a number.");
      return;
    }
    if (!density || isNaN(dens) || dens <= 0) {
      setFormError("Density is required and must be a positive number.");
      return;
    }

    const formData: ExperimentFormData = {
      experimentName: formExperimentName.trim(),
      sourceMaterialId: sourceMaterialId.trim(),
      fanPercent: fan,
      setDiameter: parseFloat(setDiameter),
      nozzleDiameter: parseFloat(nozzleDiameter),
      density: dens,
      color: color.trim(),
      manufacturingLocation: manufacturingLocation.trim(),
      notes: notes.trim(),
    };

    try {
      await startExperiment(formData);
      setDialogOpen(false);
      resetForm();
    } catch {
      // Error toast is shown by the store action
    }
  };

  const handleStop = async () => {
    try {
      await stopExperiment();
    } catch {
      // Error toast is shown by the store action
    }
  };

  const handleRetry = async () => {
    try {
      await retryStopExperiment();
    } catch {
      // Error toast is shown by the store action
    }
  };

  const canStart = isTeableConnected && !!teableTableId;

  // --- Stop-failed state: show retry / discard controls ---
  if (experimentStatus === "stop-failed" && pendingStopData) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Update failed
          </span>
          {experimentName && (
            <span className="text-xs text-amber-600/70 dark:text-amber-400/70 max-w-[120px] truncate">
              — {experimentName}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isExperimentLoading}
          className="gap-1.5"
        >
          {isExperimentLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Retry
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={discardPendingStop}
          disabled={isExperimentLoading}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </Button>
      </div>
    );
  }

  // --- Running state: show elapsed time + experiment name + stop button ---
  if (experimentStatus === "running") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          {experimentName && (
            <span className="text-sm font-medium text-red-600 dark:text-red-400 max-w-[140px] truncate">
              {experimentName}
            </span>
          )}
          <Clock className="h-3.5 w-3.5 text-red-500" />
          <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400">
            {formatElapsed(elapsed)}
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleStop}
          disabled={isExperimentLoading}
          className="gap-1.5"
        >
          {isExperimentLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          Stop
        </Button>
      </div>
    );
  }

  // --- Idle state: show "New Experiment" button ---
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              disabled={!canStart}
              className="gap-1.5"
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">New Experiment</span>
            </Button>
          </TooltipTrigger>
          {!canStart && (
            <TooltipContent>
              <p>
                {!isTeableConnected
                  ? "Connect Teable integration in Settings first"
                  : "Select a target table in Settings first"}
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Experiment Configuration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              New Experiment
            </DialogTitle>
            <DialogDescription>
              Configure your experiment parameters. Data from the extruder will
              be captured automatically when you start.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Experiment name — first field */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-name">Experiment Name *</Label>
              <Input
                id="exp-name"
                placeholder="e.g. PLA-Black-Run-017"
                value={formExperimentName}
                onChange={(e) => setFormExperimentName(e.target.value)}
                disabled={isExperimentLoading}
                autoFocus
              />
            </div>

            <Separator />

            {/* Auto-captured preview */}
            <div className="rounded-md border bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Auto-captured at start
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Operator</span>
                <span className="font-medium">
                  {teableUserName || "Unknown"}
                </span>
                <span className="text-muted-foreground">Set RPM</span>
                <span className="font-medium">
                  {currentData?.set_rpm?.toFixed(1) ?? "—"}
                </span>
                <span className="text-muted-foreground">Set T1–T4</span>
                <span className="font-medium">
                  {currentData
                    ? `${currentData.set_t1.toFixed(0)} / ${currentData.set_t2.toFixed(0)} / ${currentData.set_t3.toFixed(0)} / ${currentData.set_t4.toFixed(0)}`
                    : "—"}
                </span>
              </div>
              {!isConnected && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Extruder not connected — temperatures and RPM will be 0
                </div>
              )}
            </div>

            <Separator />

            {/* User inputs */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-source-material">Source Material ID</Label>
                <Input
                  id="exp-source-material"
                  placeholder="e.g. PLA-2024-001"
                  value={sourceMaterialId}
                  onChange={(e) => setSourceMaterialId(e.target.value)}
                  disabled={isExperimentLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-fan-percent">Fan Percent *</Label>
                  <Input
                    id="exp-fan-percent"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="e.g. 80"
                    value={fanPercent}
                    onChange={(e) => setFanPercent(e.target.value)}
                    disabled={isExperimentLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exp-diameter">Set Diameter (mm)</Label>
                  <Select
                    value={setDiameter}
                    onValueChange={setSetDiameter}
                    disabled={isExperimentLoading}
                  >
                    <SelectTrigger id="exp-diameter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.75">1.75 mm</SelectItem>
                      <SelectItem value="2.85">2.85 mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-nozzle-diameter">Nozzle Diameter (mm)</Label>
                  <Select
                    value={nozzleDiameter}
                    onValueChange={setNozzleDiameter}
                    disabled={isExperimentLoading}
                  >
                    <SelectTrigger id="exp-nozzle-diameter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 mm</SelectItem>
                      <SelectItem value="3">3 mm</SelectItem>
                      <SelectItem value="4">4 mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exp-density">Density (g/cm³) *</Label>
                  <Input
                    id="exp-density"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="e.g. 1.24"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    disabled={isExperimentLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to calculate filament weight on stop
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-color">Color</Label>
                  <Input
                    id="exp-color"
                    placeholder="e.g. Natural White"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isExperimentLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exp-location">Manufacturing Location</Label>
                  <Input
                    id="exp-location"
                    placeholder="e.g. Lab A, Building 3"
                    value={manufacturingLocation}
                    onChange={(e) => setManufacturingLocation(e.target.value)}
                    disabled={isExperimentLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-notes">Notes</Label>
                <textarea
                  id="exp-notes"
                  rows={3}
                  placeholder="Any additional notes for this experiment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isExperimentLoading}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 resize-none"
                />
              </div>
            </div>

            {formError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isExperimentLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              disabled={isExperimentLoading}
              className="gap-1.5"
            >
              {isExperimentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Experiment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
