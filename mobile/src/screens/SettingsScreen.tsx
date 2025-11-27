import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const SettingsScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Настройки</Text>
    <Text style={styles.text}>Скоро здесь появятся настройки уведомлений и гео.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  text: { color: '#9ca3af' }
});
