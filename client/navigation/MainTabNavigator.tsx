import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";

import HomeScreen from "@/screens/HomeScreen";
import WorkoutScreen from "@/screens/WorkoutScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import RecYardScreen from "@/screens/RecYardScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { Colors, Spacing } from "@/constants/theme";

export type MainTabParamList = {
  HomeTab: undefined;
  WorkoutTab: { officialRecYardSubmission?: boolean } | undefined;
  HistoryTab: undefined;
  RecYardTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.accent,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Colors.dark.backgroundRoot,
          borderTopWidth: 1,
          borderTopColor: Colors.dark.cardBorder,
          paddingTop: Spacing.sm,
          height: Platform.select({ ios: 85, android: 65 }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 1,
          textTransform: "uppercase",
        },
        headerStyle: {
          backgroundColor: Colors.dark.backgroundRoot,
        },
        headerTitleStyle: {
          color: Colors.dark.chalk,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 2,
          textTransform: "uppercase",
        },
        headerTintColor: Colors.dark.chalk,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          headerShown: false,
          title: "Yard",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WorkoutTab"
        component={WorkoutScreen}
        options={{
          headerShown: false,
          title: "Workout",
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: "History",
          headerTitle: "HISTORY",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RecYardTab"
        component={RecYardScreen}
        options={{
          title: "Rec Yard",
          headerTitle: "REC YARD",
          tabBarIcon: ({ color, size }) => (
            <Feather name="award" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerTitle: "SETTINGS",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
