/**
 * Kayda Sathi — Contract/Clause Scanner Screen
 * Paste any agreement/T&C to detect unfair, illegal, or deceptive clauses.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { scanClauses } from '@/services/api';
import type { ClauseScanResponse } from '@/types/triage';

export default function ScannerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [contractText, setContractText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClauseScanResponse | null>(null);

  const handleScan = useCallback(async () => {
    const trimmed = contractText.trim();
    if (trimmed.length < 20) {
      Alert.alert('Too short', 'Please paste more of the contract text for analysis.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await scanClauses({ contract_text: trimmed });
      setResult(data);
    } catch (err: unknown) {
      console.error('Clause scan failed:', err);
      const message = err instanceof Error ? err.message : 'Scan failed';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [contractText]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Unfair':
        return theme.danger;
      case 'Potentially Unfair':
        return theme.warning;
      default:
        return theme.success;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.strengthHigh;
    if (score >= 40) return theme.strengthMid;
    return theme.strengthLow;
  };

  const getRecommendationEmoji = (rec: string) => {
    if (rec.toLowerCase().includes('reject')) return '🚫';
    if (rec.toLowerCase().includes('negotiate')) return '⚠️';
    return '✅';
  };

  // ── Results View ──────────────────────────────────────────────────────
  if (result) {
    const scoreColor = getScoreColor(result.overall_fairness_score);

    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable onPress={() => setResult(null)} style={styles.backBtn}>
              <ThemedText style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>← Back</ThemedText>
            </Pressable>
            <ThemedText style={[styles.topBarTitle, { color: theme.text }]}>Scan Results</ThemedText>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Fairness Score */}
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={[styles.scoreCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  FAIRNESS SCORE
                </ThemedText>
                <View style={[styles.scoreCircle, { borderColor: scoreColor, backgroundColor: scoreColor + '15' }]}>
                  <ThemedText style={[styles.scoreNum, { color: scoreColor }]}>
                    {result.overall_fairness_score}
                  </ThemedText>
                  <ThemedText style={[styles.scoreOf, { color: scoreColor }]}>/100</ThemedText>
                </View>
                <ThemedText style={[styles.assessment, { color: theme.text }]}>
                  {result.overall_assessment}
                </ThemedText>

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: theme.dangerLight }]}>
                    <ThemedText style={[styles.statNum, { color: theme.danger }]}>
                      {result.flagged_clauses.length}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: theme.danger }]}>Flagged</ThemedText>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: theme.successLight }]}>
                    <ThemedText style={[styles.statNum, { color: theme.success }]}>
                      {result.safe_clauses_count}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: theme.success }]}>Safe</ThemedText>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Recommendation */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <View style={[styles.recCard, {
                backgroundColor:
                  result.recommendation.toLowerCase().includes('reject') ? theme.dangerLight :
                  result.recommendation.toLowerCase().includes('negotiate') ? theme.warningLight :
                  theme.successLight,
                borderColor:
                  result.recommendation.toLowerCase().includes('reject') ? theme.danger :
                  result.recommendation.toLowerCase().includes('negotiate') ? theme.warning :
                  theme.success,
              }]}>
                <ThemedText style={{ fontSize: 24 }}>{getRecommendationEmoji(result.recommendation)}</ThemedText>
                <ThemedText style={[styles.recText, { color: theme.text }]}>
                  {result.recommendation}
                </ThemedText>
              </View>
            </Animated.View>

            {/* Flagged Clauses */}
            {result.flagged_clauses.length > 0 && (
              <>
                <ThemedText style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                  🚩 FLAGGED CLAUSES
                </ThemedText>
                {result.flagged_clauses.map((clause, i) => {
                  const sevColor = getSeverityColor(clause.severity);
                  return (
                    <Animated.View key={i} entering={SlideInRight.duration(300).delay(i * 100)}>
                      <View style={[styles.clauseCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        {/* Severity badge */}
                        <View style={styles.clauseTop}>
                          <View style={[styles.sevBadge, { backgroundColor: sevColor + '22' }]}>
                            <ThemedText style={[styles.sevText, { color: sevColor }]}>
                              {clause.severity === 'Unfair' ? '🔴' : clause.severity === 'Potentially Unfair' ? '🟡' : '🟢'} {clause.severity}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Clause text */}
                        <View style={[styles.clauseQuote, { borderLeftColor: sevColor, backgroundColor: sevColor + '08' }]}>
                          <ThemedText style={[styles.clauseText, { color: theme.text }]}>
                            "{clause.clause_text}"
                          </ThemedText>
                        </View>

                        {/* Explanation */}
                        <ThemedText style={[styles.clauseLabel, { color: theme.textSecondary }]}>
                          Why it's problematic:
                        </ThemedText>
                        <ThemedText style={[styles.clauseExplain, { color: theme.text }]}>
                          {clause.explanation}
                        </ThemedText>

                        {/* Suggestion */}
                        <View style={[styles.suggBox, { backgroundColor: theme.successLight, borderColor: theme.success }]}>
                          <ThemedText style={[styles.clauseLabel, { color: theme.success }]}>
                            ✅ Fair alternative:
                          </ThemedText>
                          <ThemedText style={[styles.suggText, { color: theme.text }]}>
                            {clause.suggestion}
                          </ThemedText>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Input View ────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>← Back</ThemedText>
          </Pressable>
          <ThemedText style={[styles.topBarTitle, { color: theme.text }]}>Scanner</ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            {/* Header */}
            <View style={styles.scannerHeader}>
              <ThemedText style={{ fontSize: 40 }}>🔍</ThemedText>
              <ThemedText style={[styles.scannerTitle, { color: theme.text }]}>
                Contract Scanner
              </ThemedText>
              <ThemedText style={[styles.scannerDesc, { color: theme.textSecondary }]}>
                Paste any rental agreement, employment contract, or T&C below.{'\n'}
                We'll flag unfair, illegal, or deceptive clauses.
              </ThemedText>
            </View>

            {/* Input */}
            <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.contractInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Paste your contract or agreement text here..."
                placeholderTextColor={theme.textSecondary}
                value={contractText}
                onChangeText={setContractText}
                multiline
                numberOfLines={12}
                textAlignVertical="top"
              />
              <Pressable
                onPress={handleScan}
                disabled={isLoading || contractText.trim().length < 20}
                style={[
                  styles.scanBtn,
                  {
                    backgroundColor: contractText.trim().length >= 20 ? theme.accent : theme.backgroundElement,
                    opacity: isLoading ? 0.6 : 1,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ThemedText
                    style={[
                      styles.scanBtnText,
                      { color: contractText.trim().length >= 20 ? '#FFF' : theme.textSecondary },
                    ]}
                  >
                    🔍 Scan for Unfair Clauses
                  </ThemedText>
                )}
              </Pressable>
            </View>

            {/* Tips */}
            <View style={[styles.tipsCard, { backgroundColor: theme.infoLight, borderColor: theme.info }]}>
              <ThemedText style={{ fontSize: 16 }}>💡</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.tipTitle, { color: theme.info }]}>What we detect:</ThemedText>
                <ThemedText style={[styles.tipItem, { color: theme.textSecondary }]}>
                  • Illegal deposit / forfeiture clauses
                </ThemedText>
                <ThemedText style={[styles.tipItem, { color: theme.textSecondary }]}>
                  • Unenforceable non-compete terms
                </ThemedText>
                <ThemedText style={[styles.tipItem, { color: theme.textSecondary }]}>
                  • Hidden auto-renewal / cancellation traps
                </ThemedText>
                <ThemedText style={[styles.tipItem, { color: theme.textSecondary }]}>
                  • One-sided modification rights
                </ThemedText>
                <ThemedText style={[styles.tipItem, { color: theme.textSecondary }]}>
                  • Excessive notice periods & penalties
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.three },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backBtn: { padding: 8 },
  topBarTitle: { fontSize: FontSizes.md, fontWeight: '700' },

  // Scanner header
  scannerHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  scannerTitle: { fontSize: FontSizes.xl, fontWeight: '700' },
  scannerDesc: { fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },

  // Input
  inputCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  contractInput: {
    fontSize: FontSizes.sm,
    minHeight: 200,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    lineHeight: 20,
  },
  scanBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanBtnText: { fontSize: FontSizes.base, fontWeight: '700' },

  // Tips
  tipsCard: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  tipTitle: { fontSize: FontSizes.sm, fontWeight: '700', marginBottom: 6 },
  tipItem: { fontSize: FontSizes.sm, lineHeight: 20 },

  // Results
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  scoreCard: {
    padding: Spacing.four,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.three,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: { fontSize: FontSizes['2xl'], fontWeight: '800' },
  scoreOf: { fontSize: FontSizes.sm, fontWeight: '600' },
  assessment: { fontSize: FontSizes.base, textAlign: 'center', lineHeight: 22 },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  statBox: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statNum: { fontSize: FontSizes.xl, fontWeight: '800' },
  statLabel: { fontSize: FontSizes.sm, fontWeight: '600' },

  // Recommendation
  recCard: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.three,
    marginTop: Spacing.three,
    alignItems: 'center',
  },
  recText: { fontSize: FontSizes.base, fontWeight: '600', flex: 1, lineHeight: 22 },

  // Section
  sectionHeader: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },

  // Clause cards
  clauseCard: {
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  clauseTop: { flexDirection: 'row' },
  sevBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sevText: { fontSize: FontSizes.sm, fontWeight: '700' },
  clauseQuote: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 4,
  },
  clauseText: { fontSize: FontSizes.sm, fontStyle: 'italic', lineHeight: 20 },
  clauseLabel: { fontSize: FontSizes.xs, fontWeight: '700', marginTop: 4 },
  clauseExplain: { fontSize: FontSizes.sm, lineHeight: 18 },
  suggBox: {
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 4,
  },
  suggText: { fontSize: FontSizes.sm, lineHeight: 18, marginTop: 4 },
});
