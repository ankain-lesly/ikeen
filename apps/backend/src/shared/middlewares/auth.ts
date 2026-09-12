import { createError } from "../http/app-error";
import type { Request, Response, NextFunction } from "express";
import * as TokenService from "../../features/auth/token.service";
import type { TokenPayload } from "../types/auth";
import { log } from "../lib/utils";
import { UserType } from "../../../prisma/generated/client";

/**
 * Authentication Chain Builder
 * Provides a fluent API for building authentication middleware chains
 */
interface AuthOptions {
  loadUserData: boolean;
  loadMerchantData: boolean;
  optionalAuth: boolean;
  userTypes: UserType[];
  scope?: string;
  selfAccessParam?: string;
}

class AuthChain {
  private tokenPayload: TokenPayload | null = null;
  private options: AuthOptions = {
    loadUserData: false,
    loadMerchantData: false,
    optionalAuth: false,
    userTypes: [],
    scope: undefined,
    selfAccessParam: undefined,
  };

  constructor() {}

  /**
   * Basic authentication - validates JWT token
   */
  private authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Validate request headers
      if (!req.headers.authorization) {
        throw createError.unauthorized("Authorization header is required");
      }

      // Check Bearer token format
      const authHeader = req.headers.authorization;
      if (!authHeader.startsWith("Bearer ")) {
        throw createError.unauthorized(
          "Invalid authorization format. Use 'Bearer <token>'",
        );
      }

      // Extract token
      const token = authHeader.substring(7);
      if (!token || token.trim().length === 0) {
        throw createError.unauthorized("Token is required");
      }

      // Validate token format (basic JWT structure check)
      if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
        throw createError.unauthorized("Invalid token format");
      }

      // Verify and decode token
      const decoded = TokenService.verifyToken<TokenPayload>(token);

      // Set Global Reference
      this.tokenPayload = decoded;

      // log("DECODED", decoded);

      // if (!decoded.id && decoded.email) {
      //   throw createError.unauthorized("Invalid token");
      // }

      // Fetch user from database with additional security checks
      // =======================
      // TODO: CODE: DEV: NOTE: --- Using Token Data
      // =======================
      // const user = await prisma.user.findUnique({
      //   where: {
      //     id: decoded.id,
      //   },
      //   select: {
      //     id: true,
      //     email: true,
      //     firstName: true,
      //     lastName: true,
      //     type: true,
      //     status: true,
      //     lastLogin: true,
      //   },
      // });

      // if (!user) {
      //   throw createError.unauthorized("User not found or token mismatch");
      // }

      // // Check if user account is active
      // if (user.status !== "active") {
      //   throw createError.unauthorized(
      //     "Account is deactivated. Please contact support"
      //   );
      // }

      // // Attach user to request
      // req.user = user;
      // =======================
      // TODO: CODE: DEV: NOTE: --- Using Token Data
      // =======================

      req.user = decoded.user;
      // log("🔐 User attached to request:", req.user.id);

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  private authenticateOptional = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      log("🔐 Optional Auth Middleware");

      // Check if authorization header exists
      if (!req.headers.authorization) {
        log("🔐 No authorization header - continuing as guest");
        return next(); // Continue without authentication
      }

      // Check Bearer token format
      const authHeader = req.headers.authorization;
      if (!authHeader.startsWith("Bearer ")) {
        log("🔐 Invalid authorization format - continuing as guest");
        return next(); // Continue without authentication
      }

      // Extract token
      const token = authHeader.substring(7);
      if (!token || token.trim().length === 0) {
        log("🔐 Empty token - continuing as guest");
        return next(); // Continue without authentication
      }

      // Validate token format (basic JWT structure check)
      if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
        log("🔐 Invalid token format - continuing as guest");
        return next(); // Continue without authentication
      }

      try {
        // Try to verify and decode token
        log("🔐 Attempting to verify token");
        const decoded = TokenService.verifyToken<TokenPayload>(token);
        log("🔐 Token verified successfully:", decoded.user.id);

        // =======================
        // TODO: CODE: DEV: NOTE: --- Using Token Data
        // =======================

        // // Fetch user from database
        // const user = await prisma.user.findUnique({
        //   where: {
        //     id: decoded.id,
        //     // email: decoded.email,
        //   },
        //   select: {
        //     id: true,
        //     email: true,
        //     firstName: true,
        //     lastName: true,
        //     type: true,
        //     status: true,
        //     lastLogin: true,
        //   },
        // });

        // if (user && user.status === "active") {
        //   // Attach user to request
        //   req.user = user;
        //   log("�� User authenticated and attached:", req.user.id);
        // } else {
        //   log("🔐 User not found or inactive - continuing as guest");
        // }

        req.user = decoded.user;
      } catch (tokenError) {
        log("�� Token verification failed - continuing as guest:", tokenError);
        // Continue without authentication - don't fail the request
      }

      next();
    } catch (error) {
      log("🔐 Optional auth error - continuing as guest:", error);
      // For optional auth, we don't fail on errors - just continue
      next();
    }
  };

  // /**
  //  * Validate user exists and is properly set
  //  */
  // private validateUser = (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): void => {
  //   if (!req.user || !req.user.id) {
  //     log("💔 User validation failed - no user object");
  //     return next(createError.unauthorized("User authentication required"));
  //   }
  //   log("🔐 User validation passed:", req.user.id);
  //   next();
  // };

  /**
   * Load additional user data based on options
   */
  private loadUserData = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        // log("💔 loadUserData: No user object, stopping chain");
        return next(createError.unauthorized("User authentication required"));
      }

      // Load merchant data
      // if (this.options.loadMerchantData && req.user.type === USER_TYPE.VENDOR) {
      if ((["merchant", "staff"] as UserType[]).includes(req.user.type)) {
        // const merchant = await prisma.merchant.findUnique({
        //   where: { id: this.tokenPayload?.merchantId },
        //   select: {
        //     id: true,
        //     name: true,
        //     email: true,
        //     phone: true,
        //   },
        // });
        // if (!merchant) throw createError.notFound("Merchant not found");
        req.merchant = this.tokenPayload!.merchant;

        // if (req.user.type === "merchant") {
        //   const merchantContext = await AuthService.selectMerchantOwnerContext(
        //     merchant as Merchant
        //   );
        //   req.user.merchantContext = merchantContext;
        // } else {
        //   // Auto-select single merchant
        //   const { merchantContext } = await AuthService.selectStaffMerchantContext(
        //     req.user.id,
        //     merchant.id
        //   );
        //   req.user.merchantContext = merchantContext;
        // }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check user type authorization
   */
  private checkUserType = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user) {
        throw createError.unauthorized("Authentication required");
      }

      if (
        this.options.userTypes.length > 0 &&
        !this.options.userTypes.includes(req.user.type as UserType)
      ) {
        throw createError.forbidden("Not Authorized");
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check scope-based access
   */
  private checkScope = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user || !this.options.scope) {
        return next();
      }

      // TODO: Implement scope-based access control when scope system is added
      // For now, just pass through
      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check permission-based access control
   */
  private checkPermissions = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user) {
        throw createError.unauthorized("Authentication required");
      }

      // Get permissions from merchantContext (for staff/merchant users)
      const userPermissions =
        this.tokenPayload?.merchantContext?.permissions || [];

      // Check wildcard permission (owner has all permissions)
      if (userPermissions.includes("*")) {
        return next();
      }

      // Normalize to array

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check self-access control
   */
  private checkSelfAccess = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      if (!req.user || !this.options.selfAccessParam) {
        return next();
      }

      const requestedUserId =
        req.params[this.options.selfAccessParam] ||
        req.body[this.options.selfAccessParam];

      if (!requestedUserId) {
        throw createError.badRequest(
          `Missing ${this.options.selfAccessParam} parameter`,
        );
      }

      // Ensure requestedUserId is a string
      const userId = Array.isArray(requestedUserId)
        ? requestedUserId[0]
        : requestedUserId;

      // Allow access if user is requesting their own data
      if (req.user.id === userId) {
        return next();
      }

      // Allow admin access to all user data
      if (req.user.type === "admin") {
        return next();
      }

      throw createError.forbidden("You can only access your own resources");
    } catch (error) {
      next(error);
    }
  };

  /**
   * Build the final middleware chain
   */
  private buildChain(): Array<
    (req: Request, res: Response, next: NextFunction) => void
  > {
    const chain: Array<
      (req: Request, res: Response, next: NextFunction) => void
    > = [];

    // For optional auth, we still run authentication but don't fail if it doesn't work
    if (this.options.optionalAuth) {
      chain.push(this.authenticateOptional);
    } else {
      // Always start with authentication for required auth
      chain.push(this.authenticate);
    }

    // // Add user validation if user data loading is enabled
    // if (this.options.loadUserData) {
    //   chain.push(this.validateUser);
    // }

    // Add user type check if specified
    if (this.options.userTypes.length > 0) {
      chain.push(this.checkUserType);
    }

    // Add scope check if specified
    if (this.options.scope) {
      chain.push(this.checkScope);
    }

    // Add self-access check if specified
    if (this.options.selfAccessParam) {
      chain.push(this.checkSelfAccess);
    }

    // Add user data loading if any option is enabled
    if (this.options.loadUserData || this.options.loadMerchantData) {
      chain.push(this.loadUserData);
    }

    return chain;
  }

  /**
   * Load user data and profile information
   */
  withUser(): AuthChain {
    this.options.loadUserData = true;
    return this;
  }

  /**
   * Load merchant-specific data
   */
  merchant(): AuthChain {
    this.options.userTypes.push("merchant");
    this.options.loadMerchantData = true;
    return this;
  }

  /**
   * Admin access only
   */
  admin(): AuthChain {
    this.options.userTypes.push("admin");
    return this;
  }

  /**
   * Set scope for access control
   */
  withScope(scope: string): AuthChain {
    this.options.scope = scope;
    return this;
  }

  /**
   * Load user permissions (kept for backward compatibility)
   */
  withPermissions(): AuthChain {
    return this;
  }

  /**
   * Load user roles (kept for backward compatibility)
   */
  withRoles(): AuthChain {
    return this;
  }

  /**
   * Self-access control
   */
  selfAccess(paramName: string = "userId"): AuthChain {
    this.options.selfAccessParam = paramName;
    return this;
  }

  /**
   * Allow multiple user types
   */
  allow(...userTypes: UserType[]): AuthChain {
    this.options.userTypes.push(...userTypes);
    return this;
  }
  /**
   * Optional authentication - allows both authenticated and non-authenticated users
   * Sets req.user if authenticated, but doesn't require it
   */
  optional(): AuthChain {
    this.options.optionalAuth = true;
    return this;
  }

  /**
   * Execute the middleware chain and return Express middleware
   */
  execute(): (req: Request, res: Response, next: NextFunction) => void {
    const chain = this.buildChain();

    return (req: Request, res: Response, next: NextFunction) => {
      let index = 0;
      // log(`🔐 Auth chain starting with ${chain.length} middleware functions`);

      const executeNext = (error?: any) => {
        // If there's an error, pass it to Express error handling and stop IMMEDIATELY
        if (error) {
          // log(`💔 Auth chain error detected, stopping:`, error.message);
          return next(error);
        }

        // If we've reached the end of the chain, continue to the next middleware
        if (index >= chain.length) {
          // log(
          //   `🔐 Auth chain completed successfully, continuing to route handler`
          // );
          return next();
        }

        const middleware = chain[index];
        // const currentIndex = index;
        index++;

        // log(
        //   `🔐 Executing middleware ${currentIndex + 1}/${chain.length}: ${middleware.name || "anonymous"}`
        // );

        // Execute the middleware and handle any errors it might throw
        middleware(req, res, executeNext);
      };

      executeNext();
    };
  }
}

/**
 * Main authentication function that starts the chain
 */
const authenticate = (): AuthChain => new AuthChain();

/**
 * Pre-built authentication chains for common use cases
 */
export const AUTH = {
  // Basic authentication - includes user data loading and validation
  basic: authenticate().withUser().execute(),

  // Optional authentication - allows both authenticated and non-authenticated users
  optional: authenticate().optional().execute(),

  // Admin only
  admin: authenticate().admin().execute(),

  // Merchant with data
  merchant: authenticate().merchant().withUser().execute(),

  // Merchant admin access
  merchantAdmin: authenticate()
    .allow("merchant", "admin")
    .withUser()
    .execute(),

  // All authenticated users
  allUsers: authenticate()
    .allow("admin", "customer", "merchant")
    .withUser()
    .execute(),

  // All authenticated users
  role: (...roles: UserType[]) =>
    authenticate()
      .allow(...roles)
      .withUser()
      .execute(),

  // Self-access patterns
  selfAccess: (paramName: string = "userId") =>
    authenticate().selfAccess(paramName).execute(),
};

/**
 * Chainable authentication builders for permission-based access control
 * Use these when you need .can() permission checks
 *
 * @example
 * auth.merchant().can("MANAGE_STAFF").execute()
 * auth.merchantAdmin().can("VIEW_STAFF", "MANAGE_STAFF").execute()
 */
export const auth = {
  basic: () => authenticate().withUser(),
  merchant: () => authenticate().merchant().withUser(),
  merchantAdmin: () =>
    authenticate().allow("merchant", "admin").withUser(),
  admin: () => authenticate().admin(),
  allUsers: () =>
    authenticate()
      .allow("admin", "customer", "merchant")
      .withUser(),
};

export default authenticate;
