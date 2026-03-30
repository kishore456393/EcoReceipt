import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "SHOP_OWNER" | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "SHOP_OWNER" | null;
  }
}
