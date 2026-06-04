import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
// ─── Stack param list ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Home:undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Onboarding">
          {(props) => (
            <OnboardingScreen
              onGetStarted={() => props.navigation.navigate('Login')}
              onSkip={() => props.navigation.navigate('Login')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen
              onContinue={(name, phone) => {
                props.navigation.navigate('Home')
                // TODO: navigate to OTP screen
                console.log('Continue →', name, phone);
              }}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name = "Home" component = {HomeScreen}/>


      </Stack.Navigator>
    </NavigationContainer>
  );
}