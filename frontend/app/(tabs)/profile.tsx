/**
 * Profile Screen
 *
 * Displays user profile information including avatar placeholder (for tree),
 * username, email, total moments count, and a grid of recent moments.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getMoments, getImageUrl, getCurrentUser, Moment, User } from '@/services/api';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** Fetch user profile and moments data */
  const fetchData = useCallback(async () => {
    try {
      const [userData, momentsData] = await Promise.all([
        getCurrentUser(),
        getMoments('chronological'),
      ]);
      setUser(userData);
      setMoments(momentsData);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  /** Handle pull-to-refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  /** Navigate to settings screen */
  const handleSettings = () => {
    // TODO: Navigate to settings
    console.log('Settings pressed');
  };

  /** Navigate to moment detail */
  const handleMomentPress = (moment: Moment) => {
    router.push({
      pathname: '/moment/[id]',
      params: { id: moment.id.toString(), momentData: JSON.stringify(moment) },
    } as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable style={styles.settingsButton} onPress={handleSettings}>
          <MaterialIcons name="settings" size={24} color="#1f2937" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Placeholder (for tree illustration) */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              {/* Tree illustration will go here */}
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.user_name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Total Collection</Text>
            <View style={styles.statsValue}>
              <Text style={styles.statsNumber}>{moments.length}</Text>
              <Text style={styles.statsUnit}> Moments</Text>
            </View>
          </View>

          {/* Moments Grid */}
          {moments.length > 0 && (
            <View style={styles.momentsGrid}>
              {moments.slice(0, 6).map((moment) => (
                <Pressable
                  key={moment.id}
                  style={styles.momentItem}
                  onPress={() => handleMomentPress(moment)}
                >
                  <View style={styles.momentImageContainer}>
                    <Image
                      source={{ uri: getImageUrl(moment.image_path) }}
                      style={styles.momentImage}
                      contentFit="cover"
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f6f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f6f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  settingsButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  statsValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  statsUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9ca3af',
  },
  momentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  momentItem: {
    width: '48.5%',
  },
  momentImageContainer: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  momentImage: {
    width: '100%',
    height: '100%',
  },
});
