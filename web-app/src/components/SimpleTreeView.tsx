import React from 'react';
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
  items: TreeItem[];
  onItemsReorder?: (items: TreeItem[]) => void;
  channelSlug?: string;
}

export default function SimpleTreeView({ items }: TreeViewProps) {
  console.log('SimpleTreeView rendered with items:', items);
  
  if (!items || items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
          <p className="text-sm">❌ No items provided to SimpleTreeView</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
        <p className="text-sm">
          ✅ SimpleTreeView: Hiển thị {items.length} threads
        </p>
        <p className="text-xs mt-1">
          Component loaded successfully!
        </p>
      </div>

      {items.map((item, index) => {
        if (item.type !== 'thread' || !item.thread) {
          return (
            <div
              key={item.id}
              className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-3"
            >
              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
            </div>
          );
        }

        const thread = item.thread;

        return (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:border-blue-300 transition-colors"
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
