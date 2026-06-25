import PostCard from '@/components/features/posts/PostCard';
import CommentList from '@/components/features/posts/CommentList';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PostDetailPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8080/api/posts/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch post');
        const data = await response.json();
        setPost(data.post);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) return <div className="p-6">Loading post...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!post) return <div className="p-6">Post not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <PostCard post={post} />
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Comments</h2>
        <CommentList postId={post.id} />
      </div>
    </div>
  );
}