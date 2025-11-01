import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Keyloader module for secure private key management
 *
 * Loads ECDSA P-256 keypair from filesystem based on environment variable.
 * Private key path is specified via LIC_PRIVATE_KEY_PATH env var.
 */

let cachedPrivateKey: string | null = null;
let cachedPublicKey: string | null = null;

/**
 * Load private key from filesystem
 * @throws Error if LIC_PRIVATE_KEY_PATH is not set or file cannot be read
 */
export function getPrivateKey(): string {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const keyPath = process.env.LIC_PRIVATE_KEY_PATH;

  if (!keyPath) {
    throw new Error(
      "LIC_PRIVATE_KEY_PATH environment variable is not set. " +
        "Please set it to the path of your license_private.pem file."
    );
  }

  try {
    const absolutePath = resolve(keyPath);
    const keyContent = readFileSync(absolutePath, "utf8");

    // Validate PEM format for EC private key
    if (
      !keyContent.includes("BEGIN EC PRIVATE KEY") &&
      !keyContent.includes("BEGIN PRIVATE KEY")
    ) {
      throw new Error(
        `Invalid private key format in ${absolutePath}. ` +
          "Expected PEM format with EC PRIVATE KEY or PRIVATE KEY header."
      );
    }

    cachedPrivateKey = keyContent;
    return cachedPrivateKey;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to load private key from ${keyPath}: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Load public key from filesystem
 * Public key should be in the same directory as private key, named license_public.pem
 * Or can be derived from private key if needed
 * @throws Error if public key cannot be loaded
 */
export function getPublicKey(): string {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  const keyPath = process.env.LIC_PRIVATE_KEY_PATH;

  if (!keyPath) {
    throw new Error(
      "LIC_PRIVATE_KEY_PATH environment variable is not set. " +
        "Cannot derive public key path."
    );
  }

  try {
    // Derive public key path from private key path
    const publicKeyPath = keyPath.replace("private", "public");
    let absolutePath = resolve(publicKeyPath);

    // Try common naming conventions
    try {
      cachedPublicKey = readFileSync(absolutePath, "utf8");
    } catch {
      // Try test_public.pem (for test fixtures)
      try {
        const dir = keyPath.substring(
          0,
          Math.max(keyPath.lastIndexOf("/"), keyPath.lastIndexOf("\\"))
        );
        absolutePath = resolve(dir, "test_public.pem");
        cachedPublicKey = readFileSync(absolutePath, "utf8");
      } catch {
        // Try license_public.pem in same directory
        const dir = keyPath.substring(
          0,
          Math.max(keyPath.lastIndexOf("/"), keyPath.lastIndexOf("\\"))
        );
        absolutePath = resolve(dir, "license_public.pem");
        cachedPublicKey = readFileSync(absolutePath, "utf8");
      }
    }

    // Validate PEM format for EC public key
    if (!cachedPublicKey.includes("BEGIN PUBLIC KEY")) {
      throw new Error(
        `Invalid public key format in ${absolutePath}. ` +
          "Expected PEM format with PUBLIC KEY header."
      );
    }

    return cachedPublicKey;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load public key: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if private key is available without throwing
 */
export function hasPrivateKey(): boolean {
  try {
    getPrivateKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear cached keys (useful for testing)
 */
export function clearCache(): void {
  cachedPrivateKey = null;
  cachedPublicKey = null;
}
