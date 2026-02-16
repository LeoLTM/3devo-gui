import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store";
import { selectIsConnected } from "@/store/serialSlice";

export function SerialMonitor() {
  const serialOutputRef = useRef<HTMLDivElement>(null);

  // Serial state
  const isConnected = useStore(selectIsConnected);
  const serialData = useStore((state) => state.serialData);
  const clearSerialData = useStore((state) => state.clearSerialData);

  // Extruder data state
  const currentData = useStore((state) => state.currentData);
  const historicalData = useStore((state) => state.historicalData);
  const parseWarnings = useStore((state) => state.parseWarnings);

  // UI state
  const autoScroll = useStore((state) => state.autoScroll);
  const setAutoScroll = useStore((state) => state.setAutoScroll);

  // Auto-scroll to bottom when new data arrives
  useEffect(() => {
    if (autoScroll && serialOutputRef.current) {
      serialOutputRef.current.scrollTop = serialOutputRef.current.scrollHeight;
    }
  }, [serialData, autoScroll]);

  const clearMonitor = () => {
    clearSerialData();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {currentData && (
            <span>
              Data Points: {historicalData.length} | 
              Latest Time: {currentData.time.toFixed(1)}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="auto-scroll" 
              checked={autoScroll}
              onCheckedChange={(checked) => setAutoScroll(!!checked)}
            />
            <Label 
              htmlFor="auto-scroll" 
              className="text-sm font-normal cursor-pointer"
            >
              Auto-scroll
            </Label>
          </div>
          <Button onClick={clearMonitor} variant="outline" size="sm">
            Clear Monitor
          </Button>
        </div>
      </div>

      {/* Parse Warnings */}
      {parseWarnings.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded text-sm">
          <div className="font-semibold">Parse Warnings:</div>
          {parseWarnings.slice(-3).map((warning: string, idx: number) => (
            <div key={idx} className="text-xs">{warning}</div>
          ))}
        </div>
      )}

      {/* Serial Output */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 font-semibold">
          Serial Output
        </div>
        <div
          ref={serialOutputRef}
          className="bg-black text-green-400 font-mono text-sm p-4 h-[600px] overflow-y-auto"
        >
          {serialData.length === 0 ? (
            <div className="text-gray-500">
              {isConnected ? "Waiting for data..." : "Not connected. Use the Serial Connection drawer to connect."}
            </div>
          ) : (
            serialData.map((line: string, index: number) => (
              <div key={index}>{line}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
