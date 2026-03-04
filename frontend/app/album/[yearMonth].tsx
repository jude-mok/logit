/**
 * Album Detail Screen
 *
 * Pinterest-style masonry grid showing all moments for a given month.
 * Supports multi-select and bulk delete.
 */

import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getAlbumMoments, getImageUrl, deleteMoment, Moment } from '@/services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ASPECT_RATIOS = [3 / 4, 1 / 1, 4 / 3, 3 / 4, 1 / 1];

export default function AlbumDetailScreen() {
  const { yearMonth } = useLocalSearchParams<{ yearMonth: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [year, month] = yearMonth?.split('-').map(Number) ?? [0, 0];
  const monthName = MONTH_NAMES[month - 1] ?? '';
  const columnWidth = (screenWidth - 32 - 8) / 2;

  useEffect(() => {
    if (!year || !month) return;
    getAlbumMoments(year, month)
      .then(setMoments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  // Split into two columns
  const leftCol = moments.filter((_, i) => i % 2 === 0);
  const rightCol = moments.filter((_, i) => i % 2 === 1);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === moments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(moments.map(m => m.id)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete Moments',
      `Delete ${selectedIds.size} moment${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await Promise.all([...selectedIds].map(id => deleteMoment(id)));
              setMoments(prev => prev.filter(m => !selectedIds.has(m.id)));
              setSelectedIds(new Set());
              setSelectMode(false);
            } catch {
              Alert.alert('Error', 'Failed to delete some moments.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleImagePress = (moment: Moment) => {
    if (selectMode) {
      toggleSelect(moment.id);
    } else {
      router.push({
        pathname: '/moment/[id]',
        params: { id: moment.id.toString(), momentData: JSON.stringify(moment) },
      } as any);
    }
  };

  const allSelected = selectedIds.size === moments.length && moments.length > 0;

  const renderImage = (moment: Moment, colIndex: number, isRight: boolean) => {
    const globalIndex = isRight ? colIndex * 2 + 1 : colIndex * 2;
    const ratio = ASPECT_RATIOS[globalIndex % ASPECT_RATIOS.length];
    const selected = selectedIds.has(moment.id);

    return (
      <Pressable
        key={moment.id}
        style={[styles.imageWrapper, { height: columnWidth / ratio }]}
        onPress={() => handleImagePress(moment)}
        onLongPress={() => { if (!selectMode) setSelectMode(true); toggleSelect(moment.id); }}
      >
        <Image
          source={{ uri: getImageUrl(moment.image_path) }}
          style={styles.image}
          contentFit="cover"
        />
        {/* Dim overlay when selected */}
        {selectMode && selected && <View style={styles.selectedOverlay} />}

        {/* Checkbox */}
        {selectMode && (
          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
            {selected && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        {selectMode ? (
          <>
            <Pressable style={styles.headerSide} onPress={exitSelectMode}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>
              {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Select'}
            </Text>
            <Pressable style={[styles.headerSide, styles.headerSideRight]} onPress={handleDelete} disabled={selectedIds.size === 0 || deleting}>
              {deleting
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <MaterialIcons name="delete" size={22} color={selectedIds.size > 0 ? '#ef4444' : '#d1d5db'} />
              }
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.headerBtn} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{monthName.toUpperCase()}</Text>
              <Text style={styles.headerSub}>{moments.length} Moments</Text>
            </View>
            <Pressable style={styles.headerBtn} onPress={() => setSelectMode(true)} disabled={moments.length === 0}>
              <MaterialIcons name="checklist" size={24} color={moments.length > 0 ? '#1f2937' : '#d1d5db'} />
            </Pressable>
          </>
        )}
      </View>

      {/* Select all bar */}
      {selectMode && (
        <Pressable style={styles.selectAllBar} onPress={handleSelectAll}>
          <Text style={styles.selectAllText}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
          <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
            {allSelected && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
        </Pressable>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : moments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No moments this month</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            <View style={[styles.column, { width: columnWidth }]}>
              {leftCol.map((moment, i) => renderImage(moment, i, false))}
            </View>
            <View style={[styles.column, { width: columnWidth, marginTop: 24 }]}>
              {rightCol.map((moment, i) => renderImage(moment, i, true))}
            </View>
          </View>

          <View style={styles.endIndicator}>
            <View style={styles.endDot} />
            <View style={[styles.endDot, { opacity: 0.5 }]} />
            <View style={[styles.endDot, { opacity: 0.25 }]} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f6f6' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#f8f6f6',
  },
  headerBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 22,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  headerSub: {
    fontSize: 10, fontWeight: '500',
    color: '#9ca3af', textTransform: 'uppercase', marginTop: 1,
  },
  headerBtnWide: {
    minWidth: 64, height: 44,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cancelText: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  headerSide: { flex: 1, height: 44, justifyContent: 'center' },
  headerSideRight: { alignItems: 'flex-end' },

  // Select all bar
  selectAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectAllText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },

  // Checkbox
  checkbox: {
    position: 'absolute',
    top: 8, right: 8,
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1f2937',
    borderColor: '#1f2937',
  },

  // Grid
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
  grid: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  column: { gap: 8 },
  imageWrapper: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  image: { width: '100%', height: '100%' },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
  },

  // End indicator
  endIndicator: { alignItems: 'center', gap: 4, marginTop: 40, marginBottom: 8 },
  endDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' },
});
