import { useEffect, useRef, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

export function UpdateChecker() {
    const hasChecked = useRef(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        checkForUpdates();
    }, []);

    async function checkForUpdates() {
        try {
            const update = await check();
            if (update) {
                showUpdateToast(update);
            }
        } catch (err) {
            console.error("Failed to check for updates:", err);
        }
    }

    function showUpdateToast(update: Update) {
        toast(`Update v${update.version} available`, {
            description: update.body ?? "A new version is ready to install.",
            dismissible: true,
            action: {
                label: updating ? "Updating…" : "Install & Restart",
                onClick: () => installUpdate(update),
            },
        });
    }

    async function installUpdate(update: Update) {
        if (updating) return;
        setUpdating(true);

        const toastId = toast.loading("Downloading update…", {
            description: "0%",
        });

        try {
            let contentLength = 0;
            let downloaded = 0;

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case "Started":
                        contentLength = event.data.contentLength ?? 0;
                        break;
                    case "Progress":
                        downloaded += event.data.chunkLength;
                        if (contentLength > 0) {
                            const pct = Math.round((downloaded / contentLength) * 100);
                            toast.loading("Downloading update…", {
                                id: toastId,
                                description: `${pct}%`,
                            });
                        }
                        break;
                    case "Finished":
                        toast.success("Update installed! Restarting…", { id: toastId });
                        break;
                }
            });

            await relaunch();
        } catch (err) {
            console.error("Update failed:", err);
            toast.error("Update failed", {
                id: toastId,
                description: String(err),
            });
            setUpdating(false);
        }
    }

    return null;
}
