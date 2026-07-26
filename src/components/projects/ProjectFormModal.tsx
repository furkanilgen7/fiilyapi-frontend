"use client";

import { useState } from "react";

import { Button, Input, Select } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { useCreateProject } from "@/lib/api/hooks/useProjectMutations";
import type { ProjectTypeFilter } from "@/lib/api/hooks/useProjects";
import { backendErrorMessage } from "@/lib/settings/error-message";
// Mockup'siz tek yuzey — Ayarlar form kanonu birebir izlenir (spec §8):
// settings-form/settings-field siniflari settings.css'ten gelir.
import "@/components/settings/settings.css";

interface ProjectFormModalProps {
  onClose: () => void;
}

export function ProjectFormModal({ onClose }: ProjectFormModalProps) {
  const createProject = useCreateProject();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState<ProjectTypeFilter>("taahhut");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [salesTarget, setSalesTarget] = useState("");
  const [landCost, setLandCost] = useState("");
  const [landownerName, setLandownerName] = useState("");
  const [ourSharePct, setOurSharePct] = useState("");
  const [ownerSharePct, setOwnerSharePct] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createProject.isPending;

  function validate(): string | null {
    if (!code.trim()) return "Kod zorunludur.";
    if (!name.trim()) return "Ad zorunludur.";
    if (projectType === "taahhut") {
      if (!employerName.trim()) return "İşveren zorunludur.";
      if (contractAmount && Number.isNaN(Number(contractAmount))) {
        return "Sözleşme bedeli sayı olmalıdır.";
      }
    }
    if (projectType === "kendi_yatirim") {
      if (!salesTarget.trim() || Number.isNaN(Number(salesTarget))) {
        return "Satış hedefi sayı olmalıdır.";
      }
      if (landCost && Number.isNaN(Number(landCost))) return "Arsa maliyeti sayı olmalıdır.";
    }
    if (projectType === "kat_karsiligi") {
      if (!landownerName.trim()) return "Arsa sahibi zorunludur.";
      const ours = Number(ourSharePct);
      const owner = Number(ownerSharePct);
      if (!ourSharePct.trim() || Number.isNaN(ours) || ours < 0 || ours > 100) {
        return "Bizim pay 0-100 arası olmalıdır.";
      }
      if (!ownerSharePct.trim() || Number.isNaN(owner) || owner < 0 || owner > 100) {
        return "Arsa sahibi payı 0-100 arası olmalıdır.";
      }
      if (ours + owner !== 100) return "Pay oranlarının toplamı 100 olmalıdır.";
    }
    return null;
  }

  function handleSubmit() {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    createProject.mutate(
      {
        code,
        name,
        project_type: projectType,
        // NOT: gercek ProjectCreate semasinda "status" varsayilani "active" olsa da
        // TS tipinde zorunlu alan — acikca gonderiyoruz.
        status: "active",
        category: category || null,
        city: city || null,
        ...(projectType === "taahhut"
          ? {
              employer_name: employerName,
              contract_no: contractNo || null,
              contract_amount: contractAmount || null,
            }
          : {}),
        ...(projectType === "kendi_yatirim"
          ? { investment: { sales_target: salesTarget, land_cost: landCost || null } }
          : {}),
        ...(projectType === "kat_karsiligi"
          ? {
              land_share: {
                landowner_name: landownerName,
                our_share_pct: ourSharePct,
                owner_share_pct: ownerSharePct,
              },
            }
          : {}),
      },
      { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
    );
  }

  return (
    <Modal
      title="Yeni Proje"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <label className="settings-field">
          <span className="settings-field__label">Kod</span>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Ad</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Tip</span>
          <Select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value as ProjectTypeFilter)}
          >
            <option value="taahhut">Taahhüt</option>
            <option value="kendi_yatirim">Kendi Yatırım</option>
            <option value="kat_karsiligi">Kat Karşılığı</option>
          </Select>
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Kategori</span>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Şehir</span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        {projectType === "taahhut" && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">İşveren</span>
              <Input value={employerName} onChange={(e) => setEmployerName(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Sözleşme No</span>
              <Input value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Sözleşme Bedeli</span>
              <Input value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} />
            </label>
          </>
        )}
        {projectType === "kendi_yatirim" && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">Satış Hedefi</span>
              <Input value={salesTarget} onChange={(e) => setSalesTarget(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Arsa Maliyeti</span>
              <Input value={landCost} onChange={(e) => setLandCost(e.target.value)} />
            </label>
          </>
        )}
        {projectType === "kat_karsiligi" && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">Arsa Sahibi</span>
              <Input value={landownerName} onChange={(e) => setLandownerName(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Bizim Pay (%)</span>
              <Input value={ourSharePct} onChange={(e) => setOurSharePct(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Arsa Sahibi Payı (%)</span>
              <Input value={ownerSharePct} onChange={(e) => setOwnerSharePct(e.target.value)} />
            </label>
          </>
        )}
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
