import type { SupabaseClient, User } from "@supabase/supabase-js";
import { anonymousDisplayName } from "./identity";

export async function getRequestUser(request: Request, db: SupabaseClient): Promise<User | null> {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getRequestActor(request: Request, db: SupabaseClient, fallbackVisitorId = "") {
  const user = await getRequestUser(request, db);
  const actorId = user?.id || fallbackVisitorId.trim().slice(0, 100);
  return { user, actorId };
}

export function displayNameForUser(user: User | null, fallbackSeed = "") {
  if (!user || user.is_anonymous) return anonymousDisplayName(user?.id || fallbackSeed || "guest");

  const metadataName = [
    user.user_metadata?.display_name,
    user.user_metadata?.full_name,
    user.user_metadata?.name,
  ].find((value) => typeof value === "string" && value.trim());

  if (typeof metadataName === "string") return metadataName.trim().slice(0, 60);
  if (user.email) return user.email.split("@")[0].slice(0, 60) || "Registered user";
  return "Registered user";
}
