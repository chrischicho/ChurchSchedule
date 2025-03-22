import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { User } from "@shared/schema";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "#1a1a1a",
  },
  subHeader: {
    fontSize: 14,
    marginBottom: 10,
    color: "#666666",
    textAlign: "center",
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  serviceDate: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333333",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    paddingBottom: 5,
  },
  memberList: {
    marginLeft: 20,
  },
  member: {
    fontSize: 12,
    marginBottom: 5,
    color: "#444444",
  },
  noMembers: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#666666",
  },
});

interface RosterPDFProps {
  month: Date;
  rosterData: {
    [key: string]: User[];
  };
}

export function RosterPDF({ month, rosterData }: RosterPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>ElServe Roster</Text>
        <Text style={styles.subHeader}>
          {format(month, "MMMM yyyy")}
        </Text>

        {Object.entries(rosterData).map(([date, users]) => (
          <View key={date} style={styles.section}>
            <Text style={styles.serviceDate}>
              {format(new Date(date), "EEEE, MMMM d, yyyy")}
            </Text>
            <View style={styles.memberList}>
              {users.length > 0 ? (
                users
                  .sort((a, b) => {
                    const lastNameCompare = a.lastName.localeCompare(b.lastName);
                    return lastNameCompare !== 0
                      ? lastNameCompare
                      : a.firstName.localeCompare(b.firstName);
                  })
                  .map((user) => (
                    <Text key={user.id} style={styles.member}>
                      • {user.firstName} {user.lastName}
                    </Text>
                  ))
              ) : (
                <Text style={styles.noMembers}>No members available</Text>
              )}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
