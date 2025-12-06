import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";

export function SerialDrawer() {
  // UI state
  const isOpen = useStore((state) => state.isSerialDrawerOpen);
  const setOpen = useStore((state) => state.setSerialDrawerOpen);

  // Serial state
  const ports = useStore((state) => state.ports);
  const selectedPort = useStore((state) => state.selectedPort);
  const baudRate = useStore((state) => state.baudRate);
  const isConnected = useStore((state) => state.isConnected);
  const error = useStore((state) => state.error);

  // Serial actions
  const setSelectedPort = useStore((state) => state.setSelectedPort);
  const setBaudRate = useStore((state) => state.setBaudRate);
  const loadPorts = useStore((state) => state.loadPorts);
  const connect = useStore((state) => state.connect);
  const disconnect = useStore((state) => state.disconnect);
  const sendWakeup = useStore((state) => state.sendWakeup);

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleWakeup = async () => {
    await sendWakeup();
  };

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between">
          <div>
            <DrawerTitle>Serial Connection</DrawerTitle>
            <DrawerDescription>
              Configure and manage your serial port connection
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Status */}
          <div className="text-sm">
            Status:{" "}
            <span className={isConnected ? "text-green-600 font-semibold" : "text-gray-600"}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {isConnected && selectedPort && (
              <span className="ml-2 text-gray-600">to {selectedPort}</span>
            )}
          </div>

          {/* Port Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Port</label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isConnected}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {ports.length === 0 ? (
                <option value="">No ports available</option>
              ) : (
                ports.map((port: { port_name: string; port_type: string }) => (
                  <option key={port.port_name} value={port.port_name}>
                    {port.port_name} ({port.port_type})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Baud Rate */}
          <div>
            <label className="block text-sm font-medium mb-1">Baud Rate</label>
            <Input
              type="number"
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              disabled={isConnected}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={loadPorts} disabled={isConnected} variant="outline" className="w-full">
              Refresh Ports
            </Button>

            {!isConnected ? (
              <Button onClick={handleConnect} className="w-full" disabled={!selectedPort}>
                Connect
              </Button>
            ) : (
              <Button onClick={handleDisconnect} variant="destructive" className="w-full">
                Disconnect
              </Button>
            )}

            <Button 
              onClick={handleWakeup} 
              disabled={!isConnected} 
              variant="secondary"
              className="w-full"
            >
              Send Wakeup
            </Button>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
