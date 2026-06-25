import { render, screen, fireEvent } from '@testing-library/react';
import PostDetailPage from '@/app/(dashboard)/post/[postId]/page.js';
import PostCard from '@/components/features/posts/PostCard';
import CommentList from '@/components/features/posts/CommentList';

describe('Post Detail View', () => {
  it('renders post detail with comments', () => {
    const mockPost = {
      id: '1',
      authorName: 'Test User',
      content: 'Sample post content',
      imageUrl: 'https://example.com/image.jpg',
      privacy: 'public',
      comments: [
        { id: 'c1', author: 'Alice', text: 'First comment' },
        { id: 'c2', author: 'Bob', text: 'Second comment' }
      ]
    };

    render(<PostDetailPage postId="1" />);

    // Verify post details
    const postCard = screen.getByTestId("post-card");
    expect(postCard).toBeInTheDocument();
    expect(postCard.querySelector(".text-gray-800")).toHaveTextContent("Sample post content");

    // Verify comments
    const commentList = screen.getByTestId("comment-list");
    expect(commentList.querySelectorAll(".text-gray-800")).toHaveLength(2);
    expect(commentList.querySelector(".text-gray-800").textContent).toContain("First comment");
  });

  it('submits new comment with optimistic update', () => {
    const mockPost = { id: '1' };
    render(<PostDetailPage postId="1" />);

    const commentInput = screen.getByPlaceholderText("Write a comment...");
    fireEvent.change(commentInput, { target: { value: "Test comment" } });
    fireEvent.submit(screen.getByRole("button", { name: "Submit" }));

    // Check optimistic update
    expect(screen.getByText("Test comment")).toBeInTheDocument();

    // Verify server sync (would need mock API response)
    // ...
  });

  it('handles image attachment', () => {
    // Test image upload functionality
    // ...
  });
});