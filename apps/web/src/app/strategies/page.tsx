'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import {
  toggleStrategy,
  deleteStrategy,
  reorderStrategies,
  type StrategyItem,
} from '@/lib/api-client';
import { useStrategies } from '@/hooks/use-strategies';
import { useExchangeKeys } from '@/hooks/use-exchange-keys';
import { useUIMode } from '@/hooks/use-ui-mode';
import { StrategyCard } from '@/components/strategies/strategy-card';
import { CreateStrategyForm } from '@/components/strategies/create-strategy-form';
import { EasyStrategyWizard } from '@/components/strategies/easy-strategy-wizard';
import { SkeletonCard } from '@/components/ui/skeleton';

function SortableStrategyCard({
  strategy,
  onToggle,
  onDelete,
}: {
  strategy: StrategyItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: strategy.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className="mt-4 p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1">
        <StrategyCard strategy={strategy} onToggle={onToggle} onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function StrategiesPage() {
  const t = useTranslations('strategies');
  const queryClient = useQueryClient();
  const { isEasy } = useUIMode();
  const { data: strategies = [], isLoading } = useStrategies();
  const { data: keys = [] } = useExchangeKeys();
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleMutation = useMutation({
    mutationFn: toggleStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderStrategies,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  });

  const sortedStrategies = useCallback(() => {
    if (!localOrder) return [...strategies].sort((a, b) => a.order - b.order);
    return localOrder
      .map((id) => strategies.find((s) => s.id === id))
      .filter(Boolean) as StrategyItem[];
  }, [strategies, localOrder])();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedStrategies.findIndex((s) => s.id === active.id);
    const newIndex = sortedStrategies.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(sortedStrategies, oldIndex, newIndex);

    setLocalOrder(newOrder.map((s) => s.id));
    reorderMutation.mutate(newOrder.map((s, i) => ({ id: s.id, order: i })));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {isEasy ? (
            <EasyStrategyWizard
              keys={keys}
              onSuccess={() => {
                setLocalOrder(null);
                queryClient.invalidateQueries({ queryKey: ['strategies'] });
              }}
            />
          ) : (
            <CreateStrategyForm
              keys={keys}
              onSuccess={() => {
                setLocalOrder(null);
                queryClient.invalidateQueries({ queryKey: ['strategies'] });
              }}
            />
          )}
        </div>
        <div className="lg:col-span-2 space-y-4">
          {isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
          {!isLoading && sortedStrategies.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t('noStrategies')}</p>
          )}
          {!isLoading && sortedStrategies.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedStrategies.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedStrategies.map((s) => (
                  <SortableStrategyCard
                    key={s.id}
                    strategy={s}
                    onToggle={() => toggleMutation.mutate(s.id)}
                    onDelete={() => {
                      deleteMutation.mutate(s.id);
                      setLocalOrder(null);
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
