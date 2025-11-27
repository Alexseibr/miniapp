import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AdPreview } from '../../types';

interface Props {
  ad: AdPreview;
  onPress?: (ad: AdPreview) => void;
}

export const AdCard: React.FC<Props> = ({ ad, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(ad)}>
      {ad.photos?.[0] ? <Image source={{ uri: ad.photos[0] }} style={styles.image} /> : <View style={styles.placeholder} />}
      <View style={styles.info}>
        <Text style={styles.title}>{ad.title}</Text>
        <Text style={styles.price}>{ad.price ? `${ad.price} ${ad.currency ?? '₽'}` : 'Цена не указана'}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {ad.city || 'Город не указан'} {ad.distanceKm ? `• ${ad.distanceKm.toFixed(1)} км от вас` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#0f1217',
    borderRadius: 12,
    marginBottom: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  info: {
    flex: 1,
    justifyContent: 'space-between'
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  price: {
    color: '#00f5d4',
    fontSize: 15,
    marginTop: 4
  },
  meta: {
    color: '#9ca3af',
    marginTop: 4
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#111827'
  },
  placeholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#1f2937'
  }
});
