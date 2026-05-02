import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Root-level Error Boundary.
 * Catches any unhandled JavaScript error in the component tree and
 * renders a friendly recovery screen instead of crashing to a white screen.
 *
 * Usage: wrap in app/_layout.tsx around <Stack />
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry will pick this up automatically via the root Sentry.wrap()
    console.error('[ErrorBoundary] Caught error:', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.emoji}>😵</Text>
          <Text style={s.title}>Oops! Something broke</Text>
          <Text style={s.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity style={s.btn} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={s.btnTxt}>↺  Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: '#C94030',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
