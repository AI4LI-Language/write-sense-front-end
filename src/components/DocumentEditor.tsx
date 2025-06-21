'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, FileText, Edit3 } from 'lucide-react';
import { Document } from '@/types';

interface DocumentEditorProps {
  document?: Document;
  isEditing?: boolean;
  onSave?: (data: { title: string; content: string }) => void;
  onCancel?: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  isEditing = false,
  onSave,
  onCancel,
  onEdit,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when document changes
  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content);
      setHasChanges(false);
    } else if (isEditing) {
      // New document
      setTitle('');
      setContent('');
      setHasChanges(false);
    }
  }, [document, isEditing]);

  // Track changes
  useEffect(() => {
    if (document) {
      setHasChanges(
        title !== document.title || content !== document.content
      );
    } else if (isEditing) {
      setHasChanges(title.trim() !== '' || content.trim() !== '');
    }
  }, [title, content, document, isEditing]);

  const handleSave = () => {
    if (title.trim() && content.trim()) {
      onSave?.({ title: title.trim(), content: content.trim() });
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('Bạn có chắc chắn muốn hủy? Các thay đổi sẽ bị mất.')) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!document && !isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex items-center justify-center">
        <div className="text-center">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">
            Chọn một tài liệu để xem hoặc chỉnh sửa
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Hoặc sử dụng lệnh giọng nói để tạo tài liệu mới
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề tài liệu..."
              className="text-xl font-semibold text-gray-900 w-full bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1"
              autoFocus
            />
          ) : (
            <h1 className="text-xl font-semibold text-gray-900">
              {document?.title}
            </h1>
          )}
          
          {document && !isEditing && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Tạo: {formatDate(document.created_at)}</span>
              {document.updated_at !== document.created_at && (
                <span>Cập nhật: {formatDate(document.updated_at)}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={!hasChanges || !title.trim() || !content.trim() || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                <Save size={16} />
                {isLoading ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                <X size={16} />
                Hủy
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Edit3 size={16} />
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nội dung tài liệu..."
            className="w-full h-full resize-none border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <div className="h-full overflow-auto">
            {document?.content ? (
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                  {document.content}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Tài liệu này không có nội dung</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      {isEditing && (
        <div className="border-t border-gray-200 px-4 py-2 text-sm text-gray-500 flex items-center justify-between">
          <div>
            {content.length} ký tự
          </div>
          {hasChanges && (
            <div className="text-orange-600">
              • Có thay đổi chưa lưu
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 