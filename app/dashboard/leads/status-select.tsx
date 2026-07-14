"use client";

import { useTransition } from "react";
import { Select } from "@/app/components/ui/input";
import { updateLeadStatusAction } from "@/app/lib/actions/leads";
import { LEAD_STATUSSEN, LEAD_STATUS_LABELS } from "@/app/lib/leads";
import type { LeadStatus } from "@/app/generated/prisma/client";

export function StatusSelect({
  leadId,
  status,
  className,
}: {
  leadId: string;
  status: LeadStatus;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={pending}
      className={className}
      onChange={(e) => {
        const formData = new FormData();
        formData.set("leadId", leadId);
        formData.set("status", e.target.value);
        startTransition(() => updateLeadStatusAction(formData));
      }}
    >
      {LEAD_STATUSSEN.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
