/**
 * Kayda Sathi — Home Screen
 * Voice input, text input, language selector, and quick templates.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, BorderRadius, FontSizes, QuickTemplates } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { triageText, triageVoice } from '@/services/api';
import type { TriageResponse } from '@/types/triage';

// ── Languages ─────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'auto', label: '🌐 Auto' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'hinglish', label: '🔀 Hinglish' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingText, setLoadingText] = useState('Analyzing your case...');
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Mic pulse animation
  const micScale = useSharedValue(1);
  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  // ── Voice Recording ───────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant microphone access to use voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);

      // Start pulse animation
      micScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: Easing.ease }),
          withTiming(1, { duration: 600, easing: Easing.ease })
        ),
        -1,
        true
      );
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }, [micScale]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    micScale.value = withSpring(1);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Error', 'Recording failed. Please try again.');
        return;
      }

      // Send voice for triage
      setIsLoading(true);
      setLoadingText('Transcribing your voice...');

      const result = await triageVoice(uri, language);
      setLoadingText('');
      navigateToResult(result);
    } catch (err: unknown) {
      console.error('Voice triage failed:', err);
      const message = err instanceof Error ? err.message : 'Voice processing failed';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [language, micScale]);

  // ── Text Submit ───────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (trimmed.length < 10) {
      Alert.alert('Too short', 'Please describe your legal issue in more detail.');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setLoadingText('Analyzing your case...');

    try {
      const result = await triageText({ user_input: trimmed, language });
      navigateToResult(result);
    } catch (err: unknown) {
      console.error('Text triage failed:', err);
      const message = err instanceof Error ? err.message : 'Could not process your request';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [input, language]);

  // ── Navigation ────────────────────────────────────────────────────────

  const navigateToResult = (result: TriageResponse) => {
    // Store result in global state (simple approach for hackathon)
    (global as Record<string, unknown>).__triageResult = result;
    router.push('/result');
  };

  // ── Template selection ────────────────────────────────────────────────
  const handleTemplate = (text: string) => {
    setInput(text);
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.loadingIconWrap, { backgroundColor: theme.primaryLight }]}>
                <ThemedText style={{ fontSize: 40 }}>⚖️</ThemedText>
              </View>
              <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
              <ThemedText style={[styles.loadingTitle, { color: theme.text }]}>
                {loadingText}
              </ThemedText>
              <ThemedText style={[styles.loadingSubtitle, { color: theme.textSecondary }]}>
                Reviewing Indian statutes & drafting your action kit
              </ThemedText>
            </View>
          </Animated.View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View style={styles.header}>
              <ThemedText style={{ fontSize: 36, textAlign: 'center' }}>⚖️</ThemedText>
              <ThemedText style={[styles.title, { color: theme.text }]}>
                Kayda Sathi
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                Your Legal First-Aid Kit
              </ThemedText>
            </View>
          </Animated.View>

          {/* Language Selector */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langRow}
            >
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => setLanguage(lang.code)}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: language === lang.code ? theme.primary : theme.backgroundElement,
                      borderColor: language === lang.code ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.langChipText,
                      { color: language === lang.code ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    {lang.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Voice Input */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <View style={styles.voiceSection}>
              <Pressable
                onPressIn={startRecording}
                onPressOut={stopRecording}
                disabled={isLoading}
              >
                <Animated.View
                  style={[
                    micAnimStyle,
                    styles.micButton,
                    {
                      backgroundColor: isRecording ? theme.danger : theme.primary,
                      shadowColor: isRecording ? theme.danger : theme.primary,
                    },
                  ]}
                >
                  <ThemedText style={styles.micIcon}>
                    {isRecording ? '⏹️' : '🎤'}
                  </ThemedText>
                </Animated.View>
              </Pressable>
              <ThemedText style={[styles.voiceHint, { color: theme.textSecondary }]}>
                {isRecording ? 'Release to send' : 'Hold to speak your problem'}
              </ThemedText>
              <ThemedText style={[styles.voiceSubHint, { color: theme.textSecondary }]}>
                Supports Hindi, English, Tamil, Kannada & Hinglish
              </ThemedText>
            </View>
          </Animated.View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <ThemedText style={[styles.dividerText, { color: theme.textSecondary }]}>
              OR TYPE BELOW
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Text Input */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Describe your legal problem in plain language..."
                placeholderTextColor={theme.textSecondary}
                value={input}
                onChangeText={setInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Pressable
                onPress={handleSubmit}
                disabled={input.trim().length < 10}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: input.trim().length >= 10 ? theme.primary : theme.backgroundElement,
                    opacity: input.trim().length >= 10 ? 1 : 0.5,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.submitText,
                    { color: input.trim().length >= 10 ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Get Legal Action Kit →
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>

          {/* Quick Templates */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              COMMON ISSUES
            </ThemedText>
            <View style={styles.templateGrid}>
              {QuickTemplates.map((tpl, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleTemplate(tpl.text)}
                  style={[
                    styles.templateChip,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}
                >
                  <ThemedText style={[styles.templateText, { color: theme.text }]}>
                    {tpl.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Scanner CTA */}
          <Animated.View entering={FadeInDown.duration(500).delay(600)}>
            <Pressable
              onPress={() => router.push('/scanner')}
              style={[styles.scannerCta, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}
            >
              <ThemedText style={{ fontSize: 24 }}>🔍</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.scannerCtaTitle, { color: theme.accent }]}>
                  Contract Scanner
                </ThemedText>
                <ThemedText style={[styles.scannerCtaDesc, { color: theme.textSecondary }]}>
                  Paste any agreement to detect unfair clauses
                </ThemedText>
              </View>
              <ThemedText style={{ color: theme.accent, fontSize: 20 }}>→</ThemedText>
            </Pressable>
          </Animated.View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <ThemedText style={[styles.disclaimerText, { color: theme.textSecondary }]}>
              ⚠️ This provides legal information, not legal advice. For complex matters, consult a practicing advocate.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontWeight: '500',
  },

  // Language
  langRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  langChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  langChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },

  // Voice
  voiceSection: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  micIcon: {
    fontSize: 36,
  },
  voiceHint: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    marginTop: Spacing.two,
  },
  voiceSubHint: {
    fontSize: FontSizes.xs,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Input
  inputCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  textInput: {
    fontSize: FontSizes.base,
    minHeight: 100,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    lineHeight: 22,
  },
  submitButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    fontSize: FontSizes.base,
    fontWeight: '700',
  },

  // Templates
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: Spacing.five,
    marginBottom: Spacing.three,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  templateChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  templateText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },

  // Scanner CTA
  scannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.five,
  },
  scannerCtaTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  scannerCtaDesc: {
    fontSize: FontSizes.sm,
  },

  // Disclaimer
  disclaimer: {
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.two,
  },
  disclaimerText: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  loadingCard: {
    alignItems: 'center',
    padding: Spacing.five,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    width: '100%',
    maxWidth: 340,
  },
  loadingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
});
