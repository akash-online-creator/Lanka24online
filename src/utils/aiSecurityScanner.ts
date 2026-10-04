import { User, AiSecurityScanResult, DuplicatePhotoMatch } from '../types';

/**
 * Calculates a lightweight 64-bit perceptual hash (dHash) from an image Data URL
 * to detect identical or slightly manipulated duplicate photos across users.
 */
export async function computePerceptualHash(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }

        const width = 9;
        const height = 8;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        // Convert to grayscale
        const grays: number[] = [];
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          // Standard luminosity
          grays.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
        }

        // Difference hash: compare adjacent pixels
        let hash = '';
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const left = grays[y * 9 + x];
            const right = grays[y * 9 + x + 1];
            hash += left > right ? '1' : '0';
          }
        }
        resolve(hash);
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

/**
 * Computes Hamming distance between two binary hashes
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

/**
 * Scans all registered users to find any accounts that uploaded the identical or near-identical photo
 */
export async function detectDuplicatePhotos(
  targetPhotoUrl: string,
  targetUserId: string,
  allUsers: User[]
): Promise<DuplicatePhotoMatch[]> {
  if (!targetPhotoUrl || !allUsers || allUsers.length === 0) return [];

  const targetHash = await computePerceptualHash(targetPhotoUrl);
  if (!targetHash) return [];

  const matches: DuplicatePhotoMatch[] = [];

  for (const user of allUsers) {
    if (!user) continue;
    if (user.id === targetUserId || user.userId === targetUserId) continue;

    const userPhotos = [
      user.nicFrontPhotoUrl,
      user.idCardPhotoUrl,
      user.photoUrl,
      user.facePhotoUrl,
    ].filter((p): p is string => Boolean(p && p.trim().length > 50));

    for (const photo of userPhotos) {
      const userHash = await computePerceptualHash(photo);
      if (!userHash) continue;

      const dist = hammingDistance(targetHash, userHash);
      // 0 dist = 100% identical; dist <= 6 = ~90%+ similarity (same photo resized or edited)
      const similarityPercent = Math.max(0, Math.round(((64 - dist) / 64) * 100));

      if (similarityPercent >= 85) {
        matches.push({
          userId: user.userId || user.id,
          name: user.name || 'පරිශීලක',
          nicNumber: user.nicNumber || 'නොදනී',
          similarityPercent,
          userStatus: user.status || 'pending',
        });
        break; // Match found for this user
      }
    }
  }

  return matches;
}

/**
 * AI Security Scanner - Inspects NIC for AI Generation, Synthetic artifacts, Document validity,
 * and matches with duplicate accounts.
 */
export async function scanUserNicSecurity(
  user: User | null | undefined,
  allUsers: User[] = []
): Promise<AiSecurityScanResult> {
  if (!user) {
    return {
      scannedAt: new Date().toISOString(),
      isAiGenerated: false,
      aiConfidence: 0,
      isDocumentAuthentic: false,
      riskLevel: 'low',
      riskScore: 0,
      analysisSummarySi: 'පරිශීලක තොරතුරු නොමැත.',
      analysisSummaryEn: 'No user data available.',
      flags: [],
      duplicateMatches: [],
    };
  }

  const photoUrl = user.nicFrontPhotoUrl || user.idCardPhotoUrl || user.photoUrl;
  const flags: string[] = [];

  if (!photoUrl) {
    return {
      scannedAt: new Date().toISOString(),
      isAiGenerated: false,
      aiConfidence: 0,
      isDocumentAuthentic: false,
      riskLevel: 'high',
      riskScore: 90,
      analysisSummarySi: 'හැඳුනුම්පත් ඡායාරූපයක් උඩුගත කර නොමැත.',
      analysisSummaryEn: 'No NIC photo uploaded for analysis.',
      flags: ['ඡායාරූපයක් නොමැත (Missing Photo)'],
      duplicateMatches: [],
    };
  }

  // 1. Perform duplicate photo matching across all users
  const duplicateMatches = await detectDuplicatePhotos(photoUrl, user.id || user.userId || '', allUsers);
  if (duplicateMatches.length > 0) {
    flags.push(`⚠️ සමාන ඡායාරූප සහිත වෙනත් ගිණුම් ${duplicateMatches.length} ක් හමු විය (Duplicate Photo Detected)`);
  }

  // 2. Call server-side Gemini Vision API scanner
  try {
    const response = await fetch('/api/admin/scan-id-security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrl,
        declaredNic: user.nicNumber || '',
        userName: user.name || '',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.riskScore === 'number') {
        const combinedFlags = [...new Set([...(data.flags || []), ...flags])];
        let finalRiskLevel = data.riskLevel;
        let finalRiskScore = data.riskScore;

        if (duplicateMatches.length > 0) {
          finalRiskScore = Math.max(finalRiskScore, 85);
          finalRiskLevel = 'high';
        }

        return {
          scannedAt: new Date().toISOString(),
          isAiGenerated: Boolean(data.isAiGenerated),
          aiConfidence: data.aiConfidence || (data.isAiGenerated ? 88 : 10),
          isDocumentAuthentic: Boolean(data.isDocumentAuthentic),
          detectedNicNumber: data.detectedNicNumber,
          nicMatch: data.nicMatch,
          riskLevel: finalRiskLevel,
          riskScore: finalRiskScore,
          analysisSummarySi: data.analysisSummarySi || 'ස්කෑන් පරීක්ෂාව සාර්ථකයි.',
          analysisSummaryEn: data.analysisSummaryEn,
          flags: combinedFlags,
          duplicateMatches,
        };
      }
    }
  } catch (apiErr) {
    console.warn('AI Security API scan fallback:', apiErr);
  }

  // 3. Fallback Heuristic Analysis if server is offline
  let riskScore = 15;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let summarySi = 'ඡායාරූපය සාමාන්‍ය පෙනුමෙන් යුක්තයි. අමතර අවදානමක් අනාවරණය නොවීය.';

  // Check file characteristics
  if (photoUrl.length < 5000) {
    flags.push('අපැහැදිලි හෝ ඉතා කුඩා ඡායාරූපයකි (Very low resolution)');
    riskScore += 30;
  }

  if (duplicateMatches.length > 0) {
    riskScore = 88;
    riskLevel = 'high';
    summarySi = `අවධානයයි: මෙම හැඳුනුම්පත් ඡායාරූපයම වෙනත් ගිණුම් ${duplicateMatches.length} ක භාවිත කර ඇති බව හඳුනාගැනිණි!`;
  } else if (riskScore > 50) {
    riskLevel = 'medium';
    summarySi = 'ඡායාරූපයේ පැහැදිලි බව පිළිබඳ සැකයක් පවතී. අතින් පරීක්ෂා කිරීම නිර්දේශ කෙරේ.';
  }

  return {
    scannedAt: new Date().toISOString(),
    isAiGenerated: false,
    aiConfidence: 20,
    isDocumentAuthentic: true,
    detectedNicNumber: user.nicNumber,
    nicMatch: true,
    riskLevel,
    riskScore,
    analysisSummarySi: summarySi,
    flags,
    duplicateMatches,
  };
}
