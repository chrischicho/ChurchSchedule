import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { Verse } from "@shared/schema";

const styles = StyleSheet.create({
  verseContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  verseText: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#444444",
    marginBottom: 5,
  },
  verseReference: {
    fontSize: 8,
    textAlign: "right",
    color: "#666666",
  },
});

interface PDFVerseProps {
  verse: Verse;
}

export function PDFVerse({ verse }: PDFVerseProps) {
  return (
    <View style={styles.verseContainer}>
      <Text style={styles.verseText}>"{verse.text}"</Text>
      <Text style={styles.verseReference}>— {verse.reference}</Text>
    </View>
  );
}