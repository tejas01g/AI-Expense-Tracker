import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => {
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
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Onboarding */}
        <Stack.Screen name="Onboarding">
          {(props) => (
            <OnboardingScreen
              onGetStarted={() =>
                props.navigation.navigate('Login')
              }
              onSkip={() =>
                props.navigation.navigate('Login')
              }
            />
          )}
        </Stack.Screen>

        {/* Login */}
        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen
              onContinue={(name, phone) => {
                console.log(name, phone);

                props.navigation.replace('MainTabs');
              }}
              onBack={() =>
                props.navigation.goBack()
              }
            />
          )}
        </Stack.Screen>

        {/* Tabs */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}