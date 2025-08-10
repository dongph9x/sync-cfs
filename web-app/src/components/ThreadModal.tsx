import React, { useEffect } from 'react';

interface Thread {
  id: string;
  title: string;
  body_html: string;
  author_alias: string;
  created_at: Date | string;
  reply_count: number;
  tags?: string[] | null;
  thread_rank: number;
}

interface ThreadModalProps {
  thread: Thread | null;
  isOpen: boolean;
  onClose: () => void;
}

const ThreadModal: React.FC<ThreadModalProps> = ({ thread, isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !thread) return null;

  const formatDate = (dateInput: Date | string) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cleanContent = (htmlContent: string) => {
    // Loại bỏ phần AI Analysis
    const output = htmlContent.replace(/👤 <strong>Người gửi:.*$/s, '');
    return output.trim();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900" style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {thread.title}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>👤 {thread.author_alias}</span>
              <span>📅 {formatDate(thread.created_at)}</span>
              <span>💬 {thread.reply_count} bình luận</span>
              <span>🏆 Rank: {thread.thread_rank}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div 
          className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f3f4f6',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Tags */}
          {thread.tags && thread.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {thread.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Thread Content */}
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: cleanContent(thread.body_html) }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Thread ID: {thread.id}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadModal;
