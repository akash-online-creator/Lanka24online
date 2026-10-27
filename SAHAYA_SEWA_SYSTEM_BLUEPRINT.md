# 🏛️ සහය සේවා (Sahaya Sewa) - Master System Architecture & Technical Blueprint
> **ලේඛන වර්ගය:** සමස්ත පද්ධති නිර්මාණ සැලැස්ම (Complete System Architectural Specification)  
> **ව්‍යාපෘතිය:** Sahaya Sewa (සහය සේවා)  
> **ඉලක්කය:** AI Agents, Developers, සහ System Engineers සඳහා පද්ධතියේ ක්‍රියාකාරිත්වය, ගොනු ව්‍යුහය සහ දත්ත ගලායාම පැහැදිලි කිරීම.

---

## 1. 🌟 පද්ධති හඳුන්වාදීම සහ මූලික අරමුණ (System Overview)
**"සහය සේවා"** යනු ශ්‍රී ලංකාව තුළ ප්‍රජා උපකාර (Community Help), හදිසි ආපදා අනතුරු ඇඟවීම් (Red Alerts / Disaster Sirens), හදිසි ලේ අවශ්‍යතා (Blood Bank), ක්ෂණික කාර්මික සේවා (Quick & Professional Services), සහ ප්‍රජා වෙළඳපොළ (Marketplace & Price Index) ඒකාබද්ධ කර නිර්මාණය කර ඇති සජීවී (Real-time), බහුභාෂා (සිංහල, English, தமிழ்) වෙබ් සහ Android යෙදුමකි.

---

## 2. ⚙️ තාක්ෂණික එකතුව (Technology Stack)
* **Frontend Core:** React 19 (TypeScript), Vite 6, Tailwind CSS 4
* **State & Flow:** Central Orchestration State (`App.tsx`), Context API (`UserModeContext`)
* **Mobile & Native Bridge:** Capacitor 8 (Geolocation, Push Notifications, App Lifecycle)
* **Database & Auth:** Firebase Cloud Firestore (Real-time Listeners, Collections), Firebase Authentication
* **Backend Server:** Node.js (v20+), Express.js (`server.ts` running on port 3000)
* **AI & Intelligence:** Gemini API Integration (`/api/chat` proxy), Singlish Phonetic Search Parser

---

## 3. 🗺️ සමස්ත පද්ධති ගලායාමේ රූපසටහන (End-to-End System Workflow)

```
+-----------------------------------------------------------------------------------------------+
|                                      CLIENT LAYER (Web / Android APK)                         |
|  [LoginForm] <───> [RegisterForm] <───> [PendingApprovalView] <───> [DevicePinLoginView]      |
+-----------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+-----------------------------------------------------------------------------------------------+
|                         CENTRAL STATE ORCHESTRATOR (`src/App.tsx`)                            |
|   - Global Auth & Session Sync (`sahaya_sewa_session_user`)                                   |
|   - Real-time Firestore Listeners (`subscribeToUsers`, `subscribeToHelpPosts`, `subscribeToAlerts`)|
|   - Active View Routing (`login` | `register` | `dashboard` | `admin` | `pending` | `issues`)    |
+-----------------------------------------------------------------------------------------------+
         │                                                              │
         ▼                                                              ▼
+------------------------------------+        +-------------------------------------------------+
|       ADMIN CONSOLE LAYER          |        |             USER DASHBOARD LAYER                |
|  (`src/components/AdminPanel.tsx`) |        |       (`src/components/UserDashboard.tsx`)      |
|  - User Approvals & Moderation     |        |  - Unified Header (Wallet, GPS, Role Badge)     |
|  - Credit Ledger & Adjustment      |        |  - Category & Tag Filters / 3D Card Grid        |
|  - Disaster Siren Broadcaster      |        |  - Real-time Help Board (Posts, Map, Motorcycle)|
|  - Emergency Directory Manager     |        |  - 1-on-1 & Group Chats with Voice & Map Picker |
|  - Search Dictionary Synonyms      |        |  - Red Alert Banner & Proximity 5km Monitor     |
+------------------------------------+        +-------------------------------------------------+
                                                │
                                                ▼
+-----------------------------------------------------------------------------------------------+
|                               PERSISTENCE & SECURITY SERVICES                                 |
|  - `src/lib/firebase.ts` : Cloud Firestore (CRUD, Realtime Listeners, Collections)            |
|  - `src/utils/postOwnerHelper.ts` : RBAC Permissions (`checkIsAdmin`, `checkIsPostOwner`)      |
|  - `src/utils/deletedPostsManager.ts` : Permanent Deletion Blacklist Cache Engine             |
|  - `src/utils/creditManager.ts` : Virtual Credits & Transaction Ledger                        |
+-----------------------------------------------------------------------------------------------+
```

---

## 4. 📂 පද්ධති මොඩියුල සහ ගොනු නාමාවලිය (Detailed Module Blueprint)

### 🔐 A. පරිශීලක ප්‍රවේශය සහ ආරක්ෂාව (Authentication & Security)
* **`src/components/LoginForm.tsx`** : NIC අංකය සහ මුරපදය මඟින් ලොග් වීම. Admin සහ Demo Login පහසුකම.
* **`src/components/RegisterForm.tsx`** : නව සාමාජික ලියාපදිංචිය (නම, NIC, දුරකථන, ලිපිනය, ඡායාරූප).
* **`src/components/PendingApprovalView.tsx`** : පරිපාලක අනුමැතිය ලැබෙන තෙක් රැඳී සිටින තිරය.
* **`src/components/DevicePinLoginView.tsx`** : 4-digit PIN අංකය මඟින් මුරපදයක් නොමැතිව ක්ෂණිකව පිවිසීම.
* **`src/utils/postOwnerHelper.ts`** :
  * `checkIsAdmin(user)`: පරිශීලකයා Admin ද යන්න නිවැරදිව තහවුරු කිරීම (User Mode එකේදී පවා).
  * `checkIsPostOwner(user, post)`: දැන්වීමේ සැබෑ අයිතිකරු හඳුනාගැනීම.
  * `canManagePost(user, post)`: Edit / Delete සඳහා අවසර පරීක්ෂාව.

---

### 🚨 B. රතු එළිය සහ හදිසි ආපදා ප්‍රතිචාරය (Red Alert & Disaster Subsystem)
* **`src/components/RedAlertBanner.tsx`** : සක්‍රීය ආපදා පිළිබඳව Header එකේ පෙන්වන රතු අනතුරු ඇඟවීමේ තීරුව.
* **`src/components/RedAlertFloatingTrigger.tsx`** : ක්ෂණිකව SOS ආපදා වාර්තා කරන පාවෙන බොත්තම.
* **`src/components/RedAlertCreateModal.tsx`** : ආපදාවේ වර්ගය, GPS ස්ථානය, විස්තර ඇතුළත් කර Submit කිරීම.
* **`src/components/RedAlertProximityModal.tsx`** : පරිශීලකයා ආපදා ස්ථානයේ සිට **කි.මී. 5ක් හෝ 2ක්** ඇතුළත සිටින විට සයිරන් නාදය සමඟ මතුවන හදිසි Pop-up තිරය.
* **`src/utils/sirenAudio.ts`** : AudioContext මඟින් සයිරන් නාදය නිපදවීම සහ සෙල්ලම් කිරීම (Audio playback).
* **`src/components/SriLankaDisasterMap.tsx`** : ශ්‍රී ලංකා සිතියම මත සියලුම ආපදා සහ සහනාධාර ස්ථාන පෙන්වීම.

---

### 📋 C. ප්‍රජා දැන්වීම් සහ උපකාර පුවරුව (Community Help Posts)
* **`src/components/PostCard.tsx`** : 
  * සෑම දැන්වීමක් සඳහාම 3D Card අතුරුමුහුණත.
  * ගතවූ කාලය (Elapsed Time), යතුරුපැදි ගමන් දුර (Motorcycle Road Distance) සහ Google Maps Link.
  * Admin හෝ අයිතිකරු සඳහා **Edit (සංස්කරණය)** සහ **Delete (මකා දැමීම)** බොත්තම්.
* **`src/components/HelpPostModal.tsx`** : නව උපකාර ඉල්ලීමක් පළ කිරීමේ පෝරමය.
* **`src/components/ViewHelpPostModal.tsx`** : දැන්වීමේ සම්පූර්ණ විස්තරය සහ Chat ඉතිහාසය පෙන්වීම.
* **`src/utils/deletedPostsManager.ts`** :
  * `addDeletedPostId(id)`: මකා දැමූ Post IDs LocalStorage හි සදාකාලිකව Blacklist කිරීම.
  * `filterNonDeletedPosts(posts)`: Delete කළ දැන්වීම් නැවත මතුවීම වැළැක්වීමේ Filter Engine එක.

---

### 💬 D. සන්නිවේදනය සහ චැට් පද්ධතිය (Communication & Messaging)
* **`src/components/MessageInboxModal.tsx`** : සාමාජිකයින් අතර 1-on-1 පෞද්ගලික පණිවිඩ හුවමාරුව (Direct Messages).
* **`src/components/GroupChatModal.tsx`** : ශ්‍රමදාන සහ ප්‍රජා කණ්ඩායම් සඳහා වන සමූහ සංවාද.
* **`src/components/AudioVoiceNote.tsx`** : හඬ පණිවිඩ (Voice Notes) පටිගත කිරීම සහ ශ්‍රවණය කිරීම.
* **`src/components/ChatLocationCard.tsx`** : චැට් එක තුළ සජීවී සිතියම් ඛණ්ඩාංක (Map Location Pin) හුවමාරුව.
* **`src/components/OmniAssistantChatBox.tsx`** : Gemini AI මඟින් ක්‍රියාත්මක වන ස්මාර්ට් සහායකයා.

---

### 🩸 E. විශේෂිත ප්‍රජා සේවාවන් (Specialized Services)
1. **ලේ බැංකුව සහ ආපදා සහන (`BloodAndDisasterModal.tsx`):**
   * හදිසි රුධිර ඉල්ලීම් (Blood Requests), පරිත්‍යාගශීලීන්ගේ නාමාවලිය (Donors Registry), සහ වියළි ආහාර/ඇඳුම් ආධාර.
2. **හදිසි ඇමතුම් නාමාවලිය (`EmergencyDirectoryModal.tsx`):**
   * පොලිස්, රෝහල්, ගිනි නිවන, 1990 සුවසැරිය ඇතුළු සත්‍යාපිත හදිසි ඇමතුම් අංක.
3. **ප්‍රජා වෙළඳපොළ (`MarketplaceView.tsx` & `MarketplaceLowestPricesModal.tsx`):**
   * භාණ්ඩ මිලදී ගැනීම්, විකිණීම්, භාණ්ඩ හුවමාරුව (Barter) සහ දෛනික අත්‍යවශ්‍ය භාණ්ඩවල අවම මිල දර්ශකය.
4. **වෘත්තීය සේවා නාමාවලිය (`ProfessionalServicesView.tsx`):**
   * කාර්මික ශිල්පීන්, වඩු/මේසන්, විදුලි කාර්මිකයන්ගේ සත්‍යාපිත සම්බන්ධතා.
5. **ශ්‍රමදාන සහ කණ්ඩායම් වැඩ (`GroupWorkView.tsx`):**
   * ප්‍රජා වැඩ, පන්සල්/පාසල් සංවර්ධන කටයුතු සඳහා ශ්‍රමය සහ සම්පත් එක්රැස් කිරීම.

---

### 🛡️ F. පරිපාලක පාලන පුවරුව (Admin Console)
* **`src/components/AdminPanel.tsx`** : ප්‍රධාන ඇඩ්මින් ඩෑෂ්බෝඩ් එක.
  * **Users Tab:** නව පරිශීලකයින් අනුමත කිරීම / ප්‍රතික්ෂේප කිරීම / ගිණුම් අවහිර කිරීම.
  * **Posts Tab:** ප්‍රජා දැන්වීම් පාලනය සහ මකා දැමීම.
  * **Credits Tab:** `AdminCreditManagement.tsx` හරහා පරිශීලකයින්ට මුදල්/ක්‍රෙඩිට් ලබාදීම හෝ අය කිරීම.
  * **Red Alert Tab:** `AdminRedAlertManagement.tsx` මඟින් ආපදා නිවේදන විකාශනය සහ පාලනය.
  * **Issues Tab:** `AdminIssuesManagement.tsx` මඟින් පරිශීලකයින් එවන තාක්ෂණික ගැටලුවලට පිළිතුරු යැවීම.
  * **Dictionary Tab:** `AdminSearchDictionaryManager.tsx` මඟින් Singlish සහ සමාන පද සෙවුම් වචන කළමනාකරණය.

---

## 5. 🗄️ ප්‍රධාන දත්ත ව්‍යුහයන් (Core TypeScript Data Models)

```typescript
// 1. පරිශීලක මොඩලය (User Model)
export interface User {
  id: string;
  userId: string;          // NIC or Custom ID (e.g. 970181547V)
  name: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  credits: number;         // Wallet credit balance (Rs.)
  phone?: string;
  whatsappNumber?: string;
  district?: string;
  address?: string;
  isDemo?: boolean;
}

// 2. උපකාර දැන්වීම් මොඩලය (Help Post Model)
export interface HelpPost {
  id: string;
  postCode: string;        // e.g. #HELP-1024
  userId: string;
  userName: string;
  category: string;        // 'quick_services' | 'normal' | 'find_for_me' | 'from_me_to_you'
  whatHappened: string;
  whatIsNeeded: string;
  locationName: string;
  lat?: number;
  lng?: number;
  status: 'active' | 'confirmed' | 'resolved';
  createdAtMs: number;
  isBoosted?: boolean;
}

// 3. රතු එළිය ආපදා මොඩලය (Red Alert Model)
export interface RedAlertItem {
  id: string;
  disasterType: string;    // 'fire' | 'flood' | 'accident' | 'landslide'
  disasterTitleSi: string;
  description: string;
  lat: number;
  lng: number;
  locationName: string;
  status: 'active' | 'resolved' | 'false_alarm';
  reportedById: string;
  createdAtMs: number;
}
```

---

## 6. 🔄 Real-time Database Synchronization Strategy
1. **Snapshot Listeners (`src/lib/firebase.ts`):**  
   යෙදුම විවෘත වූ වහාම `subscribeToHelpPosts`, `subscribeToUsers`, `subscribeToRedAlerts` මඟින් Firestore Database එක සමඟ සජීවීව සම්බන්ධ වේ.
2. **Local Multi-Layer Cache Invalidation:**  
   දත්තයක් (Post එකක් හෝ User කෙනෙක්) Delete කළ විට:
   - **පියවර 1:** LocalStorage හි ස්ථිරව Blacklist වේ (`deletedPostsManager.ts`).
   - **පියවර 2:** React In-Memory State එකෙන් ක්ෂණිකව ඉවත් වේ (Instant UI update).
   - **පියවර 3:** Firestore Document එක සදහටම මකා දැමේ (`deleteDoc`).

---

## 🤖 AI Bots සඳහා උපදෙස් (Guidelines for AI Agents)
* **කේත වෙනස් කිරීමේදී:** පද්ධතියේ කිසිදු ප්‍රධාන Function එකක් වෙනස් කිරීමට පෙර අදාළ Component එකේ Prop Types සහ Permissions (`postOwnerHelper.ts`) පරීක්ෂා කරන්න.
* **Database Queries:** මෙම පද්ධතිය ක්‍රියාත්මක වන්නේ **Cloud Firestore (`firebase/firestore`)** මත පමණක් වන බැවින් Realtime Database (`firebase/database`) ආනයනය නොකරන්න.
* **Admin Features:** Adminවරයා සාමාන්‍ය Dashboard එකේ සිටියදී වුවද ඔහුගේ `currentUser` තොරතුරු සුරක්ෂිතව පවතින බව තහවුරු කරන්න.
