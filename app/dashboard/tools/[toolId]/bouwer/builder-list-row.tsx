"use client";

import { Pencil } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { DropdownMenu, type DropdownMenuItem } from "@/app/components/ui/dropdown-menu";
import { DragHandle, type DragHandleProps } from "@/app/components/ui/sortable-list";
import { cn } from "@/app/lib/cn";

// Eén gedeelde compacte rij voor Onderdelen/Vragen/Prijsregels (Deel 3/7/8
// van de UI/UX-herontwerpopdracht): naam + icoon + status + meta-regel, één
// duidelijke primaire actie ("Bewerken", ook door op de rij zelf te
// klikken), rest achter "•••". Vervangt de eerdere 4-6 losse icoonknoppen
// per rij in onderdelen-tab.tsx/velden-tab.tsx/regels-tab.tsx.
export function BuilderListRow({
  dragHandleProps,
  icon,
  title,
  meta,
  badge,
  extra,
  onEdit,
  menuItems,
  muted,
  className,
}: {
  dragHandleProps: DragHandleProps;
  icon?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  /** Extra rij-brede controle vóór de "Bewerken"-knop, bijv. een aan/uit-Switch. */
  extra?: React.ReactNode;
  onEdit: () => void;
  menuItems: DropdownMenuItem[];
  muted?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "transition-shadow",
        dragHandleProps.isDragging && "shadow-lg ring-1 ring-primary/30",
        muted && "opacity-60",
        className
      )}
    >
      <div className="flex items-center gap-1 py-2 pr-2 pl-1 sm:gap-2">
        <DragHandle {...dragHandleProps} />
        {icon}
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{title}</p>
              {badge}
            </div>
            {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
          </div>
        </button>
        {extra}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="hidden shrink-0 sm:inline-flex"
        >
          <Pencil className="h-3.5 w-3.5" />
          Bewerken
        </Button>
        <DropdownMenu items={menuItems} ariaLabel={`Meer acties voor ${title}`} />
      </div>
    </Card>
  );
}
