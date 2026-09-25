"use client";

import { useState } from "react";

import { useEvDisciplines } from "@/lib/api/hooks/useEvDisciplines";
import type { EvDisciplineRead } from "@/lib/api/models";

import { DisciplineDeleteDialog } from "./DisciplineDeleteDialog";
import { DisciplineFormModal } from "./DisciplineFormModal";
import { DisciplineListModal } from "./DisciplineListModal";

type ManagerView =
  | { kind: "list"; toast: string | null }
  | { kind: "form"; discipline: EvDisciplineRead | null }
  | { kind: "delete"; discipline: EvDisciplineRead };

interface DisciplineManagerProps {
  canWrite: boolean;
  canDelete: boolean;
  onClose: () => void;
}

/**
 * M6 · Disiplin yönetimi — liste / form / silme onayı arasında TEK modal.
 *
 * Mockup form ve onayı listenin ÜSTÜNE yığar (z 210 > 200). `settings/Modal`
 * yığılmayı desteklemiyor (her örnek belgeye kendi Escape + Tab tuzağı
 * dinleyicisini kurar → iç içe iki örnek Escape'te ikisini birden kapatır,
 * Tab'ı birbirinden çalar). Bu yüzden görünümler SIRAYLA açılır; kayıt/silme
 * sonrası listeye bildirimle dönülür (M6:164 başarı bandı).
 */
export function DisciplineManager({ canWrite, canDelete, onClose }: DisciplineManagerProps) {
  const disciplines = useEvDisciplines();
  const [view, setView] = useState<ManagerView>({ kind: "list", toast: null });
  const backToList = (toast: string | null = null) => setView({ kind: "list", toast });

  if (view.kind === "form") {
    return (
      <DisciplineFormModal
        discipline={view.discipline}
        existing={disciplines.data ?? []}
        onClose={() => backToList()}
        onSaved={backToList}
      />
    );
  }

  if (view.kind === "delete") {
    return <DisciplineDeleteDialog discipline={view.discipline} onClose={() => backToList()} onDeleted={backToList} />;
  }

  return (
    <DisciplineListModal
      disciplines={disciplines.data}
      isLoading={disciplines.isLoading}
      isError={disciplines.isError}
      onRetry={() => void disciplines.refetch()}
      canWrite={canWrite}
      canDelete={canDelete}
      toast={view.toast}
      onAdd={() => setView({ kind: "form", discipline: null })}
      onEdit={(discipline) => setView({ kind: "form", discipline })}
      onDelete={(discipline) => setView({ kind: "delete", discipline })}
      onClose={onClose}
    />
  );
}
