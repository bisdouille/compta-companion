import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const missing: string[] = [];
if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
if (!process.env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
if (!process.env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");
if (missing.length) {
  console.error(
    `\n❌ NextAuth: variables d'environnement manquantes: ${missing.join(", ")}\n` +
      `   → Édite .env.local puis redémarre 'npm run dev'.\n`,
  );
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
