import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, SafeAreaView } from 'react-native';

interface Props {
  iosUrl: string;
  androidUrl: string;
  message?: string;
}

/**
 * UpdateRequiredScreen
 * Modal-like screen that prevents users from using an outdated app version.
 */
export default function UpdateRequiredScreen({ iosUrl, androidUrl, message }: Props) {
  const handleUpdate = () => {
    const url = Platform.OS === 'ios' ? iosUrl : androidUrl;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.emoji}>🚀</Text>
        <Text style={s.title}>Time for an Upgrade!</Text>
        <Text style={s.desc}>
          {message || "We've added new features and fixed some space bugs. Update now to keep using Loona!"}
        </Text>
        
        <TouchableOpacity style={s.btn} onPress={handleUpdate}>
          <Text style={s.btnTxt}>Update Now</Text>
        </TouchableOpacity>
        
        <Text style={s.footer}>Loona Version 1.0.0 (Production)</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  content: { padding: 40, alignItems: 'center' },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 16, color: '#AAA', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  btn: { backgroundColor: '#4D3DBF', paddingHorizontal: 40, paddingVertical: 18, borderRadius: 20, width: '100%', alignItems: 'center' },
  btnTxt: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  footer: { position: 'absolute', bottom: 40, color: '#444', fontSize: 12 }
});
