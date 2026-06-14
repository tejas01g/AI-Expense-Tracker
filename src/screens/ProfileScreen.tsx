import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowType = 'navigate' | 'toggle' | 'value';

interface SettingsItem {
  id: string;
  icon: string;
  label: string;
  type: RowType;
  value?: string;
  toggleValue?: boolean;
}

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  items: SettingsItem[];
}

interface UserPreferences {
  darkMode?: boolean;
  notifications?: boolean;
  currency?: string;
  language?: string;
}

interface UserProfileDoc {
  name?: string;
  email?: string;
  photoURL?: string;
  isPremium?: boolean;
  preferences?: UserPreferences;
}

interface ProfileScreenProps {
  appVersion?: string;
  onEditProfile?: () => void;
  onItemPress?: (sectionId: string, itemId: string) => void;
  onUpgradePress?: () => void;
  /** Called after Firebase sign-out succeeds, e.g. to reset navigation to the auth stack */
  onLoggedOut?: () => void;
}

// ---------------------------------------------------------------------------
// Theme / constants
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#F5F4F1',
  card: '#FFFFFF',
  border: '#E8E6E0',
  textPrimary: '#1A1A18',
  textSecondary: '#6F6E69',

  heroBgStart: '#26215C',
  heroBgEnd: '#534AB7',
  heroAccentText: '#CECBF6',

  iconBg: '#EEEDFE',
  iconColor: '#534AB7',

  premiumBgStart: '#534AB7',
  premiumBgEnd: '#26215C',
  premiumAccent: '#FAEEDA',
  premiumIcon: '#F4C463',

  danger: '#C8432A',
};

const SAFE_AREA_EDGES: Edge[] = ['top', 'left', 'right'];
const USERS_COLLECTION = 'users';

// Stable empty-object reference so consumers depending on `preferences`
// don't re-fire effects every render when there are no saved prefs yet.
const EMPTY_PREFS: UserPreferences = {};

// ---------------------------------------------------------------------------
// Section blueprint (toggleValue / value get filled in from Firestore prefs)
// ---------------------------------------------------------------------------

const buildSections = (prefs: UserPreferences): SettingsSection[] => [
  {
    id: 'account',
    title: 'Account',
    icon: 'user',
    items: [
      { id: 'personalInfo', icon: 'user', label: 'Personal Information', type: 'navigate' },
      { id: 'email', icon: 'mail', label: 'Email Address', type: 'navigate' },
      { id: 'phone', icon: 'phone', label: 'Phone Number', type: 'navigate' },
      { id: 'password', icon: 'lock', label: 'Change Password', type: 'navigate' },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    icon: 'sliders',
    items: [
      { id: 'darkMode', icon: 'moon', label: 'Dark Mode', type: 'toggle', toggleValue: prefs.darkMode ?? false },
      { id: 'currency', icon: 'credit-card', label: 'Currency', type: 'value', value: prefs.currency ?? 'INR ₹' },
      { id: 'language', icon: 'globe', label: 'Language', type: 'value', value: prefs.language ?? 'English' },
      { id: 'notifications', icon: 'bell', label: 'Notifications', type: 'toggle', toggleValue: prefs.notifications ?? true },
    ],
  },
  {
    id: 'dataSecurity',
    title: 'Data & Security',
    icon: 'shield',
    items: [
      { id: 'backup', icon: 'cloud', label: 'Backup & Sync', type: 'navigate' },
      { id: 'export', icon: 'download', label: 'Export Data', type: 'navigate' },
      { id: 'privacy', icon: 'shield', label: 'Privacy & Security', type: 'navigate' },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    icon: 'life-buoy',
    items: [
      { id: 'help', icon: 'help-circle', label: 'Help Center', type: 'navigate' },
      { id: 'contact', icon: 'message-square', label: 'Contact Support', type: 'navigate' },
      { id: 'rate', icon: 'star', label: 'Rate App', type: 'navigate' },
    ],
  },
];

// ---------------------------------------------------------------------------
// useUserProfile - live Firestore profile bound to the signed-in user
// ---------------------------------------------------------------------------

interface UseUserProfileResult {
  uid: string | null;
  name: string;
  email: string;
  avatarUri: string | undefined;
  isPremium: boolean;
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
}

const useUserProfile = (): UseUserProfileResult => {
  const currentUser = auth().currentUser;
  const [doc, setDoc] = useState<UserProfileDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(!!currentUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection(USERS_COLLECTION)
      .doc(currentUser.uid)
      .onSnapshot(
        snapshot => {
          setDoc((snapshot.data() as UserProfileDoc | undefined) ?? null);
          setLoading(false);
        },
        err => {
          setError(err.message);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, [currentUser]);

  // IMPORTANT: return a stable reference (EMPTY_PREFS) when there's no
  // preferences object yet, instead of a brand-new `{}` on every render.
  // Returning a fresh object literal here previously caused the consuming
  // `useEffect([preferences])` to fire on every render -> setState ->
  // re-render -> new {} -> effect again -> "Maximum update depth exceeded".
  const preferences = doc?.preferences ?? EMPTY_PREFS;

  return {
    uid: currentUser?.uid ?? null,
    name: doc?.name ?? currentUser?.displayName ?? 'User',
    email: doc?.email ?? currentUser?.email ?? '',
    avatarUri: doc?.photoURL ?? currentUser?.photoURL ?? undefined,
    isPremium: doc?.isPremium ?? false,
    preferences,
    loading,
    error,
  };
};

// ---------------------------------------------------------------------------
// Profile header
// ---------------------------------------------------------------------------

interface ProfileHeaderProps {
  name: string;
  email: string;
  avatarUri?: string;
  isPremium: boolean;
  onEditProfile?: () => void;
}

const ProfileHeader = memo(
  ({ name, email, avatarUri, isPremium, onEditProfile }: ProfileHeaderProps) => (
    <LinearGradient
      colors={[COLORS.heroBgStart, COLORS.heroBgEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <View style={styles.avatarWrapper}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Icon name="user" size={32} color="#FFFFFF" />
          </View>
        )}
        {isPremium && (
          <View style={styles.crownBadge}>
            <Icon name="award" size={14} color="#26215C" />
          </View>
        )}
      </View>

      <Text style={styles.userName}>{name}</Text>
      <Text style={styles.userEmail}>{email}</Text>

      <TouchableOpacity
        style={styles.editButton}
        activeOpacity={0.85}
        onPress={onEditProfile}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
      >
        <Icon name="edit-2" size={14} color="#FFFFFF" />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </LinearGradient>
  ),
);
ProfileHeader.displayName = 'ProfileHeader';

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

const SectionHeader = memo(({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
));
SectionHeader.displayName = 'SectionHeader';

// ---------------------------------------------------------------------------
// Settings row
// ---------------------------------------------------------------------------

interface SettingsRowProps {
  item: SettingsItem;
  isLast: boolean;
  onPress: () => void;
  onToggle: (value: boolean) => void;
}

const SettingsRow = memo(({ item, isLast, onPress, onToggle }: SettingsRowProps) => {
  const isInteractive = item.type !== 'toggle';

  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowDivider]}
      activeOpacity={isInteractive ? 0.6 : 1}
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityRole={isInteractive ? 'button' : undefined}
    >
      <View style={styles.rowIconBadge}>
        <Icon name={item.icon} size={16} color={COLORS.iconColor} />
      </View>
      <Text style={styles.rowLabel}>{item.label}</Text>

      {item.type === 'navigate' && (
        <Icon name="chevron-right" size={18} color={COLORS.textSecondary} />
      )}

      {item.type === 'value' && (
        <View style={styles.rowValueWrapper}>
          <Text style={styles.rowValue}>{item.value}</Text>
          <Icon name="chevron-right" size={18} color={COLORS.textSecondary} />
        </View>
      )}

      {item.type === 'toggle' && (
        <Switch
          value={item.toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.border, true: COLORS.iconColor }}
          thumbColor="#FFFFFF"
        />
      )}
    </TouchableOpacity>
  );
});
SettingsRow.displayName = 'SettingsRow';

// ---------------------------------------------------------------------------
// Premium upgrade card
// ---------------------------------------------------------------------------

const PremiumCard = memo(({ onPress }: { onPress?: () => void }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} accessibilityRole="button">
    <LinearGradient
      colors={[COLORS.premiumBgStart, COLORS.premiumBgEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.premiumCard}
    >
      <View style={styles.premiumIconBadge}>
        <Icon name="star" size={18} color={COLORS.premiumIcon} />
      </View>
      <View style={styles.premiumTextWrapper}>
        <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
        <Text style={styles.premiumSubtitle}>AI Insights &amp; Smart Reports</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#FFFFFF" />
    </LinearGradient>
  </TouchableOpacity>
));
PremiumCard.displayName = 'PremiumCard';

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  appVersion = '1.0.0',
  onEditProfile,
  onItemPress,
  onUpgradePress,
  onLoggedOut,
}) => {
  const {
    uid,
    name,
    email,
    avatarUri,
    isPremium,
    preferences,
    loading,
    error,
  } = useUserProfile();

  // Derive sections directly from preferences via useMemo instead of
  // mirroring them into local state with an effect. This removes the
  // setState-in-useEffect pattern entirely, so there's nothing to loop.
  const sections = useMemo(() => buildSections(preferences), [preferences]);

  // Track optimistic toggle overrides separately (small, focused state)
  // so we don't need to clone/rebuild the whole sections tree on every toggle.
  const [toggleOverrides, setToggleOverrides] = useState<Record<string, boolean>>({});
  const [signingOut, setSigningOut] = useState(false);

  // Clear local overrides whenever fresh preferences arrive from Firestore,
  // since `sections` will already reflect the latest server values.
  useEffect(() => {
    setToggleOverrides({});
  }, [preferences]);

  const resolvedSections = useMemo(() => {
    if (Object.keys(toggleOverrides).length === 0) return sections;
    return sections.map(section => ({
      ...section,
      items: section.items.map(item =>
        item.type === 'toggle' && item.id in toggleOverrides
          ? { ...item, toggleValue: toggleOverrides[item.id] }
          : item,
      ),
    }));
  }, [sections, toggleOverrides]);

  const handleToggle = useCallback(
    (_sectionId: string, itemId: string, value: boolean) => {
      // Optimistic local update for instant feedback.
      setToggleOverrides(prev => ({ ...prev, [itemId]: value }));

      if (!uid) return;

      firestore()
        .collection(USERS_COLLECTION)
        .doc(uid)
        .set({ preferences: { [itemId]: value } }, { merge: true })
        .catch(() => {
          // Revert on failure.
          setToggleOverrides(prev => ({ ...prev, [itemId]: !value }));
          Alert.alert('Error', 'Could not save your preference. Please try again.');
        });
    },
    [uid],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await auth().signOut();
            onLoggedOut?.();
          } catch {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [onLoggedOut]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]} edges={SAFE_AREA_EDGES}>
        <ActivityIndicator size="large" color={COLORS.iconColor} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]} edges={SAFE_AREA_EDGES}>
        <Icon name="alert-circle" size={28} color={COLORS.danger} />
        <Text style={styles.errorText}>Couldn&apos;t load your profile.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={SAFE_AREA_EDGES}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={name}
          email={email}
          avatarUri={avatarUri}
          isPremium={isPremium}
          onEditProfile={onEditProfile}
        />

        {resolvedSections.map(section => (
          <View key={section.id} style={styles.sectionWrapper}>
            <SectionHeader title={section.title} />
            <View style={styles.card}>
              {section.items.map((item, index) => (
                <SettingsRow
                  key={item.id}
                  item={item}
                  isLast={index === section.items.length - 1}
                  onPress={() => onItemPress?.(section.id, item.id)}
                  onToggle={value => handleToggle(section.id, item.id, value)}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.sectionWrapper}>
          <SectionHeader title="Premium" />
          <PremiumCard onPress={onUpgradePress} />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.7}
          onPress={handleLogout}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <Icon name="log-out" size={16} color={COLORS.danger} />
          )}
          <Text style={styles.logoutText}>{signingOut ? 'Logging out...' : 'Logout'}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version {appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 52;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header
  headerGradient: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  crownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.premiumIcon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.heroBgStart,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.heroAccentText,
    marginTop: 2,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Sections
  sectionWrapper: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  rowValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Premium card
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
  },
  premiumIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTextWrapper: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  premiumSubtitle: {
    fontSize: 12,
    color: COLORS.premiumAccent,
    marginTop: 2,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});