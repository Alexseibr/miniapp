import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';

interface Props {
  label?: string;
  value: string;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  onChangeText: (text: string) => void;
}

export const TextField: React.FC<Props> = ({ label, value, placeholder, keyboardType = 'default', onChangeText }) => (
  <View style={styles.container}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      style={styles.input}
      value={value}
      placeholder={placeholder}
      placeholderTextColor="#6b7280"
      keyboardType={keyboardType}
      onChangeText={onChangeText}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  },
  label: {
    color: '#d1d5db',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f1217',
    padding: 12,
    borderRadius: 10,
    color: '#fff'
  }
});
