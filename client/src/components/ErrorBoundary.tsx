import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import * as Updates from 'expo-updates';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * GlobalErrorBoundary
 * Prevents the entire app from crashing (white screen) if a sub-component fails.
 * Shows a user-friendly "Oops" screen with a reload button.
 */
export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL UI ERROR:', error, errorInfo);
  }

  private handleReload = async () => {
    try {
      // expo-updates reloadAsync forces a fresh app restart
      await Updates.reloadAsync();
    } catch {
      this.setState({ hasError: false });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={s.container}>
          <View style={s.content}>
            <Text style={s.emoji}>🛰️</Text>
            <Text style={s.title}>Lost in Space?</Text>
            <Text style={s.desc}>
              Loona ran into an unexpected glitch. We've logged the error and our engineers are on it.
            </Text>
            
            <TouchableOpacity style={s.btn} onPress={this.handleReload}>
              <Text style={s.btnTxt}>Try Reloading</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  content: { padding: 40, alignItems: 'center' },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 16, color: '#AAA', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  btn: { backgroundColor: '#4D3DBF', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  btnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
