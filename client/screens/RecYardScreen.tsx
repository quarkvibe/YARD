import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ConcreteBackground } from "@/components/ConcreteBackground";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { formatDuration } from "@/lib/storage";
import { useRecYard, formatTimeAgo } from "@/hooks/useRecYard";
import type { LeaderboardEntry } from "@/hooks/useRecYard";
import {
  TrashTalkMessage,
  TauntCategory,
  TRASH_TALK_PRESETS,
} from "@/lib/recyard";
import {
  getRecYardPackages,
  restorePurchases,
  purchaseRecYard,
} from "@/lib/purchases";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";

type TabType = "leaderboard" | "beef" | "profile";

// Navigation types
type MainTabParamList = {
  HomeTab: undefined;
  WorkoutTab: undefined;
  HistoryTab: undefined;
  RecYardTab: undefined;
  SettingsTab: undefined;
};

export default function RecYardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  // Use the Supabase-connected Rec Yard hook
  const {
    isLoading,
    isSubscribed,
    setIsSubscribed,
    profile,
    leaderboard,
    weeklyChallenge,
    sentCallouts,
    receivedCallouts,
    initialize,
    refresh,
    createProfile: hookCreateProfile,
    updateProfile: hookUpdateProfile,
    sendCallout: hookSendCallout,
    getDaysUntilChallengeEnd,
  } = useRecYard();

  // Local UI state
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editHandle, setEditHandle] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("leaderboard");
  const [refreshing, setRefreshing] = useState(false);

  // Trash talk modal state
  const [showCalloutModal, setShowCalloutModal] = useState(false);
  const [calloutTarget, setCalloutTarget] = useState<LeaderboardEntry | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] =
    useState<TauntCategory>("challenge");
  const [customMessage, setCustomMessage] = useState("");

  // Animation values
  const fireScale = useSharedValue(1);

  // Calculate days remaining
  const daysRemaining = getDaysUntilChallengeEnd();

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      initialize();
    }, [initialize]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleUnlock = async () => {
    setIsPurchasing(true);

    try {
      // Get available packages from RevenueCat
      const packages = await getRecYardPackages();

      if (packages.length === 0) {
        // No packages available - show error with option to retry or restore
        console.log("[RecYard] No packages available from RevenueCat");
        Alert.alert(
          "SUBSCRIPTION UNAVAILABLE",
          "The subscription is being set up. Please try again in a few minutes, or restore if you've already purchased.",
          [
            { text: "TRY AGAIN", onPress: () => handleUnlock() },
            { text: "RESTORE PURCHASE", onPress: handleRestore },
            { text: "CANCEL", style: "cancel" },
          ],
        );
        setIsPurchasing(false);
        return;
      }

      // Purchase the first available package (monthly subscription)
      const result = await purchaseRecYard(packages[0]);

      if (result.success) {
        setIsSubscribed(true);
        Alert.alert(
          "WELCOME TO THE YARD",
          "Your subscription is now active. Get after it!",
        );
      } else if (result.error === "cancelled") {
        // User cancelled - do nothing
      } else {
        Alert.alert("PURCHASE FAILED", result.error || "Please try again.");
      }
    } catch (error) {
      console.error("[RecYard] Purchase error:", error);
      Alert.alert("ERROR", "Something went wrong. Please try again.");
    }

    setIsPurchasing(false);
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    const result = await restorePurchases();
    setIsPurchasing(false);

    if (result.hasRecYard) {
      setIsSubscribed(true);
      Alert.alert("RESTORED", "Your Rec Yard access has been restored.");
    } else {
      Alert.alert(
        "NO PURCHASES FOUND",
        "No previous subscriptions were found.",
      );
    }
  };

  const handleCreateProfile = async () => {
    if (!editHandle.trim()) {
      Alert.alert("HANDLE REQUIRED", "Please enter a handle.");
      return;
    }

    const success = await hookCreateProfile(
      editHandle.trim(),
      editDisplayName.trim() || editHandle.trim(),
    );
    if (success) {
      setIsEditingProfile(false);
    } else {
      Alert.alert(
        "ERROR",
        "Failed to create profile. Handle may already be taken.",
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    const success = await hookUpdateProfile({
      handle: editHandle.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
      displayName: editDisplayName,
      bio: editBio,
      instagram: editInstagram,
    });

    if (success) {
      setIsEditingProfile(false);
    } else {
      Alert.alert("ERROR", "Failed to save profile.");
    }
  };

  // Navigate to workout to participate in weekly challenge
  const handleClockIn = () => {
    if (!weeklyChallenge) {
      Alert.alert("NO CHALLENGE", "No active weekly challenge right now.");
      return;
    }

    Alert.alert(
      "CLOCK IN",
      `Join the "${weeklyChallenge.exerciseType.toUpperCase()} ${weeklyChallenge.intensity.toUpperCase()}" challenge?\n\nComplete a workout to submit your time to the leaderboard!`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "LET'S GO",
          onPress: () => {
            // Navigate to workout screen
            navigation.navigate("WorkoutTab");
          },
        },
      ],
    );
  };

  const uploadPhoto = async (uri: string) => {
    if (!profile) return;

    try {
      // Create file from URI
      const filename = `${profile.id}-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("profile-photos")
        .upload(filename, blob, { contentType: "image/jpeg", upsert: true });

      if (error) {
        console.error("[RecYard] Photo upload error:", error);
        Alert.alert("UPLOAD FAILED", "Could not upload photo.");
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(filename);

      // Update profile with new photo URL
      await hookUpdateProfile({ photoUrl: publicUrl });
    } catch (err) {
      console.error("[RecYard] Photo upload error:", err);
      Alert.alert("UPLOAD FAILED", "Could not upload photo.");
    }
  };

  const handlePickPhoto = async () => {
    Alert.alert(
      "PROFILE PHOTO",
      "Choose an option",
      [
        {
          text: "CAMERA",
          onPress: async () => {
            const { status } =
              await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("PERMISSION DENIED", "Camera access is required.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: "LIBRARY",
          onPress: async () => {
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "PERMISSION DENIED",
                "Photo library access is required.",
              );
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadPhoto(result.assets[0].uri);
            }
          },
        },
        { text: "CANCEL", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const startEditProfile = () => {
    if (profile) {
      setEditHandle(profile.handle);
      setEditDisplayName(profile.displayName);
      setEditBio(profile.bio);
      setEditInstagram(profile.instagram);
    }
    setIsEditingProfile(true);
  };

  // ============================================
  // TRASH TALK HANDLERS
  // ============================================

  const openCalloutModal = (target: LeaderboardEntry) => {
    setCalloutTarget(target);
    setSelectedCategory("challenge");
    setCustomMessage("");
    setShowCalloutModal(true);
  };

  const handleSendCallout = async (message: string, messageId?: string) => {
    if (!calloutTarget || !profile) return;

    const success = await hookSendCallout(
      calloutTarget.profileId,
      calloutTarget.handle,
      message,
      messageId,
    );

    if (success) {
      setShowCalloutModal(false);
      setCalloutTarget(null);

      // Fire animation
      fireScale.value = withSequence(
        withSpring(1.3, { damping: 10 }),
        withSpring(1, { damping: 15 }),
      );

      Alert.alert(
        "🔥 CALLOUT SENT",
        `You just called out @${calloutTarget.handle}. Let's see if they respond.`,
      );
    } else {
      Alert.alert("ERROR", "Failed to send callout.");
    }
  };

  const getCategoryMessages = (category: TauntCategory): TrashTalkMessage[] => {
    return TRASH_TALK_PRESETS.filter((m) => m.category === category);
  };

  const fireAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  // ============================================
  // RENDER: LOCKED STATE (PAYWALL)
  // ============================================

  const renderLockedState = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.lockedContainer,
        { paddingBottom: tabBarHeight + Spacing.xl },
      ]}
    >
      <Animated.View entering={FadeIn.delay(100)} style={styles.lockedHeader}>
        <View style={styles.lockIconContainer}>
          <Feather name="lock" size={48} color={Colors.dark.accent} />
        </View>
        <ThemedText style={styles.lockedTitle}>REC YARD</ThemedText>
        <ThemedText style={styles.lockedSubtitle}>COMPETITIVE MODE</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200)} style={styles.featureList}>
        <View style={styles.featureItem}>
          <Feather name="award" size={20} color={Colors.dark.accent} />
          <View style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>
              GLOBAL LEADERBOARD
            </ThemedText>
            <ThemedText style={styles.featureDesc}>
              Compete against athletes worldwide
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Feather name="video" size={20} color={Colors.dark.accent} />
          <View style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>VERIFIED TIMES</ThemedText>
            <ThemedText style={styles.featureDesc}>
              Camera verification for legit rankings
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Feather name="user" size={20} color={Colors.dark.accent} />
          <View style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>PUBLIC PROFILE</ThemedText>
            <ThemedText style={styles.featureDesc}>
              Photo, stats, badges, and social links
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Feather name="calendar" size={20} color={Colors.dark.accent} />
          <View style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>
              WEEKLY CHALLENGES
            </ThemedText>
            <ThemedText style={styles.featureDesc}>
              New deck constraints every week
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureItem}>
          <ThemedText style={{ fontSize: 20 }}>🔥</ThemedText>
          <View style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>TRASH TALK</ThemedText>
            <ThemedText style={styles.featureDesc}>
              Call out rivals and talk your smack
            </ThemedText>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Feather name="star" size={20} color={Colors.dark.accent} />
          <View style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>
              BADGES & ACHIEVEMENTS
            </ThemedText>
            <ThemedText style={styles.featureDesc}>
              Earn badges for milestones
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300)} style={styles.pricingSection}>
        <ThemedText style={styles.priceAmount}>$1.99</ThemedText>
        <ThemedText style={styles.pricePeriod}>PER MONTH</ThemedText>
        <ThemedText style={styles.priceCancel}>CANCEL ANYTIME</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(400)} style={styles.actionSection}>
        <Pressable
          style={styles.unlockButton}
          onPress={handleUnlock}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.dark.backgroundRoot} />
          ) : (
            <ThemedText style={styles.unlockButtonText}>
              ENTER THE YARD
            </ThemedText>
          )}
        </Pressable>

        <Pressable style={styles.restoreButton} onPress={handleRestore}>
          <ThemedText style={styles.restoreButtonText}>
            RESTORE PURCHASE
          </ThemedText>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );

  // ============================================
  // RENDER: PROFILE SETUP
  // ============================================

  const renderProfileSetup = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.setupContainer,
        { paddingBottom: tabBarHeight + Spacing.xl },
      ]}
    >
      <Animated.View entering={FadeIn} style={styles.setupHeader}>
        <ThemedText style={styles.setupTitle}>CREATE YOUR PROFILE</ThemedText>
        <ThemedText style={styles.setupSubtitle}>
          Choose a handle for the leaderboard
        </ThemedText>
      </Animated.View>

      <View style={styles.setupForm}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>HANDLE</ThemedText>
          <View style={styles.handleInputContainer}>
            <ThemedText style={styles.handlePrefix}>@</ThemedText>
            <TextInput
              style={styles.handleInput}
              value={editHandle}
              onChangeText={(text) =>
                setEditHandle(text.toUpperCase().replace(/[^A-Z0-9_]/g, ""))
              }
              placeholder="YOUR_HANDLE"
              placeholderTextColor={Colors.dark.textSecondary}
              maxLength={20}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>
            DISPLAY NAME (OPTIONAL)
          </ThemedText>
          <TextInput
            style={styles.textInput}
            value={editDisplayName}
            onChangeText={setEditDisplayName}
            placeholder="Your Name"
            placeholderTextColor={Colors.dark.textSecondary}
            maxLength={30}
          />
        </View>

        <Pressable
          style={styles.createProfileButton}
          onPress={handleCreateProfile}
        >
          <ThemedText style={styles.createProfileButtonText}>
            CREATE PROFILE
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );

  // ============================================
  // RENDER: TAB BAR
  // ============================================

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <Pressable
        style={[styles.tab, activeTab === "leaderboard" && styles.tabActive]}
        onPress={() => setActiveTab("leaderboard")}
      >
        <Feather
          name="award"
          size={18}
          color={
            activeTab === "leaderboard"
              ? Colors.dark.accent
              : Colors.dark.textSecondary
          }
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === "leaderboard" && styles.tabTextActive,
          ]}
        >
          BOARD
        </ThemedText>
      </Pressable>

      <Pressable
        style={[styles.tab, activeTab === "beef" && styles.tabActive]}
        onPress={() => setActiveTab("beef")}
      >
        <Animated.View style={fireAnimatedStyle}>
          <ThemedText style={styles.beefEmoji}>🔥</ThemedText>
        </Animated.View>
        <ThemedText
          style={[styles.tabText, activeTab === "beef" && styles.tabTextActive]}
        >
          BEEF
        </ThemedText>
        {receivedCallouts.filter((c) => !c.responded).length > 0 && (
          <View style={styles.beefBadge}>
            <ThemedText style={styles.beefBadgeText}>
              {receivedCallouts.filter((c) => !c.responded).length}
            </ThemedText>
          </View>
        )}
      </Pressable>

      <Pressable
        style={[styles.tab, activeTab === "profile" && styles.tabActive]}
        onPress={() => setActiveTab("profile")}
      >
        <Feather
          name="user"
          size={18}
          color={
            activeTab === "profile"
              ? Colors.dark.accent
              : Colors.dark.textSecondary
          }
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === "profile" && styles.tabTextActive,
          ]}
        >
          PROFILE
        </ThemedText>
      </Pressable>
    </View>
  );

  // ============================================
  // RENDER: LEADERBOARD TAB
  // ============================================

  const renderLeaderboardItem = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 40)}
      style={[styles.leaderboardItem, index < 3 && styles.leaderboardItemTop3]}
    >
      <View style={styles.rankContainer}>
        <ThemedText
          style={[styles.rank, index < 3 && { color: Colors.dark.accent }]}
        >
          {item.rank}
        </ThemedText>
      </View>

      <View style={styles.avatarSmall}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
        ) : (
          <Feather name="user" size={16} color={Colors.dark.textSecondary} />
        )}
      </View>

      <View style={styles.handleContainer}>
        <View style={styles.handleRow}>
          <ThemedText style={styles.handle}>{item.handle}</ThemedText>
          {item.isVerified && (
            <Feather name="check-circle" size={14} color={Colors.dark.accent} />
          )}
        </View>
        <ThemedText style={styles.submittedAt}>
          {formatTimeAgo(item.submittedAt)}
        </ThemedText>
      </View>

      <View style={styles.leaderboardActions}>
        <ThemedText style={styles.time}>{formatDuration(item.time)}</ThemedText>
        <Pressable
          style={styles.calloutButton}
          onPress={() => openCalloutModal(item)}
        >
          <ThemedText style={styles.calloutButtonEmoji}>💢</ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderLeaderboardTab = () => (
    <View style={styles.leaderboardContainer}>
      {/* Quick Actions Dashboard */}
      <Animated.View entering={FadeIn} style={styles.quickActionsCard}>
        <View style={styles.quickActionsRow}>
          {/* Your Rank */}
          <View style={styles.quickActionItem}>
            <ThemedText style={styles.quickActionLabel}>YOUR RANK</ThemedText>
            <ThemedText style={styles.quickActionValue}>
              {profile
                ? leaderboard.findIndex((l) => l.profileId === profile.id) +
                    1 || "--"
                : "--"}
            </ThemedText>
          </View>

          {/* Practice Times */}
          <View style={styles.quickActionItem}>
            <ThemedText style={styles.quickActionLabel}>PRACTICE</ThemedText>
            <ThemedText style={styles.quickActionValue}>
              {profile?.totalWorkouts || 0}
            </ThemedText>
          </View>

          {/* Best Time */}
          <View style={styles.quickActionItem}>
            <ThemedText style={styles.quickActionLabel}>BEST</ThemedText>
            <ThemedText style={styles.quickActionValue}>
              {profile?.bestTime ? formatDuration(profile.bestTime) : "--:--"}
            </ThemedText>
          </View>
        </View>

        {/* Submit Official Time Button */}
        <Pressable
          style={styles.submitOfficialButton}
          onPress={() => {
            Alert.alert(
              "SUBMIT OFFICIAL TIME",
              "Complete a workout with Rec Yard Practice Mode enabled to submit an official time to the leaderboard.\n\n• Tap 'Practice Mode' before starting\n• Complete all 52 cards\n• Your time will be submitted automatically",
              [
                { text: "GOT IT", style: "default" },
                {
                  text: "START WORKOUT",
                  onPress: () => navigation.navigate("WorkoutTab"),
                },
              ],
            );
          }}
        >
          <Feather
            name="upload"
            size={16}
            color={Colors.dark.accent}
            style={{ marginRight: 8 }}
          />
          <ThemedText style={styles.submitOfficialButtonText}>
            POST OFFICIAL TIME
          </ThemedText>
        </Pressable>
      </Animated.View>

      {/* Weekly Challenge Card */}
      {weeklyChallenge && (
        <Animated.View entering={FadeIn} style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <ThemedText style={styles.challengeLabel}>
              WEEKLY CHALLENGE
            </ThemedText>
            <View style={styles.challengeTimer}>
              <Feather name="clock" size={14} color={Colors.dark.accent} />
              <ThemedText style={styles.challengeTimerText}>
                {daysRemaining}D LEFT
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.challengeRuleset}>
            {weeklyChallenge.intensity.toUpperCase()} •{" "}
            {weeklyChallenge.exerciseType.toUpperCase()}
          </ThemedText>

          <View style={styles.challengeStats}>
            <View style={styles.challengeStat}>
              <ThemedText style={styles.challengeStatValue}>
                {weeklyChallenge.participantCount}
              </ThemedText>
              <ThemedText style={styles.challengeStatLabel}>
                PARTICIPANTS
              </ThemedText>
            </View>
            <View style={styles.challengeStat}>
              <ThemedText style={styles.challengeStatValue}>
                {weeklyChallenge.topTime
                  ? formatDuration(weeklyChallenge.topTime)
                  : "--:--"}
              </ThemedText>
              <ThemedText style={styles.challengeStatLabel}>
                TOP TIME
              </ThemedText>
            </View>
          </View>

          <Pressable style={styles.clockInButton} onPress={handleClockIn}>
            <Feather
              name="play"
              size={16}
              color={Colors.dark.backgroundRoot}
              style={{ marginRight: 8 }}
            />
            <ThemedText style={styles.clockInButtonText}>
              JOIN CHALLENGE
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* Leaderboard Header */}
      <View style={styles.leaderboardHeader}>
        <ThemedText style={styles.leaderboardTitle}>LEADERBOARD</ThemedText>
        <View style={styles.verifiedLegend}>
          <Feather name="check-circle" size={12} color={Colors.dark.accent} />
          <ThemedText style={styles.verifiedLegendText}>VERIFIED</ThemedText>
        </View>
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.profileId}
        renderItem={renderLeaderboardItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.accent}
          />
        }
      />
    </View>
  );

  // ============================================
  // RENDER: BEEF TAB (TRASH TALK)
  // ============================================

  const renderBeefTab = () => (
    <ScrollView
      style={styles.feedContainer}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.dark.accent}
        />
      }
    >
      {/* Header */}
      <View style={styles.beefHeader}>
        <ThemedText style={styles.beefTitle}>🔥 THE YARD</ThemedText>
        <ThemedText style={styles.beefSubtitle}>
          TALK YOUR TRASH. BACK IT UP.
        </ThemedText>
      </View>

      {/* Received Callouts - Need Response */}
      {receivedCallouts.filter((c) => !c.responded).length > 0 && (
        <View style={styles.beefSection}>
          <ThemedText style={styles.beefSectionTitle}>
            💢 INCOMING HEAT (
            {receivedCallouts.filter((c) => !c.responded).length})
          </ThemedText>
          {receivedCallouts
            .filter((c) => !c.responded)
            .map((callout, index) => (
              <Animated.View
                key={callout.id}
                entering={FadeInDown.delay(index * 50)}
                style={styles.calloutCard}
              >
                <View style={styles.calloutHeader}>
                  <View style={styles.calloutUser}>
                    <View style={styles.avatarSmall}>
                      {callout.fromPhotoUrl ? (
                        <Image
                          source={{ uri: callout.fromPhotoUrl }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Feather
                          name="user"
                          size={16}
                          color={Colors.dark.textSecondary}
                        />
                      )}
                    </View>
                    <ThemedText style={styles.calloutHandle}>
                      @{callout.fromHandle}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.calloutTime}>
                    {formatTimeAgo(callout.createdAt)}
                  </ThemedText>
                </View>
                <View style={styles.calloutMessage}>
                  <ThemedText style={styles.calloutText}>
                    {`"${callout.message}"`}
                  </ThemedText>
                </View>
                <View style={styles.calloutActions}>
                  <Pressable
                    style={styles.respondButton}
                    onPress={() => {
                      setCalloutTarget({
                        id: callout.fromProfileId,
                        profileId: callout.fromProfileId,
                        handle: callout.fromHandle,
                        photoUrl: callout.fromPhotoUrl,
                        rank: 0,
                        displayName: callout.fromHandle,
                        time: 0,
                        isVerified: false,
                        submittedAt: "",
                        exerciseType: "",
                        intensity: "",
                      });
                      setShowCalloutModal(true);
                    }}
                  >
                    <ThemedText style={styles.respondButtonText}>
                      🔥 RESPOND
                    </ThemedText>
                  </Pressable>
                  <Pressable style={styles.ignoreButton}>
                    <ThemedText style={styles.ignoreButtonText}>
                      IGNORE
                    </ThemedText>
                  </Pressable>
                </View>
              </Animated.View>
            ))}
        </View>
      )}

      {/* Sent Callouts */}
      {sentCallouts.length > 0 && (
        <View style={styles.beefSection}>
          <ThemedText style={styles.beefSectionTitle}>
            📢 YOUR CALLOUTS ({sentCallouts.length})
          </ThemedText>
          {sentCallouts.map((callout, index) => (
            <Animated.View
              key={callout.id}
              entering={FadeInDown.delay(index * 50)}
              style={[styles.calloutCard, styles.sentCallout]}
            >
              <View style={styles.calloutHeader}>
                <ThemedText style={styles.calloutTo}>
                  → @{callout.toHandle}
                </ThemedText>
                <ThemedText style={styles.calloutTime}>
                  {formatTimeAgo(callout.createdAt)}
                </ThemedText>
              </View>
              <ThemedText style={styles.calloutText}>
                {`"${callout.message}"`}
              </ThemedText>
              {callout.responded ? (
                <View style={styles.calloutResponse}>
                  <ThemedText style={styles.responseLabel}>
                    THEY RESPONDED:
                  </ThemedText>
                  <ThemedText style={styles.responseText}>
                    {`"${callout.responseMessage}"`}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.pendingResponse}>
                  <Feather
                    name="clock"
                    size={14}
                    color={Colors.dark.textSecondary}
                  />
                  <ThemedText style={styles.pendingText}>
                    WAITING FOR RESPONSE...
                  </ThemedText>
                </View>
              )}
            </Animated.View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {sentCallouts.length === 0 && receivedCallouts.length === 0 && (
        <View style={styles.emptyBeef}>
          <ThemedText style={styles.emptyBeefEmoji}>🥊</ThemedText>
          <ThemedText style={styles.emptyBeefTitle}>NO BEEF YET</ThemedText>
          <ThemedText style={styles.emptyBeefText}>
            TAP THE 💢 ON THE LEADERBOARD TO CALL SOMEONE OUT
          </ThemedText>
        </View>
      )}

      {/* Trash Talk Tips */}
      <View style={styles.trashTalkTips}>
        <ThemedText style={styles.tipTitle}>📖 YARD RULES</ThemedText>
        <View style={styles.tipRow}>
          <ThemedText style={styles.tipNumber}>1.</ThemedText>
          <ThemedText style={styles.tipText}>
            TALK YOUR TRASH, BUT BACK IT UP WITH TIMES
          </ThemedText>
        </View>
        <View style={styles.tipRow}>
          <ThemedText style={styles.tipNumber}>2.</ThemedText>
          <ThemedText style={styles.tipText}>
            VERIFIED CALLOUTS HIT DIFFERENT
          </ThemedText>
        </View>
        <View style={styles.tipRow}>
          <ThemedText style={styles.tipNumber}>3.</ThemedText>
          <ThemedText style={styles.tipText}>
            NO RESPONSE? THEY SCARED.
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );

  // ============================================
  // RENDER: PROFILE TAB
  // ============================================

  const renderProfileTab = () => {
    if (!profile) return null;

    if (isEditingProfile) {
      return (
        <ScrollView
          style={styles.profileContainer}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
        >
          <View style={styles.editProfileHeader}>
            <Pressable onPress={() => setIsEditingProfile(false)}>
              <ThemedText style={styles.cancelText}>CANCEL</ThemedText>
            </Pressable>
            <ThemedText style={styles.editTitle}>EDIT PROFILE</ThemedText>
            <Pressable onPress={handleSaveProfile}>
              <ThemedText style={styles.saveText}>SAVE</ThemedText>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>HANDLE</ThemedText>
            <View style={styles.handleInputContainer}>
              <ThemedText style={styles.handlePrefix}>@</ThemedText>
              <TextInput
                style={styles.handleInput}
                value={editHandle}
                onChangeText={(text) =>
                  setEditHandle(text.toUpperCase().replace(/[^A-Z0-9_]/g, ""))
                }
                maxLength={20}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>DISPLAY NAME</ThemedText>
            <TextInput
              style={styles.textInput}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              maxLength={30}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>BIO</ThemedText>
            <TextInput
              style={[styles.textInput, styles.bioInput]}
              value={editBio}
              onChangeText={setEditBio}
              maxLength={150}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>INSTAGRAM</ThemedText>
            <View style={styles.handleInputContainer}>
              <ThemedText style={styles.handlePrefix}>@</ThemedText>
              <TextInput
                style={styles.handleInput}
                value={editInstagram}
                onChangeText={setEditInstagram}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.profileContainer}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.accent}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Pressable style={styles.avatarLarge} onPress={handlePickPhoto}>
            {profile.photoUrl ? (
              <Image
                source={{ uri: profile.photoUrl }}
                style={styles.avatarImageLarge}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather
                  name="camera"
                  size={32}
                  color={Colors.dark.textSecondary}
                />
                <ThemedText style={styles.avatarPlaceholderText}>
                  ADD PHOTO
                </ThemedText>
              </View>
            )}
          </Pressable>

          <View style={styles.profileInfo}>
            <View style={styles.handleRow}>
              <ThemedText style={styles.profileHandle}>
                @{profile.handle}
              </ThemedText>
              {profile.isVerified && (
                <Feather
                  name="check-circle"
                  size={18}
                  color={Colors.dark.accent}
                />
              )}
            </View>
            {profile.displayName && (
              <ThemedText style={styles.profileDisplayName}>
                {profile.displayName}
              </ThemedText>
            )}
            {profile.bio && (
              <ThemedText style={styles.profileBio}>{profile.bio}</ThemedText>
            )}
          </View>

          <Pressable
            style={styles.editProfileButton}
            onPress={startEditProfile}
          >
            <Feather name="edit-2" size={16} color={Colors.dark.chalk} />
            <ThemedText style={styles.editProfileButtonText}>EDIT</ThemedText>
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {profile.bestTime ? formatDuration(profile.bestTime) : "--:--"}
            </ThemedText>
            <ThemedText style={styles.statLabel}>BEST TIME</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {profile.totalWorkouts}
            </ThemedText>
            <ThemedText style={styles.statLabel}>WORKOUTS</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {profile.currentStreak}
            </ThemedText>
            <ThemedText style={styles.statLabel}>STREAK</ThemedText>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.badgesSection}>
          <ThemedText style={styles.sectionTitle}>BADGES</ThemedText>
          {profile.badges.length === 0 ? (
            <View style={styles.noBadges}>
              <Feather
                name="award"
                size={24}
                color={Colors.dark.textSecondary}
              />
              <ThemedText style={styles.noBadgesText}>NO BADGES YET</ThemedText>
            </View>
          ) : (
            <View style={styles.badgesGrid}>
              {profile.badges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View
                    style={[
                      styles.badgeIcon,
                      badge.rarity === "legendary" && styles.badgeLegendary,
                      badge.rarity === "epic" && styles.badgeEpic,
                      badge.rarity === "rare" && styles.badgeRare,
                    ]}
                  >
                    <Feather
                      name={badge.icon as any}
                      size={20}
                      color={Colors.dark.chalk}
                    />
                  </View>
                  <ThemedText style={styles.badgeName}>{badge.name}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Social Links */}
        {profile.instagram && (
          <View style={styles.socialSection}>
            <ThemedText style={styles.sectionTitle}>SOCIAL</ThemedText>
            <View style={styles.socialCard}>
              <View style={styles.socialItem}>
                <Feather name="instagram" size={20} color={Colors.dark.chalk} />
                <ThemedText style={styles.socialHandle}>
                  @{profile.instagram}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Verification Section */}
        <View style={styles.verificationSection}>
          <ThemedText style={styles.sectionTitle}>VERIFICATION</ThemedText>
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <Feather name="shield" size={24} color={Colors.dark.accent} />
              <ThemedText style={styles.verificationTitle}>
                PROOF SYSTEM
              </ThemedText>
            </View>
            <ThemedText style={styles.verificationText}>
              Video verification ensures fair competition. Your front camera
              records during verified workouts to prevent fraud.
            </ThemedText>
            <View style={styles.verificationStatus}>
              <Feather
                name={profile.isVerified ? "check-circle" : "circle"}
                size={16}
                color={
                  profile.isVerified
                    ? Colors.dark.accent
                    : Colors.dark.textSecondary
                }
              />
              <ThemedText style={styles.verificationStatusText}>
                {profile.isVerified ? "VERIFIED" : "NOT ENROLLED"}
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  // ============================================
  // RENDER: CALLOUT MODAL
  // ============================================

  const renderCalloutModal = () => (
    <Modal
      visible={showCalloutModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCalloutModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={SlideInUp.springify()}
          exiting={SlideOutDown}
          style={styles.calloutModal}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCalloutModal(false)}>
              <Feather name="x" size={24} color={Colors.dark.chalk} />
            </Pressable>
            <ThemedText style={styles.modalTitle}>🔥 CALL OUT</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          {calloutTarget && (
            <View style={styles.calloutTargetInfo}>
              <ThemedText style={styles.targetLabel}>TARGET:</ThemedText>
              <ThemedText style={styles.targetHandle}>
                @{calloutTarget.handle}
              </ThemedText>
            </View>
          )}

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabs}
          >
            {(
              [
                "respect",
                "challenge",
                "taunt",
                "flex",
                "burn",
              ] as TauntCategory[]
            ).map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryTab,
                  selectedCategory === cat && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <ThemedText
                  style={[
                    styles.categoryTabText,
                    selectedCategory === cat && styles.categoryTabTextActive,
                  ]}
                >
                  {cat === "respect" && "👊 "}
                  {cat === "challenge" && "🎯 "}
                  {cat === "taunt" && "😤 "}
                  {cat === "flex" && "💪 "}
                  {cat === "burn" && "🔥 "}
                  {cat.toUpperCase()}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {/* Preset Messages */}
          <ScrollView style={styles.presetMessages}>
            {getCategoryMessages(selectedCategory).map((message) => (
              <Pressable
                key={message.id}
                style={styles.presetMessage}
                onPress={() => handleSendCallout(message.text, message.id)}
              >
                <View style={styles.presetContent}>
                  <Feather
                    name={message.icon as any}
                    size={18}
                    color={Colors.dark.accent}
                  />
                  <ThemedText style={styles.presetText}>
                    {message.text}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.heatIndicator,
                    message.heat === 2 && styles.heatSpicy,
                    message.heat === 3 && styles.heatFire,
                  ]}
                >
                  {message.heat === 1 && "🌶️"}
                  {message.heat === 2 && "🌶️🌶️"}
                  {message.heat === 3 && "🔥"}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* Custom Message */}
          <View style={styles.customMessageSection}>
            <ThemedText style={styles.customLabel}>
              OR WRITE YOUR OWN:
            </ThemedText>
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder="SAY SOMETHING..."
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={100}
                autoCapitalize="characters"
              />
              <Pressable
                style={[
                  styles.sendButton,
                  !customMessage.trim() && styles.sendButtonDisabled,
                ]}
                onPress={() =>
                  customMessage.trim() &&
                  handleSendCallout(customMessage.trim())
                }
                disabled={!customMessage.trim()}
              >
                <Feather
                  name="send"
                  size={18}
                  color={
                    customMessage.trim()
                      ? Colors.dark.backgroundRoot
                      : Colors.dark.textSecondary
                  }
                />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  // ============================================
  // RENDER: MAIN
  // ============================================

  if (isLoading) {
    return (
      <ConcreteBackground intensity="medium">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <ThemedText style={styles.loadingText}>LOADING...</ThemedText>
        </View>
      </ConcreteBackground>
    );
  }

  // Show paywall if not subscribed
  if (!isSubscribed) {
    return (
      <ConcreteBackground intensity="medium">
        <View
          style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}
        >
          {renderLockedState()}
        </View>
      </ConcreteBackground>
    );
  }

  // Show profile setup if no profile exists
  if (!profile) {
    return (
      <ConcreteBackground intensity="medium">
        <View
          style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}
        >
          {renderProfileSetup()}
        </View>
      </ConcreteBackground>
    );
  }

  // Show main Rec Yard UI
  return (
    <ConcreteBackground intensity="medium">
      <View
        style={[
          styles.container,
          {
            paddingTop: Spacing.xl,
            paddingBottom: tabBarHeight,
          },
        ]}
      >
        {renderTabBar()}
        {activeTab === "leaderboard" && renderLeaderboardTab()}
        {activeTab === "beef" && renderBeefTab()}
        {activeTab === "profile" && renderProfileTab()}
      </View>

      {renderCalloutModal()}
    </ConcreteBackground>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },

  // Locked State
  lockedContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  lockedHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  lockedTitle: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.dark.chalk,
  },
  lockedSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginTop: Spacing.sm,
  },
  featureList: {
    width: "100%",
    marginBottom: Spacing["2xl"],
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.lg,
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.chalk,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  pricingSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
  pricePeriod: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginTop: Spacing.xs,
  },
  priceCancel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.sm,
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.lg,
  },
  unlockButton: {
    width: "100%",
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  restoreButton: {
    paddingVertical: Spacing.md,
  },
  restoreButtonText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },

  // Profile Setup
  setupContainer: {
    paddingVertical: Spacing["2xl"],
  },
  setupHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.sm,
  },
  setupSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  setupForm: {
    gap: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  handleInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: Spacing.lg,
  },
  handlePrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginRight: Spacing.xs,
  },
  handleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.chalk,
    paddingVertical: Spacing.lg,
    letterSpacing: 2,
  },
  textInput: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: 16,
    color: Colors.dark.chalk,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  createProfileButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  createProfileButtonText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  tabActive: {
    borderColor: Colors.dark.accent,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  tabTextActive: {
    color: Colors.dark.accent,
  },

  // Leaderboard
  leaderboardContainer: {
    flex: 1,
  },
  challengeCard: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  challengeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
  challengeTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  challengeTimerText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.accent,
  },
  challengeRuleset: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.lg,
  },
  challengeStats: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  challengeStat: {},
  challengeStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.dark.chalk,
  },
  challengeStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  clockInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  clockInButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  // Quick Actions Dashboard
  quickActionsCard: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  quickActionItem: {
    alignItems: "center",
    flex: 1,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  quickActionValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.dark.chalk,
  },
  submitOfficialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  submitOfficialButtonText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
  leaderboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  leaderboardTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  verifiedLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  verifiedLegendText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  leaderboardItemTop3: {
    borderColor: Colors.dark.accent,
    borderWidth: 1,
  },
  rankContainer: {
    width: 32,
  },
  rank: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.dark.textSecondary,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  handleContainer: {
    flex: 1,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  handle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  submittedAt: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },

  // Feed
  feedContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  emptyFeed: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  feedItem: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  feedItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  feedItemUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  feedItemHandle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  feedItemTime: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
  },
  feedItemContent: {
    marginBottom: Spacing.lg,
  },
  feedItemDuration: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.xs,
  },
  feedItemDetails: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.accent,
    marginBottom: Spacing.sm,
  },
  feedItemStats: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  feedItemStat: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  feedItemActions: {
    flexDirection: "row",
    gap: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  feedAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  feedActionText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },

  // Profile
  profileContainer: {
    flex: 1,
  },
  editProfileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.accent,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  avatarImageLarge: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    borderStyle: "dashed",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.sm,
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  profileHandle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  profileDisplayName: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  profileBio: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
    maxWidth: 280,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  editProfileButtonText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  badgesSection: {
    marginBottom: Spacing["2xl"],
  },
  noBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  noBadgesText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  badgeItem: {
    alignItems: "center",
    width: 70,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  badgeLegendary: {
    borderColor: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  badgeEpic: {
    borderColor: "#9B59B6",
    backgroundColor: "rgba(155, 89, 182, 0.1)",
  },
  badgeRare: {
    borderColor: Colors.dark.accent,
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },
  badgeName: {
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  socialSection: {
    marginBottom: Spacing["2xl"],
  },
  socialCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  socialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  socialHandle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.dark.chalk,
  },
  verificationSection: {
    marginBottom: Spacing["2xl"],
  },
  verificationCard: {
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  verificationText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  verificationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  verificationStatusText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },

  // Leaderboard Actions
  leaderboardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  calloutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  calloutButtonEmoji: {
    fontSize: 16,
  },

  // Beef Tab Styles
  beefEmoji: {
    fontSize: 16,
  },
  beefBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.dark.pushups,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  beefBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.dark.chalk,
  },
  beefHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  beefTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.dark.chalk,
  },
  beefSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginTop: Spacing.sm,
  },
  beefSection: {
    marginBottom: Spacing["2xl"],
  },
  beefSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.lg,
  },
  calloutCard: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.dark.pushups,
  },
  sentCallout: {
    borderColor: Colors.dark.accent,
  },
  calloutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  calloutUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  calloutHandle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  calloutTo: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.accent,
  },
  calloutTime: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
  },
  calloutMessage: {
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  calloutText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.chalk,
    fontStyle: "italic",
  },
  calloutActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  respondButton: {
    flex: 1,
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  respondButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },
  ignoreButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
  },
  ignoreButtonText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  calloutResponse: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  responseLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.accent,
    marginBottom: Spacing.xs,
  },
  responseText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.chalk,
    fontStyle: "italic",
  },
  pendingResponse: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
  },
  emptyBeef: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyBeefEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyBeefTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.dark.chalk,
    marginBottom: Spacing.sm,
  },
  emptyBeefText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    letterSpacing: 1,
  },
  trashTalkTips: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.chalk,
    marginBottom: Spacing.lg,
  },
  tipRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  tipNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginRight: Spacing.md,
    width: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
  },

  // Callout Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  calloutModal: {
    backgroundColor: Colors.dark.backgroundRoot,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing["4xl"],
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.chalk,
  },
  calloutTargetInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  targetHandle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
  categoryTabs: {
    marginBottom: Spacing.lg,
    maxHeight: 44,
  },
  categoryTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  categoryTabActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  categoryTabTextActive: {
    color: Colors.dark.backgroundRoot,
  },
  presetMessages: {
    maxHeight: 200,
    marginBottom: Spacing.xl,
  },
  presetMessage: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  presetContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
    flex: 1,
  },
  heatIndicator: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heatSpicy: {
    backgroundColor: "rgba(255, 165, 0, 0.2)",
  },
  heatFire: {
    backgroundColor: "rgba(255, 69, 0, 0.3)",
  },
  customMessageSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
    paddingTop: Spacing.xl,
  },
  customLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
  },
  customInputRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dark.cardBorder,
  },
});
