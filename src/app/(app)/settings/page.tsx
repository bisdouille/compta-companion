import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm, DriveSettings } from "./client";

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
              preferredModel: prefs?.preferredModel ?? "claude-sonnet-4-6",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
