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
  // Card view styles
  card: {
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
  cardMember: {
    fontSize: 12,
    marginBottom: 2,
    color: "#444444",
  },
  // Simple view styles
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f1f1f1',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333333',
  },
  tableCell: {
    flex: 1,
    fontSize: 11,
    color: '#444444',
    paddingHorizontal: 5,
  },
  dateCell: {
    flex: 1.5,
    fontSize: 11,
    color: '#444444',
    paddingHorizontal: 5,
  },
});

interface RosterPDFProps {
  month: Date;
  rosterData: {
    [key: string]: User[];
  };
  viewType?: "card" | "simple";
}

export function RosterPDF({ month, rosterData, viewType = "card" }: RosterPDFProps) {
  // Sort users consistently by last name, then first name
  const sortUsers = (a: User, b: User) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    return lastNameCompare !== 0
      ? lastNameCompare
      : a.firstName.localeCompare(b.firstName);
  };
  
  // Convert date strings to Date objects for sorting
  const sortedDates = Object.keys(rosterData)
    .map(date => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime());
  
  // Format for display in the roster
  const formatName = (user: User) => `${user.firstName} ${user.lastName}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>ElServe Roster</Text>
        <Text style={styles.subHeader}>
          {format(month, "MMMM yyyy")}
        </Text>

        {viewType === "card" ? (
          // Card View
          sortedDates.map(date => {
            const dateStr = date.toString();
            const users = rosterData[dateStr] || [];
            
            return (
              <View key={dateStr} style={styles.section}>
                <Text style={styles.serviceDate}>
                  {format(date, "EEEE, MMMM d, yyyy")}
                </Text>
                <View style={styles.memberList}>
                  {users.length > 0 ? (
                    users
                      .sort(sortUsers)
                      .map((user) => (
                        <Text key={user.id} style={styles.member}>
                          • {formatName(user)}
                        </Text>
                      ))
                  ) : (
                    <Text style={styles.noMembers}>No members available</Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          // Simple View (Table)
          <View style={styles.section}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.dateCell}>Service Date</Text>
              <Text style={styles.tableCell}>Members</Text>
            </View>
            
            {sortedDates.map(date => {
              const dateStr = date.toString();
              const users = rosterData[dateStr] || [];
              
              return (
                <View key={dateStr} style={styles.tableRow}>
                  <Text style={styles.dateCell}>
                    {format(date, "MM/dd/yyyy")}
                  </Text>
                  <Text style={styles.tableCell}>
                    {users.length > 0 
                      ? users.sort(sortUsers).map(user => formatName(user)).join(", ")
                      : "No members available"
                    }
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Page>
    </Document>
  );
}
