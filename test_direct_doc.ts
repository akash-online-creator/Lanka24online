import { db } from './src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function test() {
  console.time("directDoc");
  const snap = await getDoc(doc(db, 'users', '9876543321'));
  console.timeEnd("directDoc");
  console.log("Found:", snap.exists(), snap.data()?.name);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
