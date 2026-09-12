// >>>
// >>> CODE: Memory File Upload to Cloudinary
// >>>

import multer from "multer";

const storage = multer.memoryStorage();
const uploadMemo = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// /** Multer single-file upload with mapped validation errors */
// export function uploadSingle(field: string): RequestHandler[] {
//   return [
//     (req, res, next) => {
//       uploadMemo.single(field)(req, res, (err) => {
//         if (!err) return next();
//         if (err instanceof MulterError) {
//           if (err.code === "LIMIT_FILE_SIZE") {
//             return next(createError.badRequest("File too large (max 10MB)"));
//           }
//           return next(createError.badRequest(err.message));
//         }
//         next(err);
//       });
//     },
//   ];
// }

export default uploadMemo;

// >>>
// >>> CODE: Disk File Upload
// >>>

// import multer from "multer";
// import path from "path";

// const uploadPath = process.env.UPLOAD_PATH || "./uploads";

// // Ensure the upload directory exists
// import fs from "fs";
// if (!fs.existsSync(uploadPath)) {
//   fs.mkdirSync(uploadPath, { recursive: true });
// }

// // Multer setup
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(
//       null,
//       file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
//     );
//   },
// });

// const upload = multer({ storage: storage });
