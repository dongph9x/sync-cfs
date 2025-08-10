import React, { useState } from 'react';
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
import { Thread, updateThreadRanks } from '../lib/db';

export interface TreeItem {
  id: string;
  title: string;
  type: 'thread' | 'category';
  children?: TreeItem[];
  thread?: Thread;
  isExpanded?: boolean;
}

interface SortableItemProps {
  item: TreeItem;
  onToggle: (id: string) => void;
}

// Helper functions for formatting and extracting data (copied from ThreadCard.astro logic)
function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

function getAuthorInitials(authorAlias: string): string {
  return authorAlias
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isStaffMember(authorAlias: string): boolean {
  const staffMembers = ['admin', 'moderator', 'staff'];
  return staffMembers.some(staff => 
    authorAlias.toLowerCase().includes(staff.toLowerCase())
  );
}

function extractTextFromHtml(html: string | null): string {
  if (!html) return '';
  // Simple HTML tag removal
  return html.replace(/<[^>]*>/g, '').trim();
}

function SortableItem({ item, onToggle }: SortableItemProps) {
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
  };

  if (item.type === 'thread' && item.thread) {
    const thread = item.thread;
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 cursor-move hover:border-blue-300 transition-colors ${
          isDragging ? 'opacity-50' : ''
        }`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-start space-x-4">
          {/* Vote/Stats Column */}
          <div className="flex-shrink-0 w-16 text-center">
            <div className="text-2xl font-bold text-gray-900">{thread.reply_count}</div>
            <div className="text-sm text-gray-600">trả lời</div>
          </div>

          {/* Content Column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  <a
                    href={`/forum/${thread.channel_slug}/${thread.slug}/`}
                    className="hover:text-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {thread.title}
                  </a>
                </h3>

                {thread.body_html && (
                  <p className="text-gray-700 text-sm mb-3">
                    {extractTextFromHtml(thread.body_html)}
                  </p>
                )}

                {/* Tags */}
                {thread.tags && thread.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {thread.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {getAuthorInitials(thread.author_alias)}
                  </div>
                  <span>
                    {thread.author_alias}
                    {isStaffMember(thread.author_alias) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 ml-1">
                        Staff
                      </span>
                    )}
                  </span>
                </div>

                <time dateTime={thread.created_at.toISOString()}>
                  hỏi {formatDate(thread.created_at)}
                </time>
              </div>

              {new Date(thread.updated_at) > new Date(thread.created_at) && (
                <time
                  dateTime={thread.updated_at.toISOString()}
                  className="text-gray-500"
                >
                  sửa đổi {formatDate(thread.updated_at)}
                </time>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 cursor-move hover:border-gray-300 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          {item.isExpanded ? '▼' : '▶'}
        </button>
      </div>
    </div>
  );
}

interface TreeViewProps {
  items: TreeItem[];
  onItemsReorder?: (items: TreeItem[]) => void;
  channelSlug?: string; // Add channel slug for database updates
}

export default function TreeView({ items, onItemsReorder, channelSlug }: TreeViewProps) {
  const [treeItems, setTreeItems] = useState<TreeItem[]>(items);
  const [isUpdating, setIsUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTreeItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        onItemsReorder?.(newItems); // Callback for parent component
        
        // Update ranks in database
        if (channelSlug) {
          setIsUpdating(true);
          updateRanksInDatabase(newItems).finally(() => {
            setIsUpdating(false);
          });
        }
        
        return newItems;
      });
    }
  }

  async function updateRanksInDatabase(items: TreeItem[]) {
    try {
      const rankUpdates = items
        .filter(item => item.type === 'thread' && item.thread)
        .map((item, index) => ({
          threadId: item.id,
          rank: index * 10 // Use increments of 10 for flexibility
        }));

      if (rankUpdates.length > 0) {
        await updateThreadRanks(rankUpdates);
        console.log('Thread ranks updated successfully');
      }
    } catch (error) {
      console.error('Failed to update thread ranks:', error);
      // Optionally show user feedback about the error
    }
  }

  const handleToggle = (id: string) => {
    setTreeItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={treeItems} strategy={verticalListSortingStrategy}>
          {treeItems.map((item) => (
            <SortableItem key={item.id} item={item} onToggle={handleToggle} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
