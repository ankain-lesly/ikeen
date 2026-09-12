import {
  UserType,
  ModelStatus,
} from "../../../prisma/generated/client";

export interface MerchantContext {
  merchantId: string;
  staffId: string;
  status: ModelStatus;
  roles: string[];
  permissions: string[];
}
export interface TokenPayload {
  user: {
    id: string;
    type: UserType;
  };
  // Staff-specific context (for staff users)
  merchantContext?: MerchantContext;
  merchant: {
    id: string;
    status: ModelStatus;
  };
}
export type AuthenticatedUser = TokenPayload["user"];

export interface StaffMerchantInfo {
  staffId: string;
  merchant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    status: ModelStatus;
  };
  roles: string[];
  status: ModelStatus;
  lastActiveAt: Date | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}
