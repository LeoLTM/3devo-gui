import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store";
import type { TeableUser } from "@/store/teableSlice";
import {
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface TeableSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeableSetupDialog({
  open,
  onOpenChange,
}: TeableSetupDialogProps) {
  const testTeableConnection = useStore((s) => s.testTeableConnection);
  const saveTeableConfig = useStore((s) => s.saveTeableConfig);
  const isTeableLoading = useStore((s) => s.isTeableLoading);

  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "success">("form");
  const [verifiedUser, setVerifiedUser] = useState<TeableUser | null>(null);

  const resetState = () => {
    setUrl("");
    setToken("");
    setError(null);
    setStep("form");
    setVerifiedUser(null);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetState();
    }
    onOpenChange(value);
  };

  const handleTestConnection = async () => {
    setError(null);

    const trimmedUrl = url.trim().replace(/\/+$/, "");
    const trimmedToken = token.trim();

    if (!trimmedUrl) {
      setError("Please enter the Teable instance URL.");
      return;
    }
    if (!trimmedToken) {
      setError("Please enter your personal access token.");
      return;
    }

    try {
      const user = await testTeableConnection(trimmedUrl, trimmedToken);
      setVerifiedUser(user);
      setStep("success");
    } catch (err) {
      setError(String(err));
    }
  };

  const handleSaveAndConnect = async () => {
    if (!verifiedUser) return;

    const trimmedUrl = url.trim().replace(/\/+$/, "");
    const trimmedToken = token.trim();

    try {
      await saveTeableConfig(
        trimmedUrl,
        trimmedToken,
        verifiedUser.name,
        verifiedUser.email,
        verifiedUser.avatar,
      );
      handleOpenChange(false);
    } catch {
      // Error toast is shown by the store action
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Connect to Teable</DialogTitle>
              <DialogDescription>
                Enter the URL of your self-hosted Teable instance and a personal
                access token to connect.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="teable-url">Instance URL</Label>
                <Input
                  id="teable-url"
                  type="url"
                  placeholder="https://teable.example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isTeableLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teable-token">Personal Access Token</Label>
                <Input
                  id="teable-token"
                  type="password"
                  placeholder="teable_pat_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isTeableLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Create a token in your Teable account under{" "}
                  <span className="font-medium">
                    Settings → Personal Access Tokens
                  </span>
                  .
                </p>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleTestConnection}
                disabled={isTeableLoading}
                className="gap-2"
              >
                {isTeableLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing…
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && verifiedUser && (
          <>
            <DialogHeader>
              <DialogTitle>Connection Successful</DialogTitle>
              <DialogDescription>
                Authenticated with your Teable instance. Review the account
                details below and save.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                {verifiedUser.avatar ? (
                  <img
                    src={verifiedUser.avatar}
                    alt={verifiedUser.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">{verifiedUser.name}</p>
                <p className="text-sm text-muted-foreground">
                  {verifiedUser.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {url.trim().replace(/\/+$/, "")}
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("form");
                  setVerifiedUser(null);
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSaveAndConnect} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Save & Connect
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
