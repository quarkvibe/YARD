import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Share,
  Alert,
  Image,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { ConcreteBackground } from "@/components/ConcreteBackground";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import {
  UserProfile,
  getProfile,
  saveProfile,
  getWorkouts,
  getBestTime,
  formatDuration,
} from "@/lib/storage";
import { checkRecYardAccess } from "@/lib/purchases";
import { supabase, ensureAuthenticated } from "@/lib/supabase";

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const [hapticsEnabled] = useState(true);
  
  // Supabase profile ID for syncing
  const supabaseProfileIdRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProfileRef = useRef<UserProfile | null>(null);

  // Stats
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [totalPushups, setTotalPushups] = useState(0);
  const [totalSquats, setTotalSquats] = useState(0);

  // Debounced sync to Supabase - waits 1 second after last change
  // Fetches Supabase profile directly to avoid stale refs
  const syncToSupabase = useCallback((localProfile: UserProfile) => {
    pendingProfileRef.current = localProfile;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      const profileToSync = pendingProfileRef.current;
      if (!profileToSync) return;
      
      try {
        const userId = await ensureAuthenticated();
        if (!userId) return;
        
        // Always check for current Supabase profile (not relying on stale ref)
        const { data: supabaseProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (!supabaseProfile) {
          // User doesn't have a Rec Yard profile yet, skip sync
          return;
        }
        
        // Update the ref for future checks
        supabaseProfileIdRef.current = supabaseProfile.id;
        
        const { error } = await supabase
          .from("profiles")
          .update({
            handle: profileToSync.handle.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
            display_name: profileToSync.displayName,
            bio: profileToSync.bio,
            instagram: profileToSync.instagram || "",
            tiktok: profileToSync.tiktok || "",
            twitter: profileToSync.twitter || "",
            youtube: profileToSync.youtube || "",
            discord: profileToSync.discord || "",
            threads: profileToSync.threads || "",
          })
          .eq("id", supabaseProfile.id)
          .eq("user_id", userId);
          
        if (error) {
          console.error("[ProfileScreen] Supabase sync error:", error);
        } else {
          console.log("[ProfileScreen] Synced to Supabase");
        }
      } catch (err) {
        console.error("[ProfileScreen] Failed to sync to Supabase:", err);
      }
    }, 1000);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const loadData = useCallback(async () => {
    // Load profile
    const loadedProfile = await getProfile();
    setProfile(loadedProfile);

    // Check subscription status
    const subStatus = await checkRecYardAccess();
    setIsSubscribed(subStatus.isSubscribed);
    
    // Check if user has a Supabase Rec Yard profile
    try {
      const userId = await ensureAuthenticated();
      if (userId) {
        const { data: supabaseProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (supabaseProfile) {
          supabaseProfileIdRef.current = supabaseProfile.id;
        }
      }
    } catch (err) {
      console.error("[ProfileScreen] Error checking Supabase profile:", err);
    }

    // Load stats from workout history
    const workouts = await getWorkouts();
    setTotalWorkouts(workouts.length);

    const best = getBestTime(workouts, "standard");
    setBestTime(best);

    const pushups = workouts.reduce((sum, w) => sum + (w.totalPushups || 0), 0);
    const squats = workouts.reduce((sum, w) => sum + (w.totalSquats || 0), 0);
    setTotalPushups(pushups);
    setTotalSquats(squats);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticsEnabled]);

  const handleProfileChange = async (key: keyof UserProfile, value: string) => {
    if (!profile) return;

    const newProfile = { ...profile, [key]: value };
    setProfile(newProfile);
    await saveProfile(newProfile);
    
    // Sync to Supabase if user has a Rec Yard profile (debounced)
    syncToSupabase(newProfile);
  };

  const handlePickPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "PERMISSION REQUIRED",
          "Please allow access to your photos to set a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;

        if (profile) {
          const newProfile = { ...profile, photoUri };
          setProfile(newProfile);
          await saveProfile(newProfile);
          syncToSupabase(newProfile);
          triggerHaptic();
        }
      }
    } catch (error) {
      console.error("Photo picker error:", error);
      Alert.alert("ERROR", "Failed to select photo. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "PERMISSION REQUIRED",
          "Please allow camera access to take a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;

        if (profile) {
          const newProfile = { ...profile, photoUri };
          setProfile(newProfile);
          await saveProfile(newProfile);
          syncToSupabase(newProfile);
          triggerHaptic();
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("ERROR", "Failed to take photo. Please try again.");
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert("PROFILE PHOTO", "Choose how to set your profile photo", [
      { text: "TAKE PHOTO", onPress: handleTakePhoto },
      { text: "CHOOSE FROM LIBRARY", onPress: handlePickPhoto },
      ...(profile?.photoUri
        ? [
            {
              text: "REMOVE PHOTO",
              style: "destructive" as const,
              onPress: async () => {
                if (profile) {
                  const newProfile = { ...profile, photoUri: undefined };
                  setProfile(newProfile);
                  await saveProfile(newProfile);
                  syncToSupabase(newProfile);
                }
              },
            },
          ]
        : []),
      { text: "CANCEL", style: "cancel" as const },
    ]);
  };

  const handleShareProfile = async () => {
    if (!profile?.handle) {
      Alert.alert(
        "SET UP PROFILE",
        "Add your handle first to share your profile!",
      );
      return;
    }

    try {
      const socials = [
        profile.instagram && `📸 @${profile.instagram}`,
        profile.tiktok && `🎵 @${profile.tiktok}`,
        profile.twitter && `🐦 @${profile.twitter}`,
        profile.youtube && `📺 ${profile.youtube}`,
        profile.threads && `🧵 @${profile.threads}`,
      ]
        .filter(Boolean)
        .join("\n");

      let message = `💪 YARD FITNESS PROFILE\n\n`;
      message += `@${profile.handle}`;
      if (profile.displayName) {
        message += ` (${profile.displayName})`;
      }
      message += `\n`;

      if (profile.bio) {
        message += `\n"${profile.bio}"\n`;
      }

      message += `\n📊 STATS\n`;
      message += `🏋️ ${totalWorkouts} Workouts\n`;
      message += `💪 ${totalPushups.toLocaleString()} Pushups\n`;
      message += `🦵 ${totalSquats.toLocaleString()} Squats\n`;
      if (bestTime) {
        message += `⏱️ Best: ${formatDuration(bestTime)}\n`;
      }

      if (socials) {
        message += `\n${socials}\n`;
      }

      message += `\n🏋️ Download YARD Fitness and start your sentence today!`;

      await Share.share({ message });
      triggerHaptic();
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  if (!profile) {
    return (
      <ConcreteBackground intensity="light" showCracks={true}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>LOADING...</ThemedText>
        </View>
      </ConcreteBackground>
    );
  }

  return (
    <ConcreteBackground intensity="light" showCracks={true}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.xl,
        }}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Pressable onPress={handlePhotoOptions} style={styles.photoContainer}>
            {profile.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Feather
                  name="user"
                  size={40}
                  color={Colors.dark.textSecondary}
                />
              </View>
            )}
            <View style={styles.photoEditBadge}>
              <Feather
                name="camera"
                size={14}
                color={Colors.dark.backgroundRoot}
              />
            </View>
          </Pressable>

          <View style={styles.headerInfo}>
            {profile.handle ? (
              <ThemedText style={styles.handleText}>
                @{profile.handle}
              </ThemedText>
            ) : (
              <ThemedText style={styles.noHandleText}>
                Set your handle
              </ThemedText>
            )}
            {profile.displayName ? (
              <ThemedText style={styles.displayNameText}>
                {profile.displayName}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Subscription Badge */}
        <View
          style={[
            styles.subscriptionBadge,
            isSubscribed && styles.subscriptionBadgeActive,
          ]}
        >
          <Feather
            name={isSubscribed ? "award" : "lock"}
            size={16}
            color={
              isSubscribed
                ? Colors.dark.backgroundRoot
                : Colors.dark.textSecondary
            }
          />
          <ThemedText
            style={[
              styles.subscriptionText,
              isSubscribed && styles.subscriptionTextActive,
            ]}
          >
            {isSubscribed ? "REC YARD MEMBER" : "FREE USER"}
          </ThemedText>
          {!isSubscribed && (
            <Pressable
              onPress={() => navigation.navigate("RecYardTab")}
              style={styles.upgradeButton}
            >
              <ThemedText style={styles.upgradeButtonText}>JOIN</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>{totalWorkouts}</ThemedText>
            <ThemedText style={styles.statLabel}>WORKOUTS</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText
              style={[styles.statValue, { color: Colors.dark.pushups }]}
            >
              {totalPushups.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.statLabel}>PUSHUPS</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText
              style={[styles.statValue, { color: Colors.dark.squats }]}
            >
              {totalSquats.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.statLabel}>SQUATS</ThemedText>
          </View>
        </View>

        {bestTime && (
          <View style={styles.bestTimeCard}>
            <Feather name="zap" size={20} color={Colors.dark.accent} />
            <View style={styles.bestTimeInfo}>
              <ThemedText style={styles.bestTimeLabel}>BEST TIME</ThemedText>
              <ThemedText style={styles.bestTimeValue}>
                {formatDuration(bestTime)}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Edit Profile Section */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>PROFILE</ThemedText>
          <Pressable
            onPress={() => {
              setIsEditing(!isEditing);
              triggerHaptic();
            }}
            style={styles.editButton}
          >
            <Feather
              name={isEditing ? "check" : "edit-2"}
              size={16}
              color={Colors.dark.accent}
            />
            <ThemedText style={styles.editButtonText}>
              {isEditing ? "DONE" : "EDIT"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          {/* Handle */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>HANDLE</ThemedText>
            <View style={styles.handleInputRow}>
              <ThemedText style={styles.handlePrefix}>@</ThemedText>
              <TextInput
                style={styles.handleInput}
                value={profile.handle || ""}
                onChangeText={(text) =>
                  handleProfileChange(
                    "handle",
                    text.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                  )
                }
                placeholder="YOUR_HANDLE"
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={20}
                autoCapitalize="characters"
                editable={isEditing}
              />
            </View>
          </View>

          {/* Display Name */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>DISPLAY NAME</ThemedText>
            <TextInput
              style={styles.textInput}
              value={profile.displayName || ""}
              onChangeText={(text) => handleProfileChange("displayName", text)}
              placeholder="Your Name"
              placeholderTextColor={Colors.dark.textSecondary}
              maxLength={30}
              editable={isEditing}
            />
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>BIO</ThemedText>
            <TextInput
              style={[styles.textInput, styles.bioInput]}
              value={profile.bio || ""}
              onChangeText={(text) => handleProfileChange("bio", text)}
              placeholder="Tell your story..."
              placeholderTextColor={Colors.dark.textSecondary}
              maxLength={150}
              multiline
              numberOfLines={3}
              editable={isEditing}
            />
          </View>
        </View>

        {/* Social Links */}
        <Pressable
          style={styles.socialLinksHeader}
          onPress={() => {
            setShowSocialLinks(!showSocialLinks);
            triggerHaptic();
          }}
        >
          <ThemedText style={styles.sectionTitle}>SOCIAL LINKS</ThemedText>
          <Feather
            name={showSocialLinks ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.dark.accent}
          />
        </Pressable>

        {showSocialLinks && (
          <View style={styles.socialLinksCard}>
            {/* Instagram */}
            <View style={styles.socialInputRow}>
              <ThemedText style={styles.socialIcon}>📸</ThemedText>
              <TextInput
                style={styles.socialInput}
                value={profile.instagram || ""}
                onChangeText={(text) => handleProfileChange("instagram", text)}
                placeholder="Instagram username"
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>

            {/* TikTok */}
            <View style={styles.socialInputRow}>
              <ThemedText style={styles.socialIcon}>🎵</ThemedText>
              <TextInput
                style={styles.socialInput}
                value={profile.tiktok || ""}
                onChangeText={(text) => handleProfileChange("tiktok", text)}
                placeholder="TikTok username"
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>

            {/* Twitter/X */}
            <View style={styles.socialInputRow}>
              <ThemedText style={styles.socialIcon}>🐦</ThemedText>
              <TextInput
                style={styles.socialInput}
                value={profile.twitter || ""}
                onChangeText={(text) => handleProfileChange("twitter", text)}
                placeholder="X / Twitter username"
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>

            {/* YouTube */}
            <View style={styles.socialInputRow}>
              <ThemedText style={styles.socialIcon}>📺</ThemedText>
              <TextInput
                style={styles.socialInput}
                value={profile.youtube || ""}
                onChangeText={(text) => handleProfileChange("youtube", text)}
                placeholder="YouTube channel"
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={50}
                autoCapitalize="none"
              />
            </View>

            {/* Discord */}
            <View style={styles.socialInputRow}>
              <ThemedText style={styles.socialIcon}>💬</ThemedText>
              <TextInput
                style={styles.socialInput}
                value={profile.discord || ""}
                onChangeText={(text) => handleProfileChange("discord", text)}
                placeholder="Discord username"
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={40}
                autoCapitalize="none"
              />
            </View>

            {/* Threads */}
            <View style={styles.socialInputRow}>
              <ThemedText style={styles.socialIcon}>🧵</ThemedText>
              <TextInput
                style={styles.socialInput}
                value={profile.threads || ""}
                onChangeText={(text) => handleProfileChange("threads", text)}
                placeholder="Threads username"
                placeholderTextColor={Colors.dark.textSecondary}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        {/* Share Profile Button */}
        <Pressable style={styles.shareButton} onPress={handleShareProfile}>
          <Feather
            name="share-2"
            size={20}
            color={Colors.dark.backgroundRoot}
          />
          <ThemedText style={styles.shareButtonText}>SHARE PROFILE</ThemedText>
        </Pressable>

        {/* Rec Yard Link (for free users) */}
        {!isSubscribed && (
          <View style={styles.recYardPromo}>
            <ThemedText style={styles.promoTitle}>
              🏆 JOIN THE REC YARD
            </ThemedText>
            <ThemedText style={styles.promoText}>
              Compete on leaderboards, challenge others, and prove you&apos;re
              the real deal. Your profile syncs to the cloud!
            </ThemedText>
            <Pressable
              style={styles.promoButton}
              onPress={() => navigation.navigate("RecYardTab")}
            >
              <ThemedText style={styles.promoButtonText}>LEARN MORE</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Rec Yard Sync Status (for subscribers) */}
        {isSubscribed && (
          <View style={styles.syncStatus}>
            <Feather name="cloud" size={16} color={Colors.dark.squats} />
            <ThemedText style={styles.syncText}>
              Profile synced to Rec Yard
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ConcreteBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
  },

  // Profile Header
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  photoContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.dark.accent,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.cardBackground,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  photoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.dark.backgroundRoot,
  },
  headerInfo: {
    alignItems: "center",
  },
  handleText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },
  noHandleText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  displayNameText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.chalk,
    marginTop: Spacing.xs,
  },

  // Subscription Badge
  subscriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  subscriptionBadgeActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  subscriptionText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  subscriptionTextActive: {
    color: Colors.dark.backgroundRoot,
  },
  upgradeButton: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.dark.backgroundRoot,
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: Spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  bestTimeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  bestTimeInfo: {
    flex: 1,
  },
  bestTimeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  bestTimeValue: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.textSecondary,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.dark.accent,
  },

  // Profile Card
  profileCard: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.dark.backgroundRoot,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  handleInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundRoot,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: Spacing.md,
  },
  handlePrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.accent,
    marginRight: 2,
  },
  handleInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.chalk,
  },

  // Social Links
  socialLinksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  socialLinksCard: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  socialInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  socialIcon: {
    fontSize: 18,
    width: 28,
    textAlign: "center",
  },
  socialInput: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.dark.chalk,
  },

  // Share Button
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },

  // Rec Yard Promo
  recYardPromo: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.accent,
    marginBottom: Spacing.sm,
  },
  promoText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  promoButton: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.dark.backgroundRoot,
  },

  // Sync Status
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  syncText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: Colors.dark.squats,
  },
});
