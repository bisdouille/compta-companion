"use client";

import { signIn } from "next-auth/react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-accent/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bienvenue 👋</CardTitle>
          <CardDescription>
            Connecte-toi avec ton compte Google. L&apos;app accédera à ton Drive en lecture seule pour
            importer tes cours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <GoogleIcon />
            Continuer avec Google
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Tes données restent privées et stockées localement (ou sur ton serveur si tu déploies).
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
