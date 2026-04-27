/// <reference types="@types/google.maps" />

import React, { useMemo, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlacePrediction, usePlacesSearch } from "@/hooks/usePlacesSearch";
import { PlaceSummary, TravelModeOption } from "@/components/map/PlaceDetailsSheet";
import { useToast } from "@/components/ui/use-toast";

const textSchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters")
  .max(120, "Too long");

interface RoutePlannerDialogProps {
  map: google.maps.Map | null;
  isOpen: boolean;
  onClose: () => void;
  currentPosition: { lat: number; lng: number } | null;
  onPlanRoute: (args: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: TravelModeOption;
  }) => Promise<void>;
}

export const RoutePlannerDialog: React.FC<RoutePlannerDialogProps> = ({
  map,
  isOpen,
  onClose,
  currentPosition,
  onPlanRoute,
}) => {
  const { toast } = useToast();
  const [originTab, setOriginTab] = useState<"current" | "manual">("current");

  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [originPick, setOriginPick] = useState<PlaceSummary | null>(null);
  const [destPick, setDestPick] = useState<PlaceSummary | null>(null);
  const [mode, setMode] = useState<TravelModeOption>("DRIVING");

  const originSearch = usePlacesSearch(map);
  const destSearch = usePlacesSearch(map);

  const originPredictions = originSearch.predictions;
  const destPredictions = destSearch.predictions;

  const canUseCurrent = !!currentPosition;

  const origin = useMemo(() => {
    if (originTab === "current") return currentPosition;
    return originPick?.location ?? null;
  }, [originTab, currentPosition, originPick]);

  const destination = useMemo(() => destPick?.location ?? null, [destPick]);

  const pickPrediction = async (
    which: "origin" | "dest",
    prediction: PlacePrediction
  ) => {
    const details = await (which === "origin"
      ? originSearch.selectPrediction(prediction)
      : destSearch.selectPrediction(prediction));

    if (!details) {
      toast({ title: "Place not found", description: "Try another search." });
      return;
    }

    const summary: PlaceSummary = {
      placeId: details.placeId,
      name: details.name,
      address: details.address,
      rating: details.rating,
      isOpen: details.isOpen,
      location: details.position,
    };

    if (which === "origin") {
      setOriginPick(summary);
      setOriginQuery(details.name);
      originSearch.clearSearch();
    } else {
      setDestPick(summary);
      setDestQuery(details.name);
      destSearch.clearSearch();
    }
  };

  const submit = async () => {
    if (!origin) {
      toast({
        title: "Select source",
        description:
          originTab === "current"
            ? "Enable location to use current location."
            : "Pick a source place from suggestions.",
      });
      return;
    }
    if (!destination) {
      toast({ title: "Select destination", description: "Pick a destination from suggestions." });
      return;
    }

    await onPlanRoute({ origin, destination, mode });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Plan Route</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <Tabs value={originTab} onValueChange={(v) => setOriginTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="current">Current location</TabsTrigger>
                <TabsTrigger value="manual">Enter manually</TabsTrigger>
              </TabsList>
              <TabsContent value="current" className="mt-3">
                <div className="text-sm text-muted-foreground">
                  {canUseCurrent
                    ? "Using your current GPS location."
                    : "Location is off/unavailable. Enable GPS first."}
                </div>
              </TabsContent>
              <TabsContent value="manual" className="mt-3">
                <Input
                  value={originQuery}
                  placeholder="Search source"
                  onChange={(e) => {
                    const val = e.target.value;
                    setOriginQuery(val);
                    const parsed = textSchema.safeParse(val);
                    if (parsed.success) originSearch.search(val);
                    else originSearch.clearSearch();
                  }}
                />
                {originPredictions.length > 0 && (
                  <div className="mt-2 rounded-xl border border-border overflow-hidden">
                    {originPredictions.slice(0, 6).map((p) => (
                      <button
                        key={p.placeId}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/60 transition-colors"
                        onClick={() => pickPrediction("origin", p)}
                      >
                        <div className="text-sm font-medium">{p.mainText}</div>
                        <div className="text-xs text-muted-foreground">{p.secondaryText}</div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>Destination</Label>
            <Input
              value={destQuery}
              placeholder="Search destination"
              onChange={(e) => {
                const val = e.target.value;
                setDestQuery(val);
                const parsed = textSchema.safeParse(val);
                if (parsed.success) destSearch.search(val);
                else destSearch.clearSearch();
              }}
            />
            {destPredictions.length > 0 && (
              <div className="mt-2 rounded-xl border border-border overflow-hidden">
                {destPredictions.slice(0, 6).map((p) => (
                  <button
                    key={p.placeId}
                    className="w-full text-left px-3 py-2 hover:bg-secondary/60 transition-colors"
                    onClick={() => pickPrediction("dest", p)}
                  >
                    <div className="text-sm font-medium">{p.mainText}</div>
                    <div className="text-xs text-muted-foreground">{p.secondaryText}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={mode === "WALKING" ? "default" : "secondary"} onClick={() => setMode("WALKING")}>
                Walk
              </Button>
              <Button variant={mode === "BICYCLING" ? "default" : "secondary"} onClick={() => setMode("BICYCLING")}>
                Bike
              </Button>
              <Button variant={mode === "DRIVING" ? "default" : "secondary"} onClick={() => setMode("DRIVING")}>
                Car
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit}>Start navigation</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
