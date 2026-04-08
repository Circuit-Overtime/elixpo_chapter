import dotenv from "dotenv";
dotenv.config();

export const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || "";
export const POLLINATIONS_BASE = "https://gen.pollinations.ai";

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
export const NEWS_VOICES = ["shimmer", "ash", "shimmer", "ash", "shimmer"];
export const PODCAST_VOICES = ["shimmer"];
export const MAX_NEWS_ITEMS = 5;
