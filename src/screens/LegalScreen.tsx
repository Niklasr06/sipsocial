import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Screen } from '../components';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { LEGAL_DOCUMENTS, LegalDocumentKey } from '../data/legal';

// Der Screen lebt in beiden Stacks (Onboarding + Root) — deshalb typen
// wir nicht auf einen konkreten Param-List, sondern auf die schmalste
// Schnittmenge der Navigation-API, die wir wirklich brauchen.
interface Props {
  navigation: { goBack: () => void };
  route: { params: { document: LegalDocumentKey } };
}

const TODO_REGEX = /\{\{TODO_[A-Z_]+\}\}/g;

function renderParagraph(text: string): React.ReactNode {
  // Markiere noch nicht gefüllte ``{{TODO_...}}``-Platzhalter visuell als
  // gelben Inline-Code statt sie als unstrukturierten Klartext zu rendern.
  // Falls noch nichts gefüllt ist, sieht der User wenigstens, dass das
  // ein offener Platzhalter ist, kein echter Inhalt.
  if (!TODO_REGEX.test(text)) return text;
  TODO_REGEX.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = TODO_REGEX.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    parts.push(
      <Text key={key++} style={styles.todoInline}>
        {match[0]}
      </Text>,
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

const LegalScreen: React.FC<Props> = ({ navigation, route }) => {
  const doc = LEGAL_DOCUMENTS[route.params.document];

  const hasOpenTodos = doc.sections.some((section) =>
    section.paragraphs.some((p) => TODO_REGEX.test(p)),
  );
  TODO_REGEX.lastIndex = 0;

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title={doc.title} />
      <Text style={styles.title}>{doc.title}</Text>
      <Text style={styles.lastUpdated}>Stand: {doc.lastUpdated}</Text>

      {hasOpenTodos ? (
        <Card tone="cream" padding="md" style={styles.todoBanner}>
          <View style={styles.todoBannerRow}>
            <Ionicons name="construct-outline" size={18} color={colors.warning} />
            <Text style={styles.todoBannerText}>
              Dieses Dokument ist noch ein Entwurf — die gelb markierten Platzhalter
              werden vor der öffentlichen Veröffentlichung mit den realen Daten
              befüllt.
            </Text>
          </View>
        </Card>
      ) : null}

      {doc.sections.map((section, idx) => (
        <View key={idx} style={styles.section}>
          {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
          {section.paragraphs.map((p, j) => (
            <Text key={j} style={styles.paragraph}>
              {renderParagraph(p)}
            </Text>
          ))}
        </View>
      ))}

      <View style={{ height: spacing.xxxl }} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  lastUpdated: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.xl },
  heading: {
    ...typography.bodyStrong,
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  todoBanner: { marginBottom: spacing.lg },
  todoBannerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  todoBannerText: {
    ...typography.small,
    color: colors.textDark,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  todoInline: {
    fontFamily: 'Menlo, Courier, monospace',
    fontSize: 13,
    color: colors.warning,
    backgroundColor: 'rgba(201, 152, 96, 0.18)',
    borderRadius: radius.sm,
  },
});

export default LegalScreen;
