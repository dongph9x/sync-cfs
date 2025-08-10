import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Thread } from '../lib/db';

export interface TreeItem {
  id: string;
  title: string;
  type: 'thread' | 'category';
  children?: TreeItem[];
  thread?: Thread;
  isExpanded?: boolean;
}

interface TreeViewProps {
  items?: TreeItem[];
  onItemsReorder?: (items: TreeItem[]) => void;
  channelSlug?: string;
}

interface SortableItemProps {
  item: TreeItem;
  index: number;
}

function SortableItem({ item, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (item.type !== 'thread' || !item.thread) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-3 cursor-move hover:bg-gray-50"
      >
        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
      </div>
    );
  }

  const thread = item.thread;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 transition-colors cursor-move ${
        isDragging ? 'shadow-lg border-blue-400' : 'hover:border-blue-300'
      }`}
    >
      <div className="flex items-start space-x-4">
        {/* Vote/Stats Column */}
        <div className="flex flex-col items-center space-y-1 min-w-[60px]">
          <div className="text-sm text-gray-500">
            {thread.reply_count} trả lời
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {thread.title}
            </h3>
            {thread.tags && thread.tags.length > 0 && (
              <div className="flex space-x-1">
                {thread.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {thread.body_html && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {thread.body_html.replace(/<[^>]*>/g, '').trim()}
            </p>
          )}

          {/* Author and Date */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                  {thread.author_alias.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-gray-700">
                  {thread.author_alias}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <time dateTime={thread.created_at.toISOString()}>
                {new Date(thread.created_at).toLocaleDateString('vi-VN')}
              </time>
              {thread.updated_at && thread.updated_at !== thread.created_at && (
                <time dateTime={thread.updated_at.toISOString()}>
                  Cập nhật: {new Date(thread.updated_at).toLocaleDateString('vi-VN')}
                </time>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TreeView({ 
  items = [], 
  onItemsReorder = () => {}, 
  channelSlug = '' 
}: TreeViewProps) {
  const [treeItems, setTreeItems] = useState<TreeItem[]>(items);
  const [isClient, setIsClient] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setTreeItems(items);
  }, [items]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTreeItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update ranks in database
        if (channelSlug) {
          const rankUpdates = newItems.map((item, index) => ({
            threadId: item.id,
            rank: index + 1,
          }));
          
          fetch('/api/update-ranks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rankUpdates }),
          })
            .then((response) => {
              if (response.ok) {
                onItemsReorder(newItems);
              } else {
                console.error('Failed to update thread ranks');
              }
            })
            .catch((error) => {
              console.error('Failed to update thread ranks:', error);
            });
        } else {
          onItemsReorder(newItems);
        }

        return newItems;
      });
    }
  };

  console.log('TreeView rendered with items:', treeItems);

  if (!isClient) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 p-3 bg-gray-100 text-gray-800 rounded-lg">
          <p className="text-sm">🔄 Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!treeItems || treeItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
          <p className="text-sm">❌ No items provided to TreeView</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
        <p className="text-sm">
          ✅ TreeView: Hiển thị {treeItems.length} threads
        </p>
        <p className="text-xs mt-1">
          Kéo và thả để sắp xếp lại thứ tự hiển thị
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={treeItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {treeItems.map((item, index) => (
            <SortableItem key={item.id} item={item} index={index} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
