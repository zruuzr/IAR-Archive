import crypto from 'node:crypto';

/**
 * Automatically prunes old, inactive Firebase Hosting versions before deploying.
 * This frees up storage quota on the Firebase project (preventing HTTP 429 RESOURCE_EXHAUSTED).
 */

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!saJson || !saJson.trim()) {
  console.log('[prune-firebase] No FIREBASE_SERVICE_ACCOUNT provided, skipping prune step.');
  process.exit(0);
}

let sa;
try {
  sa = JSON.parse(saJson);
} catch (e) {
  console.warn('[prune-firebase] Failed to parse service account JSON:', e.message);
  process.exit(0);
}

if (!sa.client_email || !sa.private_key) {
  console.warn('[prune-firebase] Service account missing client_email or private_key, skipping.');
  process.exit(0);
}

function createJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(sa.private_key, 'base64url');
  return `${unsigned}.${signature}`;
}

async function getAccessToken(sa) {
  const jwt = createJwt(sa);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function prune() {
  try {
    console.log('[prune-firebase] Authenticating with Google OAuth2...');
    const token = await getAccessToken(sa);
    const siteId = 'iararchive';

    // 1. Get current release on live channel to find the active version
    const channelRes = await fetch(
      `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/channels/live`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    let activeVersionName = null;
    if (channelRes.ok) {
      const channelData = await channelRes.json();
      activeVersionName = channelData.release?.version?.name;
      console.log(`[prune-firebase] Active release version on live channel: ${activeVersionName}`);
    } else {
      console.warn(`[prune-firebase] Could not fetch live channel (${channelRes.status}), proceeding cautiously.`);
    }

    // 2. List versions for the site
    const versionsRes = await fetch(
      `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/versions?pageSize=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!versionsRes.ok) {
      const text = await versionsRes.text();
      console.warn(`[prune-firebase] Could not list versions (${versionsRes.status}): ${text}`);
      return;
    }
    const data = await versionsRes.json();
    const versions = data.versions || [];
    console.log(`[prune-firebase] Found ${versions.length} total versions in Firebase Hosting.`);

    if (versions.length <= 2) {
      console.log('[prune-firebase] Version count is low (<= 2), nothing to prune.');
      return;
    }

    // 3. Delete old versions (keep active version and the most recent 1-2 versions)
    let deletedCount = 0;
    // Sort descending by createTime if present, so newest are first
    const sorted = [...versions].sort((a, b) => {
      const tA = new Date(a.createTime || 0).getTime();
      const tB = new Date(b.createTime || 0).getTime();
      return tB - tA;
    });

    // Keep active version + the 2 newest versions
    const toKeep = new Set();
    if (activeVersionName) toKeep.add(activeVersionName);
    for (let i = 0; i < Math.min(2, sorted.length); i++) {
      toKeep.add(sorted[i].name);
    }

    for (const v of sorted) {
      if (toKeep.has(v.name)) {
        console.log(`[prune-firebase] Keeping version: ${v.name}`);
        continue;
      }
      try {
        const delRes = await fetch(
          `https://firebasehosting.googleapis.com/v1beta1/${v.name}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (delRes.ok) {
          deletedCount++;
          console.log(`[prune-firebase] Deleted old version: ${v.name}`);
        } else {
          const errText = await delRes.text();
          console.warn(`[prune-firebase] Failed to delete ${v.name} (${delRes.status}): ${errText}`);
        }
      } catch (err) {
        console.warn(`[prune-firebase] Error deleting ${v.name}:`, err.message);
      }
    }
    console.log(`[prune-firebase] Successfully pruned ${deletedCount} old versions.`);
  } catch (err) {
    console.warn('[prune-firebase] Prune step finished with warning, proceeding with deploy:', err.message);
  }
}

prune();
