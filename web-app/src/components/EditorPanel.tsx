import React, { useState, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface Thread {
  id: string;
  title: string;
  author_alias: string;
  reply_count: number;
  thread_rank: number;
  created_at: string;
  body_html?: string;
  slug?: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  thread_count?: number;
}

interface EditorPanelProps {
  channels: Channel[];
  channelThreads: { channel: Channel; threads: Thread[] }[];
  itemsPerPage?: number;
}

export default function EditorPanel({ 
  channels, 
  channelThreads, 
  itemsPerPage = 20 
}: EditorPanelProps) {
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<Thread | null>(null);
  const [viewingThread, setViewingThread] = useState<Thread | null>(null);
  const [editForm, setEditForm] = useState({
    threadId: '',
    channelId: '',
    title: '',
    author: '',
    rank: 0,
    content: ''
  });

  const editorRef = useRef<any>(null);
  const [editorKey, setEditorKey] = useState(0); // Key để force re-render editor

  const currentChannelData = channelThreads[currentChannelIndex];
  const totalThreads = currentChannelData?.threads?.length || 0;
  const totalPages = Math.ceil(totalThreads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentThreads = currentChannelData?.threads?.slice(startIndex, endIndex) || [];

  // Generate page numbers for pagination
  const pageNumbers = [];
  const maxPages = Math.min(5, totalPages);

  for (let i = 0; i < maxPages; i++) {
    let pageNum;
    if (totalPages <= 5) {
      pageNum = i + 1;
    } else if (currentPage <= 3) {
      pageNum = i + 1;
    } else if (currentPage >= totalPages - 2) {
      pageNum = totalPages - 4 + i;
    } else {
      pageNum = currentPage - 2 + i;
    }
    pageNumbers.push(pageNum);
  }

  const handleChannelChange = (index: number) => {
    setCurrentChannelIndex(index);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to editor panel when page changes
    document.querySelector('.editor-panel-container')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEditThread = (thread: Thread) => {
    setEditingThread(thread);
    setEditForm({
      threadId: thread.id,
      channelId: currentChannelData.channel.id,
      title: thread.title,
      author: thread.author_alias,
      rank: thread.thread_rank,
      content: thread.body_html || ''
    });
    setEditorKey(prev => prev + 1); // Force re-render editor
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingThread(null);
    setEditForm({ threadId: '', channelId: '', title: '', author: '', rank: 0, content: '' });
    setEditorKey(prev => prev + 1);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/thread/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: editForm.threadId,
          channelId: editForm.channelId,
          title: editForm.title,
          author: editForm.author,
          rank: editForm.rank,
          content: editorRef.current.getContent()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Cập nhật thread thành công!');
        handleCloseEditModal();
        // Reload page to refresh data
        window.location.reload();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Có lỗi xảy ra khi cập nhật thread');
    }
  };

  const handleViewThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/admin/thread/${threadId}`);
      const data = await response.json();
      
      if (data.success) {
        setViewingThread(data.thread);
        setIsViewModalOpen(true);
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Có lỗi xảy ra khi tải thông tin thread');
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingThread(null);
  };

  return (
    <div className="editor-panel-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Channel Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {channelThreads.map((channelData, index) => (
            <button
              key={channelData.channel.id}
              onClick={() => handleChannelChange(index)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                index === currentChannelIndex
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {channelData.channel.name} ({channelData.threads.length})
            </button>
          ))}
        </nav>
      </div>

      {/* Thread List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {currentChannelData?.channel.name}
          </h3>
          
          {currentThreads.length > 0 ? (
            <div className="space-y-4">
              {currentThreads.map((thread) => (
                <div key={thread.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {thread.title}
                      </h4>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p><strong>Tác giả:</strong> {thread.author_alias}</p>
                        <p><strong>Rank:</strong> {thread.thread_rank}</p>
                        <p><strong>Ngày tạo:</strong> {new Date(thread.created_at).toLocaleDateString('vi-VN')}</p>
                        <p><strong>Reply:</strong> {thread.reply_count}</p>
                      </div>
                      {thread.body_html && (
                        <div className="mt-3 prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: thread.body_html.substring(0, 200) + (thread.body_html.length > 200 ? '...' : '') }} />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={() => handleViewThread(thread.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Xem
                      </button>
                      <button
                        onClick={() => handleEditThread(thread)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Chưa có threads nào trong kênh này.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Hiển thị <span className="font-medium">{startIndex + 1}</span> đến{' '}
                    <span className="font-medium">{Math.min(endIndex, totalThreads)}</span> trong tổng số{' '}
                    <span className="font-medium">{totalThreads}</span> threads
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    
                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Thread Modal */}
      {isEditModalOpen && editingThread && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Chỉnh Sửa Thread</h3>
                <button
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tác giả</label>
                    <input
                      type="text"
                      value={editForm.author}
                      onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rank</label>
                    <input
                      type="number"
                      value={editForm.rank}
                      onChange={(e) => setEditForm({ ...editForm, rank: parseInt(e.target.value) })}
                      min="1"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nội dung</label>
                  <Editor
                    key={editorKey} // Force re-render when key changes
                    apiKey='0f5tsbkjdfnkk3pndq95f01lwbcuh1v9lll7ixui666u7j8e'
                    onInit={(evt, editor) => editorRef.current = editor}
                    initialValue={editForm.content}
                    init={{
                      height: 400,
                      menubar: false,
                      plugins: [
                        // Core editing features
                        'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
                        // Premium features
                        'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'ai', 'uploadcare', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown','importword', 'exportword', 'exportpdf'
                      ],
                      toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
                      tinycomments_mode: 'embedded',
                      tinycomments_author: 'Editor',
                      mergetags_list: [
                        { value: 'First.Name', title: 'First Name' },
                        { value: 'Email', title: 'Email' },
                      ],
                      ai_request: (request, respondWith) => respondWith.string(() => Promise.reject('See docs to implement AI Assistant')),
                      uploadcare_public_key: '690e2c7b6ddd3e323677',
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                      branding: false,
                      promotion: false
                    }}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Thread Modal */}
      {isViewModalOpen && viewingThread && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Xem Thread</h3>
                <button
                  onClick={handleCloseViewModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{viewingThread.title}</h4>
                  <div className="mt-2 text-sm text-gray-500">
                    <p><strong>Tác giả:</strong> {viewingThread.author_alias}</p>
                    <p><strong>Rank:</strong> {viewingThread.thread_rank}</p>
                    <p><strong>Ngày tạo:</strong> {new Date(viewingThread.created_at).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Reply:</strong> {viewingThread.reply_count}</p>
                  </div>
                </div>
                
                {viewingThread.body_html && (
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: viewingThread.body_html }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
