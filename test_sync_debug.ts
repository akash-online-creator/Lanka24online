import { syncUserPasswordInFirestore, getUserFromFirestore } from './src/lib/firebase';

async function test() {
  console.log("Fetching user 9876543321V...");
  const user = await getUserFromFirestore('9876543321V');
  console.log("Current user:", user);

  console.log("Calling syncUserPasswordInFirestore with 'testPass123'...");
  await syncUserPasswordInFirestore(user, 'testPass123');

  console.log("Re-fetching user 9876543321V...");
  const userAfter = await getUserFromFirestore('9876543321V');
  console.log("After update:", userAfter);

  console.log("Re-fetching user with 9876543321...");
  const userAfterNumeric = await getUserFromFirestore('9876543321');
  console.log("After update numeric:", userAfterNumeric);

  console.log("Resetting back to 545554...");
  await syncUserPasswordInFirestore(user, '545554');
}

test().then(() => process.exit(0)).catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
