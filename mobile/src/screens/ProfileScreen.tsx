import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

const ProfileScreen = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Профиль</Text>
      {user ? (
        <>
          <Text style={styles.text}>Телефон: {user.phone}</Text>
          <Text style={styles.text}>Роль: {user.role}</Text>
        </>
      ) : (
        <Text style={styles.text}>Нет данных пользователя</Text>
      )}
      <Button title="Выйти" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 24 },
  title: { fontSize: 22, fontWeight: '600', color: '#e5e7eb', marginBottom: 16 },
  text: { color: '#e5e7eb', marginBottom: 4 },
});

export default ProfileScreen;
