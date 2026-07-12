"use client";

import { useRef, useTransition } from "react";
import { Switch } from "@/app/components/ui/switch";

export function ActiveToggle({
  action,
  id,
  idField,
  actief,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  idField: string;
  actief: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      onChange={() => {
        const formData = new FormData(formRef.current!);
        startTransition(() => action(formData));
      }}
    >
      <input type="hidden" name={idField} value={id} />
      <input type="hidden" name="actief" value={String(actief)} />
      <Switch defaultChecked={actief} disabled={pending} />
    </form>
  );
}
