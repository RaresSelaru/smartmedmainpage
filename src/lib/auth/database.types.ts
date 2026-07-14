export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AccountRole = "user" | "premium" | "admin";

export type SmartMedDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: {
          city: string | null;
          created_at: string;
          exam_year: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          school: string | null;
          updated_at: string;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          exam_year?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          school?: string | null;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          exam_year?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          school?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_roles: {
        Row: {
          created_at: string;
          role: AccountRole;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role?: AccountRole;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: AccountRole;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      smartmed_role: AccountRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
