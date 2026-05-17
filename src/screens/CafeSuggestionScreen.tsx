import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Pressable } from 'react-native';
import { Button, CafeMap, Card, Chip, Header, Screen, StatusPill } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { useApp } from '../store/AppContext';
import { formatDateLong, formatTimeRange } from '../utils/date';
import { Cafe } from '../types';
import { cafeApi, ApiCafe } from '../services/cafeApi';
import { isApiUnavailable } from '../services/apiClient';

type Props = NativeStackScreenProps<RootStackParamList, 'CafeSuggestion'>;

function mapApiCafe(c: ApiCafe): Cafe {
  return {
    id: c.id,
    name: c.name,
    address: c.address,
    area: c.area as Cafe['area'],
    openingHours: c.opening_hours || '',
    rating: c.rating,
    atmosphere: c.atmosphere,
    distanceMock: c.distance_mock,
    emoji: c.emoji,
    location: c.location ? { lat: c.location.lat, lng: c.location.lng } : undefined,
    placeId: c.place_id ?? undefined,
    source: c.source,
  };
}

const CafeSuggestionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId } = route.params;
  const { matches, cafes, updateMatch, getUser } = useApp();
  const match = matches.find((m) => m.id === matchId);
  const initialCafe = match ? cafes.find((c) => c.id === match.suggestedCafeId) : null;

  const [remoteCafes, setRemoteCafes] = useState<Cafe[] | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [apiNote, setApiNote] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number>(0);
  const [atmosphereFilter, setAtmosphereFilter] = useState<string | null>(null);

  const cafesInArea = useMemo(() => {
    if (!initialCafe) return [];
    if (remoteCafes && remoteCafes.length > 0) return remoteCafes.slice(0, 12);
    const sameArea = cafes.filter((c) => c.area === initialCafe.area);
    const others = cafes.filter((c) => c.area !== initialCafe.area);
    return [...sameArea, ...others.slice(0, 2)];
  }, [cafes, initialCafe, remoteCafes]);

  // Most common atmosphere tags across the current pool — capped so the
  // filter row doesn't sprawl. We only surface tags that appear at least
  // twice; one-off tags become noise.
  const topAtmospheres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cafesInArea) {
      for (const tag of c.atmosphere || []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [cafesInArea]);

  const filteredCafes = useMemo(() => {
    return cafesInArea.filter((c) => {
      if (minRating > 0 && c.rating < minRating) return false;
      if (atmosphereFilter && !c.atmosphere.includes(atmosphereFilter)) return false;
      return true;
    });
  }, [cafesInArea, minRating, atmosphereFilter]);

  const [selectedCafeId, setSelectedCafeId] = useState(initialCafe?.id ?? '');

  // Reflect remote results in selection if the initial cafe disappears.
  useEffect(() => {
    if (remoteCafes && !remoteCafes.find((c) => c.id === selectedCafeId) && remoteCafes[0]) {
      setSelectedCafeId(remoteCafes[0].id);
    }
  }, [remoteCafes, selectedCafeId]);

  // If the active filter hides the currently selected cafe, jump to the
  // first survivor so the detail card on the page isn't empty.
  useEffect(() => {
    if (filteredCafes.length === 0) return;
    if (!filteredCafes.find((c) => c.id === selectedCafeId)) {
      setSelectedCafeId(filteredCafes[0].id);
    }
  }, [filteredCafes, selectedCafeId]);

  if (!match || !initialCafe) {
    return (
      <Screen>
        <Header onBack={() => navigation.goBack()} title="Cafévorschlag" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.lg }]}>
          Dieser Vorschlag ist nicht mehr verfügbar.
        </Text>
      </Screen>
    );
  }

  const other = getUser(match.userBId);
  const selectedCafe =
    (remoteCafes ?? cafes).find((c) => c.id === selectedCafeId) ??
    cafes.find((c) => c.id === selectedCafeId) ??
    initialCafe;

  const onContinue = () => {
    if (selectedCafe.id !== match.suggestedCafeId) {
      updateMatch(match.id, { suggestedCafeId: selectedCafe.id });
    }
    navigation.navigate('MeetingConfirmation', { matchId: match.id });
  };

  const fetchNearby = async () => {
    setLoadingRemote(true);
    setApiNote(null);
    try {
      const params = initialCafe.location
        ? { lat: initialCafe.location.lat, lng: initialCafe.location.lng, limit: 10 }
        : { area: initialCafe.area, limit: 10 };
      const res = await cafeApi.search(params);
      const mapped = res.map(mapApiCafe);
      if (mapped.length === 0) {
        setApiNote('Keine weiteren Cafés gefunden. Wir bleiben bei den Vorschlägen aus dem Bereich.');
      } else {
        setRemoteCafes(mapped);
        const fromGoogle = mapped.some((c) => c.source === 'google');
        setApiNote(
          fromGoogle
            ? `${mapped.length} echte Cafés über Google Places geladen.`
            : `${mapped.length} Cafés geladen (lokale Daten).`,
        );
      }
    } catch (err) {
      if (isApiUnavailable(err)) {
        setApiNote('Backend nicht erreichbar — Vorschläge aus lokalen Cafés.');
      } else {
        setApiNote('Suche fehlgeschlagen. Wir bleiben bei den lokalen Vorschlägen.');
      }
    } finally {
      setLoadingRemote(false);
    }
  };

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title="Cafévorschlag" />
      <Text style={styles.title}>Ein guter Ort für euer Treffen.</Text>
      <Text style={styles.subline}>
        Vorgeschlagen passend zu eurem Bereich. Du kannst auch ein anderes Café wählen.
      </Text>

      <View style={{ marginTop: spacing.lg }}>
        <View style={styles.filterRow}>
          <Text style={[typography.small, { color: colors.textSecondary, marginRight: spacing.sm }]}>
            Filter:
          </Text>
          <Chip
            label="Alle"
            size="sm"
            selected={minRating === 0 && atmosphereFilter === null}
            onPress={() => {
              setMinRating(0);
              setAtmosphereFilter(null);
            }}
          />
          <Chip
            label="★ 4.5+"
            size="sm"
            selected={minRating === 4.5}
            onPress={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
          />
          <Chip
            label="★ 4.0+"
            size="sm"
            selected={minRating === 4.0}
            onPress={() => setMinRating(minRating === 4.0 ? 0 : 4.0)}
          />
          {topAtmospheres.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="sm"
              selected={atmosphereFilter === tag}
              onPress={() => setAtmosphereFilter(atmosphereFilter === tag ? null : tag)}
            />
          ))}
        </View>
        {filteredCafes.length === 0 ? (
          <Text style={[typography.small, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            Keine Treffer für diesen Filter. <Pressable onPress={() => { setMinRating(0); setAtmosphereFilter(null); }}><Text style={{ color: colors.primary, fontWeight: '600' }}>Filter zurücksetzen</Text></Pressable>
          </Text>
        ) : null}
        <CafeMap
          cafes={filteredCafes.length > 0 ? filteredCafes : cafesInArea}
          selectedCafeId={selectedCafeId}
          onSelect={(id) => setSelectedCafeId(id)}
        />
      </View>

      <Card tone="cream" padding="lg" style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 36, marginRight: spacing.md }}>{selectedCafe.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cafeName}>{selectedCafe.name}</Text>
            <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>
              {selectedCafe.address}
            </Text>
          </View>
          {selectedCafe.source === 'google' ? <StatusPill label="Google Places" tone="info" /> : null}
        </View>

        <View style={styles.cafeMetaRow}>
          <Meta icon="star-outline" label={`${selectedCafe.rating.toFixed(1)} Bewertung`} />
          {selectedCafe.distanceMock ? <Meta icon="walk-outline" label={selectedCafe.distanceMock} /> : null}
          {selectedCafe.openingHours ? <Meta icon="time-outline" label={selectedCafe.openingHours} /> : null}
        </View>

        {selectedCafe.atmosphere.length > 0 ? (
          <View style={styles.atmosphereRow}>
            {selectedCafe.atmosphere.map((a) => (
              <View key={a} style={styles.atmospherePill}>
                <Text style={styles.atmosphereText}>{a}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.timeBox}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[typography.bodyStrong, { color: colors.textDark, marginLeft: 6 }]}>
            {formatDateLong(match.suggestedDate)}
          </Text>
        </View>
        <View style={styles.timeBox}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={[typography.bodyStrong, { color: colors.textDark, marginLeft: 6 }]}>
            {formatTimeRange(match.suggestedStartTime, match.suggestedEndTime)}
          </Text>
        </View>
        {other ? (
          <View style={styles.timeBox}>
            <Ionicons name="person-outline" size={16} color={colors.primary} />
            <Text style={[typography.bodyStrong, { color: colors.textDark, marginLeft: 6 }]}>
              mit {other.pseudonym}
            </Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.actionRow}>
        <Button
          label={loadingRemote ? 'Suche…' : 'Anderes Café suchen'}
          variant="secondary"
          size="md"
          loading={loadingRemote}
          onPress={fetchNearby}
          iconLeft={<Ionicons name="search" size={16} color={colors.primary} />}
          style={{ flex: 1 }}
        />
      </View>
      {apiNote ? (
        <Text style={[typography.small, { color: colors.textSecondary, marginTop: 6 }]}>{apiNote}</Text>
      ) : null}

      <Text style={[typography.caption, styles.sectionLabel]}>
        Alternativen ({filteredCafes.length > 0 ? filteredCafes.length : cafesInArea.length})
      </Text>
      {(filteredCafes.length > 0 ? filteredCafes : cafesInArea).map((c) => (
        <CafeRow
          key={c.id}
          cafe={c}
          selected={c.id === selectedCafeId}
          onPress={() => setSelectedCafeId(c.id)}
        />
      ))}

      <Button
        label="Dieses Café vorschlagen"
        onPress={onContinue}
        fullWidth
        style={{ marginTop: spacing.xxl }}
      />
    </Screen>
  );
};

const Meta: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = ({ icon, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, marginBottom: 6 }}>
    <Ionicons name={icon} size={14} color={colors.textSecondary} />
    <Text style={[typography.small, { color: colors.textSecondary, marginLeft: 4 }]}>{label}</Text>
  </View>
);

const CafeRow: React.FC<{ cafe: Cafe; selected: boolean; onPress: () => void }> = ({
  cafe,
  selected,
  onPress,
}) => (
  <Card
    tone="white"
    padding="md"
    style={[styles.altCard, selected && styles.altCardSelected]}
    onPress={onPress}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginRight: spacing.md }}>{cafe.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: colors.textDark }]}>{cafe.name}</Text>
        <Text style={[typography.small, { color: colors.textSecondary }]}>
          {cafe.area}
          {cafe.distanceMock ? ` · ${cafe.distanceMock}` : ''}
          {cafe.rating ? ` · ★ ${cafe.rating.toFixed(1)}` : ''}
        </Text>
      </View>
      {selected ? <StatusPill label="Gewählt" tone="info" /> : null}
    </View>
  </Card>
);

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  subline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  cafeName: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 26,
    color: colors.textDark,
  },
  cafeMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
  atmosphereRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  atmospherePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  atmosphereText: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
  timeBox: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  actionRow: { flexDirection: 'row', marginTop: spacing.lg },
  sectionLabel: { color: colors.textSecondary, marginTop: spacing.xxl, marginBottom: spacing.sm },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  altCard: { marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  altCardSelected: { borderColor: colors.primary, backgroundColor: colors.surface },
});

export default CafeSuggestionScreen;
