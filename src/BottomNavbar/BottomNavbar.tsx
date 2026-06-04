import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';

interface Props {
  activeTab?: 'Home' | 'Wallet' | 'Analytics' | 'Profile';
  onHomePress?: () => void;
  onWalletPress?: () => void;
  onAddPress?: () => void;
  onAnalyticsPress?: () => void;
  onProfilePress?: () => void;
}

const BottomNavbar: React.FC<Props> = ({
  activeTab = 'Wallet',
  onHomePress,
  onWalletPress,
  onAddPress,
  onAnalyticsPress,
  onProfilePress,
}) => {
  const activeColor = '#2BB3FF';
  const inactiveColor = '#B0B0B0';

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Home */}
        <TouchableOpacity
          style={styles.tab}
          onPress={onHomePress}
        >
          <Ionicons
            name="home-outline"
            size={22}
            color={
              activeTab === 'Home'
                ? activeColor
                : inactiveColor
            }
          />

          <Text
            style={[
              styles.label,
              {
                color:
                  activeTab === 'Home'
                    ? activeColor
                    : inactiveColor,
              },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* Wallet */}
        <TouchableOpacity
          style={styles.tab}
          onPress={onWalletPress}
        >
          <Ionicons
            name="wallet-outline"
            size={22}
            color={
              activeTab === 'Wallet'
                ? activeColor
                : inactiveColor
            }
          />

          <Text
            style={[
              styles.label,
              {
                color:
                  activeTab === 'Wallet'
                    ? activeColor
                    : inactiveColor,
              },
            ]}
          >
            Wallet
          </Text>
        </TouchableOpacity>

        {/* Space for Center Button */}
        <View style={{ width: 70 }} />

        {/* Analytics */}
        <TouchableOpacity
          style={styles.tab}
          onPress={onAnalyticsPress}
        >
          <Ionicons
            name="trending-up-outline"
            size={22}
            color={
              activeTab === 'Analytics'
                ? activeColor
                : inactiveColor
            }
          />

          <Text
            style={[
              styles.label,
              {
                color:
                  activeTab === 'Analytics'
                    ? activeColor
                    : inactiveColor,
              },
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          style={styles.tab}
          onPress={onProfilePress}
        >
          <Ionicons
            name="person-outline"
            size={22}
            color={
              activeTab === 'Profile'
                ? activeColor
                : inactiveColor
            }
          />

          <Text
            style={[
              styles.label,
              {
                color:
                  activeTab === 'Profile'
                    ? activeColor
                    : inactiveColor,
              },
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>

        {/* Floating Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddPress}
        >
          <Ionicons
            name="add"
            size={30}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BottomNavbar;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
  },

  container: {
    height: 85,
    width: '100%',
    backgroundColor: '#0E0A08',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 12,
    paddingHorizontal: 10,
  },

  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },

  addButton: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#6B5BFF',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#6B5BFF',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,

    elevation: 10,
  },
});