import React, { useEffect, useMemo, useState } from "react";
import { X, Star, Phone, Globe, MapPin, Navigation2, Footprints, Bike, Car } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePlaceDetails, PlaceDetailsExtended } from "@/hooks/usePlaceDetails";
import { PlacePrediction } from "@/hooks/usePlacesSearch"; // Import PlacePrediction

export type TravelModeOption = "WALKING" | "BICYCLING" | "DRIVING";

interface PlaceDetailsSheetProps {
  place: PlacePrediction | null;
  isOpen: boolean;
  onClose: () => void;
  onStartDirections: (travelMode: TravelModeOption) => void;
}

export const PlaceDetailsSheet: React.FC<PlaceDetailsSheetProps> = ({
  place,
  isOpen,
  onClose,
  onStartDirections,
}) => {
  const { fetchPlaceDetails, isLoading } = usePlaceDetails();
  const [details, setDetails] = useState<PlaceDetailsExtended | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!isOpen || !place) return;

    (async () => {
      const d = await fetchPlaceDetails(place);
      if (mounted) setDetails(d);
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, place, fetchPlaceDetails]);

  const title = details?.name || place?.mainText || "";
  const address = details?.address || place?.description || "";

  // Photos are not available from Nominatim
  const photos = useMemo(() => {
    return [];
  }, []);

  if (!isOpen || !place) return null;

  return (
    <div className="absolute left-4 top-24 w-[360px] max-w-[92vw] max-h-[70vh] glass-panel rounded-2xl overflow-hidden z-30 animate-slide-up">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <div className="font-serif font-semibold truncate">{title}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {/* Rating and Open status are not directly available from Nominatim */}
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(70vh - 64px)" }}>
        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading place details…</div>
        )}

        {photos.length > 0 && (
          <div className="rounded-xl overflow-hidden bg-secondary/40">
            <div className="flex gap-2 overflow-x-auto p-2 custom-scrollbar">
              {photos.map((p, idx) => (
                <img
                  key={idx}
                  src={p.url}
                  alt={`${title} photo ${idx + 1}`}
                  loading="lazy"
                  className="h-36 w-56 object-cover rounded-lg shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div className="text-foreground/90">{address}</div>
          </div>
        )}

        {(details?.phoneNumber || details?.website) && (
          <div className="grid grid-cols-1 gap-2">
            {details?.phoneNumber && (
              <button
                className="w-full px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
                onClick={() => {
                  navigator.clipboard.writeText(details.phoneNumber!);
                  toast({ title: "Phone copied" });
                }}
              >
                <Phone className="w-4 h-4 text-primary" />
                <span className="truncate">{details.phoneNumber}</span>
              </button>
            )}
            {details?.website && (
              <a
                className="w-full px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
                href={details.website}
                target="_blank"
                rel="noreferrer"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span className="truncate">Website</span>
              </a>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Start navigation</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onStartDirections("WALKING")}
              className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors flex flex-col items-center gap-1"
              title="Walk"
            >
              <Footprints className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Walk</span>
            </button>
            <button
              onClick={() => onStartDirections("BICYCLING")}
              className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors flex flex-col items-center gap-1"
              title="Bike"
            >
              <Bike className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Bike</span>
            </button>
            <button
              onClick={() => onStartDirections("DRIVING")}
              className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors flex flex-col items-center gap-1"
              title="Car"
            >
              <Car className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Car</span>
            </button>
          </div>

          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            <Navigation2 className="w-4 h-4" />
            <span>Routes + ETA will appear in the Commute panel.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
