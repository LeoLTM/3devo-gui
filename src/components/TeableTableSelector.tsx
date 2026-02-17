import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { Loader2, Save } from "lucide-react";

interface TeableSpace {
  id: string;
  name: string;
}

interface TeableBase {
  id: string;
  name: string;
  spaceId: string;
}

interface TeableTable {
  id: string;
  name: string;
}

export function TeableTableSelector() {
  const teableSpaceId = useStore((s) => s.teableSpaceId);
  const teableBaseId = useStore((s) => s.teableBaseId);
  const teableTableId = useStore((s) => s.teableTableId);
  const saveTeableTarget = useStore((s) => s.saveTeableTarget);

  // Initialize state from store values (will be restored on navigation)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(teableSpaceId || "");
  const [selectedBaseId, setSelectedBaseId] = useState<string>(teableBaseId || "");
  const [selectedTableId, setSelectedTableId] = useState<string>(teableTableId || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync with store when values change (e.g., loaded from config)
  useEffect(() => {
    if (teableSpaceId && selectedSpaceId === "") {
      setSelectedSpaceId(teableSpaceId);
    }
    if (teableBaseId && selectedBaseId === "") {
      setSelectedBaseId(teableBaseId);
    }
    if (teableTableId && selectedTableId === "") {
      setSelectedTableId(teableTableId);
    }
  }, [teableSpaceId, teableBaseId, teableTableId, selectedSpaceId, selectedBaseId, selectedTableId]);

  // Fetch spaces
  const {
    data: spaces,
    isLoading: isLoadingSpaces,
    error: spacesError,
  } = useQuery<TeableSpace[]>({
    queryKey: ["teable-spaces"],
    queryFn: async () => {
      return await invoke<TeableSpace[]>("list_teable_spaces");
    },
    retry: 1,
  });

  // Fetch bases for selected space
  const {
    data: bases,
    isLoading: isLoadingBases,
    error: basesError,
  } = useQuery<TeableBase[]>({
    queryKey: ["teable-bases", selectedSpaceId],
    queryFn: async () => {
      if (!selectedSpaceId) return [];
      return await invoke<TeableBase[]>("list_teable_bases", {
        spaceId: selectedSpaceId,
      });
    },
    enabled: !!selectedSpaceId,
    retry: 1,
  });

  // Fetch tables for selected base
  const {
    data: tables,
    isLoading: isLoadingTables,
    error: tablesError,
  } = useQuery<TeableTable[]>({
    queryKey: ["teable-tables", selectedBaseId],
    queryFn: async () => {
      if (!selectedBaseId) return [];
      return await invoke<TeableTable[]>("list_teable_tables", {
        baseId: selectedBaseId,
      });
    },
    enabled: !!selectedBaseId,
    retry: 1,
  });

  // Handlers that clear dependent fields when user changes selections
  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    // Clear dependent selections when space changes
    setSelectedBaseId("");
    setSelectedTableId("");
  };

  const handleBaseChange = (baseId: string) => {
    setSelectedBaseId(baseId);
    // Clear dependent selection when base changes
    setSelectedTableId("");
  };

  const handleSave = async () => {
    if (!selectedSpaceId || !selectedBaseId || !selectedTableId) return;

    setIsSaving(true);
    try {
      await saveTeableTarget(selectedSpaceId, selectedBaseId, selectedTableId);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    selectedSpaceId !== teableSpaceId ||
    selectedBaseId !== teableBaseId ||
    selectedTableId !== teableTableId;

  const canSave =
    hasChanges && selectedSpaceId && selectedBaseId && selectedTableId;

  return (
    <div className="space-y-4">
      {/* Space Selector */}
      <div className="space-y-2">
        <Label htmlFor="teable-space">Space</Label>
        <Select
          value={selectedSpaceId}
          onValueChange={handleSpaceChange}
          disabled={isLoadingSpaces}
        >
          <SelectTrigger id="teable-space">
            {isLoadingSpaces ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading spaces...
              </span>
            ) : (
              <SelectValue placeholder="Select a space" />
            )}
          </SelectTrigger>
          <SelectContent>
            {spaces?.map((space) => (
              <SelectItem key={space.id} value={space.id}>
                {space.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {spacesError && (
          <p className="text-sm text-destructive">
            Failed to load spaces: {String(spacesError)}
          </p>
        )}
      </div>

      {/* Base Selector */}
      <div className="space-y-2">
        <Label htmlFor="teable-base">Base</Label>
        <Select
          value={selectedBaseId}
          onValueChange={handleBaseChange}
          disabled={!selectedSpaceId || isLoadingBases}
        >
          <SelectTrigger id="teable-base">
            {isLoadingBases ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading bases...
              </span>
            ) : (
              <SelectValue placeholder="Select a base" />
            )}
          </SelectTrigger>
          <SelectContent>
            {bases?.map((base) => (
              <SelectItem key={base.id} value={base.id}>
                {base.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {basesError && (
          <p className="text-sm text-destructive">
            Failed to load bases: {String(basesError)}
          </p>
        )}
      </div>

      {/* Table Selector */}
      <div className="space-y-2">
        <Label htmlFor="teable-table">Table</Label>
        <Select
          value={selectedTableId}
          onValueChange={setSelectedTableId}
          disabled={!selectedBaseId || isLoadingTables}
        >
          <SelectTrigger id="teable-table">
            {isLoadingTables ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tables...
              </span>
            ) : (
              <SelectValue placeholder="Select a table" />
            )}
          </SelectTrigger>
          <SelectContent>
            {tables?.map((table) => (
              <SelectItem key={table.id} value={table.id}>
                {table.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tablesError && (
          <p className="text-sm text-destructive">
            Failed to load tables: {String(tablesError)}
          </p>
        )}
      </div>

      {/* Save Button */}
      {canSave && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Target Table
            </>
          )}
        </Button>
      )}
    </div>
  );
}
