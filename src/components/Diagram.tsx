import { useState, useMemo, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { selectIsConnected } from '@/store/serialSlice';
import { DiagramConfigDialog } from '@/components/diagram/DiagramConfigDialog';
import {
  Play,
  Pause,
  Sliders,
  Clock,
  RotateCcw,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  X,
  Plus,
} from 'lucide-react';
import { DataRow } from '@/types/extruder';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

export function Diagram() {
  const [configOpen, setConfigOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isConnected = useStore(selectIsConnected);
  const currentData = useStore((state) => state.currentData);
  const historicalData = useStore((state) => state.historicalData);
  const clearHistoricalData = useStore((state) => state.clearHistoricalData);

  const diagramConfig = useStore((state) => state.diagramConfig);
  const isDiagramPaused = useStore((state) => state.isDiagramPaused);
  const toggleDiagramPause = useStore((state) => state.toggleDiagramPause);
  const setTimeWindowSeconds = useStore((state) => state.setTimeWindowSeconds);
  const toggleSeries = useStore((state) => state.toggleSeries);

  // Sync fullscreen state if user exits via Escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Freeze data snapshot when paused
  const pausedDataRef = useRef<DataRow[]>([]);
  useEffect(() => {
    if (isDiagramPaused) {
      pausedDataRef.current = historicalData;
    }
  }, [isDiagramPaused]);

  const activeData = isDiagramPaused ? pausedDataRef.current : historicalData;

  // Filter data according to time window
  const filteredData = useMemo(() => {
    if (activeData.length === 0) return [];
    if (diagramConfig.timeWindowSeconds === 0) return activeData;

    const latestTime = activeData[activeData.length - 1].time;
    const startTime = latestTime - diagramConfig.timeWindowSeconds;
    const sliced = activeData.filter((d) => d.time >= startTime);
    return sliced.length > 0 ? sliced : activeData.slice(-50);
  }, [activeData, diagramConfig.timeWindowSeconds]);

  // Active series enabled by user
  const enabledSeries = useMemo(
    () => diagramConfig.series.filter((s) => s.enabled),
    [diagramConfig.series]
  );

  // Check which axes are used
  const hasLeftAxis = useMemo(
    () =>
      enabledSeries.some((s) => s.axis === 'left') ||
      diagramConfig.limitLines.some((l) => l.enabled && l.axis === 'left'),
    [enabledSeries, diagramConfig.limitLines]
  );

  const hasRightAxis = useMemo(
    () =>
      enabledSeries.some((s) => s.axis === 'right') ||
      diagramConfig.limitLines.some((l) => l.enabled && l.axis === 'right'),
    [enabledSeries, diagramConfig.limitLines]
  );

  // Derive unique unit labels for left & right axes
  const leftUnitLabel = useMemo(() => {
    const units = Array.from(
      new Set(enabledSeries.filter((s) => s.axis === 'left').map((s) => s.unit))
    );
    return units.length > 0 ? units.join(' / ') : 'Value';
  }, [enabledSeries]);

  const rightUnitLabel = useMemo(() => {
    const units = Array.from(
      new Set(enabledSeries.filter((s) => s.axis === 'right').map((s) => s.unit))
    );
    return units.length > 0 ? units.join(' / ') : 'Value';
  }, [enabledSeries]);

  // Chart datasets with zero-spike filter support
  const chartData = useMemo(() => {
    const labels = filteredData.map((d) => `${d.time.toFixed(1)}s`);

    const datasets = enabledSeries.map((s) => {
      const dataPoints = filteredData.map((d) => {
        const val = d[s.key];
        if (typeof val !== 'number') return null;
        // Filter out zero-spikes if configured for this metric
        if (s.filterZeroSpikes && val === 0) return null;
        return val;
      });

      return {
        label: `${s.label} (${s.unit})`,
        data: dataPoints,
        borderColor: s.color,
        backgroundColor: `${s.color}15`,
        borderWidth: 2,
        yAxisID: s.axis === 'right' ? 'y1' : 'y',
        tension: diagramConfig.tension,
        pointRadius: filteredData.length > 100 ? 0 : 2,
        pointHoverRadius: 5,
        fill: false,
        spanGaps: true, // ponytail: smooth interpolation across filtered 0-spikes
      };
    });

    return { labels, datasets };
  }, [filteredData, enabledSeries, diagramConfig.tension]);

  // Build annotations for custom horizontal limit lines
  const annotations = useMemo(() => {
    const ann: Record<string, any> = {};

    diagramConfig.limitLines
      .filter((l) => l.enabled)
      .forEach((line) => {
        const scale = line.axis === 'right' ? 'y1' : 'y';
        ann[`limit_${line.id}`] = {
          type: 'line' as const,
          drawTime: 'afterDatasetsDraw' as const,
          scaleID: scale,
          value: line.value,
          yScaleID: scale,
          yMin: line.value,
          yMax: line.value,
          borderColor: line.color,
          borderWidth: 2,
          borderDash: line.lineStyle === 'dashed' ? [6, 4] : [],
          label: {
            display: true,
            content: `${line.label}: ${line.value}`,
            position: 'end' as const,
            backgroundColor: `${line.color}dd`,
            color: '#ffffff',
            font: {
              size: 11,
              weight: 'bold' as const,
            },
            padding: 4,
            borderRadius: 4,
          },
        };
      });

    return ann;
  }, [diagramConfig.limitLines]);

  // Chart options
  const options = useMemo<ChartOptions<'line'>>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: diagramConfig.showLegend,
          position: 'top',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            font: { size: 11 },
          },
        },
        tooltip: {
          enabled: true,
          position: 'nearest',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 11 },
          padding: 8,
          boxPadding: 4,
        },
        annotation: {
          annotations,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Elapsed Time',
            font: { size: 11 },
          },
          grid: {
            display: diagramConfig.showGrid,
            color: 'rgba(150, 150, 150, 0.15)',
          },
          ticks: {
            maxTicksLimit: 12,
            font: { size: 10 },
          },
        },
        y: {
          display: hasLeftAxis,
          position: 'left',
          title: {
            display: true,
            text: leftUnitLabel,
            font: { size: 11 },
          },
          grid: {
            display: diagramConfig.showGrid,
            color: 'rgba(150, 150, 150, 0.15)',
          },
          ticks: {
            font: { size: 10 },
          },
        },
        y1: {
          display: hasRightAxis,
          position: 'right',
          title: {
            display: true,
            text: rightUnitLabel,
            font: { size: 11 },
          },
          grid: {
            drawOnChartArea: false, // Don't duplicate horizontal grid lines
          },
          ticks: {
            font: { size: 10 },
          },
        },
      },
    };
  }, [
    diagramConfig.showLegend,
    diagramConfig.showGrid,
    annotations,
    hasLeftAxis,
    hasRightAxis,
    leftUnitLabel,
    rightUnitLabel,
  ]);

  // Only 1 min, 5 min, 10 min, All
  const timeWindowPresets = [
    { label: '1 min', value: 60 },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: 'All', value: 0 },
  ];

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-7xl mx-auto flex flex-col gap-2.5 min-h-0 h-full flex-1 overflow-hidden ${
        isFullscreen ? 'p-4 bg-background fixed inset-0 z-50 h-screen max-w-none' : ''
      }`}
    >
      {/* Top Toolbar */}
      <Card className="p-3 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status & Live Info */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConnected
                  ? isDiagramPaused
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 animate-pulse" />
                  {isDiagramPaused ? 'LIVE PAUSED' : 'STREAMING LIVE'}
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  DISCONNECTED
                </>
              )}
            </div>

            <div className="text-xs text-muted-foreground hidden sm:block">
              {filteredData.length} data points
              {currentData && ` • Runtime: ${currentData.time.toFixed(1)}s`}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Time Window Buttons */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
              <Clock className="h-3.5 w-3.5 ml-1.5 mr-0.5 text-muted-foreground" />
              {timeWindowPresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setTimeWindowSeconds(preset.value)}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                    diagramConfig.timeWindowSeconds === preset.value
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Pause / Resume Button */}
            <Button
              variant={isDiagramPaused ? 'default' : 'outline'}
              size="sm"
              onClick={toggleDiagramPause}
              className="gap-1.5 h-8 text-xs font-medium"
            >
              {isDiagramPaused ? (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" /> Resume
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </>
              )}
            </Button>

            {/* Clear Data */}
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistoricalData}
              className="h-8 px-2 text-xs"
              title="Clear Chart Buffer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            {/* Fullscreen Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 px-2 text-xs hidden md:inline-flex"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Configure Button */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="gap-1.5 h-8 text-xs"
            >
              <Sliders className="h-3.5 w-3.5" />
              Configure
            </Button>
          </div>
        </div>

        {/* Metric Quick Badges Bar - Only show active metrics */}
        <div className="mt-2.5 pt-2.5 border-t flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-muted-foreground text-[11px] shrink-0 mr-1 font-medium">
            Active Metrics:
          </span>
          {enabledSeries.length === 0 ? (
            <span className="text-muted-foreground text-[11px] italic">
              None active. Click Configure to add metrics.
            </span>
          ) : (
            enabledSeries.map((s) => (
              <span
                key={s.key}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/30 bg-accent text-accent-foreground text-[11px] font-medium shrink-0 shadow-xs"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.label}</span>
                <span className="text-[10px] opacity-70">({s.unit})</span>
                <button
                  type="button"
                  onClick={() => toggleSeries(s.key)}
                  className="ml-0.5 hover:text-destructive opacity-60 hover:opacity-100 transition-opacity"
                  title={`Disable ${s.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfigOpen(true)}
            className="h-6 px-2 text-[11px] gap-1 shrink-0 ml-1 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      </Card>

      {/* Main Big Chart Card */}
      <Card className="p-3 sm:p-4 flex-1 min-h-0 flex flex-col shadow-xs relative overflow-hidden">
        {filteredData.length < 2 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground gap-3">
            <div className="p-4 rounded-full bg-muted/50">
              <Sliders className="h-8 w-8 opacity-60" />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">
                {isConnected ? 'Waiting for extruder data...' : 'Device Disconnected'}
              </div>
              <div className="text-xs mt-1 max-w-sm">
                {isConnected
                  ? 'Live data stream is connected. Graph will start plotting automatically as points arrive.'
                  : 'Connect to a serial port via the bottom-right connection button to stream real-time data.'}
              </div>
            </div>
            {!isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigOpen(true)}
                className="mt-2 text-xs gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                Customize Series & Limits First
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex-1 relative min-h-0">
            <Line data={chartData} options={options} plugins={[annotationPlugin]} />
          </div>
        )}
      </Card>

      {/* Configuration Dialog */}
      <DiagramConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        container={containerRef.current}
      />
    </div>
  );
}

