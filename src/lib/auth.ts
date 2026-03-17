import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn("[auth] authorize: missing email or password");
          return null;
        }

        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              studentProfile: true,
              professorProfile: true,
            },
          });

          if (!user) {
            // Generic log — do not reveal whether user exists
            console.warn("[auth] authorize: login failed");
            return null;
          }
          if (!user.isActive) {
            console.warn("[auth] authorize: login failed (inactive account)");
            return null;
          }

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          if (!valid) {
            console.warn("[auth] authorize: login failed (invalid credentials)");
            return null;
          }

          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profileId:
              user.studentProfile?.id ?? user.professorProfile?.id ?? null,
            programme: user.studentProfile?.programme ?? null,
          };
        } catch (err) {
          console.error("[auth] authorize: DB error →", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.profileId = (user as any).profileId;
        token.programme = (user as any).programme;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).profileId = token.profileId;
        (session.user as any).programme = token.programme;
      }
      return session;
    },
  },
});
