/**
 * Sahaya Sewa (Lanka24online) — Firestore & Storage Security Rules Verification Suite
 * Verifies the "Dirty Dozen" adversarial payloads against firestore.rules & storage.rules invariants.
 */

export interface AdversarialPayloadTestCase {
  id: string;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  authContext: {
    uid: string | null;
    email?: string;
    email_verified?: boolean;
    role?: string;
    admin?: boolean;
  };
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED' | 'ALLOWED';
  rationale: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: AdversarialPayloadTestCase[] = [
  {
    id: 'DD-01',
    name: 'Unauthenticated Admin Privilege Escalation on /users',
    collectionPath: '/users/attacker_1',
    operation: 'create',
    authContext: { uid: 'attacker_1', email_verified: false },
    payload: { id: 'attacker_1', name: 'Attacker', role: 'super_admin', isAdmin: true, credits: 500 },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isSafeUserCreate blocks self-assigned admin/super_admin roles.',
  },
  {
    id: 'DD-02',
    name: 'Unverified Email Spoofing Admin Claim',
    collectionPath: '/admins/spoofed_admin',
    operation: 'create',
    authContext: {
      uid: 'spoofed_admin',
      email: 'admin@sahaya.lk',
      email_verified: false,
      admin: true,
    },
    payload: { role: 'admin' },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isAdmin() strictly requires request.auth.token.email_verified == true.',
  },
  {
    id: 'DD-03',
    name: 'Denial-of-Wallet Credit Minting (> 50,000 cap)',
    collectionPath: '/users/usr_101',
    operation: 'update',
    authContext: { uid: 'usr_101', email_verified: true },
    payload: { credits: 999999999, balance: 999999999 },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isSafeCreditValue enforces credits <= 50000 and balance <= 50000.',
  },
  {
    id: 'DD-04',
    name: 'Immutable NIC Tampering after Registration',
    collectionPath: '/users/usr_101',
    operation: 'update',
    authContext: { uid: 'usr_101', email_verified: true },
    payload: { nic: '999999999V', nicNumber: '999999999V' },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isSafeUserUpdate enforces nicUnchanged && nicNumUnchanged for non-admins.',
  },
  {
    id: 'DD-05',
    name: 'Post Author Hijacking (Changing userId on /posts)',
    collectionPath: '/posts/post_500',
    operation: 'update',
    authContext: { uid: 'attacker_2', email_verified: true },
    payload: { userId: 'attacker_2', authorId: 'attacker_2' },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isSafePostUpdate enforces userIdUnchanged && authorIdUnchanged && createdAtUnchanged.',
  },
  {
    id: 'DD-06',
    name: 'Red Alert Vote Weight Manipulation (weight = 100.0)',
    collectionPath: '/red_alerts/alert_1/votes/voter_1',
    operation: 'create',
    authContext: { uid: 'voter_1', email_verified: true },
    payload: { voterId: 'voter_1', vote: 'true', weight: 100.0 },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: '/red_alerts/{alertId}/votes/{voterId} enforces weight >= 0.2 && weight <= 5.0.',
  },
  {
    id: 'DD-07',
    name: 'Red Alert Vote Deletion (Tampering with Vote History)',
    collectionPath: '/red_alerts/alert_1/votes/voter_1',
    operation: 'delete',
    authContext: { uid: 'voter_1', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'Votes cannot be deleted (allow delete: if false); voters may only switch true/false.',
  },
  {
    id: 'DD-08',
    name: 'Audit Log Deletion or Tampering by Attacker',
    collectionPath: '/auditLogs/log_999',
    operation: 'delete',
    authContext: { uid: 'attacker_1', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: '/auditLogs/{logId} is append-only (allow update, delete: if false).',
  },
  {
    id: 'DD-09',
    name: 'Unauthorized Read of Audit Logs by Non-Admin',
    collectionPath: '/auditLogs/log_999',
    operation: 'get',
    authContext: { uid: 'normal_user', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: '/auditLogs/{logId} restricts get and list strictly to isAdmin().',
  },
  {
    id: 'DD-10',
    name: 'Unauthorized Listing of Web Push Subscriptions',
    collectionPath: '/subscriptions',
    operation: 'list',
    authContext: { uid: 'normal_user', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: '/subscriptions restricts list to isAdmin() and get to owner or admin.',
  },
  {
    id: 'DD-11',
    name: 'Password Reset Auto-Approval Bypass',
    collectionPath: '/password_reset_requests/req_1',
    operation: 'create',
    authContext: { uid: 'attacker_1', email_verified: true },
    payload: { userId: 'victim_1', status: 'approved' },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: '/password_reset_requests requires initial status == "pending".',
  },
  {
    id: 'DD-12',
    name: 'Path Poisoning with Oversized / Invalid Document ID (> 150 chars or path chars)',
    collectionPath: '/posts/../../etc/passwd',
    operation: 'create',
    authContext: { uid: 'attacker_1', email_verified: true },
    payload: { title: 'Malicious' },
    expectedOutcome: 'PERMISSION_DENIED',
    rationale: 'isValidId enforces size <= 150 and regex ^[a-zA-Z0-9_\\-.:@]+$.',
  },
];
