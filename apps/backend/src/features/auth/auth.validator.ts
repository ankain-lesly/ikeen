import { UserType } from "../../../prisma/generated/client";
import { z } from "zod";

// Register schema
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Your fullname is required")
      .regex(/^[A-Za-z\s'-]+$/, "Fullname can only contain letters, spaces"),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    email: z.string().email("Invalid email address"),
  }),
});

// Login schema
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

// Social login schema
export const socialSigninSchema = z.object({
  body: z.object({
    provider: z.enum(["google", "apple"], {
      message: "Google or apple sigin option",
    }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    image: z.string().url().optional(),
    providerAccountId: z.string().min(1, "Provider Account ID is required"),
    isEmailVerified: z.boolean().optional(),
  }),
});

// Validate Social login user schema
export const socialSiginValidateSchema = z.object({
  body: z.object({
    email: z.string().email(),
    providerAccountId: z.string().min(1, "Provider Account ID is required"),
  }),
});

// export const socialLoginSchema = z.object({
// body: z.object({
//   provider: z.enum(["google", "facebook", "apple"], {
//     errorMap: () => ({
//       message: "Provider must be one of: google, facebook, apple",
//     }),
//   }),
//   token: z.string().min(1, "Token is required"), })
// });

// // Verify email schema
// export const verifyEmailSchema = z.object({
//   body: z.object({
//     token: z.string().min(1, "Token is required"),
//   }),
// });

// Forgot password schema
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    type: z.nativeEnum(UserType, { message: "Invalid Request" })?.optional(),
  }),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, "Token is required"),
      password: z.string().min(8, {
        message: "Password must be at least 8 characters.",
      }),
      passwordConfirm: z.string().min(1, "Confirm password is required"),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: "Passwords must match",
      path: ["passwordConfirm"],
    }),
});

// export const authValidators = {
//   validateLogin: validate(z.object({ body: loginSchema })),
//   validateRegister: validate(z.object({ body: registerSchema })),
//   validateForgotPassword: validate(z.object({ body: forgotPasswordSchema })),
//   validateResetPassword: validate(z.object({ body: resetPasswordSchema })),
//   // validateVerifyEmail: validate(z.object({ body: verifyEmailSchema })),
//   validateChangePassword: validate(z.object({ body: changePasswordSchema })),
//   // validateUpdateProfile: validate(
//   //   z.object({ body: updateProfileSchema })
//   // ),
//   // validateRefreshToken: validate(z.object({ body: refreshTokenSchema })),
//   validateSocialLogin: validate(z.object({ body: socialLoginSchema })),
//   // validateCreateUser: validate(z.object({ body: createUserSchema })),
//   // validateUpdateUser: validate(z.object({ body: updateUserSchema })),
// };

// // Verify email schema
// export const verificationSchema = z.object({
//   body: z.object({
//     token: z.string().min(1, "Token is required").optional(),
//     email: z.string().email().optional(),
//     code: z.string().min(1, "Code is required").optional(),
//   }),
// });

// Export Types DTOs
export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
export type SocialSigninInput = z.infer<typeof socialSigninSchema>["body"];
export type SocialSigninValidateInput = z.infer<
  typeof socialSiginValidateSchema
>["body"];
