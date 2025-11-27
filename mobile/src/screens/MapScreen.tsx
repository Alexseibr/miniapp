import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Карта (заглушка)</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#e5e7eb' },
});

export default MapScreen;
