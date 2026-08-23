"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Echte drag-and-drop-herordening (Deel 4 van de UI/UX-herontwerpopdracht),
// gebouwd op @dnd-kit — dezelfde bibliotheek die het leads Kanban-bord al
// gebruikt (app/dashboard/leads/kanban-board.tsx), hier met de @dnd-kit/
// sortable-laag erbovenop voor verticale lijstherordening (live "waar komt
// het terecht"-feedback zit al in @dnd-kit/sortable's animatie, hoeft niet
// zelf gebouwd te worden).
//
// Alleen het sleep-handvat (DragHandle) krijgt de listeners/attributes, niet
// de hele rij — zo kan een gebruiker nooit per ongeluk een onderdeel openen
// door ergens anders op de rij te klikken (dat risico bestaat wél in het
// Kanban-bord, waar de hele kaart sleepbaar is; hier bewust anders omdat
// rijen ook klikbare acties bevatten).
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  dndContextId,
  className,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, dragHandleProps: DragHandleProps) => React.ReactNode;
  dndContextId: string;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oudeIndex = items.findIndex((item) => item.id === active.id);
    const nieuweIndex = items.findIndex((item) => item.id === over.id);
    if (oudeIndex === -1 || nieuweIndex === -1) return;
    onReorder(arrayMove(items, oudeIndex, nieuweIndex));
  }

  return (
    <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={cn("flex flex-col gap-2", className)}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(dragHandleProps) => renderItem(item, dragHandleProps)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export type DragHandleProps = {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  isDragging: boolean;
};

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: DragHandleProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-10")}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

// Presentationele sleep-handvat-knop — gebruikt de attributes/listeners van
// SortableList's renderItem-callback. `touch-none` voorkomt dat de browser
// zelf gaat scrollen zodra een sleepbeweging op een touchscreen begint.
export function DragHandle({
  attributes,
  listeners,
  isDragging,
}: {
  attributes: DragHandleProps["attributes"];
  listeners: DragHandleProps["listeners"];
  isDragging?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Verslepen om te herordenen"
      className={cn(
        "flex h-9 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-muted-foreground active:cursor-grabbing",
        isDragging && "cursor-grabbing text-foreground"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
