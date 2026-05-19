import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Header, Screen } from '../components';
import { colors, fonts, spacing, typography } from '../theme';
import { LEGAL_DOCUMENTS, LegalDocumentKey } from '../data/legal';

// Der Screen lebt in beiden Stacks (Onboarding + Root) — deshalb typen
// wir nicht auf einen konkreten Param-List, sondern auf die schmalste
// Schnittmenge der Navigation-API, die wir wirklich brauchen.
interface Props {
  navigation: { goBack: () => void };
  route: { params: { document: LegalDocumentKey } };
}

const LegalScreen: React.FC<Props> = ({ navigation, route }) => {
  const doc = LEGAL_DOCUMENTS[route.params.document];

  return (
    <Screen>
      <Header onBack={() => navigation.goBack()} title={doc.title} />
      <Text style={styles.title}>{doc.title}</Text>
      <Text style={styles.lastUpdated}>Stand: {doc.lastUpdated}</Text>

      {doc.sections.map((section, idx) => (
        <View key={idx} style={styles.section}>
          {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
          {section.paragraphs.map((p, j) => (
            <Text key={j} style={styles.paragraph}>
              {p}
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
});

export default LegalScreen;
