const { generateKeyPairSync } = require("crypto");
const { writeFileSync } = require("fs");
const { join } = require("path");

// Generate ECDSA P-256 keypair for testing
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

// Save to fixtures directory
const fixturesDir = __dirname;
writeFileSync(join(fixturesDir, "test_private.pem"), privateKey);
writeFileSync(join(fixturesDir, "test_public.pem"), publicKey);

console.log("Test keypair generated successfully!");
console.log("Private key:", join(fixturesDir, "test_private.pem"));
console.log("Public key:", join(fixturesDir, "test_public.pem"));
