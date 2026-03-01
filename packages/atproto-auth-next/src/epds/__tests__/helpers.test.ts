import { describe, it, expect } from "bun:test";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateDpopKeyPair,
  restoreDpopKeyPair,
  createDpopProof,
} from "../helpers";

describe("generateCodeVerifier", () => {
  it("returns a base64url string of the right length (32 bytes → 43 chars)", () => {
    const verifier = generateCodeVerifier();
    expect(typeof verifier).toBe("string");
    // 32 bytes base64url = ceil(32 * 4/3) = 43 chars (no padding)
    expect(verifier.length).toBe(43);
  });

  it("generates unique values each call", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });

  it("only uses base64url characters (no +, /, =)", () => {
    const verifier = generateCodeVerifier();
    expect(/^[A-Za-z0-9_-]+$/.test(verifier)).toBe(true);
  });
});

describe("generateCodeChallenge", () => {
  it("returns a base64url string", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(typeof challenge).toBe("string");
    expect(/^[A-Za-z0-9_-]+$/.test(challenge)).toBe(true);
  });

  it("is deterministic for the same verifier", () => {
    const verifier = "test-verifier-123";
    expect(generateCodeChallenge(verifier)).toBe(
      generateCodeChallenge(verifier),
    );
  });

  it("produces different challenges for different verifiers", () => {
    const a = generateCodeChallenge("verifier-a");
    const b = generateCodeChallenge("verifier-b");
    expect(a).not.toBe(b);
  });

  it("satisfies the S256 PKCE challenge format (SHA-256 base64url)", () => {
    // Reference: PKCE RFC 7636 §4.2
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469f492c09a37a2d9b2c
    // base64url of that hex = ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0
    const challenge = generateCodeChallenge("abc");
    expect(challenge).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });
});

describe("generateState", () => {
  it("returns a base64url string of the right length (16 bytes → 22 chars)", () => {
    const state = generateState();
    expect(typeof state).toBe("string");
    expect(state.length).toBe(22);
  });

  it("generates unique values each call", () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });
});

describe("generateDpopKeyPair", () => {
  it("returns a key pair with expected fields", () => {
    const { privateKey, publicJwk, privateJwk } = generateDpopKeyPair();

    expect(typeof privateKey).toBe("object");
    expect(publicJwk.kty).toBe("EC");
    expect(publicJwk.crv).toBe("P-256");
    expect(privateJwk.kty).toBe("EC");
    expect(privateJwk.crv).toBe("P-256");
  });

  it("public JWK has no private key material", () => {
    const { publicJwk } = generateDpopKeyPair();
    expect("d" in publicJwk).toBe(false);
    expect(publicJwk.x).toBeTruthy();
    expect(publicJwk.y).toBeTruthy();
  });

  it("private JWK includes the d parameter", () => {
    const { privateJwk } = generateDpopKeyPair();
    expect(privateJwk.d).toBeTruthy();
  });

  it("generates different key pairs each call", () => {
    const a = generateDpopKeyPair();
    const b = generateDpopKeyPair();
    expect(a.publicJwk.x).not.toBe(b.publicJwk.x);
  });
});

describe("restoreDpopKeyPair", () => {
  it("restores the same public key from the private JWK", () => {
    const { publicJwk, privateJwk } = generateDpopKeyPair();
    const restored = restoreDpopKeyPair(privateJwk);

    expect(restored.publicJwk.x).toBe(publicJwk.x);
    expect(restored.publicJwk.y).toBe(publicJwk.y);
    expect(restored.publicJwk.kty).toBe(publicJwk.kty);
    expect(restored.publicJwk.crv).toBe(publicJwk.crv);
  });

  it("restored public JWK has no private key material", () => {
    const { privateJwk } = generateDpopKeyPair();
    const { publicJwk } = restoreDpopKeyPair(privateJwk);
    expect("d" in publicJwk).toBe(false);
  });
});

describe("createDpopProof", () => {
  it("returns a valid 3-part JWT string", () => {
    const { privateKey, publicJwk } = generateDpopKeyPair();
    const proof = createDpopProof({
      privateKey,
      jwk: publicJwk,
      method: "POST",
      url: "https://example.com/oauth/token",
    });

    const parts = proof.split(".");
    expect(parts.length).toBe(3);

    // Header must contain alg, typ, and jwk
    const header = JSON.parse(
      Buffer.from(parts[0]!, "base64url").toString("utf8"),
    );
    expect(header.alg).toBe("ES256");
    expect(header.typ).toBe("dpop+jwt");
    expect(header.jwk).toBeDefined();
  });

  it("includes correct htm and htu claims in the payload", () => {
    const { privateKey, publicJwk } = generateDpopKeyPair();
    const proof = createDpopProof({
      privateKey,
      jwk: publicJwk,
      method: "POST",
      url: "https://example.com/oauth/token",
    });

    const parts = proof.split(".");
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    );

    expect(payload.htm).toBe("POST");
    expect(payload.htu).toBe("https://example.com/oauth/token");
    expect(typeof payload.jti).toBe("string");
    expect(typeof payload.iat).toBe("number");
  });

  it("includes nonce when provided", () => {
    const { privateKey, publicJwk } = generateDpopKeyPair();
    const proof = createDpopProof({
      privateKey,
      jwk: publicJwk,
      method: "POST",
      url: "https://example.com/oauth/token",
      nonce: "test-nonce-123",
    });

    const parts = proof.split(".");
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    );
    expect(payload.nonce).toBe("test-nonce-123");
  });

  it("includes ath claim when accessToken is provided", () => {
    const { privateKey, publicJwk } = generateDpopKeyPair();
    const proof = createDpopProof({
      privateKey,
      jwk: publicJwk,
      method: "GET",
      url: "https://example.com/resource",
      accessToken: "some-access-token",
    });

    const parts = proof.split(".");
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    );
    // ath is SHA-256(access_token) base64url
    expect(typeof payload.ath).toBe("string");
    expect(payload.ath.length).toBeGreaterThan(0);
  });

  it("generates different jti for each call (replay protection)", () => {
    const { privateKey, publicJwk } = generateDpopKeyPair();
    const opts = {
      privateKey,
      jwk: publicJwk,
      method: "POST",
      url: "https://example.com/oauth/token",
    };

    const proof1 = createDpopProof(opts);
    const proof2 = createDpopProof(opts);

    const jti1 = JSON.parse(
      Buffer.from(proof1.split(".")[1]!, "base64url").toString("utf8"),
    ).jti;
    const jti2 = JSON.parse(
      Buffer.from(proof2.split(".")[1]!, "base64url").toString("utf8"),
    ).jti;

    expect(jti1).not.toBe(jti2);
  });

  it("signature is 64 bytes (raw EC r||s format) base64url encoded", () => {
    const { privateKey, publicJwk } = generateDpopKeyPair();
    const proof = createDpopProof({
      privateKey,
      jwk: publicJwk,
      method: "POST",
      url: "https://example.com/oauth/token",
    });

    const sigB64 = proof.split(".")[2]!;
    const sigBytes = Buffer.from(sigB64, "base64url");
    // ES256 raw signature = 64 bytes (32 bytes r + 32 bytes s)
    expect(sigBytes.length).toBe(64);
  });
});
