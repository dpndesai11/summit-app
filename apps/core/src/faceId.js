// Face ID (or Touch ID / the device passcode prompt) as a quicker way past the
// password gate, using the browser's WebAuthn "platform authenticator". A passkey
// is created on this device after you unlock once with the password; on later
// launches, proving it is you to the phone (Face ID) unlocks the app.
//
// Honest limits: Summit is a static site with no server, so nothing here can
// check the result against a secret the phone doesn't hold. This is a convenience
// lock — it keeps the same strength as the password check it sits beside (which
// also runs in the browser) — not a stronger one. The password always still works.
const KEY = 'summit_faceid_cred';

export const toB64Url = (bytes) => {
  let s = '';
  new Uint8Array(bytes).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const fromB64Url = (str) => {
  const b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export const hasFaceId = () => Boolean(read());

export const forgetFaceId = () => { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

// True when this browser can prompt for Face ID / Touch ID.
export const isFaceIdAvailable = async () => {
  try {
    return Boolean(window.PublicKeyCredential)
      && await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

const challenge = () => crypto.getRandomValues(new Uint8Array(32));

// Create the passkey (asks for Face ID once) and remember it on this device.
export const registerFaceId = async () => {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: 'Summit', id: window.location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'summit', displayName: 'Summit' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      attestation: 'none',
      timeout: 60000,
    },
  });
  if (!cred) throw new Error('No credential created');
  try { localStorage.setItem(KEY, toB64Url(cred.rawId)); } catch { throw new Error('Could not save Face ID on this device'); }
};

// Ask for Face ID. Resolves when the phone confirms it is you, rejects otherwise.
export const verifyFaceId = async () => {
  const id = read();
  if (!id) throw new Error('Face ID is not set up on this device');
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      rpId: window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromB64Url(id) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  if (!assertion) throw new Error('Face ID was cancelled');
};
