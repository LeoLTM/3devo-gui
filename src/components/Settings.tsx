import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  FolderOpen,
  Database,
  Trash2,
  User,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "@/store";
import { TeableSetupDialog } from "@/components/TeableSetupDialog";

export function Settings() {
  const outputPath = useStore((state) => state.outputPath);
  const isLoadingConfig = useStore((state) => state.isLoadingConfig);
  const setOutputPath = useStore((state) => state.setOutputPath);
  const loadConfig = useStore((state) => state.loadConfig);

  // Teable state
  const isTeableConnected = useStore((s) => s.isTeableConnected);
  const teableUrl = useStore((s) => s.teableUrl);
  const teableUserName = useStore((s) => s.teableUserName);
  const teableUserEmail = useStore((s) => s.teableUserEmail);
  const teableUserAvatar = useStore((s) => s.teableUserAvatar);
  const loadTeableConfig = useStore((s) => s.loadTeableConfig);
  const removeTeableConfig = useStore((s) => s.removeTeableConfig);

  const [teableDialogOpen, setTeableDialogOpen] = useState(false);

  // Load config when the settings page mounts (ensures fresh data)
  useEffect(() => {
    loadConfig();
    loadTeableConfig();
  }, []);

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Output Folder",
      defaultPath: outputPath || undefined,
    });

    if (selected) {
      await setOutputPath(selected);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-muted-foreground" />
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Application configuration and preferences
          </p>
        </div>
      </div>

      <Separator />

      {/* Log File Output Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Log File Output</h3>
            <p className="text-sm text-muted-foreground">
              Choose the folder where log files and exported data will be saved.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="output-path">Output Folder</Label>
            <div className="flex gap-2">
              <Input
                id="output-path"
                value={isLoadingConfig ? "Loading..." : outputPath || "No folder selected"}
                readOnly
                className="flex-1 text-muted-foreground cursor-default"
              />
              <Button
                onClick={handleBrowse}
                variant="outline"
                disabled={isLoadingConfig}
                className="shrink-0 gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Browse
              </Button>
            </div>
            {outputPath && (
              <p className="text-xs text-muted-foreground">
                Files will be saved to this directory.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Teable Integration Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Teable Integration</h3>
            <p className="text-sm text-muted-foreground">
              Connect to a self-hosted Teable instance to sync experiment data.
            </p>
          </div>

          {isTeableConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                  {teableUserAvatar ? (
                    <img
                      src={teableUserAvatar}
                      alt={teableUserName ?? "User"}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* User info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {teableUserName ?? "Unknown User"}
                  </p>
                  {teableUserEmail && (
                    <p className="text-sm text-muted-foreground truncate">
                      {teableUserEmail}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    {teableUrl}
                  </p>
                </div>

                {/* Status badge */}
                <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Connected
                </span>
              </div>

              <Button
                variant="destructive"
                onClick={removeTeableConfig}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove Integration
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setTeableDialogOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Connect Teable
            </Button>
          )}
        </div>
      </Card>

      {/* Teable Setup Dialog */}
      <TeableSetupDialog
        open={teableDialogOpen}
        onOpenChange={setTeableDialogOpen}
      />
    </div>
  );
}
