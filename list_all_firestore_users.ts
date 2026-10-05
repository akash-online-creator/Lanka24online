import { getAllMatchingUsersFromFirestore, getUserFromFirestore } from './src/lib/firebase';

async function main() {
  console.log("Checking user with 9876543321V...");
  const u1 = await getUserFromFirestore('9876543321V');
  console.log("u1:", u1 ? { id: u1.id, name: u1.name, key: u1.key, password: u1.password, isTemp: u1.isTemporaryPassword } : null);

  console.log("Checking user with 9876543321...");
  const u2 = await getUserFromFirestore('9876543321');
  console.log("u2:", u2 ? { id: u2.id, name: u2.name, key: u2.key, password: u2.password, isTemp: u2.isTemporaryPassword } : null);

  console.log("Checking all matches for 9876543321V...");
  const matches = await getAllMatchingUsersFromFirestore('9876543321V');
  console.log("matches count:", matches.length);
  matches.forEach(m => console.log("Match Doc:", m.id, "Name:", m.name, "Key:", m.key, "Password:", m.password));
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
