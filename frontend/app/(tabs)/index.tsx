/**
 * Archive Screen (Home)
 *
 * Main screen displaying user's moments in a masonry grid layout.
 * Supports filtering by random, chronological, or starred moments.
 * Shows inspirational quotes at the bottom of the feed.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MomentCard } from '@/components/moment-card';
import { getMoments, getQuotesBatch, Moment, Quote, OrderType } from '@/services/api';

type FilterType = 'random' | 'chronological' | 'starred';

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [filter, setFilter] = useState<FilterType>('random');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const quote = quotes[quoteIndex] || null;

  /** Fetch moments from API with specified ordering */
  const fetchMoments = useCallback(async (order: OrderType) => {
    try {
      const data = await getMoments(order);
      setMoments(data);
    } catch (error) {
      console.error('Failed to fetch moments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** Pre-fetch quotes batch for cycling through on filter changes */
  const fetchQuotes = useCallback(async () => {
    try {
      const data = await getQuotesBatch(20);
      setQuotes(data);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    }
  }, []);

  // Load quotes on initial mount
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Fetch moments when filter changes and cycle to next quote
  useEffect(() => {
    fetchMoments(filter);
    setQuoteIndex((prev) => (prev + 1) % Math.max(quotes.length, 1));
  }, [filter, fetchMoments, quotes.length]);

  // Refresh moments when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMoments(filter);
    }, [filter, fetchMoments])
  );

  /** Handle pull-to-refresh action */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMoments(filter);
    fetchQuotes();
  }, [filter, fetchMoments, fetchQuotes]);

  /** Update filter and trigger data reload */
  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter !== filter) {
      setLoading(true);
      setFilter(newFilter);
    }
  };

  /** Navigate to moment detail screen */
  const handleMomentPress = (moment: Moment) => {
    router.push({
      pathname: '/moment/[id]',
      params: { id: moment.id.toString(), momentData: JSON.stringify(moment) },
    } as any);
  };

  // Split moments into two columns for masonry layout
  const leftColumnMoments = moments.filter((_, index) => index % 2 === 0);
  const rightColumnMoments = moments.filter((_, index) => index % 2 === 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>LOGIT</Text>
      </View>

      <View style={styles.filterContainer}>
        <Pressable
          style={styles.filterButton}
          onPress={() => handleFilterChange('random')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'random' && styles.filterTextActive,
            ]}
          >
            RANDOM
          </Text>
          {filter === 'random' && <View style={styles.filterUnderline} />}
        </Pressable>

        <Pressable
          style={styles.filterButton}
          onPress={() => handleFilterChange('chronological')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'chronological' && styles.filterTextActive,
            ]}
          >
            CHRONOLOGICAL
          </Text>
          {filter === 'chronological' && <View style={styles.filterUnderline} />}
        </Pressable>

        <Pressable
          style={styles.filterButton}
          onPress={() => handleFilterChange('starred')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'starred' && styles.filterTextActive,
            ]}
          >
            STARRED
          </Text>
          {filter === 'starred' && <View style={styles.filterUnderline} />}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {moments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No moments yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to capture your first moment
              </Text>
            </View>
          ) : (
            <View style={styles.masonryGrid}>
              <View style={styles.column}>
                {leftColumnMoments.map((moment) => (
                  <MomentCard
                    key={moment.id}
                    moment={moment}
                    onPress={() => handleMomentPress(moment)}
                  />
                ))}
              </View>
              <View style={styles.column}>
                {rightColumnMoments.map((moment) => (
                  <MomentCard
                    key={moment.id}
                    moment={moment}
                    onPress={() => handleMomentPress(moment)}
                  />
                ))}
              </View>
            </View>
          )}

          {quote && (
            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>"{quote.text}"</Text>
              {quote.author && (
                <Text style={styles.quoteAuthor}>— {quote.author}</Text>
              )}
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
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -1,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fafafa',
  },
  filterButton: {
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#9ca3af',
  },
  filterTextActive: {
    fontWeight: '700',
    color: '#000',
  },
  filterUnderline: {
    marginTop: 4,
    width: '100%',
    height: 2,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  masonryGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  column: {
    flex: 1,
  },
  quoteCard: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
  },
  quoteMark: {
    display: 'none',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
});
