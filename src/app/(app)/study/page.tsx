import { Suspense } from "react";
import { StudySession } from "./client";

export default function StudyPage({
  searchParams,
}: {
  searchParams: { chapterId?: string; courseId?: string; mode?: string };
}) {
  return (
    <Suspense>
      <StudySession
        chapterId={searchParams.chapterId}
        courseId={searchParams.courseId}
        mode={searchParams.mode || "due"}
      />
    </Suspense>
  );
}
