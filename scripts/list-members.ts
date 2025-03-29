
import { db } from '../server/db';
import { users } from '../shared/schema';

async function listMembers() {
  try {
    const members = await db.select().from(users);
    
    console.log('\nMember List:');
    console.log('====================');
    members.sort((a, b) => a.id - b.id).forEach(member => {
      console.log(`ID: ${member.id}`);
      console.log(`Name: ${member.firstName} ${member.lastName}`);
      console.log(`Initials: ${member.initials}`);
      console.log('--------------------');
    });
  } catch (error) {
    console.error('Error fetching members:', error);
  } finally {
    process.exit(0);
  }
}

listMembers();
