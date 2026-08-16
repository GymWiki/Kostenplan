"use client";

import { Select } from "@/app/components/ui/input";
import { LEAD_STATUSSEN, LEAD_STATUS_LABELS } from "@/app/lib/leads";
import type { LeadStatus } from "@/app/generated/prisma/client";

export function StatusSelect({
  leadId,
  status,
  className,
  onStatusChange,
}: {
  leadId: string;
  status: LeadStatus;
  className?: string;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}) {
  return (
    <Select
      defaultValue={status}
      className={className}
      onChange={(e) => onStatusChange(leadId, e.target.value as LeadStatus)}
    >
      {LEAD_STATUSSEN.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
