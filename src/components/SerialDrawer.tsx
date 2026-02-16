import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store";
import { selectIsConnected, selectIsOperationInProgress } from "@/store/serialSlice";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";

interface ParsedPortInfo {
  portName: string;
  isExtruder: boolean;
  modelName?: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

/**
 * Parse port information and determine if it's a filament extruder
 */
function parsePortInfo(port: {
  port_name: string;
  port_type: string;
  vendor_id?: number;
  product_id?: number;
  manufacturer?: string;
  product?: string;
  serial_number?: string;
}): ParsedPortInfo {
  const result: ParsedPortInfo = {
    portName: port.port_name,
    isExtruder: false,
  };

  // Check if this is a filament extruder
  const isExtruder =
    port.product?.toLowerCase().includes("filament extruder") ||
    (port.manufacturer?.toLowerCase().includes("3devo") ?? false);

  result.isExtruder = isExtruder;

  if (port.port_type === "USB") {
    result.manufacturer = port.manufacturer;
    result.modelName = port.product;
    result.serialNumber = port.serial_number;

    if (port.vendor_id && port.product_id) {
      result.vendorId = port.vendor_id.toString(16).padStart(4, "0").toUpperCase();
      result.productId = port.product_id.toString(16).padStart(4, "0").toUpperCase();
    }
  }

  return result;
}

export function SerialDrawer() {
  // UI state
  const isOpen = useStore((state) => state.isSerialDrawerOpen);
  const setOpen = useStore((state) => state.setSerialDrawerOpen);

  // Serial state
  const ports = useStore((state) => state.ports);
  const selectedPort = useStore((state) => state.selectedPort);
  const baudRate = useStore((state) => state.baudRate);
  const connectionState = useStore((state) => state.connectionState);
  const isConnected = useStore(selectIsConnected);
  const isOperationInProgress = useStore(selectIsOperationInProgress);
  const error = useStore((state) => state.error);

  // Serial actions
  const setSelectedPort = useStore((state) => state.setSelectedPort);
  const setBaudRate = useStore((state) => state.setBaudRate);
  const loadPorts = useStore((state) => state.loadPorts);
  const connect = useStore((state) => state.connect);
  const disconnect = useStore((state) => state.disconnect);
  const sendWakeup = useStore((state) => state.sendWakeup);

  // Refresh ports when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadPorts();
    }
  }, [isOpen, loadPorts]);

  // Cleanup: disconnect on unmount if connected
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect().catch(err => {
          console.error('Failed to disconnect on unmount:', err);
        });
      }
    };
  }, []);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Connect error:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const handleWakeup = async () => {
    try {
      await sendWakeup();
    } catch (err) {
      console.error('Wakeup error:', err);
    }
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
              {connectionState === 'connecting' && 'Connecting...'}
              {connectionState === 'connected' && 'Connected'}
              {connectionState === 'disconnecting' && 'Disconnecting...'}
              {connectionState === 'disconnected' && 'Disconnected'}
            </span>
            {isConnected && selectedPort && (
              <span className="ml-2 text-gray-600">to {selectedPort}</span>
            )}
          </div>

          {/* Port Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Port</label>
            <Select
              value={selectedPort && ports.some(p => p.port_name === selectedPort) ? selectedPort : undefined}
              onValueChange={setSelectedPort}
              disabled={isConnected}
            >
              <SelectTrigger className="w-full min-h-14 h-auto py-2">
                <SelectValue placeholder={ports.length === 0 ? "No ports available" : "Select serial port"}>
                  {selectedPort && (() => {
                    const port = ports.find(p => p.port_name === selectedPort);
                    if (port) {
                      const parsed = parsePortInfo(port);
                      if (parsed.isExtruder && parsed.modelName) {
                        return (
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{parsed.modelName}</span>
                            <span className="text-xs text-muted-foreground font-normal">{parsed.portName}</span>
                          </div>
                        );
                      }
                      return parsed.portName;
                    }
                    return selectedPort;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ports.map((port) => {
                  const parsed = parsePortInfo(port);
                  
                  return (
                    <SelectItem key={port.port_name} value={port.port_name}>
                      {parsed.isExtruder && parsed.modelName ? (
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium">{parsed.modelName}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {parsed.portName}
                            {parsed.serialNumber && ` • SN: ${parsed.serialNumber}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium">{parsed.portName}</span>
                          {parsed.modelName && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {parsed.manufacturer && `${parsed.manufacturer} • `}
                              {parsed.modelName}
                            </span>
                          )}
                          {!parsed.modelName && port.port_type !== "Unknown" && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {port.port_type}
                            </span>
                          )}
                        </div>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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
            <Button 
              onClick={loadPorts} 
              disabled={isConnected || isOperationInProgress} 
              variant="outline" 
              className="w-full"
            >
              Refresh Ports
            </Button>

            {!isConnected ? (
              <Button 
                onClick={handleConnect} 
                className="w-full" 
                disabled={!selectedPort || isOperationInProgress}
              >
                {connectionState === 'connecting' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <Button 
                onClick={handleDisconnect} 
                variant="destructive" 
                className="w-full"
                disabled={isOperationInProgress}
              >
                {connectionState === 'disconnecting' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {connectionState === 'disconnecting' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            )}

            <Button 
              onClick={handleWakeup} 
              disabled={!isConnected || isOperationInProgress} 
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
