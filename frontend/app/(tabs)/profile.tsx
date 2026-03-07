/**
 * Profile Screen
 *
 * Shows user info + stats, then a horizontally swipeable pager:
 *   Page 0 — Calendar view (month calendar with dots on days that have moments)
 *   Page 1 — Albums grid (monthly cover images)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  getMoments, getImageUrl, getCurrentUser, clearTokens,
  updateUser, getAlbums, getCalendar, getTreeStatus,
  Moment, User, Album, CalendarDay, TreeStatus,
} from '@/services/api';

// ─── Tree images (stage 1–5 + dead=6) ───────────────────────────────────────
const TREE_IMAGES: Record<string, any> = {
  '1': require('@/assets/tress/1.jpeg'),
  '2': require('@/assets/tress/2.jpeg'),
  '3': require('@/assets/tress/3.jpeg'),
  '4': require('@/assets/tress/4.jpeg'),
  '5': require('@/assets/tress/5.jpeg'),
  '6': require('@/assets/tress/6.jpeg'),
  'dead': require('@/assets/tress/7.jpeg'),
};

// ─── Calendar helpers ────────────────────────────────────────────────────────
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // Profile data
  const [user, setUser] = useState<User | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  // Tree
  const [treeStatus, setTreeStatus] = useState<TreeStatus | null>(null);

  // Pager
  const pagerRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);

  // Calendar
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [markedDays, setMarkedDays] = useState<Set<number>>(new Set());
  const [calLoading, setCalLoading] = useState(false);

  // Settings dropdown
  const [menuVisible, setMenuVisible] = useState(false);
  const gearRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  // Edit profile modal
  const [editVisible, setEditVisible] = useState(false);
  const [editTab, setEditTab] = useState<'username' | 'password'>('username');
  const [editUserName, setEditUserName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Fetch profile data ─────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [userData, momentsData, albumsData, treeData] = await Promise.all([
        getCurrentUser(),
        getMoments('chronological'),
        getAlbums().catch(() => [] as Album[]),
        getTreeStatus().catch(() => null),
      ]);
      setUser(userData);
      setMoments(momentsData);
      setAlbums(albumsData);
      setTreeStatus(treeData);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch calendar ─────────────────────────────────────────────────────────
  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setCalLoading(true);
    try {
      const data: CalendarDay[] = await getCalendar(year, month);
      const days = new Set(data.map(d => new Date(d.created_at * 1000).getDate()));
      setMarkedDays(days);
    } catch {
      setMarkedDays(new Set());
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCalendar(calYear, calMonth); }, [calYear, calMonth, fetchCalendar]);
  useFocusEffect(useCallback(() => {
    fetchData();
    fetchCalendar(calYear, calMonth);
  }, [fetchData, fetchCalendar, calYear, calMonth]));

  // ── Month navigation ───────────────────────────────────────────────────────
  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // ── Settings / edit handlers ───────────────────────────────────────────────
  const handleGearPress = () => {
    gearRef.current?.measure((_x, _y, _w, h, _px, py) => {
      setMenuPosition({ top: py + h + 4, right: 16 });
      setMenuVisible(true);
    });
  };

  const handleEditProfile = () => {
    setMenuVisible(false);
    setEditTab('username');
    setEditUserName(user?.user_name || '');
    setCurrentPassword('');
    setNewPassword('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setEditVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTab === 'username') {
        if (!editUserName.trim()) { Alert.alert('Error', 'Please enter a username.'); return; }
        if (editUserName === user?.user_name) { setEditVisible(false); return; }
        setUser(await updateUser({ user_name: editUserName }));
      } else {
        if (!currentPassword || !newPassword) { Alert.alert('Error', 'Please fill in both password fields.'); return; }
        await updateUser({ current_password: currentPassword, new_password: newPassword });
      }
      setEditVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    await clearTokens();
    router.replace('/login');
  };

  // ── Pager scroll handler ───────────────────────────────────────────────────
  const handlePagerScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    setPageIndex(Math.round(x / screenWidth));
  };

  const goToPage = (index: number) => {
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    setPageIndex(index);
  };

  // ── Calendar cells ─────────────────────────────────────────────────────────
  const calCells = buildCalendarCells(calYear, calMonth);
  const cellSize = (screenWidth - 32) / 7;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.headerButtons}>
          <Pressable ref={gearRef as any} style={styles.iconButton} onPress={handleGearPress}>
            <MaterialIcons name="settings" size={24} color="#1f2937" />
          </Pressable>
        </View>
      </View>

      {/* ── Settings Dropdown ── */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <View style={[styles.menuCard, { top: menuPosition.top, right: menuPosition.right }]}>
              <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                <MaterialIcons name="edit" size={18} color="#1f2937" />
                <Text style={styles.menuItemText}>Edit Profile</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <MaterialIcons name="logout" size={18} color="#ef4444" />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={[styles.editContainer, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.editHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setEditVisible(false)}>
              <MaterialIcons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.editHeaderTitle}>LOGIT</Text>
          </View>
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, editTab === 'username' && styles.tabActive]} onPress={() => setEditTab('username')}>
              <Text style={[styles.tabText, editTab === 'username' && styles.tabTextActive]}>Username</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, editTab === 'password' && styles.tabActive]} onPress={() => setEditTab('password')}>
              <Text style={[styles.tabText, editTab === 'password' && styles.tabTextActive]}>Password</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.editScroll} contentContainerStyle={styles.editScrollContent} keyboardShouldPersistTaps="handled">
            {editTab === 'username' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>User Name</Text>
                <TextInput style={styles.input} value={editUserName} onChangeText={setEditUserName} placeholder="Enter username" placeholderTextColor="#94a3b8" autoCapitalize="none" autoFocus />
              </View>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Current Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput style={styles.inputWithIcon} value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" placeholderTextColor="#94a3b8" secureTextEntry={!showCurrentPw} autoFocus />
                    <TouchableOpacity style={styles.visibilityBtn} onPress={() => setShowCurrentPw(v => !v)}>
                      <MaterialIcons name={showCurrentPw ? 'visibility-off' : 'visibility'} size={22} color="#000" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput style={styles.inputWithIcon} value={newPassword} onChangeText={setNewPassword} placeholder="••••••••" placeholderTextColor="#94a3b8" secureTextEntry={!showNewPw} />
                    <TouchableOpacity style={styles.visibilityBtn} onPress={() => setShowNewPw(v => !v)}>
                      <MaterialIcons name={showNewPw ? 'visibility-off' : 'visibility'} size={22} color="#000" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Main Content ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <View style={styles.mainContent}>

          {/* Tree placeholder + user info + stats */}
          <View style={styles.profileTop}>
            <Image
              source={treeStatus ? TREE_IMAGES[String(treeStatus.stage)] : TREE_IMAGES['1']}
              style={styles.treePlaceholder}
              contentFit="contain"
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.user_name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsLabel}>Total Collection</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsNumber}>{moments.length}</Text>
                <Text style={styles.statsUnit}>Moments</Text>
              </View>
            </View>
          </View>

          {/* Calendar / Album tab switcher */}
          <View style={styles.viewTabs}>
            <TouchableOpacity style={styles.viewTab} onPress={() => goToPage(0)}>
              <Text style={[styles.viewTabText, pageIndex === 0 && styles.viewTabTextActive]}>Calendar</Text>
              {pageIndex === 0 && <View style={styles.viewTabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.viewTab} onPress={() => goToPage(1)}>
              <Text style={[styles.viewTabText, pageIndex === 1 && styles.viewTabTextActive]}>Album</Text>
              {pageIndex === 1 && <View style={styles.viewTabUnderline} />}
            </TouchableOpacity>
          </View>

          {/* Horizontal pager */}
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePagerScroll}
            style={styles.pager}
          >
            {/* ── Page 0: Calendar ── */}
            <View style={[styles.page, { width: screenWidth }]}>
              {/* Month nav */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <MaterialIcons name="chevron-left" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <MaterialIcons name="chevron-right" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((d, i) => (
                  <Text key={i} style={[styles.weekDay, { width: cellSize }]}>{d}</Text>
                ))}
              </View>

              {/* Day cells */}
              {calLoading ? (
                <ActivityIndicator style={{ marginTop: 32 }} color="#000" />
              ) : (
                <View style={styles.calGrid}>
                  {calCells.map((day, i) => {
                    const isToday = day === today.getDate() && calMonth === today.getMonth() + 1 && calYear === today.getFullYear();
                    const hasM = day !== null && markedDays.has(day);
                    const isPast = day !== null && !isToday && (
                      calYear < today.getFullYear() ||
                      (calYear === today.getFullYear() && calMonth < today.getMonth() + 1) ||
                      (calYear === today.getFullYear() && calMonth === today.getMonth() + 1 && day < today.getDate())
                    );
                    return (
                      <View key={i} style={[styles.calCell, { width: cellSize, height: cellSize }]}>
                        {day !== null && (
                          <View style={[
                            styles.dayBg,
                            hasM && !isToday && styles.dayBgHasM,
                            isToday && styles.dayBgToday,
                          ]}>
                            <Text style={[
                              styles.dayNum,
                              isPast && !hasM && styles.dayNumPast,
                              hasM && !isToday && styles.dayNumHasM,
                              isToday && styles.dayNumToday,
                            ]}>{day}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── Page 1: Albums ── */}
            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={styles.albumsPage}
              showsVerticalScrollIndicator={false}
            >
              {albums.length === 0 ? (
                <Text style={styles.emptyText}>No albums yet</Text>
              ) : (
                <View style={styles.albumGrid}>
                  {albums.map((album) => {
                    const monthName = new Date(album.year, album.month - 1)
                      .toLocaleString('en', { month: 'long' });
                    return (
                      <Pressable
                        key={`${album.year}-${album.month}`}
                        style={styles.albumCell}
                        onPress={() => router.push({
                          pathname: '/album/[yearMonth]',
                          params: { yearMonth: `${album.year}-${album.month}` },
                        } as any)}
                      >
                        <View style={styles.albumImageBox}>
                          <Image source={{ uri: getImageUrl(album.cover_image) }} style={styles.albumImage} contentFit="cover" />
                          <View style={styles.albumOverlay}>
                            <Text style={styles.albumCount}>{album.count}</Text>
                          </View>
                        </View>
                        <Text style={styles.albumMonth}>{monthName.toUpperCase()}</Text>
                        <Text style={styles.albumYear}>{album.year}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f6f6' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8f6f6',
  },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  headerButtons: { position: 'absolute', right: 16, flexDirection: 'row', gap: 4 },
  iconButton: { padding: 8, borderRadius: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Dropdown
  menuOverlay: { flex: 1 },
  menuCard: {
    position: 'absolute', backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 4, minWidth: 160,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  menuItemDanger: { color: '#ef4444' },
  menuDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 8 },

  // Edit profile modal
  editContainer: { flex: 1, backgroundColor: '#fff' },
  editHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  editHeaderTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 4, color: '#000' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#000' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5 },
  tabTextActive: { color: '#000' },
  editScroll: { flex: 1 },
  editScrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#000', borderRadius: 0, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#000', backgroundColor: '#fff' },
  inputWrapper: { position: 'relative' },
  inputWithIcon: { borderWidth: 1, borderColor: '#000', borderRadius: 0, paddingHorizontal: 16, paddingVertical: 14, paddingRight: 52, fontSize: 15, color: '#000', backgroundColor: '#fff' },
  visibilityBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  saveButton: { backgroundColor: '#000', paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' },

  // Main layout
  mainContent: { flex: 1 },

  // Profile top section
  profileTop: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16 },
  treePlaceholder: {
    width: 160, height: 160,
    borderRadius: 16,
    marginBottom: 14,
  },
  userInfo: { alignItems: 'center', marginBottom: 10 },
  userName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, textTransform: 'uppercase', color: '#1f2937' },
  userEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statsCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  statsLabel: { fontSize: 10, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statsNumber: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  statsUnit: { fontSize: 13, fontWeight: '500', color: '#9ca3af' },

  // View tab switcher
  viewTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  viewTab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  viewTabText: {
    fontSize: 12, fontWeight: '600', letterSpacing: 2,
    textTransform: 'uppercase', color: '#9ca3af',
  },
  viewTabTextActive: { color: '#1f2937' },
  viewTabUnderline: { position: 'absolute', bottom: 0, height: 2, width: '50%', backgroundColor: '#1f2937' },

  // Pager
  pager: { flex: 1 },
  page: { paddingHorizontal: 16, paddingTop: 4 },

  // Calendar
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', letterSpacing: 0.3 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { alignItems: 'center', justifyContent: 'center' },
  dayBg: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayBgHasM: { backgroundColor: '#1f2937' },
  dayBgToday: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#1f2937' },
  dayNum: { fontSize: 14, color: '#d1d5db', fontWeight: '400' },
  dayNumPast: { color: '#6b7280', fontWeight: '500' },
  dayNumHasM: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: '#1f2937', fontWeight: '700' },

  // Albums
  albumsPage: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  albumCell: { width: '48.5%' },
  albumImageBox: { aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  albumImage: { width: '100%', height: '100%' },
  albumOverlay: { position: 'absolute', bottom: 8, right: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  albumCount: { fontSize: 12, fontWeight: '700', color: '#fff' },
  albumMonth: { fontSize: 13, fontWeight: '700', color: '#1f2937', letterSpacing: 0.5, marginTop: 6 },
  albumYear: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
});
