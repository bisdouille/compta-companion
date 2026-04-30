import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm, DriveSettings, ResetProgressionButton } from "./client";

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;
  const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Personnalise ton expérience de révision.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dossier Google Drive</CardTitle>
          <CardDescription>
            Le dossier racine qui contient tes cours. Tu peux le changer à tout moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriveSettings currentFolderId={prefs?.driveRootFolder ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objectifs & rappels</CardTitle>
          <CardDescription>
            Définis ton rythme idéal. Les statistiques de streak suivent ces objectifs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaultValues={{
              dailyGoalMin: prefs?.dailyGoalMin ?? 15,
              dailyGoalCards: prefs?.dailyGoalCards ?? 20,
              examDate: prefs?.examDate ? prefs.examDate.toISOString().slice(0, 10) : "",
              reminderTime: prefs?.reminderTime ?? "",
              preferredModel: prefs?.preferredModel ?? "claude-haiku-4-5-20251001",
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Zone sensible</CardTitle>
          <CardDescription>
            Remet à zéro ta progression de révision (SM-2, sessions, agenda quotidien). Ne touche
            pas au contenu généré.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetProgressionButton />
        </CardContent>
      </Card>
    </div>
  );
}
