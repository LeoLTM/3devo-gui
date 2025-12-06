import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function Analytics() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <BarChart3 className="h-16 w-16 text-muted-foreground" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Analytics</h2>
            <p className="text-muted-foreground">
              Advanced analytics and data visualization features coming soon.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
