import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SerialMonitor } from "@/components/SerialMonitor";
import { Dashboard } from "@/components/Dashboard";
import { Analytics } from "@/components/Analytics";
import { Settings } from "@/components/Settings";
import { AppLayout } from "@/components/AppLayout";
import { SerialDrawer } from "@/components/SerialDrawer";
import { useStore } from "@/store";
import { selectIsConnected } from "@/store/serialSlice";
import { Plug } from "lucide-react";
import "./styles/globals.css";

function App() {
  const activePage = useStore((state) => state.activePage);
  const isConnected = useStore(selectIsConnected);
  const connectionState = useStore((state) => state.connectionState);
  const setupListeners = useStore((state) => state.setupListeners);
  const loadPorts = useStore((state) => state.loadPorts);
  const loadConfig = useStore((state) => state.loadConfig);
  const toggleSerialDrawer = useStore((state) => state.toggleSerialDrawer);

  // Load ports and config on mount
  useEffect(() => {
    loadPorts();
    loadConfig();
  }, []);

  // Setup listeners when connected
  // Note: Cleanup is handled by serial-disconnected event listener
  useEffect(() => {
    if (connectionState === 'connected') {
      // Use IIFE to handle async properly
      (async () => {
        try {
          await setupListeners();
        } catch (err) {
          console.error('Failed to setup listeners:', err);
        }
      })();
    }
  }, [connectionState]);

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
    <ErrorBoundary>
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

      {/* Toast Notifications */}
      <Toaster position="bottom-right" />
    </ErrorBoundary>
  );
}

export default App;
