import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import auth from '@react-native-firebase/auth';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import WalletScreen from './src/screens/WalletScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import BottomNavbar from './src/BottomNavbar/BottomNavbar';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
      tabBar={props => {
        const routeName =
          props.state.routes[props.state.index].name;

        return (
          <BottomNavbar
            activeTab={routeName as any}
            onHomePress={() =>
              props.navigation.navigate('Home')
            }
            onWalletPress={() =>
              props.navigation.navigate('Wallet')
            }
            onAnalyticsPress={() =>
              props.navigation.navigate('Analytics')
            }
            onProfilePress={() =>
              props.navigation.navigate('Profile')
            }
            onAddPress={() => {
              console.log('Add Expense');
            }}
          />
        );
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />

      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
      />

      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(
      firebaseUser => {
        setUser(firebaseUser);

        if (initializing) {
          setInitializing(false);
        }
      },
    );

    return subscriber;
  }, [initializing]);

  if (initializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {user ? (
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
          />
        ) : (
          <>
            <Stack.Screen name="Onboarding">
              {props => (
                <OnboardingScreen
                  onGetStarted={() =>
                    props.navigation.navigate(
                      'Login',
                    )
                  }
                  onSkip={() =>
                    props.navigation.navigate(
                      'Login',
                    )
                  }
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Login">
              {props => (
                <LoginScreen
                  onContinue={() => {
                    // No navigation needed
                    // Firebase auth state listener
                    // will automatically open MainTabs
                  }}
                  onBack={() =>
                    props.navigation.goBack()
                  }
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}