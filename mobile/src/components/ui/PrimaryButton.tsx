import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const PrimaryButton: React.FC<Props> = ({ title, onPress, disabled, loading }) => (
  <TouchableOpacity
    style={[styles.button, disabled ? styles.disabled : undefined]}
    onPress={onPress}
    disabled={disabled || loading}
  >
    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.text}>{title}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#00f5d4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8
  },
  text: {
    fontWeight: '700',
    color: '#050608',
    fontSize: 16
  },
  disabled: {
    opacity: 0.5
  }
});
