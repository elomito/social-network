import React, { useState, useEffect } from 'react';

export default function CommentList({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch comments for the post
  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8080/api/comments/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch comments');
        const data = await response.json();
        setComments(data.comments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [postId]);

  // Handle comment submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];
      const response = await fetch(`http://localhost:8080/api/comments/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newComment, imageUrl: null }), // Add image handling if needed
      });
      if (!response.ok) throw new Error('Comment submission failed');
      const data = await response.json();
      setComments([...comments, data.comment]); // Optimistic update
      setNewComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading && <div className="text-gray-500 text-sm">Loading comments...</div>}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Submit
        </button>
      </form>
      {comments.length > 0 && (
        <div className="mt-4 space-y-2">
          {comments.map((comment, index) => (
            <div key={comment.id} className="border border-gray-100 p-2 rounded-lg">
              <div className="flex items-center mb-2">
                <img
                  src={comment.authorAvatar || '/default-avatar.png'}
                  alt={comment.author}
                  className="h-8 w-8 rounded-full"
                />
                <div>
                  <h5 className="text-sm font-medium">{comment.author}</h5>
                  <p className="text-gray-600 text-sm">{new Date(comment.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
              <p className="mt-1 text-gray-800">{comment.text}</p>
              {comment.imageUrl && (
                <img
                  src={comment.imageUrl}
                  alt="Comment attachment"
                  className="mt-2 max-h-48 object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}