interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  POLLINATIONS_TOKEN: string;
  CORS_ORIGIN: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB?: D1Database;
      KV?: KVNamespace;
      CLOUDINARY_CLOUD_NAME?: string;
      CLOUDINARY_API_KEY?: string;
      CLOUDINARY_API_SECRET?: string;
      POLLINATIONS_TOKEN?: string;
      CORS_ORIGIN?: string;
    }
  }
}

export {};
