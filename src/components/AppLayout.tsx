import { ReactNode, useState, useEffect } from "react";
import { useStore } from "@/store";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { selectIsConnected } from "@/store/serialSlice";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Terminal,
  BarChart3,
  Settings,
  Plug,
} from "lucide-react";
import { ExperimentWidget } from "@/components/ExperimentWidget";
import type { PageType } from "@/store/uiSlice";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const activePage = useStore((state) => state.activePage);
  const setActivePage = useStore((state) => state.setActivePage);
  const toggleSerialDrawer = useStore((state) => state.toggleSerialDrawer);
  const isConnected = useStore(selectIsConnected);
  const selectedPort = useStore((state) => state.selectedPort);
  const [appVersion, setAppVersion] = useState<string>("dev");

  useEffect(() => {
    getVersion()
      .then((version) => {
        setAppVersion(version);
        getCurrentWindow().setTitle(`3devo Extruder v${version}`);
      })
      .catch(() => {
        // Fallback for dev environment
        setAppVersion("dev");
      });
  }, []);

  const navigationItems: { page: PageType; icon: typeof LayoutDashboard; label: string }[] = [
    { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { page: 'serial-monitor', icon: Terminal, label: 'Serial Monitor' },
    { page: 'analytics', icon: BarChart3, label: 'Analytics' },
    { page: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex flex-col">
              <span className="font-semibold text-sm">3devo Extruder</span>
              <span className="text-xs text-muted-foreground">v{appVersion}</span>
            </div>
          </div>
          <Separator />
          <div className="px-2 py-2">
            <Button
              onClick={toggleSerialDrawer}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <Plug className="h-4 w-4" />
              Serial Connection
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.page}>
                      <SidebarMenuButton
                        isActive={activePage === item.page}
                        onClick={() => setActivePage(item.page)}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? `Connected to ${selectedPort}` : "Disconnected"}
              </span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">
            {navigationItems.find((item) => item.page === activePage)?.label || "3devo Filament Extruder"}
          </h1>
          <div className="ml-auto">
            <ExperimentWidget />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
