import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { Image as RNImage, StyleSheet, View, Text, Pressable } from 'react-native';
import { Moment, getImageUrl } from '@/services/api';

interface MomentCardProps {
  moment: Moment;
  onPress?: () => void;
}

export function MomentCard({ moment, onPress }: MomentCardProps) {
  const [aspectRatio, setAspectRatio] = useState(1);
  const imageUri = getImageUrl(moment.image_path);

  const date = new Date(moment.created_at * 1000);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  useEffect(() => {
    RNImage.getSize(
      imageUri,
      (width, height) => {
        setAspectRatio(width / height);
      },
      (error) => {
        console.log('Failed to get image size:', error);
        setAspectRatio(3 / 4); // fallback
      }
    );
  }, [imageUri]);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { aspectRatio }]}
          contentFit="cover"
          transition={300}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  image: {
    width: '100%',
  },
  textContainer: {
    paddingHorizontal: 2,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: 'center',
  },
  date: {
    fontSize: 9,
    color: '#9ca3af',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
