import React from 'react';

interface TestTreeViewProps {
  items: any[];
}

export default function TestTreeView({ items }: TestTreeViewProps) {
  console.log('TestTreeView rendered with items:', items);
  
  if (!items || items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
          <p className="text-sm">❌ No items provided to TestTreeView</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
        <p className="text-sm">
          ✅ TestTreeView: Hiển thị {items.length} threads
        </p>
        <p className="text-xs mt-1">
          Component loaded successfully!
        </p>
      </div>

      {items.map((item, index) => (
        <div key={item.id || index} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {item.title || 'No title'}
          </h3>
          <p className="text-sm text-gray-600">
            ID: {item.id} | Type: {item.type} | Index: {index}
          </p>
        </div>
      ))}
    </div>
  );
}
