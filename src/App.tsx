import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SerialMonitor } from "@/components/SerialMonitor";
import { Dashboard } from "@/components/Dashboard";
import { Analytics } from "@/components/Analytics";
import { Settings } from "@/components/Settings";
import { AppLayout } from "@/components/AppLayout";
import { SerialDrawer } from "@/components/SerialDrawer";
import { useStore } from "@/store";
import { Plug } from "lucide-react";
import "./styles/globals.css";

function App() {
  const activePage = useStore((state) => state.activePage);
  const isConnected = useStore((state) => state.isConnected);
  const setupListeners = useStore((state) => state.setupListeners);
  const cleanupListeners = useStore((state) => state.cleanupListeners);
  const loadPorts = useStore((state) => state.loadPorts);
  const toggleSerialDrawer = useStore((state) => state.toggleSerialDrawer);

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

  // Render active page content
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'serial-monitor':
        return <SerialMonitor />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <AppLayout>
        {renderPage()}
      </AppLayout>

      {/* Global Serial Drawer */}
      <SerialDrawer />

      {/* Floating Action Button */}
      <Button
        onClick={toggleSerialDrawer}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        title="Open Serial Connection"
      >
        <Plug className="h-6 w-6" />
      </Button>
    </>
  );
}

export default App;
