import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { AccidentZone } from '@/hooks/useAccidentZones';
import { LatLng } from '@/types/map';

interface ProximityWarningProps {
    map: L.Map | null;
    currentPosition: LatLng | null;
    zones: AccidentZone[];
}

export const ProximityWarning: React.FC<ProximityWarningProps> = ({ map, currentPosition, zones }) => {
    const [warning, setWarning] = useState<{ distance: number, zone: AccidentZone } | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const markerRef = useRef<L.Marker | null>(null);
    const popupRef = useRef<L.Popup | null>(null);

    useEffect(() => {
        if (!map || !currentPosition) return;

        let closestDistance = Infinity;
        let closestZone: AccidentZone | null = null;

        const userLatLng = L.latLng(currentPosition.lat, currentPosition.lng);

        for (const zone of zones) {
            const zoneLatLng = L.latLng(zone.lat, zone.lng);
            const distance = userLatLng.distanceTo(zoneLatLng); // Leaflet's distance calculation

            if (distance < closestDistance) {
                closestDistance = distance;
                closestZone = zone;
            }
        }

        if (closestDistance <= 500 && closestZone) {
            setWarning({ distance: closestDistance, zone: closestZone });

            if (!markerRef.current) {
                const isBlackspot = closestZone.point_type === 'blackspot';
                const iconHtml = `<div style="
                    width: 28px; height: 28px; border-radius: 50%;
                    background-color: ${isBlackspot ? '#ef4444' : '#991b1b'};
                    border: 2px solid #fff;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px; color: white;
                ">🚨</div>`;

                markerRef.current = L.marker([closestZone.lat, closestZone.lng], {
                    icon: L.divIcon({
                        className: 'proximity-warning-icon',
                        html: iconHtml,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14],
                    }),
                }).addTo(map);

                // Leaflet doesn't have direct animation like Google Maps BOUNCE.
                // Custom animation would require CSS or a plugin.

                popupRef.current = L.popup({
                    closeButton: false,
                    autoPan: false,
                    offset: L.point(0, -20), // Adjust offset to be above the marker
                });

                const mOver = () => {
                    if (!closestZone) return;
                    const isB = closestZone.point_type === 'blackspot';
                    const contentString = `
                        <div style="font-family: 'Inter', sans-serif; color: #111; padding: 4px; min-width: 200px;">
                            <h3 style="color: #ef4444; font-weight: bold; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px;">
                                ${isB ? '🚨 Blackspot Danger' : '⚠️ History Detected'}
                            </h3>
                            <div style="font-size: 11px; line-height: 1.5;">
                                <strong>Severity:</strong> ${closestZone.severity}<br/>
                                ${closestZone.risk_info ? `<strong>Risk:</strong> ${closestZone.risk_info}<br/>` : ''}
                                ${closestZone.landmark ? `<strong>Landmark:</strong> ${closestZone.landmark}<br/>` : ''}
                            </div>
                        </div>
                    `;
                    if (popupRef.current && markerRef.current && map) {
                        popupRef.current.setLatLng(markerRef.current.getLatLng()).setContent(contentString).openOn(map);
                    }
                };

                const mOut = () => {
                    popupRef.current?.remove();
                };

                markerRef.current.on('mouseover', mOver);
                markerRef.current.on('mouseout', mOut);

            } else {
                markerRef.current.setLatLng([closestZone.lat, closestZone.lng]);
            }
        } else {
            setWarning(null);
            setIsExpanded(false);
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
        }
    }, [map, currentPosition, zones]);

    useEffect(() => {
        return () => {
            markerRef.current?.remove();
            popupRef.current?.remove();
        }
    }, []);

    if (!warning) return null;

    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#111111] border border-[#2A2A2A] rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-50">
            <div className="flex items-center gap-5">
                <div className="flex-shrink-0 animate-pulse w-3 h-3 rounded-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.9)]" />
                <div className="flex-1">
                    <h3 className="text-[#C5A880] font-serif tracking-[0.2em] uppercase text-[10px] font-bold mb-1.5 opacity-90">
                        {warning.zone.point_type === 'blackspot' ? 'Critical Blackspot Detected' : 'Caution: Accident History'}
                    </h3>
                    <p className="text-zinc-300 font-serif text-sm tracking-wide">
                        Safety Warning <span className="text-red-500 font-medium ml-1">[{Math.round(warning.distance)}m ahead]</span>
                    </p>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-shrink-0 text-[10px] uppercase tracking-wider font-bold text-[#C5A880] border border-[#C5A880]/50 px-3 py-1.5 rounded hover:bg-[#C5A880] hover:text-[#111] transition-colors"
                >
                    {isExpanded ? 'Hide' : 'Know More'}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#2A2A2A] text-zinc-400 text-sm font-serif leading-relaxed">
                    {warning.zone.point_type === 'blackspot' ? (
                        <>
                            This is a high-risk zone tagged as <strong className="text-red-500">{warning.zone.landmark}</strong>.
                            Reported risk: <span className="text-zinc-200 italic">"{warning.zone.risk_info}"</span>.
                            Exercise extreme caution.
                        </>
                    ) : (
                        <>
                            This accident occurred on a <strong className="text-zinc-200">{warning.zone.day || 'Recorded Day'}</strong> involving a <strong className="text-zinc-200">{warning.zone.vehicle || 'Vehicle'}</strong>.
                            Historical severity: <strong className="text-zinc-200">{warning.zone.severity}</strong>.
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
