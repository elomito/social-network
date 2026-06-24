// Example typed response for a generic API request
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}
