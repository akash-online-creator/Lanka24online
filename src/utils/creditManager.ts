rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ===============================================================
    // 🛡️ 1. Core Security & Authentication Helper Functions
    // ===============================================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() && (
        request.auth.token.role == 'admin' ||
        request.auth.token.role == 'super_admin' ||
        request.auth.token.email == 'admin@sahaya.lk' ||
        request.auth.token.email == 'www.akash.online@gmail.com' ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'])
      );
    }

    function isApprovedUser() {
      return isAuthenticated() && (
        isAdmin() ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'approved')
      );
    }

    // ===============================================================
    // 👤 2. Users Collection (පරිශීලක ගිණුම් කළමනාකරණය)
    // ===============================================================
    match /users/{userId} {
      allow read, write: if true;

      match /{allChildren=**} {
        allow read, write: if true;
      }
    }

    // ===============================================================
    // 📢 3. Help Posts & Community Interactions (posts & helpPosts)
    // ===============================================================
    match /posts/{postId} {
      allow read, write: if true;
      match /{allChildren=**} {
        allow read, write: if true;
      }
    }

    match /helpPosts/{postId} {
      allow read, write: if true;
      match /{allChildren=**} {
        allow read, write: if true;
      }
    }

    // ===============================================================
    // 🚨 4. Red Alerts (හදිසි ආපදා සහ අනතුරු ඇඟවීම්)
    // ===============================================================
    match /red_alerts/{alertId} {
      allow read, write: if true;
      match /{allChildren=**} {
        allow read, write: if true;
      }
    }
    match /redAlerts/{alertId} {
      allow read, write: if true;
      match /{allChildren=**} {
        allow read, write: if true;
      }
    }
    match /push_broadcast_queue/{queueId} {
      allow read, write: if true;
    }

    // ===============================================================
    // 🛠️ 5. Issues & User Reports (ගැටළු සහ පැමිණිලි කළමනාකරණය)
    // ===============================================================
    match /issues/{issueId} {
      allow read, write: if true;
      match /{allChildren=**} {
        allow read, write: if true;
      }
    }

    // ===============================================================
    // 💰 6. Credits & Transactions (ණය කළමනාකරණය)
    // ===============================================================
    match /credits/{userId} {
      allow read, write: if true;
    }

    match /creditTransactions/{transactionId} {
      allow read, write: if true;
    }

    // ===============================================================
    // ☎️ 7. Emergency Directory (හදිසි ඇමතුම් නාමාවලිය)
    // ===============================================================
    match /emergencyDirectory/{contactId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ===============================================================
    // 📖 8. Search Dictionary & Keywords (සෙවුම් ශබ්දකෝෂය)
    // ===============================================================
    match /searchDictionary/{wordId} {
      allow read, write: if true;
    }

    // ===============================================================
    // 🧠 9. AI Knowledge Base (කෘතිම බුද්ධි දැනුම් පද්ධතිය)
    // ===============================================================
    match /aiKnowledge/{knowledgeId} {
      allow read, write: if true;
    }

    // ===============================================================
    // 🟢 10. Presence Tracking (සජීවී පරිශීලක ක්‍රියාකාරීත්වය)
    // ===============================================================
    match /presence/{userId} {
      allow read, write: if true;
    }

    // ===============================================================
    // 🔔 11. Notifications (දැනුම්දීම් පද්ධතිය)
    // ===============================================================
    match /notifications/{notificationId} {
      allow read, write: if true;
    }

    // ===============================================================
    // 💬 12. Messages & Direct Chat (පරිශීලක පණිවිඩ හුවමාරුව)
    // ===============================================================
    match /chats/{chatId} {
      allow read, write: if true;

      match /{allChildren=**} {
        allow read, write: if true;
      }
    }

    // ===============================================================
    // 🔑 13. Password Resets (මුරපද යළි පිහිටුවීම් ඉල්ලීම්)
    // ===============================================================
    match /passwordResets/{resetId} {
      allow read, write: if true;
    }

    // ===============================================================
    // ⚙️ 14. System Settings & Admin Official Bank Info (පද්ධති සැකසුම් සහ නිල බැංකු ගිණුම)
    // ===============================================================
    // Admin Bank Deposit Info - ඕනෑම කෙනෙකුට කියවිය හැක (Public Read), වෙනස් කළ හැක්කේ Admin ට පමණි (Admin Only Write)
    match /systemSettings/bank_info {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /system_metadata/bank_deposit_info {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /systemSettings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /system_metadata/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ===============================================================
    // 📜 15. Audit Logs (පරිපාලක ක්‍රියාකාරකම් ලඝු සටහන්)
    // ===============================================================
    match /auditLogs/{logId} {
      allow read, write: if true;
    }

    match /sos_live_sessions/{sessionId} {
      allow read, write: if true;
    }

    match /marketplace/{itemId} {
      allow read, write: if true;
    }

    match /market_shops/{shopId} {
      allow read, write: if true;
    }

  }
}

