import * as jose from "jose";
import { generateUUID } from "./webcrypto";

export interface JWTPayload {
    sub: string;
    email: string;
    provider?: "google" | "github" | "discord" | "microsoft" | "email";
    scopes?: string[];
    iat: number;
    exp: number;
    type: "access" | "refresh";
    client_id?: string;
    aud?: string | string[];
    sid?: string;
}

export interface OAuthClaims {
    clientId?: string;
    audience?: string | string[];
    sid?: string;
}

export async function getSigningKey(): Promise<jose.KeyLike | Uint8Array> {
    const privateKeyPEM = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!privateKeyPEM) {
        throw new Error("JWT_PRIVATE_KEY not found in environment");
    }
    return jose.importPKCS8(privateKeyPEM, "EdDSA");
}

export async function getVerifyingKey(): Promise<jose.KeyLike | Uint8Array> {
    const publicKeyPEM = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n");
    if (!publicKeyPEM) {
        throw new Error("JWT_PUBLIC_KEY not found in environment");
    }
    return jose.importSPKI(publicKeyPEM, "EdDSA");
}

export async function createAccessToken(
    userId: string,
    email: string,
    provider?: "google" | "github" | "discord" | "microsoft" | "email",
    expiresInMinutes: number = 15,
    scopes?: string[],
    oauthClaims?: OAuthClaims,
): Promise<string> {
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
        sub: userId,
        email,
        type: "access",
        ...(provider && { provider }),
        ...(scopes && { scopes }),
        ...(oauthClaims?.clientId && { client_id: oauthClaims.clientId }),
        ...(oauthClaims?.sid && { sid: oauthClaims.sid }),
    };

    const key = await getSigningKey();

    let builder = new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "EdDSA" })
        .setIssuedAt()
        .setExpirationTime(`${expiresInMinutes}m`);

    if (oauthClaims?.audience) {
        builder = builder.setAudience(oauthClaims.audience);
    }

    return await builder.sign(key);
}

export async function createRefreshToken(
    userId: string,
    provider?: "google" | "github" | "discord" | "microsoft" | "email",
    expiresInDays: number = 30,
    scopes?: string[],
    oauthClaims?: OAuthClaims,
): Promise<string> {
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
        sub: userId,
        email: "",
        type: "refresh",
        ...(provider && { provider }),
        ...(scopes && { scopes }),
        ...(oauthClaims?.clientId && { client_id: oauthClaims.clientId }),
        ...(oauthClaims?.sid && { sid: oauthClaims.sid }),
    };

    const key = await getSigningKey();

    let builder = new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "EdDSA" })
        .setJti(generateUUID())
        .setIssuedAt()
        .setExpirationTime(`${expiresInDays}d`);

    if (oauthClaims?.audience) {
        builder = builder.setAudience(oauthClaims.audience);
    }

    return await builder.sign(key);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
    try {
        const key = await getVerifyingKey();

        const verified = await jose.jwtVerify(token, key, {
            algorithms: ["EdDSA"],
        });

        return verified.payload as unknown as JWTPayload;
    } catch (error) {
        console.error("[JWT] Verification failed:", error);
        return null;
    }
}
