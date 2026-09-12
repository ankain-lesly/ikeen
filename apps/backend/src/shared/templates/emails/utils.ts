import { Decimal } from "../../../../prisma/generated/client/internal/prismaNamespace";
import { formatDate } from "../../lib/date-utils";

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const fmt = {
  date: (d: Date | string) => formatDate(new Date(d), "long"), //.form("dd MMM yyyy"),
  dateTime: (d: Date | string) => new Date(d).toISOString(), //.toFormat("dd MMM yyyy HH:mm"),
  currency: (n: number | string | null | undefined | Decimal) =>
    `${Number(n?.toString() ?? 0).toFixed(2)}`,
  pct: (n: number) => `${n.toFixed(1)}%`,
};
