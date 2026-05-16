import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cafe } from '../types';
import { colors, fonts, radius, spacing, typography } from '../theme';

interface Props {
  cafes: Cafe[];
  selectedCafeId?: string;
  onSelect?: (cafeId: string) => void;
  height?: number;
}

/**
 * Native-friendly cafe map.
 *
 * On iOS/Android we lazily require ``react-native-maps`` (so the web bundle
 * never tries to evaluate it). On web we render a designed, on-brand fallback
 * that visualises the cafe positions on a relative coordinate plane.
 *
 * Both paths support marker selection through ``onSelect``.
 */
export const CafeMap: React.FC<Props> = ({ cafes, selectedCafeId, onSelect, height = 240 }) => {
  if (Platform.OS !== 'web') {
    return (
      <NativeMap cafes={cafes} selectedCafeId={selectedCafeId} onSelect={onSelect} height={height} />
    );
  }
  return <WebMapFallback cafes={cafes} selectedCafeId={selectedCafeId} onSelect={onSelect} height={height} />;
};

// ------------------------- Native (react-native-maps) -------------------------

const NativeMap: React.FC<Props> = ({ cafes, selectedCafeId, onSelect, height }) => {
  let Maps: any = null;
  try {
    // The dynamic module name defeats Metro's static analysis so the web
    // bundle never tries to resolve `react-native-maps`. The package is only
    // resolved at runtime on iOS/Android — and only if it's actually
    // installed.
    const moduleName = 'react-native-maps';
    // eslint-disable-next-line @typescript-eslint/no-require-imports, security/detect-non-literal-require
    Maps = require(moduleName);
  } catch {
    Maps = null;
  }
  if (!Maps) {
    // Library not installed yet — degrade to the fallback so the screen renders.
    return <WebMapFallback cafes={cafes} selectedCafeId={selectedCafeId} onSelect={onSelect} height={height} />;
  }
  const MapView = Maps.default;
  const { Marker } = Maps;
  const withCoords = cafes.filter((c) => !!c.location);
  if (withCoords.length === 0) {
    return <WebMapFallback cafes={cafes} selectedCafeId={selectedCafeId} onSelect={onSelect} height={height} />;
  }
  const first = withCoords[0].location!;

  return (
    <View style={[styles.frame, { height }]}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {withCoords.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.location!.lat, longitude: c.location!.lng }}
            title={c.name}
            description={c.address}
            onPress={() => onSelect?.(c.id)}
            pinColor={c.id === selectedCafeId ? '#7A4E2D' : '#C77752'}
          />
        ))}
      </MapView>
    </View>
  );
};

// ------------------------- Web fallback (no Google JS) -------------------------

const WebMapFallback: React.FC<Props> = ({ cafes, selectedCafeId, onSelect, height = 240 }) => {
  const withCoords = useMemo(() => cafes.filter((c) => !!c.location), [cafes]);
  const bounds = useMemo(() => {
    if (withCoords.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const c of withCoords) {
      const { lat, lng } = c.location!;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    const padLat = (maxLat - minLat) * 0.2 || 0.01;
    const padLng = (maxLng - minLng) * 0.2 || 0.01;
    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [withCoords]);

  return (
    <View style={[styles.frame, { height }]}>
      <View style={styles.map}>
        <View style={styles.mapGridOverlay} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${(i + 1) * 11}%` }]} />
          ))}
        </View>
        <View style={styles.mapLabel}>
          <Ionicons name="map-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.mapLabelText}>Café-Karte · Vorschau</Text>
        </View>
        {bounds &&
          withCoords.map((c) => {
            const { lat, lng } = c.location!;
            const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
            const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
            const selected = c.id === selectedCafeId;
            return (
              <Pressable
                key={c.id}
                onPress={() => onSelect?.(c.id)}
                style={({ pressed }) => [
                  styles.markerWrap,
                  { left: `${x}%`, top: `${y}%` },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.marker, selected && styles.markerSelected]}>
                  <Text style={styles.markerEmoji}>{c.emoji}</Text>
                </View>
                {selected ? (
                  <View style={styles.markerCallout}>
                    <Text style={styles.markerCalloutText} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  map: { flex: 1, backgroundColor: '#EFE2D0', position: 'relative' },
  mapGridOverlay: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(122, 78, 45, 0.08)' },
  gridLineH: { left: 0, right: 0, height: 1 },
  gridLineV: { top: 0, bottom: 0, width: 1 },
  mapLabel: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapLabelText: { ...typography.caption, color: colors.textSecondary, marginLeft: 4 },
  markerWrap: { position: 'absolute', alignItems: 'center', transform: [{ translateX: -16 }, { translateY: -28 }] },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: '#2F241D',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  markerSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  markerEmoji: { fontSize: 18, fontFamily: fonts.sans },
  markerCallout: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.textDark,
    borderRadius: radius.sm,
    maxWidth: 160,
  },
  markerCalloutText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
