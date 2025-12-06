import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SerialMonitor } from "@/components/SerialMonitor";
import { Dashboard } from "@/components/Dashboard";
import { useStore } from "@/store";
import "./App.css";

function App() {
  const showSerialMonitor = useStore((state) => state.showSerialMonitor);
  const setShowSerialMonitor = useStore((state) => state.setShowSerialMonitor);
  const isConnected = useStore((state) => state.isConnected);
  const setupListeners = useStore((state) => state.setupListeners);
  const cleanupListeners = useStore((state) => state.cleanupListeners);
  const loadPorts = useStore((state) => state.loadPorts);

  // Load ports on mount
  useEffect(() => {
    loadPorts();
  }, []);

  // Setup/cleanup listeners based on connection state
  useEffect(() => {
    if (isConnected) {
      setupListeners();
    }
    
    // Cleanup listeners only on unmount or when disconnecting
    return () => {
      if (isConnected) {
        cleanupListeners();
      }
    };
  }, [isConnected]);

  return (
    <main className="container">
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance mb-4">
        <code className="relative rounded px-[0.3rem] py-[0.2rem] font-mono font-semibold">
          3devo Filament Extruder
        </code>
      </h1>

      {/* View Toggle */}
      <div className="flex justify-center gap-2 mb-4">
        <Button
          variant={!showSerialMonitor ? "default" : "outline"}
          onClick={() => setShowSerialMonitor(false)}
        >
          Dashboard
        </Button>
        <Button
          variant={showSerialMonitor ? "default" : "outline"}
          onClick={() => setShowSerialMonitor(true)}
        >
          Serial Monitor
        </Button>
      </div>

      {/* Main Content */}
      {showSerialMonitor ? (
        <SerialMonitor />
      ) : (
        <Dashboard />
      )}
    </main>
  );
}

export default App;
