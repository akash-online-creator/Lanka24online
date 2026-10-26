import crypto from "crypto";

const VAPID_PUBLIC_KEY = "BCCmGXeIae2pqzekOU9_6I7hhrYhfntoUIqviG3ik-rLzvzKeEep2TCLeJVjFX0NOHydP-hN1946MQ47wtXetcs";
const VAPID_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "IKYZd4hp7amrN6Q5T3_ojuGGtiF-e2hQiq-IbeKT6ss",
  y: "zvzKeEep2TCLeJVjFX0NOHydP-hN1946MQ47wtXetcs",
  d: "qmQAE4yALklFLMFyDYSG25CfNWBlB8FryNAcii8c3sA"
};

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str) {
  const clean = String(str ? str : "").trim();
  const padLen = (4 - (clean.length % 4)) % 4;
  const padded = clean + "=".repeat(padLen);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function hkdfSha256(salt, ikm, info, length) {
  return Buffer.from(crypto.hkdfSync("sha256", ikm, salt, info, length));
}

function createVapidAuthHeader(endpointUrl) {
  const parsed = new URL(endpointUrl);
  const audience = parsed.protocol + "//" + parsed.host;
  const headerB64 = toBase64Url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payloadB64 = toBase64Url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 43200,
      sub: "mailto:admin@supporservice.online"
    })
  );
  const unsignedToken = headerB64 + "." + payloadB64;
  const privKey = crypto.createPrivateKey({ key: VAPID_JWK, format: "jwk" });
  const signature = crypto.sign("sha256", Buffer.from(unsignedToken), {
    key: privKey,
    dsaEncoding: "ieee-p1363"
  });
  const jwt = unsignedToken + "." + toBase64Url(signature);
  return "vapid t=" + jwt + ", k=" + VAPID_PUBLIC_KEY;
}

function encryptWebPushPayload(p256dhB64, authB64, plainBuffer) {
  const clientPublicKey = fromBase64Url(p256dhB64);
  const authSecret = fromBase64Url(authB64);
  const serverEcdh = crypto.createECDH("prime256v1");
  serverEcdh.generateKeys();
  const serverPublicKey = serverEcdh.getPublicKey();
  const sharedSecret = serverEcdh.computeSecret(clientPublicKey);
  const salt = crypto.randomBytes(16);

  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "ascii"),
    clientPublicKey,
    serverPublicKey
  ]);
  const ikm = hkdfSha256(authSecret, sharedSecret, keyInfo, 32);
  const cek = hkdfSha256(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0", "ascii"), 16);
  const nonce = hkdfSha256(salt, ikm, Buffer.from("Content-Encoding: nonce\0", "ascii"), 12);

  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const padded = Buffer.concat([plainBuffer, Buffer.from([2])]);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  const rsBuf = Buffer.alloc(4);
  rsBuf.writeUInt32BE(4096, 0);
  const idLenBuf = Buffer.from([serverPublicKey.length]);
  return Buffer.concat([salt, rsBuf, idLenBuf, serverPublicKey, encrypted]);
}

async function fetchStoredSubscriptions() {
  const urls = [
    "https://firestore.googleapis.com/v1/projects/gen-lang-client-0262698872/databases/ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f/documents/device_push_tokens?pageSize=300",
    "https://firestore.googleapis.com/v1/projects/gen-lang-client-0536295842/databases/(default)/documents/device_push_tokens?pageSize=300"
  ];
  const subs = [];
  const seenEndpoints = new Set();

  for (const u of urls) {
    try {
      const res = await fetch(u);
      if (!res.ok) continue;
      const data = await res.json();
      const docs = data && Array.isArray(data.documents) ? data.documents : [];
      for (const d of docs) {
        const f = d && d.fields ? d.fields : {};
        const endpoint = f.endpoint && f.endpoint.stringValue ? f.endpoint.stringValue : f.token && f.token.stringValue && f.token.stringValue.startsWith("https://") ? f.token.stringValue : "";
        const p256dh = f.p256dh && f.p256dh.stringValue ? f.p256dh.stringValue : "";
        const auth = f.auth && f.auth.stringValue ? f.auth.stringValue : "";
        if (endpoint && !seenEndpoints.has(endpoint)) {
          seenEndpoints.add(endpoint);
          subs.push({ endpoint, p256dh, auth });
        }
      }
    } catch (e) {}
  }
  return subs;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const bodyData = req.body ? req.body : {};
    const category = bodyData.category ? String(bodyData.category) : "red_alert";
    const title = bodyData.title ? String(bodyData.title) : "🚨 සහය සේවා - රතු එළිය";
    const body = bodyData.body ? String(bodyData.body) : "හදිසි ආපදා අනතුරු ඇඟවීමක් වාර්තා වී ඇත.";
    const alertId = bodyData.alertId ? String(bodyData.alertId) : "";
    const postId = bodyData.postId ? String(bodyData.postId) : "";
    const groupId = bodyData.groupId ? String(bodyData.groupId) : "";
    const locationName = bodyData.locationName ? String(bodyData.locationName) : "ශ්‍රී ලංකාව";
    const latitude = bodyData.latitude !== undefined ? String(bodyData.latitude) : "";
    const longitude = bodyData.longitude !== undefined ? String(bodyData.longitude) : "";
    const radiusKm = bodyData.radiusKm !== undefined ? String(bodyData.radiusKm) : "15.0";

    const pushPayloadObj = {
      category: category,
      title: title,
      disasterTitleSi: title,
      body: body,
      description: body,
      alertId: alertId,
      postId: postId,
      groupId: groupId,
      locationName: locationName,
      latitude: latitude,
      longitude: longitude,
      radiusKm: radiusKm
    };
    const payloadBuffer = Buffer.from(JSON.stringify(pushPayloadObj), "utf-8");

    const subscriptions = await fetchStoredSubscriptions();
    let dispatchedCount = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const authHeader = createVapidAuthHeader(sub.endpoint);
        if (sub.p256dh && sub.auth) {
          const encryptedBody = encryptWebPushPayload(sub.p256dh, sub.auth, payloadBuffer);
          const pushRes = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              TTL: "86400",
              Urgency: "high"
            },
            body: encryptedBody
          });
          if (pushRes.ok ? true : pushRes.status === 201) {
            dispatchedCount += 1;
          }
        } else {
          const pushRes = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Length": "0",
              TTL: "86400",
              Urgency: "high"
            }
          });
          if (pushRes.ok ? true : pushRes.status === 201) {
            dispatchedCount += 1;
          }
        }
      })
    );

    return res.status(200).json({
      success: true,
      dispatchedCount: dispatchedCount,
      totalSubscriptions: subscriptions.length
    });
  } catch (err) {
    console.error("Web Push Broadcast Error:", err);
    return res.status(500).json({ error: "Failed to broadcast web push" });
  }
}
}
