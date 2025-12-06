import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export function Settings() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <SettingsIcon className="h-16 w-16 text-muted-foreground" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Settings</h2>
            <p className="text-muted-foreground">
              Application configuration and preferences coming soon.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
