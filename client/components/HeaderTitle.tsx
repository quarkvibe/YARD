import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";

export function HeaderTitle() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>YARD</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.dark.chalk,
  },
});
