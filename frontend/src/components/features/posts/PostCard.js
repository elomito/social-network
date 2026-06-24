import React from 'react';

export default function PostCard({ post }) {
  // Gracefully handle missing data fields just in case
  const {
    authorName = 'Anonymous User',
    authorAvatar,
    createdAt,
    content = '',
    imageUrl,
    privacy = 'public',
    likesCount = 0,
    commentsCount = 0
  } = post;
// Format timestamp to look clean (e.g., "Jun 24, 2026")
  const formattedDate = createdAt 
    ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Just now';

  return (
    <div className="p-4 bg-white rounded-lg shadow border border-gray-100 space-y-3">
      {/* HEADER SECTION: Author, Timestamp, Privacy */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600">
              {authorName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{authorName}</h4>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium text-[10px]">
                {privacy}
              </span>
            </div>
          </div>
        </div>
      </div>
{/* BODY SECTION: Post Text Content */}
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
{/* OPTIONAL IMAGE ATTACHMENT */}
      {imageUrl && (
        <div className="mt-2 overflow-hidden rounded-lg max-h-96 bg-gray-50 border border-gray-100">
          <img src={imageUrl} alt="Post attachment" className="w-full h-full object-cover" />
        </div>
      )}
{/* FOOTER SECTION: Interaction Entry Points */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500 text-sm">
        <button className="flex items-center space-x-2 hover:text-blue-600 transition">
          <span>👍</span>
          <span className="font-medium text-xs">{likesCount} Likes</span>
        </button>
        
        <button className="flex items-center space-x-2 hover:text-blue-600 transition">
          <span>💬</span>
          <span className="font-medium text-xs">{commentsCount} Comments</span>
        </button>
      </div>
    </div>
  );
}
