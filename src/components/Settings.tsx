import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "@/store";
import { ModeToggle } from "./ThemeToggle";

export function Settings() {
  const outputPath = useStore((state) => state.outputPath);
  const isLoadingConfig = useStore((state) => state.isLoadingConfig);
  const setOutputPath = useStore((state) => state.setOutputPath);
  const loadConfig = useStore((state) => state.loadConfig);

  // Load config when the settings page mounts (ensures fresh data)
  useEffect(() => {
    loadConfig();
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

      <Separator />

      <ModeToggle />

    </div>
  );
}
