import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { favoritesApi } from '../api/favoritesApi';
import { AdPreview } from '../types';
import { AdCard } from '../components/ads/AdCard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<AdPreview[]>([]);

  useEffect(() => {
    favoritesApi
      .list()
      .then((res) => setItems(res.data.data?.items || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <AdCard ad={item} onPress={(ad) => navigation.navigate('AdDetails', { adId: ad._id })} />}
        ListEmptyComponent={<Text style={styles.empty}>Избранных объявлений пока нет</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608', padding: 16 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 20 }
});
