import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { API_URL } from '../constants';

const { width } = Dimensions.get('window');

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL UI ERROR:', error, errorInfo);
    
    // Report crash to backend
    fetch(`${API_URL}/errors/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        component: 'ErrorBoundary',
        platform: Platform.OS === 'web' ? 'web' : 'mobile',
        metadata: {
          componentStack: errorInfo.componentStack,
          device: Platform.OS,
          timestamp: new Date().toISOString(),
        }
      })
    }).catch(err => console.log('Failed to report crash:', err));
  }

  private handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      this.setState({ hasError: false });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={s.container}>
          <View style={s.glow} />
          <View style={s.content}>
            <Text style={s.emoji}>🦊</Text>
            <Text style={s.title}>Oops! Even the fox gets lost sometimes.</Text>
            <Text style={s.desc}>
              Something went wrong in the lunar orbit. Don't worry, your secrets are safe. 
              Let's get you back to the feed.
            </Text>
            
            <TouchableOpacity style={s.btn} onPress={this.handleReload} activeOpacity={0.8}>
              <Text style={s.btnTxt}>Restart Loona</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
    justifyContent: 'center',
    alignItems: 'center'
  },
  glow: {
    position: 'absolute',
    top: '30%',
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: '#F97316',
    borderRadius: width * 0.4,
    opacity: 0.15,
    transform: [{ scale: 1.5 }],
  },
  content: { 
    padding: 32, 
    alignItems: 'center',
    zIndex: 1 
  },
  emoji: { 
    fontSize: 72, 
    marginBottom: 24,
    textShadowColor: 'rgba(249, 115, 22, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20
  },
  title: { 
    fontSize: 26, 
    fontFamily: 'Syne_700Bold', 
    color: '#FFF', 
    marginBottom: 16, 
    textAlign: 'center',
    lineHeight: 32
  },
  desc: { 
    fontSize: 15, 
    color: '#888', 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 40,
    paddingHorizontal: 20
  },
  btn: { 
    backgroundColor: '#F97316', 
    paddingHorizontal: 40, 
    paddingVertical: 18, 
    borderRadius: 30,
    shadowColor: '#F97316',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 }
  },
  btnTxt: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: '900',
    letterSpacing: 0.5
  },
});
