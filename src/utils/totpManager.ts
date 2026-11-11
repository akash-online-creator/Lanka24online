import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export interface TotpSetupData {
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
}

const ISSUER = 'Sahaya Sewa';

/**
 * Generates a new TOTP secret and QR code for Google Authenticator
 */
export async function generateTotpSetup(userLabel: string): Promise<TotpSetupData> {
  const cleanLabel = userLabel.replace(/[^a-zA-Z0-9@._-]/g, '') || 'User';
  
  // Generate a random 20-byte base32 secret
  const secret = new OTPAuth.Secret({ size: 20 });
  
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: cleanLabel,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });

  const uri = totp.toString();
  
  // Generate QR code data URL
  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 260,
    color: {
      dark: '#004d26',
      light: '#ffffff',
    },
  });

  return {
    secret: secret.base32,
    uri,
    qrCodeDataUrl,
  };
}

/**
 * Verifies a 6-digit TOTP code against a base32 secret
 */
export function verifyTotpToken(secretBase32: string, token: string): boolean {
  if (!secretBase32 || !token) return false;
  
  const cleanToken = token.replace(/\s+/g, '').trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32.trim()),
    });

    // Window: 1 allows +/- 1 time step (30 seconds) tolerance for clock drift
    const delta = totp.validate({
      token: cleanToken,
      window: 1,
    });

    return delta !== null;
  } catch (error) {
    console.warn('TOTP verification error:', error);
    return false;
  }
}
