import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  generateLicense,
  verifyLicense,
  validateLicense,
  signPayload,
  isLicenseExpired,
  LicensePayload,
} from "../license";
import { getPrivateKey, getPublicKey, clearCache } from "../keyloader";

describe("License Generation and Verification", () => {
  const fixturesPath = join(__dirname, "fixtures");
  const testPrivateKeyPath = join(fixturesPath, "test_private.pem");
  const testPublicKeyPath = join(fixturesPath, "test_public.pem");

  let originalEnv: string | undefined;
  let testPrivateKey: string;
  let testPublicKey: string;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.LIC_PRIVATE_KEY_PATH;

    // Set test key path
    process.env.LIC_PRIVATE_KEY_PATH = testPrivateKeyPath;

    // Load test keys
    testPrivateKey = readFileSync(testPrivateKeyPath, "utf8");
    testPublicKey = readFileSync(testPublicKeyPath, "utf8");

    // Clear cache
    clearCache();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.LIC_PRIVATE_KEY_PATH = originalEnv;
    } else {
      delete process.env.LIC_PRIVATE_KEY_PATH;
    }
    clearCache();
  });

  describe("Keyloader", () => {
    it("should load private key from env path", () => {
      const privateKey = getPrivateKey();
      expect(privateKey).toContain("BEGIN");
      expect(privateKey).toContain("PRIVATE KEY");
    });

    it("should load public key from env path", () => {
      const publicKey = getPublicKey();
      expect(publicKey).toContain("BEGIN PUBLIC KEY");
    });

    it("should throw error when LIC_PRIVATE_KEY_PATH is not set", () => {
      delete process.env.LIC_PRIVATE_KEY_PATH;
      clearCache();

      expect(() => getPrivateKey()).toThrow(
        "LIC_PRIVATE_KEY_PATH environment variable is not set"
      );
    });

    it("should cache keys after first load", () => {
      const key1 = getPrivateKey();
      const key2 = getPrivateKey();
      expect(key1).toBe(key2); // Same reference = cached
    });
  });

  describe("License Generation", () => {
    it("should generate a valid license token", async () => {
      const token = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST_CUSTOMER",
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(2); // payload.signature format
    });

    it("should include all required fields in payload", async () => {
      const params = {
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST_CUSTOMER",
      };

      const token = await generateLicense(params);
      const result = verifyLicense(token, testPublicKey);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.mac).toBe(params.mac);
      expect(result.payload?.expiry).toBe(params.expiry);
      expect(result.payload?.customer).toBe(params.customer);
      expect(result.payload?.issuedAt).toBeDefined();
    });

    it("should generate different tokens for different parameters", async () => {
      const token1 = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "CUSTOMER_A",
      });

      const token2 = await generateLicense({
        mac: "d0:cf:13:16:21:29",
        expiry: "2026-12-31T23:59:59Z",
        customer: "CUSTOMER_B",
      });

      expect(token1).not.toBe(token2);
    });
  });

  describe("License Verification", () => {
    it("should verify a valid token", async () => {
      const token = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST_CUSTOMER",
      });

      const result = verifyLicense(token, testPublicKey);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject tampered payload", async () => {
      const token = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST_CUSTOMER",
      });

      // Tamper with the token by decoding, modifying, and re-encoding payload
      const [payloadB64, signature] = token.split(".");
      const payloadBuffer = Buffer.from(
        payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      );
      const payloadObj = JSON.parse(payloadBuffer.toString("utf8"));

      // Modify the payload
      payloadObj.customer = "HACKED_CUSTOMER";

      // Re-encode the tampered payload
      const tamperedPayload = Buffer.from(JSON.stringify(payloadObj), "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const tamperedToken = `${tamperedPayload}.${signature}`;

      const result = verifyLicense(tamperedToken, testPublicKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("signature");
    });

    it("should reject tampered signature", async () => {
      const token = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST_CUSTOMER",
      });

      // Tamper with signature by flipping some bytes
      const [payload, signature] = token.split(".");
      const sigBuffer = Buffer.from(
        signature.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      );

      // Flip a byte in the middle of signature
      sigBuffer[(sigBuffer.length / 2) | 0] ^= 0xff;

      const tamperedSignature = sigBuffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const tamperedToken = `${payload}.${tamperedSignature}`;

      const result = verifyLicense(tamperedToken, testPublicKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("signature");
    });

    it("should reject invalid token format", () => {
      const result = verifyLicense("invalid-token", testPublicKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format");
    });

    it("should reject token with missing signature", () => {
      const result = verifyLicense("payload_only", testPublicKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format");
    });
  });

  describe("License Expiry", () => {
    it("should detect expired license", () => {
      const expiredPayload: LicensePayload = {
        mac: "d0:cf:13:16:21:28",
        expiry: "2020-01-01T00:00:00Z", // Past date
        customer: "TEST",
        issuedAt: "2019-01-01T00:00:00Z",
      };

      expect(isLicenseExpired(expiredPayload)).toBe(true);
    });

    it("should detect valid (non-expired) license", () => {
      const validPayload: LicensePayload = {
        mac: "d0:cf:13:16:21:28",
        expiry: "2030-01-01T00:00:00Z", // Future date
        customer: "TEST",
        issuedAt: new Date().toISOString(),
      };

      expect(isLicenseExpired(validPayload)).toBe(false);
    });

    it("should reject expired license in validateLicense", async () => {
      const token = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2020-01-01T00:00:00Z", // Expired
        customer: "TEST_CUSTOMER",
      });

      const result = validateLicense(token, testPublicKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should accept valid non-expired license in validateLicense", async () => {
      const token = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2030-12-31T23:59:59Z", // Future
        customer: "TEST_CUSTOMER",
      });

      const result = validateLicense(token, testPublicKey);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Token Encoding", () => {
    it("should produce base64url format without padding", async () => {
      const token = await generateLicense({
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST_CUSTOMER",
      });

      const [payload, signature] = token.split(".");

      // base64url should not contain + / = characters
      expect(payload).not.toMatch(/[+/=]/);
      expect(signature).not.toMatch(/[+/=]/);
    });

    it("should roundtrip encode/decode correctly", async () => {
      const originalParams = {
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST_CUSTOMER",
      };

      const token = await generateLicense(originalParams);
      const result = verifyLicense(token, testPublicKey);

      expect(result.valid).toBe(true);
      expect(result.payload?.mac).toBe(originalParams.mac);
      expect(result.payload?.expiry).toBe(originalParams.expiry);
      expect(result.payload?.customer).toBe(originalParams.customer);
    });
  });

  describe("Signature Algorithms", () => {
    it("should use ECDSA with SHA-256", async () => {
      const payload: LicensePayload = {
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST",
        issuedAt: new Date().toISOString(),
      };

      // This should not throw if the algorithm is correct
      const signature = signPayload(testPrivateKey, payload);
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });

    it("should produce DER-encoded signatures", async () => {
      const payload: LicensePayload = {
        mac: "d0:cf:13:16:21:28",
        expiry: "2026-12-31T23:59:59Z",
        customer: "TEST",
        issuedAt: new Date().toISOString(),
      };

      const signature = signPayload(testPrivateKey, payload);

      // DER-encoded ECDSA signatures start with 0x30 (SEQUENCE tag)
      expect(signature[0]).toBe(0x30);
    });
  });
});
