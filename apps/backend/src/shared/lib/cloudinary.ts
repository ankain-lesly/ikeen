import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from "cloudinary";
import { UploadDIRType } from "../types";
import { cloudinaryConfig, UploadDIRDefault } from "../config/cloudinary";
import { createError } from "../http/app-error";
import { log } from "./utils";

// CODE: Configure Cloudinary with credentials from environment variables
cloudinary.config(cloudinaryConfig);

// Define a type for the result of Cloudinary uploads
export type CloudinaryUploadResult = UploadApiResponse | UploadApiErrorResponse;

const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "video/webm",
];

export function isCloudinaryUploadSuccess(
  result: CloudinaryUploadResult | undefined | null,
): result is UploadApiResponse {
  return (
    !!result &&
    "public_id" in result &&
    !!result.public_id &&
    !!(result.secure_url || result.url)
  );
}

function assertUploadFile(file: Express.Multer.File): void {
  if (!file?.buffer?.length) {
    throw createError.badRequest("Uploaded file is empty or missing");
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
    throw createError.badRequest(
      `Unsupported file type: ${file.mimetype || "unknown"}`,
    );
  }
}

/**
 * Handle Upload MediaFile to Cloudinary
 * This function uploads a single file to Cloudinary.
 * @param file - The file to be uploaded (from Express Multer)
 * @param public_id - Optional public ID for the uploaded file
 * @param folder - Optional folder name in Cloudinary to store the file
 * @returns A promise that resolves to the upload result or error response
 */
export async function uploadImage(
  file: Express.Multer.File,
  folder: UploadDIRType = UploadDIRDefault,
  public_id?: string
): Promise<CloudinaryUploadResult> {
  // Call the internal function to upload the file to Cloudinary
  // return await uploadCloudinaryImage(file, folder, public_id);
  try {
    return await uploadCloudinaryFile(file, folder, public_id);
  } catch (error: any) {
    log(`Cloudinary upload error: ${error.message}`);
    throw createError.serverError(`Failed to process upload. Try again`);
  }
}

/**
 * Handle Upload many MediaFiles to Cloudinary
 * This function uploads multiple files to Cloudinary.
 * @param files - A List of files to be uploaded (from Express Multer)
 * @param public_id - Optional public ID for the uploaded file
 * @param folder - Optional folder name in Cloudinary to store the file
 * @returns A promise that resolves to the upload result or error response
 */
export async function uploadImages(
  files: Express.Multer.File[],
  folder: UploadDIRType = UploadDIRDefault,
  public_id?: string
): Promise<CloudinaryUploadResult[]> {
  return Promise.all(
    files.map((file) => uploadCloudinaryImage(file, folder, public_id))
  );
}

/**
 * Upload MediaFile to Cloudinary
 * This function handles the actual upload process to Cloudinary.
 * @param file - The file to be uploaded (from Express Multer)
 * @param public_id - Optional public ID for the uploaded file
 * @param folder - Optional folder name in Cloudinary to store the file
 * @returns A promise that resolves to the upload result or error response
 */
async function uploadCloudinaryImage(
  file: Express.Multer.File,
  folder: UploadDIRType = UploadDIRDefault,
  public_id?: string
): Promise<CloudinaryUploadResult> {
  assertUploadFile(file);

  // Convert the file buffer to a base64 string
  const b64 = Buffer.from(file.buffer).toString("base64");
  // Create a data URI for the file
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  try {
    return await cloudinary.uploader.upload(dataURI, {
      public_id,
      folder,
      resource_type: "auto", // Automatically determine the resource type
    });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw createError.serverError(
      `Upload failed: ${error?.message ?? "unknown error"}`,
    );
  }
}

// Function to upload a file to Cloudinary
async function uploadCloudinaryFile(
  file: Express.Multer.File,
  folder: string = "default_folder", // Default folder name for uploads
  public_id?: string // Optional custom public_id for the file
): Promise<CloudinaryUploadResult> {
  assertUploadFile(file);

  const uploadOptions: {
    public_id?: string;
    folder: string;
    resource_type: "image" | "auto";
  } = {
    public_id,
    folder,
    resource_type: file.mimetype.startsWith("image/") ? "image" : "auto",
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          finish(() =>
            reject(
              createError.serverError(
                `CL: Upload failed: ${error.message}`,
              ),
            ),
          );
          return;
        }
        if (!isCloudinaryUploadSuccess(result)) {
          finish(() =>
            reject(
              createError.serverError(
                "CL: Upload returned an invalid upload result",
              ),
            ),
          );
          return;
        }
        finish(() => resolve(result));
      },
    );

    stream.on("error", (err) => {
      finish(() =>
        reject(
          createError.serverError(`CL: Upload stream error: ${err.message}`),
        ),
      );
    });

    stream.end(file.buffer);
  });
}

/**
 * Delete a file from Cloudinary
 * This function deletes a file using its public ID.
 * @param publicId - The public ID of the file to be deleted
 * @returns A promise that resolves to the delete result or error response
 */
export async function deleteFromCloudinary(
  publicId: string
): Promise<UploadApiResponse | UploadApiErrorResponse> {
  try {
    // Call Cloudinary's destroy method to delete the file
    const result = await cloudinary.uploader.destroy(publicId);
    return result; // Return the result of the delete operation
  } catch (error: any) {
    // Log any errors that occur during the delete process
    console.error("Cloudinary delete error:", error);
    throw new Error(`Cloudinary delete failed: ${error.message}`); // Rethrow with a more descriptive message
  }
}

/**
 * Get the URL of a file stored in Cloudinary
 * This function retrieves the URL of a file using its public ID.
 * @param publicId - The public ID of the file
 * @returns A promise that resolves to the URL of the file
 */
export async function getCloudinaryUrl(publicId: string): Promise<string> {
  // Return the URL of the file from Cloudinary
  return cloudinary.url(publicId);
}
// >>>>>>>>>>>>>>>>>>>>
// >> CODE: Save Cloudinary Data to Database <<
// >>>>>>>>>>>>>>>>>>>>

/**
 * Saves file metadata from Cloudinary to the database.
 * Supports both single and multiple file uploads and can work within a Prisma transaction.
 *
 * @param {CloudinaryUploadResult | CloudinaryUploadResult[]} fileInfo - The file metadata from Cloudinary.
 * @param {string} fileableId - The ID of the entity associated with the file (e.g., user, product).
 * @param {UploadDIRType} [folder=UploadDIRDefault] - The directory/folder type for file categorization.
 * @param {PrismaClient | Prisma.TransactionClient} [tx=prisma] - Optional Prisma transaction client for atomic operations.
 * @returns {Promise<Prisma.BatchPayload | Prisma.File>} - The saved file(s) metadata in the database.
 */

// export const handleSaveFile = async (
//   fileInfo: CloudinaryUploadResult | CloudinaryUploadResult[],
//   fileableField: keyof MediaFile,
//   fileableId: string,
//   folder: UploadDIRType = UploadDIRDefault,
//   tx: PrismaClient | Prisma.TransactionClient = prisma // Support transaction
// ) => {
//   if (Array.isArray(fileInfo)) {
//     // ✅ Use createMany inside the provided transaction
//     return await tx.mediaFile.createMany({
//       data: fileInfo.map((file) =>
//         mapCloudinaryFileData({
//           fileInfo: file,
//           fileableField,
//           fileableId,
//           folder,
//         })
//       ),
//     });
//   } else {
//     // ✅ Use create inside the provided transaction
//     return await tx.mediaFile.create({
//       data: mapCloudinaryFileData({
//         fileInfo,
//         fileableField,
//         fileableId,
//         folder,
//       }),
//     });
//   }
// };

// interface MapFileProps {
//   fileInfo: CloudinaryUploadResult;
//   fileableField?: keyof MediaFile;
//   fileableId?: string;
//   folder: UploadDIRType;
// }

// // Function to map and generate file data
// export const mapCloudinaryFileData = ({
//   fileInfo,
//   fileableField,
//   fileableId,
//   folder = UploadDIRDefault,
// }: MapFileProps) => {
//   return {
//     ...(fileableField && fileableId ? { [fileableField]: fileableId } : {}),
//     publicId: fileInfo.public_id,
//     folder: folder,
//     size: fileInfo.bytes.toString(), // Use Cloudinary's bytes
//     mimeType: `${fileInfo.resource_type}/${fileInfo.format}`, // Use Cloudinary's format
//     path: fileInfo.secure_url || fileInfo.url, // Use Cloudinary's URL
//     name: `${fileInfo.public_id}.${fileInfo.format}`, // Use Cloudinary's public id and format to generate name
//   };
// };
