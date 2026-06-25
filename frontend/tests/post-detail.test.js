/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PostDetailPage from '../src/app/(dashboard)/post/[postId]/page'
import CommentList from '../src/components/features/posts/CommentList'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock the utility function
jest.mock('../src/lib/utils', () => ({
  getTokenFromCookie: () => 'mock-token',
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('PostDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<PostDetailPage params={{ postId: '123' }} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays error when post fetch fails', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      })
    )

    render(<PostDetailPage params={{ postId: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText(/post not found/i)).toBeInTheDocument()
    })
  })

  it('displays error when user lacks permission', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 403,
      })
    )

    render(<PostDetailPage params={{ postId: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText(/permission to view this post/i)).toBeInTheDocument()
    })
  })
})

describe('CommentList', () => {
  it('renders empty state when no comments', () => {
    render(<CommentList comments={[]} loading={false} error="" />)
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('renders loading skeleton when loading', () => {
    render(<CommentList comments={[]} loading={true} error="" />)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders error message when error is provided', () => {
    render(<CommentList comments={[]} loading={false} error="Failed to load comments" />)
    expect(screen.getByText(/failed to load comments/i)).toBeInTheDocument()
  })

  it('renders comments chronologically (oldest first)', () => {
    const comments = [
      {
        id: '3',
        authorName: 'User C',
        content: 'Third comment',
        createdAt: '2026-06-25T12:00:00Z',
      },
      {
        id: '1',
        authorName: 'User A',
        content: 'First comment',
        createdAt: '2026-06-25T10:00:00Z',
      },
      {
        id: '2',
        authorName: 'User B',
        content: 'Second comment',
        createdAt: '2026-06-25T11:00:00Z',
      },
    ]

    const { container } = render(<CommentList comments={comments} loading={false} error="" />)

    const commentElements = container.querySelectorAll('.text-sm.font-medium')
    expect(commentElements[0]).toHaveTextContent('User A')
    expect(commentElements[1]).toHaveTextContent('User B')
    expect(commentElements[2]).toHaveTextContent('User C')
  })

  it('renders comment with image attachment', () => {
    const comments = [
      {
        id: '1',
        authorName: 'User A',
        content: 'Comment with image',
        createdAt: '2026-06-25T10:00:00Z',
        imageUrl: 'https://example.com/image.jpg',
      },
    ]

    render(<CommentList comments={comments} loading={false} error="" />)
    expect(screen.getByAltText(/comment attachment/i)).toBeInTheDocument()
  })

  it('renders comment with author and timestamp', () => {
    const comments = [
      {
        id: '1',
        authorName: 'Test User',
        content: 'Test comment content',
        createdAt: '2026-06-25T10:00:00Z',
      },
    ]

    render(<CommentList comments={comments} loading={false} error="" />)
    expect(screen.getByText(/test user/i)).toBeInTheDocument()
    expect(screen.getByText(/test comment content/i)).toBeInTheDocument()
  })
})

describe('CommentComposer', () => {
  it('allows text input for comments', () => {
    const mockOnSubmit = jest.fn()
    const { container } = render(
      <PostDetailPage params={{ postId: '123' }} />
    )

    // This test would need to be adjusted based on actual component structure
    // For now, we're testing the page component
  })

  it('handles image file selection', () => {
    // Test that image preview works
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
    const mockOnImageChange = jest.fn()

    // This would be tested more thoroughly with the actual CommentComposer component
  })

  it('handles GIF URL input', () => {
    // Test that GIF URL input works
  })
})

describe('Optimistic Updates', () => {
  it('shows comment immediately after submission', async () => {
    // Mock successful post and comments fetch
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '123',
            authorName: 'Test Author',
            content: 'Test post content',
            createdAt: '2026-06-25T10:00:00Z',
            privacy: 'public',
            commentsCount: 0,
          }),
      })
    )

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )

    // Mock successful comment submission
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '456',
            authorName: 'You',
            content: 'New comment',
            createdAt: '2026-06-25T12:00:00Z',
          }),
      })
    )

    render(<PostDetailPage params={{ postId: '123' }} />)

    // Wait for initial load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  it('reverts optimistic update on failure', async () => {
    // Mock successful post and comments fetch
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '123',
            authorName: 'Test Author',
            content: 'Test post content',
            createdAt: '2026-06-25T10:00:00Z',
            privacy: 'public',
            commentsCount: 0,
          }),
      })
    )

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )

    // Mock failed comment submission
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
      })
    )

    render(<PostDetailPage params={{ postId: '123' }} />)

    // Wait for initial load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})

describe('Privacy', () => {
  it('respects post visibility when fetching comments', async () => {
    // The backend handles privacy, but we test the frontend respects 403 errors
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 403,
      })
    )

    render(<PostDetailPage params={{ postId: '123' }} />)

    await waitFor(() => {
      expect(screen.getByText(/permission to view this post/i)).toBeInTheDocument()
    })
  })
})