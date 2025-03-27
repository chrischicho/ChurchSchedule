import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { User, Verse, ServiceRole } from "@shared/schema";
import { PDFVerse } from "./pdf-verse";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
  },
  header: {
    fontSize: 24,
    marginBottom: 5,
    textAlign: "center",
    color: "#1a1a1a",
  },
  churchName: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#444444",
  },
  subHeader: {
    fontSize: 14,
    marginBottom: 10,
    color: "#666666",
    textAlign: "center",
  },
  copyright: {
    position: "absolute",
    bottom: 30,
    right: 30,
    fontSize: 10,
    color: "#999999",
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
  role: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
    color: "#333333",
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
  roleCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "bold",
    color: "#333333",
    paddingHorizontal: 5,
  },
  memberCell: {
    flex: 2,
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
  verse?: Verse;
}

export function RosterPDF({ month, rosterData, viewType = "card", verse, ...props }: RosterPDFProps & React.ComponentProps<typeof Document>) {
  // Sort users consistently by last name, then first name
  const sortUsers = (a: User, b: User) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    return lastNameCompare !== 0
      ? lastNameCompare
      : a.firstName.localeCompare(b.firstName);
  };
  
  // Convert date strings to Date objects for sorting and create a new object with proper date keys
  const processedRosterData: { [key: string]: User[] } = {};
  
  // Process the roster data with consistent date handling
  Object.entries(rosterData).forEach(([dateStr, users]) => {
    // Ensure we have a proper Date object
    const dateObj = new Date(dateStr);
    // Use a consistent date string format for keys
    const normalizedDateStr = dateObj.toISOString();
    processedRosterData[normalizedDateStr] = users;
  });
  
  // Get sorted dates for display
  const sortedDates = Object.keys(processedRosterData)
    .map(date => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime());
  
  // Format for display in the roster
  const formatName = (user: User) => `${user.firstName} ${user.lastName}`;

  return (
    <Document {...props}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>ElServe</Text>
        <Text style={styles.churchName}>El Gibbor IFC Sunday Roster</Text>
        <Text style={styles.subHeader}>
          {format(month, "MMMM yyyy")}
        </Text>
        <Text style={styles.copyright}>ElGibbor IFC ©</Text>

        {viewType === "card" ? (
          // Card View
          <>
            {sortedDates.map(date => {
              const isoDateStr = date.toISOString();
              const users = processedRosterData[isoDateStr] || [];
              
              return (
                <View key={isoDateStr} style={styles.section}>
                  <Text style={styles.serviceDate}>
                    {format(date, "EEEE, MMMM d, yyyy")}
                  </Text>
                  <View style={styles.memberList}>
                    {users.length > 0 ? (
                      users
                        .sort(sortUsers)
                        .map((user) => (
                          <Text key={user.id} style={styles.member}>
                            • {formatName(user)} {user.role && `(${user.role.name})`}
                          </Text>
                        ))
                    ) : (
                      <Text style={styles.noMembers}>No members assigned</Text>
                    )}
                  </View>
                </View>
              );
            })}
            
            {/* Display verse at the bottom of the card view if provided */}
            {verse && (
              <View style={{ marginTop: 20, padding: 10 }}>
                <PDFVerse verse={verse} />
              </View>
            )}
          </>
        ) : (
          // Simple View (Table)
          <View style={styles.section}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.dateCell}>Service Date</Text>
              <Text style={styles.roleCell}>Role</Text>
              <Text style={styles.memberCell}>Member</Text>
            </View>
            
            {sortedDates.map(date => {
              const isoDateStr = date.toISOString();
              const users = processedRosterData[isoDateStr] || [];
              
              return users.length > 0 ? (
                users.sort(sortUsers).map((user, idx) => (
                  <View key={`${isoDateStr}-${user.id}`} style={styles.tableRow}>
                    {idx === 0 ? (
                      <Text style={styles.dateCell}>
                        {format(date, "dd/MM/yyyy")}
                      </Text>
                    ) : (
                      <Text style={styles.dateCell}></Text>
                    )}
                    <Text style={styles.roleCell}>
                      {user.role ? user.role.name : ''}
                    </Text>
                    <Text style={styles.memberCell}>
                      {formatName(user)}
                    </Text>
                  </View>
                ))
              ) : (
                <View key={isoDateStr} style={styles.tableRow}>
                  <Text style={styles.dateCell}>
                    {format(date, "dd/MM/yyyy")}
                  </Text>
                  <Text style={styles.roleCell}></Text>
                  <Text style={styles.memberCell}>
                    No members assigned
                  </Text>
                </View>
              );
            })}
            
            {/* Display verse at the bottom of the table if provided */}
            {verse && (
              <View style={{ marginTop: 20, padding: 10 }}>
                <PDFVerse verse={verse} />
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
