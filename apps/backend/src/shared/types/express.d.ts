import { TokenPayload } from "./auth";

declare module "ngeohash";

declare global {
  namespace Express {
    interface Request extends TokenPayload {
      requestTime?: string;
      // user: TokenPayload["user"];
      // merchant: TokenPayload["merchant"];
    }
  }
}
