import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { User, Verse } from "@shared/schema";
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
  // Standard availability-based roster data (legacy format)
  rosterData?: {
    [key: string]: User[];
  };
  // New service role-based roster data
  serviceRoster?: {
    [dateStr: string]: {
      [roleName: string]: User[];
    }
  };
  viewType?: "card" | "simple" | "roles";
  verse?: Verse;
}

export function RosterPDF({ month, rosterData, serviceRoster, viewType = "card", verse, ...props }: RosterPDFProps & React.ComponentProps<typeof Document>) {
  // Sort users consistently by last name, then first name
  const sortUsers = (a: User, b: User) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    return lastNameCompare !== 0
      ? lastNameCompare
      : a.firstName.localeCompare(b.firstName);
  };
  
  // Define data structures for different view types
  let processedRosterData: { [key: string]: User[] } = {};
  let processedServiceRoster: { 
    [normalizedDateStr: string]: { 
      [roleName: string]: User[]
    } 
  } = {};
  
  // Get dates and normalize them for consistent handling
  let sortedDates: Date[] = [];
  
  if (viewType === "roles" && serviceRoster) {
    // Process service roster data with roles
    Object.entries(serviceRoster).forEach(([dateStr, roleAssignments]) => {
      const dateObj = new Date(dateStr);
      const normalizedDateStr = dateObj.toISOString();
      
      processedServiceRoster[normalizedDateStr] = roleAssignments;
    });
    
    // Get sorted dates for service roster
    sortedDates = Object.keys(processedServiceRoster)
      .map(date => new Date(date))
      .sort((a, b) => a.getTime() - b.getTime());
  } else if (rosterData) {
    // Process regular roster data (availability-based)
    Object.entries(rosterData).forEach(([dateStr, users]) => {
      const dateObj = new Date(dateStr);
      const normalizedDateStr = dateObj.toISOString();
      processedRosterData[normalizedDateStr] = users;
    });
    
    // Get sorted dates for regular roster
    sortedDates = Object.keys(processedRosterData)
      .map(date => new Date(date))
      .sort((a, b) => a.getTime() - b.getTime());
  }
  
  // Format for display in the roster
  const formatName = (user: User) => `${user.firstName} ${user.lastName}`;

  // Add role-specific styles
  const roleStyles = StyleSheet.create({
    roleSection: {
      marginBottom: 15,
    },
    roleName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#444444',
      marginBottom: 5,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: '#eeeeee',
    },
    roleUsers: {
      marginLeft: 15,
    },
    roleUser: {
      fontSize: 12,
      marginBottom: 3,
      color: '#555555',
    },
    noRoleUsers: {
      fontSize: 11,
      fontStyle: 'italic',
      color: '#888888',
      marginLeft: 15,
      marginBottom: 5,
    },
    // Roles table view
    roleTable: {
      marginTop: 10,
      marginBottom: 20,
    },
    roleRow: {
      flexDirection: 'row',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#eeeeee',
    },
    roleNameCell: {
      flex: 1,
      fontSize: 12,
      fontWeight: 'bold',
      color: '#444444',
      paddingHorizontal: 5,
    },
    roleUsersCell: {
      flex: 2,
      fontSize: 11,
      color: '#555555',
      paddingHorizontal: 5,
    },
  });

  return (
    <Document {...props}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>ElServe</Text>
        <Text style={styles.churchName}>El Gibbor IFC Sunday Roster</Text>
        <Text style={styles.subHeader}>
          {format(month, "MMMM yyyy")}
        </Text>
        <Text style={styles.copyright}>ElGibbor IFC ©</Text>

        {viewType === "roles" ? (
          // Roles View - for service assignments
          <>
            {sortedDates.map(date => {
              const isoDateStr = date.toISOString();
              const rolesForDate = processedServiceRoster[isoDateStr] || {};
              const hasAssignments = Object.keys(rolesForDate).length > 0;
              
              return (
                <View key={isoDateStr} style={styles.section}>
                  <Text style={styles.serviceDate}>
                    {format(date, "EEEE, MMMM d, yyyy")}
                  </Text>
                  
                  {hasAssignments ? (
                    <View style={roleStyles.roleTable}>
                      {/* Role assignments */}
                      {Object.entries(rolesForDate).map(([roleName, users], index) => (
                        <View key={`${isoDateStr}-${roleName}`} style={roleStyles.roleRow}>
                          <Text style={roleStyles.roleNameCell}>{roleName}:</Text>
                          <Text style={roleStyles.roleUsersCell}>
                            {users.length > 0 
                              ? users.sort(sortUsers).map(user => formatName(user)).join(", ")
                              : "(Unassigned)"
                            }
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noMembers}>No role assignments for this date</Text>
                  )}
                </View>
              );
            })}
            
            {/* Display verse at the bottom */}
            {verse && (
              <View style={{ marginTop: 20, padding: 10 }}>
                <PDFVerse verse={verse} />
              </View>
            )}
          </>
        ) : viewType === "card" ? (
          // Card View - for availability
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
                            • {formatName(user)}
                          </Text>
                        ))
                    ) : (
                      <Text style={styles.noMembers}>No members available</Text>
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
          // Simple View (Table) - for availability
          <View style={styles.section}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.dateCell}>Service Date</Text>
              <Text style={styles.tableCell}>Members</Text>
            </View>
            
            {sortedDates.map(date => {
              const isoDateStr = date.toISOString();
              const users = processedRosterData[isoDateStr] || [];
              
              return (
                <View key={isoDateStr} style={styles.tableRow}>
                  <Text style={styles.dateCell}>
                    {format(date, "dd/MM/yyyy")}
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
            
            {/* Display verse at the bottom of the table if provided */}
            {verse && <PDFVerse verse={verse} />}
          </View>
        )}
      </Page>
    </Document>
  );
}
