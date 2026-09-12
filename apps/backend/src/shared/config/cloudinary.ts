import { ConfigOptions } from "cloudinary";
import ENV from "./env";
import { UploadDIRType } from "../types";

export const UploadDIRDefault: UploadDIRType = "assets";

// CODE: Validate required environment variables
if (
  !ENV.CLOUDINARY_CLOUD_NAME ||
  !ENV.CLOUDINARY_API_KEY ||
  !ENV.CLOUDINARY_API_SECRET
) {
  throw new Error("Missing Cloudinary configuration in environment variables.");
}

// CODE: Configure Cloudinary with credentials from environment variables
export const cloudinaryConfig: ConfigOptions = {
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME, // Cloud name for Cloudinary account
  api_key: ENV.CLOUDINARY_API_KEY, // API key for Cloudinary account
  api_secret: ENV.CLOUDINARY_API_SECRET, // API secret for Cloudinary account
  secure: true, // This is key  
};
