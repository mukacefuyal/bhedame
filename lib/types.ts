export type MediaType = "image" | "video" | "embed" | "text";

export type ReactionValue = -1 | 0 | 1;

export interface Post {
  id: string;
  title: string;
  caption: string | null;
  category: string;
  media_type: MediaType;
  media_url: string | null;
  embed_url: string | null;
  source_url: string | null;
  author_name: string;
  created_at: string;
  likes: number;
  dislikes: number;
  score: number;
  comments_count: number;
  user_reaction?: ReactionValue;
}

export interface Comment {
  id: string;
  post_id: string;
  visitor_id?: string;
  author_name: string;
  body: string;
  created_at: string;
}
