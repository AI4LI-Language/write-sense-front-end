'use client';

import React from 'react';
import { FileText, Edit3, Trash2, Plus, Search, Calendar } from 'lucide-react';
import { Document } from '@/types';

interface DocumentManagerProps {
  documents: Document[];
  currentDocument?: Document;
  onDocumentSelect?: (document: Document) => void;
  onDocumentCreate?: () => void;
  onDocumentEdit?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents = [],
  currentDocument,
  onDocumentSelect,
  onDocumentCreate,
  onDocumentEdit,
  onDocumentDelete,
  searchQuery = '',
  onSearchChange,
  isLoading = false,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={24} />
            Quản lý tài liệu
          </h2>
          <button
            onClick={onDocumentCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Tạo mới
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8">
            {documents.length === 0 ? (
              <>
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">
                  Chưa có tài liệu nào. Hãy tạo tài liệu đầu tiên của bạn!
                </p>
                <button
                  onClick={onDocumentCreate}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Tạo tài liệu mới
                </button>
              </>
            ) : (
              <>
                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">
                  Không tìm thấy tài liệu nào phù hợp với từ khóa "{searchQuery}"
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  currentDocument?.id === document.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
                onClick={() => onDocumentSelect?.(document)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {document.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {document.content.substring(0, 150)}
                      {document.content.length > 150 ? '...' : ''}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Tạo: {formatDate(document.created_at)}
                      </span>
                      {document.updated_at !== document.created_at && (
                        <span className="flex items-center gap-1">
                          <Edit3 size={12} />
                          Sửa: {formatDate(document.updated_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentEdit?.(document);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
                          onDocumentDelete?.(document.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 