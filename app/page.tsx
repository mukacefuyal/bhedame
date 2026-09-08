import { Feed } from "@/components/Feed";
import { demoPosts } from "@/lib/demo";

export default function HomePage() {
  return <Feed initialPosts={demoPosts} />;
}
