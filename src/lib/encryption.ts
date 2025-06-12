
// Encryption/Decryption utilities for Twilio agent links
// This file can be imported in backend for decryption

const VITE_TWILIO_OUTBOUND_SECRET = import.meta.env.VITE_TWILIO_OUTBOUND_SECRET;
const VITE_TWILIO_OUTBOUND_URL = import.meta.env.VITE_TWILIO_OUTBOUND_URL;

// Convert string to base64url (URL-safe base64)
const toBase64Url = (str: string): string => {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Convert base64url back to string
const fromBase64Url = (base64url: string): string => {
  // Add padding if needed
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
};

export const encrypt = (text: string): string => {
  const key = VITE_TWILIO_OUTBOUND_SECRET;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return toBase64Url(result);
};

// Type definition for the link configuration payload
export interface LinkConfiguration {
  agent_id: string;
  agent_phone_number_id: string;
}

export const generateEncryptedLink = (payload: LinkConfiguration): string => {
  const encryptedPayload = encrypt(JSON.stringify(payload));
  // No URL encoding needed since we're using URL-safe base64url
  return `${VITE_TWILIO_OUTBOUND_URL}?token=${encryptedPayload}`;
};

export const decrypt = (encryptedText: string): string => {
  try {
    const key = VITE_TWILIO_OUTBOUND_SECRET;
    const decoded = fromBase64Url(encryptedText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch (error) {
    console.error('Decrypt error:', error);
    throw new Error('Invalid encrypted payload');
  }
};

// Helper function to decrypt and parse payload
export const decryptLinkConfiguration = (encryptedData: string): LinkConfiguration => {
  try {
    // Direct decryption - no URL decoding needed with base64url
    const decryptedString = decrypt(encryptedData);
    console.log('Decrypted payload:', decryptedString);
    return JSON.parse(decryptedString) as LinkConfiguration;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid encrypted token');
  }
};
