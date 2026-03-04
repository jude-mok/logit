import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const handlePress = (routeName: string, isFocused: boolean) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (routeName === 'add') {
      // Handle add button press - navigate to add modal
      navigation.navigate('modal');
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 16 }]}>
      {/* Archive Tab */}
      <Pressable
        style={styles.tabButton}
        onPress={() => handlePress('index', state.index === 0)}
      >
        <MaterialIcons
          name="inventory-2"
          size={24}
          color={state.index === 0 ? '#000' : '#9ca3af'}
        />
        <Text
          style={[
            styles.tabLabel,
            state.index === 0 ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Archive
        </Text>
      </Pressable>

      {/* Add Button */}
      <Pressable
        style={styles.addButton}
        onPress={() => handlePress('add', false)}
      >
        <View style={styles.addButtonInner}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </View>
      </Pressable>

      {/* Profile Tab */}
      <Pressable
        style={styles.tabButton}
        onPress={() => handlePress('profile', state.index === 1)}
      >
        <MaterialIcons
          name="person"
          size={24}
          color={state.index === 1 ? '#000' : '#9ca3af'}
        />
        <Text
          style={[
            styles.tabLabel,
            state.index === 1 ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Profile
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#000',
  },
  tabLabelInactive: {
    color: '#9ca3af',
  },
  addButton: {
    flex: 1,
    alignItems: 'center',
    marginTop: -32,
  },
  addButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
