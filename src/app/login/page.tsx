"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GraduationCap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function login() {
    try {
      const result = await signIn("google", { callbackUrl: "/dashboard", redirect: true });
      // Si la redirection ne se déclenche pas, c'est que les env vars sont KO côté serveur.
      if (result === undefined) {
        // Vérifie l'API providers — si vide, env vars manquantes
        const res = await fetch("/api/auth/providers");
        const providers = await res.json();
        if (!providers || !providers.google) {
          setError(
            "Le provider Google n'est pas configuré. Vérifie GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et NEXTAUTH_SECRET dans .env.local, puis redémarre `npm run dev`.",
          );
        } else {
          setError("La connexion n'a pas démarré. Ouvre la console (F12) pour voir l'erreur.");
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-accent/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Compta Companion</CardTitle>
          <CardDescription>Connecte-toi avec ton compte Google pour accéder à tes cours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" size="lg" onClick={login}>
            <GoogleIcon />
            Continuer avec Google
          </Button>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground text-center">
            Tes données restent stockées localement sur ton ordi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 11v3.4h4.8c-.2 1.3-1.6 3.7-4.8 3.7-2.9 0-5.3-2.4-5.3-5.4s2.4-5.4 5.3-5.4c1.7 0 2.8.7 3.4 1.3l2.3-2.2C16.3 5.1 14.4 4.2 12 4.2c-4.4 0-7.9 3.5-7.9 7.9s3.5 7.9 7.9 7.9c4.6 0 7.6-3.2 7.6-7.7 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}
