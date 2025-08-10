import React, { useState, useEffect, useMemo } from 'react';
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
import ThreadModal from './ThreadModal';

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
  onThreadClick: (thread: Thread) => void;
}

function SortableItem({ item, index, onThreadClick }: SortableItemProps) {
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
      className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 transition-colors relative ${
        isDragging ? 'shadow-lg border-blue-400' : 'hover:border-blue-300'
      }`}
    >
      {/* Drag Handle - chỉ ở góc trên bên trái */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded cursor-move flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10"
        title="Kéo để sắp xếp lại"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
              <div 
          className="flex items-start space-x-4 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onThreadClick(thread);
          }}
        >
        {/* Vote/Stats Column */}
        <div className="flex flex-col items-center space-y-1 min-w-[60px]">
          <div className="text-sm text-gray-500">
            {thread.reply_count} bình luận
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                {thread.author_alias.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-gray-700 text-sm">
                {thread.author_alias}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <time dateTime={thread.created_at.toISOString()} className="text-xs text-gray-600">
                {new Date(thread.created_at).toLocaleDateString('vi-VN')}
              </time>
              {thread.updated_at && thread.updated_at !== thread.created_at && (
                <time dateTime={thread.updated_at.toISOString()} className="text-xs text-gray-500">
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'title' | 'created_at' | 'reply_count'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleThreadClick = (thread: Thread) => {
    setSelectedThread(thread);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedThread(null);
  };

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

  // Filter and sort items in one useMemo to ensure proper updates
  const filteredAndSortedItems = useMemo(() => {
    // Filter items first
    const filtered = treeItems.filter(item => {
      if (item.type !== 'thread' || !item.thread) return false;
      
      const thread = item.thread;
      const searchLower = searchTerm.toLowerCase();
      
      return (
        thread.title.toLowerCase().includes(searchLower) ||
        thread.author_alias.toLowerCase().includes(searchLower) ||
        (thread.body_html && thread.body_html.replace(/<[^>]*>/g, '').toLowerCase().includes(searchLower)) ||
        (thread.tags && thread.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    });

    // Sort items
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (!a.thread || !b.thread) return 0;
      
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.thread.title;
          bValue = b.thread.title;
          break;
        case 'created_at':
          aValue = new Date(a.thread.created_at).getTime();
          bValue = new Date(b.thread.created_at).getTime();
          break;
        case 'reply_count':
          aValue = a.thread.reply_count;
          bValue = b.thread.reply_count;
          break;
        case 'rank':
        default:
          // Sử dụng thứ tự hiện tại trong treeItems thay vì thread_rank từ database
          const aIndex = treeItems.findIndex(item => item.id === a.id);
          const bIndex = treeItems.findIndex(item => item.id === b.id);
          aValue = aIndex;
          bValue = bIndex;
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [treeItems, searchTerm, sortBy, sortOrder]);

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

          console.log('Sending rank updates:', rankUpdates);
          console.log('Request body:', JSON.stringify({ rankUpdates }));

          fetch('/api/update-ranks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rankUpdates }),
          })
            .then(async (response) => {
              console.log('Response status:', response.status);
              console.log('Response headers:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                const result = await response.json();
                console.log('Response body:', result);
                onItemsReorder(newItems);
              } else {
                const errorText = await response.text();
                console.error('Failed to update thread ranks:', response.status, errorText);
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
  console.log('Filtered and sorted items:', filteredAndSortedItems);

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
      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        {/* Search Box */}
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề, tác giả, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sắp xếp theo:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="rank">Thứ tự hiển thị</option>
              <option value="title">Tiêu đề</option>
              <option value="created_at">Ngày tạo</option>
              <option value="reply_count">Số bình luận</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Thứ tự:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>

          {/* Clear Search */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
        <p className="text-sm">
          ✅ Hiển thị {filteredAndSortedItems.length} / {treeItems.length} threads
          {searchTerm && ` (tìm kiếm: "${searchTerm}")`}
        </p>
        <p className="text-xs mt-1">
          🖱️ Kéo icon ở góc trái để sắp xếp lại • 🖱️ Click để xem chi tiết
        </p>
      </div>

      {/* No Results */}
      {filteredAndSortedItems.length === 0 && searchTerm && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
          <p className="text-sm">🔍 Không tìm thấy kết quả nào cho "{searchTerm}"</p>
        </div>
      )}

      {/* TreeView Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredAndSortedItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {filteredAndSortedItems.map((item, index) => (
            <SortableItem key={item.id} item={item} index={index} onThreadClick={handleThreadClick} />
          ))}
        </SortableContext>
      </DndContext>

      {/* Thread Modal */}
      <ThreadModal
        thread={selectedThread}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

