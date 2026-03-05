import * as jose from 'jose';

export interface JWTPayload {
  sub: string;
  email: string;
  provider?: 'google' | 'github' | 'email';
  isAdmin?: boolean;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}


export async function getSigningKey(): Promise<jose.KeyLike | Uint8Array> {
  const privateKeyPEM = process.env.JWT_PRIVATE_KEY;
  if (!privateKeyPEM) {
    throw new Error('JWT_PRIVATE_KEY not found in environment');
  }
  return jose.importPKCS8(privateKeyPEM, 'EdDSA');
}

export async function getVerifyingKey(): Promise<jose.KeyLike | Uint8Array> {
  const publicKeyPEM = process.env.JWT_PUBLIC_KEY;
  if (!publicKeyPEM) {
    throw new Error('JWT_PUBLIC_KEY not found in environment');
  }
  return jose.importSPKI(publicKeyPEM, 'EdDSA');
}

export async function createAccessToken(
  userId: string,
  email: string,
  provider?: 'google' | 'github' | 'email',
  expiresInMinutes: number = 15,
  isAdmin: boolean = false
): Promise<string> {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    email,
    type: 'access',
    isAdmin,
    ...(provider && { provider }),
  };

  const key = await getSigningKey();

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInMinutes}m`)
    .sign(key);

  return jwt;
}


export async function createRefreshToken(
  userId: string,
  provider?: 'google' | 'github' | 'email',
  expiresInDays: number = 30
): Promise<string> {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    email: '',
    type: 'refresh',
    ...(provider && { provider }),
  };

  const key = await getSigningKey();

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .sign(key);

  return jwt;
}


export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const key = await getVerifyingKey();

    const verified = await jose.jwtVerify(token, key, {
      algorithms: ['EdDSA'],
    });

    return verified.payload as unknown as JWTPayload;
  } catch (error) {
    console.error('[JWT] Verification failed:', error);
    return null;
  }
}
