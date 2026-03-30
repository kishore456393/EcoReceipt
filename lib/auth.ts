import { NextAuthOptions, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          console.error("[Auth] Missing email or password");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              passwordHash: true,
            },
          });

          if (!user) {
            console.error("[Auth] No user found for email:", email);
            return null;
          }

          if (!user.passwordHash) {
            console.error("[Auth] User has no password (likely signed up via Google):", email);
            return null;
          }

          const passwordValid = await compare(password, user.passwordHash);
          if (!passwordValid) {
            console.error("[Auth] Invalid password for:", email);
            return null;
          }

          console.log("[Auth] Credentials sign-in successful for:", email);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role ?? "SHOP_OWNER",
          } as User & { role: string };
        } catch (error) {
          console.error("[Auth] Error during authorize:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth logins (Google), check if user exists by email and link if needed
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true },
          });

          if (existingUser) {
            // Check if this Google account is already linked
            const googleAccountLinked = existingUser.accounts.some(
              (acc) => acc.provider === "google"
            );

            if (!googleAccountLinked) {
              // Link the Google account to the existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                },
              });
            }

            // Update the user role and email verification for existing users
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                role: "SHOP_OWNER",
                emailVerified: new Date(),
              },
            });

            return true;
          }

          // For NEW Google users: don't try to update here.
          // The adapter will create the user after signIn returns true.
          // Role will be set via the linkAccount event below.
          console.log("[Auth] New Google user, will be created by adapter:", user.email);
        } catch (error) {
          console.error("[Auth] Failed to process Google sign-in:", error);
          // Don't block sign-in on account linking errors
        }
      } else if (account?.provider === "credentials") {
        // For credentials login, role is already set in authorize
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "SHOP_OWNER" },
          });
        } catch (error) {
          console.error("[Auth] Failed to set role for credentials login:", error);
        }
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      // On initial sign in, attach user id and role
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? "SHOP_OWNER";
      }

      // When session is updated or on any sign-in, ensure role is correct
      if (trigger === "update" || (trigger === "signIn" && token.id)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role ?? "SHOP_OWNER";
          }
        } catch (error) {
          console.error("[Auth] Failed to fetch role in jwt callback:", error);
        }
      }

      // Ensure role always has a value
      if (!token.role) {
        token.role = "SHOP_OWNER";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  events: {
    async linkAccount({ user }) {
      // This runs after the adapter creates a new user and links the OAuth account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          role: "SHOP_OWNER",
        },
      });
    },
  },
};
