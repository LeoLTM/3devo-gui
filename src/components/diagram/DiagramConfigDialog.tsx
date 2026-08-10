import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AVAILABLE_METRICS,
  MetricCategory,
} from '@/types/diagram';
import { useStore } from '@/store';
import { Plus, Trash2, RotateCcw, Sliders, Activity, LineChart, Sparkles } from 'lucide-react';

const CATEGORY_NAMES: Record<MetricCategory, string> = {
  temperatures: 'Temperatures & Heaters (°C)',
  filament: 'Filament & Spool (mm)',
  motors: 'Motors & Speeds (RPM / %)',
  power: 'Power & Duty Cycles (% / mA)',
};

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f43f5e', '#64748b', '#ffffff',
];

interface DiagramConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: HTMLElement | null;
}

export function DiagramConfigDialog({ open, onOpenChange, container }: DiagramConfigDialogProps) {
  const [activeTab, setActiveTab] = useState<'series' | 'limits' | 'display'>('series');

  const diagramConfig = useStore((state) => state.diagramConfig);
  const toggleSeries = useStore((state) => state.toggleSeries);
  const updateSeries = useStore((state) => state.updateSeries);
  const addLimitLine = useStore((state) => state.addLimitLine);
  const updateLimitLine = useStore((state) => state.updateLimitLine);
  const removeLimitLine = useStore((state) => state.removeLimitLine);
  const setShowGrid = useStore((state) => state.setShowGrid);
  const setShowLegend = useStore((state) => state.setShowLegend);
  const setTension = useStore((state) => state.setTension);
  const resetDiagramConfig = useStore((state) => state.resetDiagramConfig);

  // New limit line form state
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState<string>('200');
  const [newColor, setNewColor] = useState('#ef4444');
  const [newAxis, setNewAxis] = useState<'left' | 'right'>('left');
  const [newLineStyle, setNewLineStyle] = useState<'solid' | 'dashed'>('dashed');

  const handleAddLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newValue);
    if (isNaN(val)) return;

    addLimitLine({
      label: newLabel.trim() || `Limit ${val}`,
      value: val,
      color: newColor,
      axis: newAxis,
      lineStyle: newLineStyle,
      enabled: true,
    });

    setNewLabel('');
    setNewValue('200');
  };

  const categories: MetricCategory[] = ['temperatures', 'filament', 'motors', 'power'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={container}
        className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sliders className="h-5 w-5 text-primary" />
            Configure Diagram
          </DialogTitle>
          <div className="flex gap-2 pt-2">
            <Button
              variant={activeTab === 'series' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('series')}
              className="gap-1.5"
            >
              <Activity className="h-4 w-4" />
              Metrics & Series
            </Button>
            <Button
              variant={activeTab === 'limits' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('limits')}
              className="gap-1.5"
            >
              <LineChart className="h-4 w-4" />
              Horizontal Limit Bars ({diagramConfig.limitLines.length})
            </Button>
            <Button
              variant={activeTab === 'display' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('display')}
              className="gap-1.5"
            >
              <Sliders className="h-4 w-4" />
              Chart Options
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: METRICS & SERIES */}
          {activeTab === 'series' && (
            <div className="space-y-6">
              <div className="text-xs text-muted-foreground">
                Select which extruder metrics to plot on the live diagram. Toggle 0-spike filtering to prevent sudden sensor 0-drops from distorting scale.
              </div>

              {categories.map((cat) => {
                const metricsInCat = AVAILABLE_METRICS.filter((m) => m.category === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {CATEGORY_NAMES[cat]}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {metricsInCat.map((metric) => {
                        const activeSeries = diagramConfig.series.find((s) => s.key === metric.key);
                        const isEnabled = activeSeries ? activeSeries.enabled : false;
                        const currentColor = activeSeries?.color || metric.defaultColor;
                        const currentAxis = activeSeries?.axis || metric.defaultAxis;
                        const isFilteringZeros = activeSeries?.filterZeroSpikes ?? (metric.defaultFilterZeroSpikes ?? false);

                        return (
                          <div
                            key={metric.key}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-sm transition-colors ${
                              isEnabled ? 'bg-accent/40 border-primary/40' : 'bg-card border-border hover:bg-accent/20'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <Checkbox
                                id={`metric-${metric.key}`}
                                checked={isEnabled}
                                onCheckedChange={() => toggleSeries(metric.key)}
                              />
                              <label
                                htmlFor={`metric-${metric.key}`}
                                className="cursor-pointer truncate text-xs font-medium"
                                title={metric.description}
                              >
                                {metric.label}
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  ({metric.unit})
                                </span>
                              </label>
                            </div>

                            {isEnabled && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Filter 0 spikes button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSeries(metric.key, {
                                      filterZeroSpikes: !isFilteringZeros,
                                    })
                                  }
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono border transition-colors ${
                                    isFilteringZeros
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold'
                                      : 'bg-muted/60 text-muted-foreground hover:bg-muted border-border'
                                  }`}
                                  title="Filter out 0-value glitch spikes so they don't break graph scale"
                                >
                                  {isFilteringZeros ? 'Filter 0s' : 'No filter'}
                                </button>

                                {/* Axis selector */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSeries(metric.key, {
                                      axis: currentAxis === 'left' ? 'right' : 'left',
                                    })
                                  }
                                  className="text-[10px] px-1.5 py-0.5 rounded font-mono border bg-muted/60 hover:bg-muted text-muted-foreground"
                                  title="Toggle Y axis (Left / Right)"
                                >
                                  {currentAxis === 'left' ? 'L' : 'R'}
                                </button>

                                {/* Color picker preview */}
                                <div className="relative flex items-center">
                                  <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) =>
                                      updateSeries(metric.key, { color: e.target.value })
                                    }
                                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0 z-10"
                                    title="Choose series color"
                                  />
                                  <div
                                    className="w-5 h-5 rounded-full border shadow-xs"
                                    style={{ backgroundColor: currentColor }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: LIMIT BARS */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              <div className="text-xs text-muted-foreground">
                Add horizontal reference limit lines (e.g., target temperatures, max thresholds, diameter tolerances).
              </div>

              {/* Existing Limit Lines List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configured Limit Lines
                </div>
                {diagramConfig.limitLines.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                    No custom limit lines configured. Add one below!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diagramConfig.limitLines.map((limit) => (
                      <div
                        key={limit.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-sm gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={limit.enabled}
                            onCheckedChange={(checked) =>
                              updateLimitLine(limit.id, { enabled: Boolean(checked) })
                            }
                          />
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: limit.color }}
                          />
                          <span className="font-medium text-xs truncate">{limit.label}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            Y = {limit.value} ({limit.axis === 'left' ? 'Left Axis' : 'Right Axis'})
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            [{limit.lineStyle}]
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeLimitLine(limit.id)}
                            title="Delete Limit Line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Add New Limit Line Form */}
              <form onSubmit={handleAddLimit} className="space-y-3 p-3 bg-muted/30 border rounded-lg">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  Add New Limit Line
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="limit-label" className="text-xs">
                      Label / Description
                    </Label>
                    <Input
                      id="limit-label"
                      placeholder="e.g. Target Temp 210°C"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="limit-val" className="text-xs">
                      Y Value (Threshold)
                    </Label>
                    <Input
                      id="limit-val"
                      type="number"
                      step="any"
                      placeholder="e.g. 210 or 1.75"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Assigned Axis</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={newAxis === 'left' ? 'default' : 'outline'}
                        className="h-7 text-xs flex-1"
                        onClick={() => setNewAxis('left')}
                      >
                        Left (Y)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={newAxis === 'right' ? 'default' : 'outline'}
                        className="h-7 text-xs flex-1"
                        onClick={() => setNewAxis('right')}
                      >
                        Right (Y1)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Line Style</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={newLineStyle === 'dashed' ? 'default' : 'outline'}
                        className="h-7 text-xs flex-1"
                        onClick={() => setNewLineStyle('dashed')}
                      >
                        Dashed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={newLineStyle === 'solid' ? 'default' : 'outline'}
                        className="h-7 text-xs flex-1"
                        onClick={() => setNewLineStyle('solid')}
                      >
                        Solid
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Line Color</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <input
                          type="color"
                          value={newColor}
                          onChange={(e) => setNewColor(e.target.value)}
                          className="w-7 h-7 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0 z-10"
                        />
                        <div
                          className="w-6 h-6 rounded-full border shadow-xs"
                          style={{ backgroundColor: newColor }}
                        />
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {COLOR_PALETTE.slice(0, 6).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewColor(c)}
                            className="w-4 h-4 rounded-full border border-black/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" className="h-8 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Add Limit Line
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DISPLAY & AXES */}
          {activeTab === 'display' && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Fine-tune general diagram appearance and render parameters.
              </div>

              <div className="space-y-3 p-3 bg-card border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Show Background Grid</div>
                    <div className="text-[11px] text-muted-foreground">
                      Display gridlines for X and Y coordinate scales
                    </div>
                  </div>
                  <Checkbox
                    checked={diagramConfig.showGrid}
                    onCheckedChange={(c) => setShowGrid(Boolean(c))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Show Legend</div>
                    <div className="text-[11px] text-muted-foreground">
                      Display metric dataset labels at the top of the chart
                    </div>
                  </div>
                  <Checkbox
                    checked={diagramConfig.showLegend}
                    onCheckedChange={(c) => setShowLegend(Boolean(c))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Curve Smoothing (Tension)</div>
                    <div className="text-[11px] text-muted-foreground">
                      {diagramConfig.tension > 0 ? 'Smooth Bezier curves' : 'Straight line segments'}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={diagramConfig.tension === 0 ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => setTension(0)}
                    >
                      Straight
                    </Button>
                    <Button
                      size="sm"
                      variant={diagramConfig.tension > 0 ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => setTension(0.25)}
                    >
                      Smooth
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/20 border rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">Reset to Defaults</div>
                  <div className="text-[11px] text-muted-foreground">
                    Restore standard extruder temperature & filament series
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetDiagramConfig}
                  className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Configuration
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t bg-muted/10 flex justify-between items-center sm:justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            Settings automatically saved
          </div>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
