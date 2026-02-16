import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Toast notification helpers for consistent error/success messaging
 */
export const showToast = {
  error: (message: string, description?: string) => {
    toast.error(message, { description });
  },
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, { description });
  },
  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },
  
  // Specialized toast for connection events
  connectionError: (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    toast.error("Connection Error", { 
      description: message,
      duration: 5000 
    });
  },
  connectionLost: () => {
    toast.error("Connection Lost", {
      description: "The serial device has been disconnected",
      duration: 5000
    });
  },
  connected: (portName: string) => {
    toast.success("Connected", {
      description: `Successfully connected to ${portName}`,
      duration: 3000
    });
  },
  disconnected: () => {
    toast.info("Disconnected", {
      description: "Serial connection closed",
      duration: 3000
    });
  },
};