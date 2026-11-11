import { getUserFromFirestore } from './src/lib/firebase';

async function test() {
  console.log("--- Testing lowercase 9876543321v ---");
  const u1 = await getUserFromFirestore('9876543321v');
  console.log("u1:", u1?.name, "key:", u1?.key, "pw:", u1?.password, "tempCode:", u1?.tempCode, "isTemp:", u1?.isTemporaryPassword);

  console.log("--- Testing uppercase 9876543321V ---");
  const u2 = await getUserFromFirestore('9876543321V');
  console.log("u2:", u2?.name, "key:", u2?.key, "pw:", u2?.password, "tempCode:", u2?.tempCode, "isTemp:", u2?.isTemporaryPassword);

  console.log("--- Testing numeric 9876543321 ---");
  const u3 = await getUserFromFirestore('9876543321');
  console.log("u3:", u3?.name, "key:", u3?.key, "pw:", u3?.password, "tempCode:", u3?.tempCode, "isTemp:", u3?.isTemporaryPassword);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
