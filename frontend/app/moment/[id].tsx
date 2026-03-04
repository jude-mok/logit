/**
 * Moment Detail Screen
 *
 * Displays full details of a single moment including image,
 * caption, and creation date. Allows users to star/unstar
 * the moment or permanently delete it.
 */

import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Moment, getImageUrl, toggleStar, deleteMoment } from '@/services/api';

export default function MomentDetailScreen() {
  const { id, momentData } = useLocalSearchParams<{ id: string; momentData?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moment, setMoment] = useState<Moment | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageAspectRatio, setImageAspectRatio] = useState(3 / 4);

  // Parse moment data passed from previous screen
  useEffect(() => {
    if (momentData) {
      try {
        const parsed = JSON.parse(momentData);
        setMoment(parsed);
        setLoading(false);
      } catch (e) {
        console.error('Failed to parse moment data:', e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [momentData]);

  /** Navigate back to previous screen */
  const handleBack = () => {
    router.back();
  };

  /** Toggle starred status and update local state */
  const handleToggleStar = async () => {
    if (!moment) return;
    try {
      const updated = await toggleStar(moment.id);
      setMoment(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to update star status');
    }
  };

  /** Show confirmation dialog and delete moment if confirmed */
  const handleDelete = () => {
    Alert.alert(
      'Delete Moment',
      'Are you sure you want to delete this moment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!moment) return;
            try {
              await deleteMoment(moment.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete moment');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Error state
  if (!moment) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Moment not found</Text>
      </View>
    );
  }

  // Format timestamp to readable date
  const date = new Date(moment.created_at * 1000);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: getImageUrl(moment.image_path) }}
            style={[styles.image, { aspectRatio: imageAspectRatio }]}
            contentFit="cover"
            onLoad={(e) => {
              const { width, height } = e.source;
              if (width && height) {
                setImageAspectRatio(width / height);
              }
            }}
          />
        </View>

        <View style={styles.metaContainer}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Date Captured</Text>
            <View style={styles.dateRow}>
              <MaterialIcons name="calendar-today" size={18} color="#9ca3af" />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
          <Pressable
            style={[styles.starButton, moment.is_starred && styles.starButtonActive]}
            onPress={handleToggleStar}
          >
            <MaterialIcons
              name={moment.is_starred ? 'star' : 'star-border'}
              size={24}
              color={moment.is_starred ? '#f59e0b' : '#000'}
            />
          </Pressable>
        </View>

        {moment.comment && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{moment.comment}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 16 }]}>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
          <Text style={styles.deleteText}>Delete Moment</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageWrapper: {
    padding: 16,
  },
  image: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  dateContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  starButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButtonActive: {
    backgroundColor: '#fef3c7',
  },
  descriptionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  deleteText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600',
  },
});
