/**
 * Kayda Sathi — Root Layout
 * Stack navigation: Home → Result / Scanner
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

// Custom dark theme matching our design
const KaydaDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Colors.dark.primary,
  },
};

const KaydaLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    primary: Colors.light.primary,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Auto-hide splash screen once layout is ready
  SplashScreen.hideAsync();

  return (
    <ThemeProvider value={isDark ? KaydaDarkTheme : KaydaLightTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="result" />
        <Stack.Screen name="scanner" />
      </Stack>
    </ThemeProvider>
  );
}
