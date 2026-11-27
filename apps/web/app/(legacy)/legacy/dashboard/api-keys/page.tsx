import { redirect } from "next/navigation";

export default function ApiKeysRedirect() {
  redirect("/legacy/dashboard/keys");
}
