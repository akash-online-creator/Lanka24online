# Sahaya Sewa (සහය සේවා) - Codebase Architecture & File Index

This file acts as a permanent architectural map for the AI assistant and developers to quickly locate and understand all files and their specific responsibilities in the application.

---

## 🚀 Root & Configuration Files
- `server.ts` : Express + Vite custom backend server. Hosts `/api/admin/reset-password`, `/api/chat` (Gemini API proxy with model fallback), and static SPA middleware.
- `package.json` : Project scripts (`dev`, `build`, `start`, `lint`) and npm dependencies.
- `vite.config.ts` : Vite configuration including Tailwind CSS plugins and port settings.
- `firebase-applet-config.json` : Client configuration parameters for Firebase (projectId, databaseId, apiKey, etc.).
- `firestore.rules` : Security access rules for Firestore collections.
- `firebase-blueprint.json` : Firestore database collection schema definitions.
- `index.html` : Web application HTML entry point and metadata.
- `metadata.json` : App title, description, and permissions manifest.

---

## 🌐 Core Application Entry Points (`/src`)
- `src/main.tsx` : React DOM application bootstrap and root rendering.
- `src/App.tsx` : Central state orchestrator, global auth listener, routing/view switching, Red Alert siren/proximity engine, and Firebase synchronization.
- `src/index.css` : Global Tailwind CSS stylesheets and animation styles.
- `src/types/index.ts` : Comprehensive TypeScript interfaces, types, and enums for all domain models (User, HelpPost, RedAlertItem, Issue, etc.).
- `src/lib/firebase.ts` : Firebase client SDK initialization (Auth, Firestore DB) with helper functions for real-time listeners and CRUD operations.

---

## 📊 Data Layer (`/src/data`)
- `src/data/translations.ts` : Multilingual translation dictionaries (Sinhala `si`, English `en`, Tamil `ta`).
- `src/data/initialData.ts` : Default categories, initial mock/demo users, and system setup configurations.
- `src/data/redAlertData.ts` : Emergency Red Alert classifications, default hazard presets, and notification data.
- `src/data/emergencyDirectory.ts` : Sri Lanka emergency contact directory, hotline numbers, hospital contacts, and verification alerts.
- `src/data/bloodAndDisasterData.ts` : Blood bank requests, volunteer donor registry, and disaster relief item storage logic.
- `src/data/marketplaceData.ts` : Community marketplace products, lowest price indexes, seller shops, and buyer requests.
- `src/data/groupWorkData.ts` : Collaborative group projects (ශ්‍රමදාන, community initiatives) and group task definitions.
- `src/data/professionalServicesData.ts` : Directory of verified skilled professionals and artisans.
- `src/data/searchDictionary.ts` : Smart search synonym mapping and Sinhala phonetic search index.

---

## 🛠️ Utility Functions (`/src/utils`)
- `src/utils/aiAssistantEngine.ts` : Client-side AI prompt generator and local assistant fallbacks.
- `src/utils/blockedCredentialsManager.ts` : Manage blacklisted NICs, phone numbers, and IP addresses.
- `src/utils/creditManager.ts` : System credit calculations, rewards, gifting, and transaction deductions.
- `src/utils/dataSaver.ts` : Low-bandwidth data saver mode toggles and asset compression helpers.
- `src/utils/dateUtils.ts` : Sri Lankan relative time formatters and date conversions.
- `src/utils/deletedPostsManager.ts` : Local tracking of soft-deleted posts, blood requests, and disaster items.
- `src/utils/demoDataMasker.ts` : Privacy masking for guest/demo mode interactions.
- `src/utils/geoUtils.ts` : Haversine GPS distance calculator (km) and proximity detectors.
- `src/utils/googleTranslator.ts` & `src/utils/chatTranslator.ts` : Dynamic multilingual chat and text translation.
- `src/utils/imageCompressor.ts` : Client-side image canvas downscaling to lightweight Base64 Data URLs.
- `src/utils/notificationManager.ts` : In-app toast alerts, badge counts, and browser notification triggers.
- `src/utils/pdfGenerator.ts` : Generate and download PDF membership / identity summary cards.
- `src/utils/policyGuard.ts` : Profanity filtering, fraud detection, and community guideline validation.
- `src/utils/postOwnerHelper.ts` : Permission checks to verify if current user is the post creator or admin.
- `src/utils/postTranslator.ts` : Translation pipeline for community board posts.
- `src/utils/rateLimiter.ts` : Client rate limiting to protect endpoints against spam.
- `src/utils/singlishUtils.ts` : Singlish to Unicode Sinhala phonetics parser for search queries.
- `src/utils/sirenAudio.ts` : Emergency siren audio synthesis and sound playback controllers.
- `src/utils/tagUtils.ts` : Category tag normalization, storage, and auto-tag suggestions.
- `src/utils/textUtils.tsx` : Typography formatting, highlighting search keywords, and string helpers.
- `src/utils/trustScore.ts` : User trust score and verification badge evaluation algorithm.

---

## 🧩 UI Components (`/src/components`)

### 1. Authentication, Onboarding & User Profile
- `LoginForm.tsx` : NIC + Password authentication form with validation and quick demo login.
- `RegisterForm.tsx` : New user registration form with photo upload and NIC capture.
- `PendingApprovalView.tsx` : Pending user account verification screen waiting for admin review.
- `ChangePasswordModal.tsx` : Modal prompting users to change temporary password to a permanent one.
- `UserSettingsModal.tsx` : User profile management, photo update, and personal details editing.
- `UserWalletModal.tsx` : User credit balance, transaction history, and credit top-up requests.
- `RegistrationSuccessModal.tsx` : Welcome popup after successful account creation.
- `DemoRegistrationPromptModal.tsx` : Prompt urging demo/guest users to register a real account.
- `WrongLoginModal.tsx` : Modal shown when invalid credentials are provided.

### 2. Admin & System Management
- `AdminPanel.tsx` : Comprehensive administrator dashboard (user approvals, password resets, post moderation, issues).
- `AdminCreditManagement.tsx` : Admin view for allocating, revoking, and inspecting user credit balances.
- `AdminEmergencyDirectoryManagement.tsx` : Admin CRUD for managing emergency hotline contacts and reports.
- `AdminModerationModal.tsx` : Content review and post approval/rejection modal.
- `AdminRedAlertManagement.tsx` : Admin controls for active disaster alerts and broadcast management.
- `AdminSearchDictionaryManager.tsx` : Admin management of synonym keywords and search indexes.

### 3. Red Alert & Disaster Response
- `RedAlertLiveManager.tsx` : Live emergency watcher and distance broadcaster.
- `RedAlertCreateModal.tsx` : Emergency reporting modal with GPS location detection and photo evidence.
- `RedAlertDetailModal.tsx` : In-depth disaster report view with status change updates and safety instructions.
- `RedAlertBanner.tsx` : Header banner warning of active emergency situations nearby.
- `RedAlertFloatingTrigger.tsx` : Quick-access floating SOS alert trigger button.
- `RedAlertProximityModal.tsx` : Urgent pop-up alert when an active hazard is within 2km of user.
- `SriLankaDisasterMap.tsx` : Interactive geographic map showing incident zones across Sri Lanka.
- `ProximityAlertBanner.tsx` : Real-time proximity indicator for immediate surroundings.

### 4. Community Help Posts & Requests
- `HelpRequestsPage.tsx` : Main bulletin board showing filtered community help posts.
- `HelpPostModal.tsx` : Modal for creating a new help request with category and location.
- `EditHelpPostModal.tsx` : Modal for editing an existing help post.
- `ViewHelpPostModal.tsx` : Detailed modal showing post information, media, and contact options.
- `PostCard.tsx` : Individual help post card component with like, share, and contact actions.
- `OfferSupportModal.tsx` : Modal for volunteering or offering assistance for a specific request.
- `SupportOffersModal.tsx` : List of volunteer help offers received for the post creator.
- `BoostPostModal.tsx` : Modal to spend credits to pin/boost post visibility.
- `HelperBillModal.tsx` : Settlement/billing modal for rendered assistance.
- `ResolutionPromptModal.tsx` : Prompt asking post owners if their issue was successfully resolved.
- `PosterIssueResponseModal.tsx` : Owner response dialog for community reviews.

### 5. Services & Features
- `BloodAndDisasterModal.tsx` : Blood donation requests, donors directory, and emergency disaster relief.
- `EmergencyDirectoryModal.tsx` : Directory of verified police, hospital, and ambulance hotlines.
- `MarketplaceView.tsx` : Community marketplace view (products, buying, selling, lowest prices).
- `MarketplaceAddSellerItemModal.tsx`, `MarketplaceAddBuyerRequestModal.tsx`, `MarketplaceAddShopModal.tsx` : Marketplace item & shop creation modals.
- `MarketplaceLowestPricesModal.tsx` : Price comparison index for daily essentials.
- `MarketShopPreviewModal.tsx` : Vendor/shop profile modal.
- `MarketplaceNewsTicker.tsx` : Live market price updates and notices.
- `ProfessionalServicesView.tsx` : Verified artisan and professional service directory.
- `RegisterProfessionalServiceModal.tsx` : Modal to register as a professional service provider.
- `ProfessionalServiceDetailModal.tsx` : Profile and rating view for a professional.
- `QuickServiceModal.tsx`, `QuickServiceDetailModal.tsx`, `QuickServiceConfirmWorkflow.tsx` : Urgent quick-help matching workflow.
- `GroupWorkView.tsx` & `CreateGroupModal.tsx` : Community labor (ශ්‍රමදාන) and teamwork coordination.
- `FindForMeModal.tsx` : AI-assisted search assistant for finding specific services.
- `FromMeToYouModal.tsx` : Free donation and item gifting directory.
- `VolunteerSupportModal.tsx` : Community volunteer task application modal.

### 6. Communication & Chat
- `OmniAssistantChatBox.tsx` : AI smart assistant chat window powered by Gemini API.
- `MessageInboxModal.tsx` & `MessageInboxBubble.tsx` : Direct 1-on-1 private messaging hub and floating bubble.
- `GroupChatModal.tsx` : Real-time group discussions with location and media sharing.
- `GroupChatMapPickerModal.tsx` & `GroupChatMapViewerModal.tsx` : Map picker for sharing coordinates in group chats.
- `QuickServiceChatModal.tsx` & `ProfessionalServiceChatModal.tsx` : Specialized negotiation and order chat dialogs.
- `AudioVoiceNote.tsx` : Voice message recorder and playback player.
- `ChatLocationCard.tsx` : Embedded interactive map location message in chat.

### 7. Global Layout & Utility UI
- `Header.tsx` & `UnifiedDashboardHeader.tsx` : Navigation header with search bar, wallet credits, and profile menu.
- `UserDashboard.tsx` : Main landing view assembling categories, recent posts, and quick actions.
- `CategoryGrid.tsx` & `CategorySelectionModal.tsx` : 3D category cards and filter selection modal.
- `LocationBar.tsx` : District/city selector and current GPS location badge.
- `TagSearchBar.tsx` & `TagSelector.tsx` : Keyword and tag auto-complete filters.
- `FontSizeController.tsx` : Global typography scaling controller (A- / A / A+).
- `GpsActivationGate.tsx` & `GpsPermissionModal.tsx` : Geolocation permission prompt and verification.
- `NotificationCenterModal.tsx` & `LiveNotificationToast.tsx` : Notification inbox and real-time toast alerts.
- `IssuesHelpPage.tsx` : Support help desk for submitting technical issues to admins.
- `AppLogo.tsx` : Branded animated Sahaya Sewa logo.
- `MemoryStorageBar.tsx` : Storage usage and cache monitor indicator.
- `Card3D.tsx` : Interactive 3D tilt card container.
- `TrustBadge.tsx` & `MedicalPlusBadge.tsx` : Trust rating and verified medical badges.
- `EmbeddedMediaViewer.tsx` : Image/media lightbox modal.
- `SlideToConfirmButton.tsx` : Swipe-to-confirm safety button for sensitive actions.
- `SmartSearchSynonymPrompt.tsx` : Intelligent search suggestions for query expansion.
- `InsufficientCreditsModal.tsx` : Low credit warning and top-up prompt.
- `DeleteConfirmModal.tsx` : Deletion confirmation dialog.
- `PolicyViolationModal.tsx` : Warning modal for guideline violations.
