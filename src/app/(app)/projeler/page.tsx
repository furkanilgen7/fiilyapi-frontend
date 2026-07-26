import { Suspense } from "react";

import { ProjectsView } from "@/components/projects/ProjectsView";

// useSearchParams kullanan istemci bilesen Suspense sinirinda sarilir (Next 15).
export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  );
}
