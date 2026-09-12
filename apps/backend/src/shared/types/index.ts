// Upload Directories
export type UploadDIRType =
  | "products"
  | "profiles"
  | "merchant_requests"
  | "deliveries"
  | "assets";

// Create type from constants
// export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
// export type PaymentStatus =
//   (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
// export type StoreStatus = (typeof STORE_STATUS)[keyof typeof STORE_STATUS];
// export type ProductStatus =
//   (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
// export type DeliveryStatus =
//   (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export interface PaginationOptions {
  page?: number;
  limit?: number;
  // sort?: Record<string, 1 | -1>;
  select?: string;
  populate?: {
    path: string;
    select?: string;
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
// export interface PaginatedResponse<T> {
//   items: T[];
//   page: number;
//   limit: number;
//   totalPages: number;
//   total: number;
// }

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  tags?: string[];
  authorId?: string;
  published?: boolean;
}
