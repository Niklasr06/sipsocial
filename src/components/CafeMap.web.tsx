/**
 * Web-only cafe map using OpenStreetMap tiles via Leaflet.
 *
 * Metro's platform-specific resolution picks this file when bundling for
 * web (because of the ``.web.tsx`` suffix). On native, ``CafeMap.tsx`` is
 * used instead and uses ``react-native-maps`` — neither file imports the
 * other, so leaflet never reaches the native bundle.
 *
 * No API key needed: OSM raster tiles are free for casual / low-traffic
 * use under their tile-usage policy.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Cafe } from '../types';
import { colors, radius } from '../theme';

interface Props {
  cafes: Cafe[];
  selectedCafeId?: string;
  onSelect?: (cafeId: string) => void;
  height?: number;
}

// Inject Leaflet's CSS once on first import. Bundling CSS through Metro
// works in newer Expo SDKs but the runtime ``<link>`` is dependency-free
// and survives any plugin reshuffle.
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
let _leafletCssInjected = false;
function ensureLeafletCss(): void {
  if (_leafletCssInjected) return;
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
    _leafletCssInjected = true;
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS_URL;
  link.crossOrigin = '';
  document.head.appendChild(link);
  _leafletCssInjected = true;
}

function makeMarkerIcon(emoji: string, selected: boolean): L.DivIcon {
  const bg = selected ? colors.primary : colors.surface;
  const border = selected ? colors.primary : colors.accent;
  const color = selected ? '#fff' : colors.textDark;
  return L.divIcon({
    className: 'sipsocial-cafe-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 18px;
        background: ${bg};
        border: 2px solid ${border};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: ${color};
        box-shadow: 0 4px 10px rgba(47, 36, 29, 0.25);
      ">${emoji || '☕'}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/** Recenters/zooms the map so all cafés fit nicely when the list changes. */
const FitBounds: React.FC<{ cafes: Cafe[] }> = ({ cafes }) => {
  const map = useMap();
  const sig = useMemo(
    () => cafes.map((c) => `${c.id}:${c.location?.lat},${c.location?.lng}`).join('|'),
    [cafes],
  );
  useEffect(() => {
    const withCoords = cafes.filter((c) => !!c.location);
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      const { lat, lng } = withCoords[0].location!;
      map.setView([lat, lng], 15, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(
      withCoords.map((c) => [c.location!.lat, c.location!.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return null;
};

export const CafeMap: React.FC<Props> = ({
  cafes,
  selectedCafeId,
  onSelect,
  height = 240,
}) => {
  useEffect(() => {
    ensureLeafletCss();
  }, []);

  const withCoords = useMemo(() => cafes.filter((c) => !!c.location), [cafes]);

  // No cafés with coordinates → render nothing visual but keep the frame
  // height so the surrounding layout doesn't jump around.
  if (withCoords.length === 0) {
    return (
      <div
        style={{
          height,
          borderRadius: radius.xl,
          border: `1px solid ${colors.border}`,
          background: colors.surfaceAlt,
        }}
      />
    );
  }

  const first = withCoords[0].location!;

  return (
    <div
      style={{
        height,
        borderRadius: radius.xl,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
      }}
    >
      <MapContainer
        center={[first.lat, first.lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds cafes={withCoords} />
        {withCoords.map((c) => (
          <Marker
            key={c.id}
            position={[c.location!.lat, c.location!.lng]}
            icon={makeMarkerIcon(c.emoji, c.id === selectedCafeId)}
            eventHandlers={onSelect ? { click: () => onSelect(c.id) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
              {c.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
