import type {
  Database,
  Json,
} from "@/lib/supabase/database.types";

export type { Json };

export type SmartMedDatabase = Database;
export type AccountRole = Database["public"]["Enums"]["smartmed_role"];
