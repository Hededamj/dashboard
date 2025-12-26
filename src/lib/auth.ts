import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow whitelisted emails (comma-separated)
      const allowedEmailsStr = process.env.ALLOWED_EMAIL;

      if (!allowedEmailsStr) {
        console.error("ALLOWED_EMAIL environment variable is not set");
        return false;
      }

      // Split by comma and trim whitespace
      const allowedEmails = allowedEmailsStr.split(',').map(email => email.trim());

      if (!user.email || !allowedEmails.includes(user.email)) {
        console.log(`Unauthorized login attempt from: ${user.email}`);
        return false;
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
