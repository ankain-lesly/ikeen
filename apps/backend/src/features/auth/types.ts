export interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  roleId?: string;
}

// export interface LoginDto {
//   email: string;
//   password: string;
// }

// export interface RegisterDto {
//   email: string;
//   password: string;
//   fullname: string;
// }

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface ChangePasswordDto {
  userId: string;
  currentPassword: string;
  newPassword: string;
}
