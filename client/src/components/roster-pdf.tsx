import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { User, Verse } from "@shared/schema";
import { PDFVerse } from "./pdf-verse";

// Register custom fonts for enhanced typography
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/montserrat/v15/JTUSjIg1_i6t8kCHKm459Wlhzg.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/montserrat/v15/JTURjIg1_i6t8kCHKm45_bZF3gnD-w.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/montserrat/v15/JTURjIg1_i6t8kCHKm45_dJE3gnD-w.ttf', fontWeight: 700 },
  ]
});

Font.register({
  family: 'Lora',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/lora/v16/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkqg.ttf', fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/lora/v16/0QI8MX1D_JOuMw_hLdO6T2wV9KnW-MoFoq92mQ.ttf', fontStyle: 'italic' },
  ]
});

// Enhanced color palette
const colors = {
  primary: '#4a6da7',
  primaryLight: '#edf2f9',
  secondary: '#3d5a80',
  accent: '#718ecc',
  darkText: '#23304e',
  mediumText: '#4e5d79',
  lightText: '#8c9bb5',
  background: '#ffffff',
  divider: '#e1e8f5',
  tableHeader: '#f0f4fa',
  cardBg: '#f8fafd',
  highlight: '#f1f8ff',
  danger: '#e63946',
};

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: colors.background,
    padding: 40,
    fontFamily: 'Montserrat',
  },
  header: {
    fontSize: 28,
    marginBottom: 5,
    textAlign: "center",
    color: colors.primary,
    fontWeight: 700,
    fontFamily: 'Montserrat',
  },
  headerBar: {
    height: 4,
    width: 100,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    marginBottom: 15,
    borderRadius: 2,
  },
  churchName: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
    color: colors.mediumText,
    fontFamily: 'Montserrat',
    fontWeight: 600,
  },
  subHeader: {
    fontSize: 14,
    marginBottom: 25,
    color: colors.accent,
    textAlign: "center",
    fontFamily: 'Lora',
    fontStyle: 'italic',
  },
  copyright: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 9,
    color: colors.lightText,
    fontFamily: 'Montserrat',
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    left: 40,
    fontSize: 9,
    color: colors.lightText,
    fontFamily: 'Montserrat',
  },
  section: {
    margin: 0,
    marginBottom: 15,
    padding: 15,
    flexGrow: 1,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  serviceDate: {
    fontSize: 16,
    marginBottom: 12,
    color: colors.darkText,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    fontWeight: 600,
    fontFamily: 'Montserrat',
  },
  memberList: {
    marginLeft: 20,
    marginTop: 5,
  },
  member: {
    fontSize: 12,
    marginBottom: 5,
    color: colors.mediumText,
    fontFamily: 'Lora',
  },
  noMembers: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.lightText,
    fontFamily: 'Lora',
  },
  // Card view styles with enhanced design
  card: {
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 6,
    backgroundColor: colors.cardBg,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardMember: {
    fontSize: 12,
    marginBottom: 4,
    color: colors.mediumText,
    fontFamily: 'Lora',
  },
  // Simple view styles with better typography
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: colors.tableHeader,
    fontWeight: 'bold',
    fontSize: 12,
    color: colors.darkText,
    fontFamily: 'Montserrat',
  },
  tableCell: {
    flex: 1,
    fontSize: 11,
    color: colors.mediumText,
    paddingHorizontal: 8,
    fontFamily: 'Lora',
  },
  dateCell: {
    flex: 1.5,
    fontSize: 11,
    color: colors.darkText,
    paddingHorizontal: 8,
    fontFamily: 'Montserrat',
    fontWeight: 600,
  },
  decorativeLine: {
    height: 1,
    backgroundColor: colors.accent,
    width: '100%',
    marginVertical: 15,
    opacity: 0.3,
  },
  cornerDecoration: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 60,
    height: 60,
    opacity: 0.07,
  },
  footerDecoration: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 30,
    opacity: 0.05,
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
  const formatName = (user: User) => {
    if (viewType === "simple" && user.initials) {
      // Use custom initials when in simple view
      return user.initials;
    }
    return `${user.firstName} ${user.lastName}`;
  };

  // Add role-specific styles with enhanced design
  const roleStyles = StyleSheet.create({
    roleSection: {
      marginBottom: 15,
    },
    roleName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.darkText,
      marginBottom: 7,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      fontFamily: 'Montserrat',
    },
    roleUsers: {
      marginLeft: 20,
    },
    roleUser: {
      fontSize: 12,
      marginBottom: 4,
      color: colors.mediumText,
      fontFamily: 'Lora',
    },
    noRoleUsers: {
      fontSize: 11,
      fontStyle: 'italic',
      color: colors.lightText,
      marginLeft: 20,
      marginBottom: 7,
      fontFamily: 'Lora',
    },
    // Roles table view with enhanced design
    roleTable: {
      marginTop: 10,
    },
    roleRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      marginBottom: 4,
    },
    roleNameCell: {
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
      color: colors.secondary,
      paddingHorizontal: 8,
      fontFamily: 'Montserrat',
    },
    roleUsersCell: {
      flex: 2,
      fontSize: 12,
      color: colors.mediumText,
      paddingHorizontal: 8,
      fontFamily: 'Lora',
    },
    roleAltRow: {
      backgroundColor: colors.highlight,
    },
  });

  return (
    <Document {...props}>
      <Page size="A4" style={styles.page} wrap>
        {/* Create a decorative SVG for the top left corner */}
        <View style={styles.cornerDecoration}>
          <Text style={{
            color: colors.primary,
            fontSize: 50,
            opacity: 0.3,
            fontFamily: 'Montserrat',
            fontWeight: 'bold',
          }}>EG</Text>
        </View>
        
        {/* Main header section */}
        <Text style={styles.header}>ElServe</Text>
        <View style={styles.headerBar} />
        <Text style={styles.churchName}>El Gibbor IFC Sunday Roster</Text>
        <Text style={styles.subHeader}>
          {format(month, "MMMM yyyy")}
        </Text>
        
        {/* Decorative top divider */}
        <View style={styles.decorativeLine} />
        
        {/* Page number and copyright info */}
        <Text style={styles.pageNumber}>Page 1</Text>
        <Text style={styles.copyright}>ElGibbor IFC © {new Date().getFullYear()}</Text>

        {viewType === "roles" ? (
          // Roles View - for service assignments
          <>
            {sortedDates.map(date => {
              const isoDateStr = date.toISOString();
              const rolesForDate = processedServiceRoster[isoDateStr] || {};
              const hasAssignments = Object.keys(rolesForDate).length > 0;
              
              return (
                <View key={isoDateStr} style={styles.section}>
                  {/* Service date with icon effect */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: 3, 
                      backgroundColor: colors.accent, 
                      marginRight: 8 
                    }} />
                    <Text style={styles.serviceDate}>
                      {format(date, "EEEE, MMMM d, yyyy")}
                    </Text>
                  </View>
                  
                  {hasAssignments ? (
                    <View style={roleStyles.roleTable}>
                      {/* Role assignments with alternating row colors */}
                      {Object.entries(rolesForDate).map(([roleName, users], index) => (
                        <View 
                          key={`${isoDateStr}-${roleName}`} 
                          style={roleStyles.roleRow}
                        >
                          <Text style={roleStyles.roleNameCell}>
                            {roleName}
                          </Text>
                          <Text style={roleStyles.roleUsersCell}>
                            {users.length > 0 
                              ? users.sort(sortUsers).map(user => formatName(user)).join(", ")
                              : <Text style={{ fontStyle: 'italic', color: colors.lightText }}>
                                  (Unassigned)
                                </Text>
                            }
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ 
                      padding: 15, 
                      backgroundColor: colors.highlight, 
                      borderRadius: 4,
                      marginTop: 10, 
                      alignItems: 'center'
                    }}>
                      <Text style={[styles.noMembers, { textAlign: 'center' }]}>
                        No role assignments for this service date
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
            
            {/* Display verse at the bottom with decorative elements */}
            {verse && (
              <>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginTop: 15, 
                  marginBottom: 5
                }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                  <Text style={{ 
                    margin: 6, 
                    color: colors.accent, 
                    fontSize: 10, 
                    fontFamily: 'Montserrat',
                    fontWeight: 600,
                  }}>VERSE OF THE MONTH</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                </View>
                <PDFVerse verse={verse} />
              </>
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
            
            {/* Display verse at the bottom with decorative elements */}
            {verse && (
              <>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginTop: 15, 
                  marginBottom: 5
                }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                  <Text style={{ 
                    margin: 6, 
                    color: colors.accent, 
                    fontSize: 10, 
                    fontFamily: 'Montserrat',
                    fontWeight: 600,
                  }}>VERSE OF THE MONTH</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                </View>
                <PDFVerse verse={verse} />
              </>
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
            
            {/* Display verse at the bottom with decorative elements */}
            {verse && (
              <>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginTop: 15, 
                  marginBottom: 5
                }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                  <Text style={{ 
                    margin: 6, 
                    color: colors.accent, 
                    fontSize: 10, 
                    fontFamily: 'Montserrat',
                    fontWeight: 600,
                  }}>VERSE OF THE MONTH</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                </View>
                <PDFVerse verse={verse} />
              </>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
