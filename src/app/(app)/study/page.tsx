import { Suspense } from "react";
import { StudySession } from "./client";

export default function StudyPage({
  searchParams,
}: {
  searchParams: { documentId?: string; chapterId?: string; courseId?: string; mode?: string };
}) {
  return (
    <Suspense>
      <StudySession
        documentId={searchParams.documentId}
        chapterId={searchParams.chapterId}
        courseId={searchParams.courseId}
        mode={searchParams.mode || "due"}
      />
    </Suspense>
  );
}
