import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store";

export function SerialMonitor() {
  const serialOutputRef = useRef<HTMLDivElement>(null);

  // Serial state
  const ports = useStore((state) => state.ports);
  const selectedPort = useStore((state) => state.selectedPort);
  const baudRate = useStore((state) => state.baudRate);
  const isConnected = useStore((state) => state.isConnected);
  const serialData = useStore((state) => state.serialData);
  const error = useStore((state) => state.error);

  // Serial actions
  const setSelectedPort = useStore((state) => state.setSelectedPort);
  const setBaudRate = useStore((state) => state.setBaudRate);
  const loadPorts = useStore((state) => state.loadPorts);
  const connect = useStore((state) => state.connect);
  const disconnect = useStore((state) => state.disconnect);
  const sendWakeup = useStore((state) => state.sendWakeup);
  const clearSerialData = useStore((state) => state.clearSerialData);

  // Extruder data state
  const currentData = useStore((state) => state.currentData);
  const historicalData = useStore((state) => state.historicalData);
  const parseWarnings = useStore((state) => state.parseWarnings);

  // Auto-scroll to bottom when new data arrives
  useEffect(() => {
    if (serialOutputRef.current) {
      serialOutputRef.current.scrollTop = serialOutputRef.current.scrollHeight;
    }
  }, [serialData]);

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const clearMonitor = () => {
    clearSerialData();
  };

  const handleWakeup = async () => {
    await sendWakeup();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold">Serial Monitor</h2>

      {/* Controls */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">Port</label>
          <select
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            disabled={isConnected}
            className="w-full px-3 py-2 border rounded-md"
          >
            {ports.map((port: { port_name: string; port_type: string }) => (
              <option key={port.port_name} value={port.port_name}>
                {port.port_name} ({port.port_type})
              </option>
            ))}
          </select>
        </div>

        <div className="w-32">
          <label className="block text-sm font-medium mb-1">Baud Rate</label>
          <Input
            type="number"
            value={baudRate}
            onChange={(e) => setBaudRate(e.target.value)}
            disabled={isConnected}
          />
        </div>

        <Button onClick={loadPorts} disabled={isConnected} variant="outline">
          Refresh
        </Button>

        {!isConnected ? (
          <Button onClick={handleConnect}>Connect</Button>
        ) : (
          <Button onClick={handleDisconnect} variant="destructive">
            Disconnect
          </Button>
        )}

        <Button onClick={handleWakeup} disabled={!isConnected} variant="secondary">
          Wakeup
        </Button>

        <Button onClick={clearMonitor} variant="outline">
          Clear
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="text-sm">
        Status:{" "}
        <span className={isConnected ? "text-green-600" : "text-gray-600"}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        {currentData && (
          <span className="ml-4">
            Data Points: {historicalData.length} | 
            Latest Time: {currentData.time.toFixed(1)}s
          </span>
        )}
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
          className="bg-black text-green-400 font-mono text-sm p-4 h-96 overflow-y-auto"
        >
          {serialData.length === 0 ? (
            <div className="text-gray-500">Waiting for data...</div>
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
