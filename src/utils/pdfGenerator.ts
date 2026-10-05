import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { User } from '../types';

/**
 * Generates and downloads an official high-resolution PDF dossier for a registered user.
 * The filename is set to the user's NIC number (e.g. 199512345678.pdf).
 */
export async function generateAndDownloadUserPdf(user: User): Promise<boolean> {
  try {
    // 1. Create a dedicated container for the PDF layout
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.padding = '36px 40px';
    container.style.boxSizing = 'border-box';
    container.style.zIndex = '-9999';

    const nowFormatted = new Date().toLocaleString('si-LK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const nicNumber = (user.nicNumber || user.userId || 'NIC_NOT_PROVIDED').trim();
    const facePhoto = user.facePhotoUrl || user.photoUrl;
    const nicFrontPhoto = user.nicFrontPhotoUrl || user.idCardPhotoUrl;
    const nicBackPhoto = user.nicBackPhotoUrl;

    const safeText = (val?: string | number | null) => (val ? String(val) : 'නොමැත (N/A)');

    container.innerHTML = `
      <div style="border: 2px solid #059669; border-radius: 16px; overflow: hidden; background: #ffffff;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%); color: #ffffff; padding: 24px 28px; border-bottom: 3px solid #10b981;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <div style="background: #ffffff; color: #065f46; font-weight: 900; font-size: 18px; padding: 6px 12px; border-radius: 8px;">
                  සහය සේවා
                </div>
                <span style="font-size: 13px; color: #a7f3d0; font-weight: bold; letter-spacing: 0.5px;">
                  SAHAYA SEVA COMMUNITY PORTAL
                </span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                පරිශීලක ලියාපදිංචි තොරතුරු සහ පෞද්ගලික ලිපිගොනුව
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #d1fae5;">
                Official User Registration Profile & Verification Dossier
              </p>
            </div>

            <!-- Header Badge Box -->
            <div style="text-align: right; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 16px; border-radius: 12px;">
              <div style="font-size: 10px; color: #6ee7b7; text-transform: uppercase; font-weight: bold;">User ID</div>
              <div style="font-size: 18px; font-weight: 900; color: #ffffff; font-family: monospace;">${safeText(user.userId)}</div>
              <div style="font-size: 10px; color: #a7f3d0; margin-top: 2px;">
                Status: <strong style="color: #34d399; text-transform: uppercase;">${safeText(user.status)}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Meta Bar -->
        <div style="background: #f0fdf4; border-bottom: 1px solid #d1fae5; padding: 10px 28px; display: flex; justify-content: space-between; font-size: 11px; color: #065f46; font-weight: 600;">
          <div><strong>ජාතික හැඳුනුම්පත (NIC):</strong> <span style="font-family: monospace; font-size: 12px; font-weight: 800; color: #047857;">${nicNumber}</span></div>
          <div><strong>වාර්තාව බාගත කළ දිනය:</strong> ${nowFormatted}</div>
          <div><strong>ලියාපදිංචි දිනය:</strong> ${safeText(user.registeredAt)}</div>
        </div>

        <div style="padding: 24px 28px;">
          <!-- Section 1: User Identity & Profile Summary -->
          <div style="display: flex; gap: 24px; margin-bottom: 24px;">
            <!-- Face Photo Box -->
            <div style="width: 140px; shrink: 0; text-align: center;">
              <div style="width: 130px; height: 155px; border-radius: 12px; overflow: hidden; border: 2px solid #059669; background: #f8fafc; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center;">
                ${
                  facePhoto
                    ? `<img src="${facePhoto}" style="width: 100%; height: 100%; object-fit: cover;" alt="User Face" />`
                    : `<div style="font-size: 11px; color: #64748b; font-weight: bold; padding: 12px;">ඡායාරූපයක් නැත<br/>(No Photo)</div>`
                }
              </div>
              <span style="font-size: 11px; font-weight: bold; color: #0f766e;">පැතිකඩ ඡායාරූපය</span>
            </div>

            <!-- Details Grid -->
            <div style="flex: 1;">
              <h2 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #064e3b; text-transform: uppercase; border-bottom: 2px solid #a7f3d0; padding-bottom: 4px;">
                01. මූලික පෞද්ගලික තොරතුරු (Personal Details)
              </h2>

              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tbody>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569; width: 38%;">සම්පූර්ණ නම (Full Name):</td>
                    <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${safeText(user.name)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">වාසගම (Surname):</td>
                    <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${safeText(user.surname)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">මුල් නම / අග නම:</td>
                    <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${safeText(user.firstName)} ${safeText(user.lastName)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">ජාතික හැඳුනුම්පත් අංකය (NIC):</td>
                    <td style="padding: 6px 8px; font-weight: 800; color: #065f46; font-family: monospace; font-size: 13px;">${nicNumber}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">උපන් දිනය (Date of Birth):</td>
                    <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${safeText(user.birthDate)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">දුරකථන / WhatsApp අංකය:</td>
                    <td style="padding: 6px 8px; font-weight: 800; color: #0f172a; font-family: monospace;">${safeText(user.whatsappNumber || user.phone)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">Gmail / විද්‍යුත් ලිපිනය:</td>
                    <td style="padding: 6px 8px; font-weight: 600; color: #0f172a; font-family: monospace;">${safeText(user.email)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">පදිංචි ලිපිනය (Address):</td>
                    <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${safeText(user.address)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px; font-weight: bold; color: #475569;">ආසන්නතම නගරය (Nearest Town):</td>
                    <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${safeText(user.nearestTown)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 2: GPS Audit & System Security Details -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #064e3b; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
              02. ලියාපදිංචි GPS පිහිටීම සහ උපාංග තොරතුරු (Verified GPS & Device Audit)
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
              <div>
                <span style="color: #64748b; font-weight: bold;">ලියාපදිංචි කළ ස්ථානය (Location):</span>
                <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">
                  📍 ${safeText(user.registrationLocationName || user.nearestTown || user.address)}
                </div>
              </div>
              <div>
                <span style="color: #64748b; font-weight: bold;">GPS ඛණ්ඩාංක (Coordinates):</span>
                <div style="font-weight: 700; color: #047857; font-family: monospace; margin-top: 2px;">
                  ${user.registrationLat ? `${user.registrationLat.toFixed(5)}° N, ${user.registrationLng?.toFixed(5)}° E` : 'නොමැත'}
                  ${user.registrationAccuracy ? ` (±${user.registrationAccuracy}m accuracy)` : ''}
                </div>
              </div>
              <div>
                <span style="color: #64748b; font-weight: bold;">IP ලිපිනය (Client IP):</span>
                <div style="font-weight: 700; color: #0284c7; font-family: monospace; margin-top: 2px;">
                  ${safeText(user.ipAddress)}
                </div>
              </div>
              <div>
                <span style="color: #64748b; font-weight: bold;">භාවිතා කළ උපාංගය (Device Platform):</span>
                <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">
                  ${safeText(user.deviceInfo)}
                </div>
              </div>
              <div>
                <span style="color: #64748b; font-weight: bold;">මුරපදය / System Key:</span>
                <div style="font-weight: 800; color: #b45309; font-family: monospace; margin-top: 2px;">
                  ${safeText(user.key || user.securityCode)}
                </div>
              </div>
              <div>
                <span style="color: #64748b; font-weight: bold;">ගිණුම් වර්ගය (Role):</span>
                <div style="font-weight: 700; color: #065f46; text-transform: uppercase; margin-top: 2px;">
                  ${safeText(user.role)}
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Identity Documents (NIC Front & Back) -->
          <div>
            <h2 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #064e3b; text-transform: uppercase; border-bottom: 2px solid #a7f3d0; padding-bottom: 4px;">
              03. ජාතික හැඳුනුම්පත් ලේඛන ඡායාරූප (NIC Document Photos)
            </h2>

            <div style="display: flex; gap: 20px; justify-content: center;">
              <!-- NIC Front -->
              <div style="flex: 1; border: 1px solid #94a3b8; border-radius: 12px; overflow: hidden; background: #f8fafc; padding: 8px; text-align: center;">
                <div style="font-size: 11px; font-weight: 800; color: #0f766e; margin-bottom: 6px;">
                  🪪 හැඳුනුම්පත් ඉදිරිපස (NIC Front)
                </div>
                <div style="height: 170px; display: flex; align-items: center; justify-content: center; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                  ${
                    nicFrontPhoto
                      ? `<img src="${nicFrontPhoto}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="NIC Front" />`
                      : `<span style="font-size: 11px; color: #94a3b8; font-weight: bold;">ඉදිරිපස ඡායාරූපයක් නැත</span>`
                  }
                </div>
              </div>

              <!-- NIC Back -->
              <div style="flex: 1; border: 1px solid #94a3b8; border-radius: 12px; overflow: hidden; background: #f8fafc; padding: 8px; text-align: center;">
                <div style="font-size: 11px; font-weight: 800; color: #0f766e; margin-bottom: 6px;">
                  🪪 හැඳුනුම්පත් පසුපස (NIC Back)
                </div>
                <div style="height: 170px; display: flex; align-items: center; justify-content: center; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                  ${
                    nicBackPhoto
                      ? `<img src="${nicBackPhoto}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="NIC Back" />`
                      : `<span style="font-size: 11px; color: #94a3b8; font-weight: bold;">පසුපස ඡායාරූපයක් නැත</span>`
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4: Official Footer Stamp & Verification Note -->
          <div style="margin-top: 24px; padding-top: 14px; border-top: 2px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b;">
            <div>
              <strong>සහය සේවා ප්‍රජා පද්ධතිය - නිල පරිපාලන වාර්තාව</strong><br/>
              මෙම ලේඛනය පරිශීලකයාගේ ලියාපදිංචි දත්තවල නිවැරදි පිටපතකි.
            </div>
            <div style="text-align: right;">
              <div style="border: 1px solid #059669; padding: 4px 10px; border-radius: 6px; color: #059669; font-weight: bold; display: inline-block;">
                ✓ ADMIN VERIFIED & AUDITED
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Wait a brief moment to ensure any embedded base64/blob images render completely
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Render container to Canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Remove the temporary offscreen element
    document.body.removeChild(container);

    // Generate PDF via jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // The user requested the PDF filename to be the NIC number
    const safeNicFilename = nicNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeNicFilename}.pdf`;

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating user PDF:', error);
    // Cleanup if container still attached
    const existing = document.getElementById('pdf-render-container');
    if (existing) document.body.removeChild(existing);
    return false;
  }
}
