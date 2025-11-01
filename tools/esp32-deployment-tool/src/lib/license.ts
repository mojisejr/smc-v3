import { createSign, createVerify } from "crypto";
import { getPrivateKey, getPublicKey } from "./keyloader";

/**
 * License module for generating and verifying signed license tokens
 *
 * Uses ECDSA P-256 (prime256v1) with SHA-256 for signing.
 * Token format: base64url(payload) + '.' + base64url(signature)
 */

export interface LicensePayload {
  mac: string;
  expiry: string; // ISO 8601 date string
  customer: string;
  issuedAt: string; // ISO 8601 date string
}

export interface VerificationResult {
  valid: boolean;
  payload?: LicensePayload;
  error?: string;
}

/**
 * Convert Buffer to base64url encoding (RFC 4648 §5)
 */
function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Convert base64url string back to Buffer
 */
function base64urlToBuffer(str: string): Buffer {
  // Add padding if needed
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) {
    padded += "=";
  }
  return Buffer.from(padded, "base64");
}

/**
 * Sign a payload using the private key
 * @param privateKeyPem - PEM-formatted EC private key
 * @param payload - Payload object to sign
 * @returns DER-encoded signature as Buffer
 */
export function signPayload(
  privateKeyPem: string,
  payload: LicensePayload
): Buffer {
  const payloadJson = JSON.stringify(payload);
  const payloadBuffer = Buffer.from(payloadJson, "utf8");

  const sign = createSign("SHA256");
  sign.update(payloadBuffer);
  sign.end();

  // Sign with DER encoding (standard ASN.1 format)
  const signature = sign.sign({
    key: privateKeyPem,
    dsaEncoding: "der",
  });

  return signature;
}

/**
 * Encode payload and signature into a compact token
 * @param payload - License payload
 * @param signature - DER-encoded signature
 * @returns Token string in format: base64url(payload).base64url(signature)
 */
export function encodeToken(
  payload: LicensePayload,
  signature: Buffer
): string {
  const payloadJson = JSON.stringify(payload);
  const payloadBuffer = Buffer.from(payloadJson, "utf8");

  return `${base64url(payloadBuffer)}.${base64url(signature)}`;
}

/**
 * Generate a signed license token for a device
 * @param params - License parameters (mac, expiry, customer)
 * @returns Signed license token string
 */
export async function generateLicense(params: {
  mac: string;
  expiry: string;
  customer: string;
}): Promise<string> {
  const payload: LicensePayload = {
    mac: params.mac,
    expiry: params.expiry,
    customer: params.customer,
    issuedAt: new Date().toISOString(),
  };

  const privateKey = getPrivateKey();
  const signature = signPayload(privateKey, payload);

  return encodeToken(payload, signature);
}

/**
 * Verify a license token signature and parse the payload
 * @param token - License token string
 * @param publicKeyPem - Optional public key PEM (defaults to loading from keyloader)
 * @returns Verification result with payload if valid
 */
export function verifyLicense(
  token: string,
  publicKeyPem?: string
): VerificationResult {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return {
        valid: false,
        error:
          "Invalid token format. Expected: base64url(payload).base64url(signature)",
      };
    }

    const [payloadB64, signatureB64] = parts;

    // Decode payload and signature
    const payloadBuffer = base64urlToBuffer(payloadB64);
    const signatureBuffer = base64urlToBuffer(signatureB64);

    // Get public key
    const publicKey = publicKeyPem || getPublicKey();

    // Verify signature
    const verify = createVerify("SHA256");
    verify.update(payloadBuffer);
    verify.end();

    const isValid = verify.verify(
      {
        key: publicKey,
        dsaEncoding: "der",
      },
      signatureBuffer
    );

    if (!isValid) {
      return {
        valid: false,
        error: "Invalid signature. Token may have been tampered with.",
      };
    }

    // Parse payload
    const payloadJson = payloadBuffer.toString("utf8");
    const payload = JSON.parse(payloadJson) as LicensePayload;

    // Validate payload structure
    if (
      !payload.mac ||
      !payload.expiry ||
      !payload.customer ||
      !payload.issuedAt
    ) {
      return {
        valid: false,
        error: "Invalid payload structure. Missing required fields.",
      };
    }

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : "Unknown verification error",
    };
  }
}

/**
 * Check if a license has expired
 * @param payload - License payload
 * @returns true if expired, false otherwise
 */
export function isLicenseExpired(payload: LicensePayload): boolean {
  const expiryDate = new Date(payload.expiry);
  const now = new Date();
  return expiryDate < now;
}

/**
 * Validate a license token completely (signature + expiry + structure)
 * @param token - License token string
 * @param publicKeyPem - Optional public key PEM
 * @returns Verification result with additional expiry check
 */
export function validateLicense(
  token: string,
  publicKeyPem?: string
): VerificationResult {
  const result = verifyLicense(token, publicKeyPem);

  if (!result.valid || !result.payload) {
    return result;
  }

  if (isLicenseExpired(result.payload)) {
    return {
      valid: false,
      payload: result.payload,
      error: "License has expired",
    };
  }

  return result;
}
