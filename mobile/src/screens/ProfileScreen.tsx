import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { User } from '../types';
import { openTelegramBot } from '../services/telegramService';

export const ProfileScreen: React.FC = () => {
  const { user, logout, fetchMe } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);

  useEffect(() => {
    fetchMe().then((data) => setProfile(data));
  }, [fetchMe]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Профиль</Text>
      <Text style={styles.label}>Имя</Text>
      <Text style={styles.value}>{profile?.name || '—'}</Text>
      <Text style={styles.label}>Телефон</Text>
      <Text style={styles.value}>{profile?.phone || '—'}</Text>
      <Text style={styles.label}>Роль</Text>
      <Text style={styles.value}>{profile?.role || 'user'}</Text>

      <TouchableOpacity style={styles.button} onPress={openTelegramBot}>
        <Text style={styles.buttonText}>Открыть в Telegram</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => logout()}>
        <Text style={styles.buttonText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { color: '#6b7280', marginTop: 8 },
  value: { color: '#fff', fontSize: 16 },
  button: {
    backgroundColor: '#00f5d4',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16
  },
  secondary: {
    backgroundColor: '#111827'
  },
  buttonText: { color: '#050608', fontWeight: '700' }
});
