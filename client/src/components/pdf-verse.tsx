import React from "react";
import { Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { Verse } from "@shared/schema";

// Ensure fonts are registered if not already done in parent component
Font.register({
  family: 'Lora',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/lora/v16/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkqg.ttf', fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/lora/v16/0QI8MX1D_JOuMw_hLdO6T2wV9KnW-MoFoq92mQ.ttf', fontStyle: 'italic' },
  ]
});

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/montserrat/v15/JTUSjIg1_i6t8kCHKm459Wlhzg.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/montserrat/v15/JTURjIg1_i6t8kCHKm45_bZF3gnD-w.ttf', fontWeight: 600 },
  ]
});

// Enhanced color palette matching roster PDF
const colors = {
  primary: '#4a6da7',
  accent: '#718ecc',
  mediumText: '#4e5d79',
  lightText: '#8c9bb5',
  divider: '#e1e8f5',
  background: '#f8fafd',
};

const styles = StyleSheet.create({
  verseContainer: {
    marginTop: 25,
    marginBottom: 10,
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.divider,
    position: 'relative',
  },
  quoteMarks: {
    position: 'absolute',
    top: -12,
    left: 20,
    fontSize: 40,
    color: colors.primary,
    opacity: 0.15,
    fontFamily: 'Lora',
    fontStyle: 'italic',
  },
  verseText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.mediumText,
    marginBottom: 8,
    lineHeight: 1.6,
    fontFamily: 'Lora',
    textAlign: 'justify',
  },
  verseReference: {
    fontSize: 9,
    textAlign: 'right',
    color: colors.lightText,
    fontFamily: 'Montserrat',
    fontWeight: 600,
  },
  horizontalLine: {
    height: 1,
    backgroundColor: colors.divider,
    width: '100%',
    marginBottom: 8,
  },
  category: {
    fontSize: 8,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'Montserrat',
    fontWeight: 600,
  }
});

interface PDFVerseProps {
  verse: Verse;
}

export function PDFVerse({ verse }: PDFVerseProps) {
  return (
    <View style={styles.verseContainer}>
      <Text style={styles.quoteMarks}>"</Text>
      
      {verse.category && (
        <Text style={styles.category}>Verse of Encouragement • {verse.category}</Text>
      )}
      
      <Text style={styles.verseText}>{verse.text}</Text>
      
      <View style={styles.horizontalLine} />
      <Text style={styles.verseReference}>— {verse.reference}</Text>
    </View>
  );
}