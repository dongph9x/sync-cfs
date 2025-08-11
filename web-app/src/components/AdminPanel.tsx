import React, { useState, useEffect, useRef } from 'react';
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

interface AdminPanelProps {
  channels: Channel[];
  channelThreads: { channel: Channel; threads: Thread[] }[];
  itemsPerPage?: number;
}

export default function AdminPanel({ 
  channels, 
  channelThreads, 
  itemsPerPage = 20 
}: AdminPanelProps) {
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
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
    // Scroll to admin panel when page changes
    document.querySelector('.admin-panel-container')?.scrollIntoView({ behavior: 'smooth' });
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
    setEditForm({
      threadId: '',
      channelId: '',
      title: '',
      author: '',
      rank: 0,
      content: ''
    });
    setEditorKey(prev => prev + 1); // Force re-render editor
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get content from TinyMCE editor
    const content = editorRef.current ? editorRef.current.getContent() : editForm.content;

    try {
      const response = await fetch('/api/admin/thread/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          content
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Cập nhật thành công!');
        handleCloseEditModal();
        // Reload the page to show changes
        window.location.reload();
      } else {
        alert('Có lỗi xảy ra: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Có lỗi xảy ra khi cập nhật');
    }
  };

  const handleViewThread = async (threadId: string) => {
    try {
      // Get thread data
      const threadResponse = await fetch(`/api/admin/thread/${threadId}`);
      const threadData = await threadResponse.json();
      
      if (threadData.success) {
        setViewingThread(threadData.thread);
        setIsViewModalOpen(true);
      } else {
        alert('Không thể tải thông tin thread');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Có lỗi xảy ra khi tải thread');
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingThread(null);
  };

  const handleChangePassword = () => {
    setIsChangePasswordModalOpen(true);
  };

  const handleCloseChangePasswordModal = () => {
    setIsChangePasswordModalOpen(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Đổi mật khẩu thành công!');
        handleCloseChangePasswordModal();
        // Reset form
        (e.target as HTMLFormElement).reset();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Có lỗi xảy ra khi đổi mật khẩu');
    }
  };

  const handleCreateUser = () => {
    setIsCreateUserModalOpen(true);
  };

  const handleCloseCreateUserModal = () => {
    setIsCreateUserModalOpen(false);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const username = formData.get('username') as string;
    const role = formData.get('role') as string;

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          role
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        handleCloseCreateUserModal();
        // Reset form
        (e.target as HTMLFormElement).reset();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Có lỗi xảy ra khi tạo user');
    }
  };

  return (
    <div className="admin-panel-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản Trị Hệ Thống</h1>
            <p className="mt-2 text-gray-600">Quản lý và chỉnh sửa threads trong các kênh</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCreateUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Tạo User
            </button>
            <button
              onClick={handleChangePassword}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Đổi mật khẩu
            </button>
          </div>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {channels.map((channel, index) => (
            <button
              key={channel.id}
              onClick={() => handleChannelChange(index)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                index === currentChannelIndex
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {channel.name}
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {channel.thread_count || 0}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Threads List */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentChannelData?.channel?.name || 'Không có kênh'}
          </h2>
          <p className="text-gray-600">
            {currentChannelData?.channel?.description || 'Không có mô tả'}
          </p>
        </div>

        {currentThreads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Không có threads nào trong kênh này</p>
          </div>
        ) : (
          <div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {currentThreads.map((thread, index) => (
                  <li key={thread.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            #{startIndex + index + 1}
                          </span>
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {thread.title}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>Tác giả: {thread.author_alias}</span>
                          <span>Replies: {thread.reply_count}</span>
                          <span>Rank: {thread.thread_rank}</span>
                          <span>Tạo: {new Date(thread.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditThread(thread)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => handleViewThread(thread.id)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Xem
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 pt-6 border-t border-gray-200">
                {/* Results info */}
                <div className="text-sm text-gray-600">
                  Hiển thị {startIndex + 1}-{Math.min(endIndex, totalThreads)} trong tổng số {totalThreads} threads
                </div>
                
                {/* Pagination controls */}
                <nav className="flex items-center space-x-1" aria-label="Pagination">
                  {/* Previous button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    ← Trước
                  </button>

                  {/* Page numbers */}
                  {pageNumbers.map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {/* Next button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Sau →
                  </button>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Thread Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Chỉnh sửa Thread</h3>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <input type="hidden" value={editForm.threadId} />
                <input type="hidden" value={editForm.channelId} />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tác giả</label>
                  <input
                    type="text"
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Thứ tự (Rank)</label>
                  <input
                    type="number"
                    value={editForm.rank}
                    onChange={(e) => setEditForm({ ...editForm, rank: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
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
                      tinycomments_author: 'Admin',
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
                    Lưu thay đổi
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
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
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
                  <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-gray-900">{viewingThread.title}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tác giả</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-gray-900">{viewingThread.author_alias}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Thứ tự (Rank)</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-gray-900">{viewingThread.thread_rank}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: viewingThread.body_html || '' }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleCloseViewModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Đổi mật khẩu</h3>
                <button
                  onClick={handleCloseChangePasswordModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    name="currentPassword"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
                  <input
                    type="password"
                    name="newPassword"
                    required
                    minLength={6}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">Tối thiểu 6 ký tự</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    minLength={6}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseChangePasswordModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Tạo User Mới</h3>
                <button
                  onClick={handleCloseCreateUserModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    name="username"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">Email sẽ tự động tạo: username@gmail.com</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    name="role"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Chọn role</option>
                    <option value="admin">Admin - Quản trị viên</option>
                    <option value="editor">Editor - Biên tập viên</option>
                    <option value="viewer">Viewer - Người xem</option>
                  </select>
                  <div className="mt-1 text-sm text-gray-500">
                    <p><strong>Admin:</strong> Toàn quyền quản trị hệ thống</p>
                    <p><strong>Editor:</strong> Chỉnh sửa threads và quản lý nội dung</p>
                    <p><strong>Viewer:</strong> Chỉ xem và không có quyền chỉnh sửa</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Thông tin tự động:</strong>
                  </p>
                  <p className="text-sm text-blue-700">• Email: username@gmail.com</p>
                  <p className="text-sm text-blue-700">• Mật khẩu: 112233</p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseCreateUserModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Tạo User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
