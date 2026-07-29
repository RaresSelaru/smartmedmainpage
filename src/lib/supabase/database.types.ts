export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_plans: {
        Row: {
          cover_media_id: number | null
          created_at: string
          description: string | null
          id: number
          metadata: Json
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          cover_media_id?: number | null
          created_at?: string
          description?: string | null
          id?: never
          metadata?: Json
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          cover_media_id?: number | null
          created_at?: string
          description?: string | null
          id?: never
          metadata?: Json
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_plans_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      account_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["smartmed_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["smartmed_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["smartmed_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointment_status_history: {
        Row: {
          appointment_id: number
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: number
          reason: string | null
          to_status: string
        }
        Insert: {
          appointment_id: number
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          reason?: string | null
          to_status: string
        }
        Update: {
          appointment_id?: number
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          booking_horizon_days: number
          booking_notice_minutes: number
          buffer_after_minutes: number
          buffer_before_minutes: number
          created_at: string
          description: string | null
          duration_minutes: number
          id: number
          is_active: boolean
          location_mode: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          booking_horizon_days?: number
          booking_notice_minutes?: number
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: never
          is_active?: boolean
          location_mode?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          booking_horizon_days?: number
          booking_notice_minutes?: number
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: never
          is_active?: boolean
          location_mode?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type_id: number
          blocked_ends_at: string
          blocked_starts_at: string
          cancelled_at: string | null
          confirmed_at: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          created_by: string | null
          customer_notes: string | null
          ends_at: string
          id: number
          location_id: number | null
          public_id: string
          source: string
          staff_member_id: number | null
          starts_at: string
          status: string
          timezone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointment_type_id: number
          blocked_ends_at: string
          blocked_starts_at: string
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_notes?: string | null
          ends_at: string
          id?: never
          location_id?: number | null
          public_id?: string
          source?: string
          staff_member_id?: number | null
          starts_at: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointment_type_id?: number
          blocked_ends_at?: string
          blocked_starts_at?: string
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_notes?: string | null
          ends_at?: string
          id?: never
          location_id?: number | null
          public_id?: string
          source?: string
          staff_member_id?: number | null
          starts_at?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          course_session_id: number
          created_at: string
          enrollment_id: number | null
          id: number
          notes: string | null
          recorded_at: string | null
          recorded_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_session_id: number
          created_at?: string
          enrollment_id?: number | null
          id?: never
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_session_id?: number
          created_at?: string
          enrollment_id?: number | null
          id?: never
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_session_id_fkey"
            columns: ["course_session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          appointment_type_id: number | null
          created_at: string
          ends_at: string
          id: number
          is_public: boolean
          kind: string
          location_id: number | null
          public_label: string | null
          staff_member_id: number
          starts_at: string
          updated_at: string
        }
        Insert: {
          appointment_type_id?: number | null
          created_at?: string
          ends_at: string
          id?: never
          is_public?: boolean
          kind: string
          location_id?: number | null
          public_label?: string | null
          staff_member_id: number
          starts_at: string
          updated_at?: string
        }
        Update: {
          appointment_type_id?: number | null
          created_at?: string
          ends_at?: string
          id?: never
          is_public?: boolean
          kind?: string
          location_id?: number | null
          public_label?: string | null
          staff_member_id?: number
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          appointment_type_id: number | null
          created_at: string
          effective_from: string | null
          effective_until: string | null
          id: number
          is_active: boolean
          is_public: boolean
          local_end_time: string
          local_start_time: string
          location_id: number | null
          slot_interval_minutes: number
          staff_member_id: number
          timezone: string
          updated_at: string
          weekday: number
        }
        Insert: {
          appointment_type_id?: number | null
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: never
          is_active?: boolean
          is_public?: boolean
          local_end_time: string
          local_start_time: string
          location_id?: number | null
          slot_interval_minutes?: number
          staff_member_id: number
          timezone?: string
          updated_at?: string
          weekday: number
        }
        Update: {
          appointment_type_id?: number | null
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: never
          is_active?: boolean
          is_public?: boolean
          local_end_time?: string
          local_start_time?: string
          location_id?: number | null
          slot_interval_minutes?: number
          staff_member_id?: number
          timezone?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: number
          created_at: string
          id: number
          product_variant_id: number
          quantity: number
          updated_at: string
        }
        Insert: {
          cart_id: number
          created_at?: string
          id?: never
          product_variant_id: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          cart_id?: number
          created_at?: string
          id?: never
          product_variant_id?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          currency: string
          expires_at: string | null
          id: number
          public_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: never
          public_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: never
          public_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consent_events: {
        Row: {
          action: string
          created_at: string
          id: number
          metadata: Json
          occurred_at: string
          policy_version: string
          purpose: string
          source: string
          subject_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          policy_version: string
          purpose: string
          source: string
          subject_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          policy_version?: string
          purpose?: string
          source?: string
          subject_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          appointment_id: number | null
          assigned_to_staff_id: number | null
          consent_to_contact: boolean
          created_at: string
          email: string
          id: number
          message: string
          name: string
          offering_id: number | null
          order_id: number | null
          phone: string | null
          preferred_channel: string
          public_id: string
          source: string
          status: string
          topic: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointment_id?: number | null
          assigned_to_staff_id?: number | null
          consent_to_contact?: boolean
          created_at?: string
          email: string
          id?: never
          message: string
          name: string
          offering_id?: number | null
          order_id?: number | null
          phone?: string | null
          preferred_channel?: string
          public_id?: string
          source?: string
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointment_id?: number | null
          assigned_to_staff_id?: number | null
          consent_to_contact?: boolean
          created_at?: string
          email?: string
          id?: never
          message?: string
          name?: string
          offering_id?: number | null
          order_id?: number | null
          phone?: string | null
          preferred_channel?: string
          public_id?: string
          source?: string
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_assigned_to_staff_id_fkey"
            columns: ["assigned_to_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      content_authors: {
        Row: {
          avatar_media_id: number | null
          bio: string | null
          created_at: string
          display_name: string
          id: number
          slug: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_media_id?: number | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: never
          slug: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_media_id?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: never
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_authors_avatar_media_id_fkey"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      content_categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          name: string
          parent_id: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
          parent_id?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
          parent_id?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      content_collection_items: {
        Row: {
          collection_id: number
          content_entry_id: number
          ends_at: string | null
          sort_order: number
          starts_at: string | null
        }
        Insert: {
          collection_id: number
          content_entry_id: number
          ends_at?: string | null
          sort_order?: number
          starts_at?: string | null
        }
        Update: {
          collection_id?: number
          content_entry_id?: number
          ends_at?: string | null
          sort_order?: number
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "content_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collection_items_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_collections: {
        Row: {
          collection_key: string
          created_at: string
          description: string | null
          id: number
          metadata: Json
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          collection_key: string
          created_at?: string
          description?: string | null
          id?: never
          metadata?: Json
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          collection_key?: string
          created_at?: string
          description?: string | null
          id?: never
          metadata?: Json
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_entries: {
        Row: {
          author_id: number | null
          cover_media_id: number | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: number
          kind: string
          metadata: Json
          published_at: string | null
          published_revision_id: number | null
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          visibility: string
          working_revision_id: number | null
        }
        Insert: {
          author_id?: number | null
          cover_media_id?: number | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: never
          kind?: string
          metadata?: Json
          published_at?: string | null
          published_revision_id?: number | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
          working_revision_id?: number | null
        }
        Update: {
          author_id?: number | null
          cover_media_id?: number | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: never
          kind?: string
          metadata?: Json
          published_at?: string | null
          published_revision_id?: number | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
          working_revision_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "content_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_published_revision_fk"
            columns: ["published_revision_id"]
            isOneToOne: false
            referencedRelation: "content_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_working_revision_fk"
            columns: ["working_revision_id"]
            isOneToOne: false
            referencedRelation: "content_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_entry_categories: {
        Row: {
          category_id: number
          content_entry_id: number
          is_primary: boolean
        }
        Insert: {
          category_id: number
          content_entry_id: number
          is_primary?: boolean
        }
        Update: {
          category_id?: number
          content_entry_id?: number
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "content_entry_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_categories_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_entry_tags: {
        Row: {
          content_entry_id: number
          tag_id: number
        }
        Insert: {
          content_entry_id: number
          tag_id: number
        }
        Update: {
          content_entry_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_entry_tags_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "content_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      content_relations: {
        Row: {
          content_entry_id: number
          related_content_entry_id: number
          relation_type: string
          sort_order: number
        }
        Insert: {
          content_entry_id: number
          related_content_entry_id: number
          relation_type?: string
          sort_order?: number
        }
        Update: {
          content_entry_id?: number
          related_content_entry_id?: number
          relation_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_relations_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_relations_related_content_entry_id_fkey"
            columns: ["related_content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revision_media: {
        Row: {
          created_at: string
          media_asset_id: number
          revision_id: number
          sort_order: number
          usage: string
        }
        Insert: {
          created_at?: string
          media_asset_id: number
          revision_id: number
          sort_order?: number
          usage?: string
        }
        Update: {
          created_at?: string
          media_asset_id?: number
          revision_id?: number
          sort_order?: number
          usage?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_revision_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_revision_media_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "content_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          body: Json
          change_summary: string | null
          content_entry_id: number
          created_at: string
          created_by: string | null
          editorial_snapshot: Json
          id: number
          revision_no: number
          schema_version: number
        }
        Insert: {
          body?: Json
          change_summary?: string | null
          content_entry_id: number
          created_at?: string
          created_by?: string | null
          editorial_snapshot?: Json
          id?: never
          revision_no: number
          schema_version?: number
        }
        Update: {
          body?: Json
          change_summary?: string | null
          content_entry_id?: number
          created_at?: string
          created_by?: string | null
          editorial_snapshot?: Json
          id?: never
          revision_no?: number
          schema_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          available_from: string | null
          course_id: number
          created_at: string
          description: string | null
          id: number
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          course_id: number
          created_at?: string
          description?: string | null
          id?: never
          position: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          course_id?: number
          created_at?: string
          description?: string | null
          id?: never
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offerings: {
        Row: {
          capacity: number | null
          code: string
          cohort_label: string | null
          course_id: number
          created_at: string
          ends_at: string | null
          enrollment_closes_at: string | null
          enrollment_opens_at: string | null
          exam_year: number | null
          id: number
          location_id: number | null
          metadata: Json
          modality: string
          starts_at: string | null
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          code: string
          cohort_label?: string | null
          course_id: number
          created_at?: string
          ends_at?: string | null
          enrollment_closes_at?: string | null
          enrollment_opens_at?: string | null
          exam_year?: number | null
          id?: never
          location_id?: number | null
          metadata?: Json
          modality?: string
          starts_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          code?: string
          cohort_label?: string | null
          course_id?: number
          created_at?: string
          ends_at?: string | null
          enrollment_closes_at?: string | null
          enrollment_opens_at?: string | null
          exam_year?: number | null
          id?: never
          location_id?: number | null
          metadata?: Json
          modality?: string
          starts_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          created_at: string
          ends_at: string
          id: number
          location_id: number | null
          offering_id: number
          session_kind: string
          staff_member_id: number | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: never
          location_id?: number | null
          offering_id: number
          session_kind?: string
          staff_member_id?: number | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: never
          location_id?: number | null
          offering_id?: number
          session_kind?: string
          staff_member_id?: number | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sessions_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sessions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      course_staff: {
        Row: {
          course_id: number
          role: string
          sort_order: number
          staff_member_id: number
        }
        Insert: {
          course_id: number
          role?: string
          sort_order?: number
          staff_member_id: number
        }
        Update: {
          course_id?: number
          role?: string
          sort_order?: number
          staff_member_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_staff_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_staff_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_media_id: number | null
          created_at: string
          created_by: string | null
          delivery_mode: string
          description: string | null
          estimated_minutes: number | null
          id: number
          metadata: Json
          short_description: string | null
          slug: string
          status: string
          subject_id: number | null
          title: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          cover_media_id?: number | null
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: never
          metadata?: Json
          short_description?: string | null
          slug: string
          status?: string
          subject_id?: number | null
          title: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          cover_media_id?: number | null
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: never
          metadata?: Json
          short_description?: string | null
          slug?: string
          status?: string
          subject_id?: number | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country_code: string
          created_at: string
          id: number
          is_default_billing: boolean
          is_default_shipping: boolean
          label: string | null
          phone: string | null
          postal_code: string | null
          recipient_name: string
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country_code?: string
          created_at?: string
          id?: never
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient_name: string
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country_code?: string
          created_at?: string
          id?: never
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient_name?: string
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      digital_deliveries: {
        Row: {
          available_from: string
          created_at: string
          download_count: number
          expires_at: string | null
          id: number
          max_downloads: number | null
          media_asset_id: number
          order_item_id: number
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_from?: string
          created_at?: string
          download_count?: number
          expires_at?: string | null
          id?: never
          max_downloads?: number | null
          media_asset_id: number
          order_item_id: number
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_from?: string
          created_at?: string
          download_count?: number
          expires_at?: string | null
          id?: never
          max_downloads?: number | null
          media_asset_id?: number
          order_item_id?: number
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_deliveries_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_deliveries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          enrolled_at: string
          id: number
          offering_id: number
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: never
          offering_id: number
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: never
          offering_id?: number
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          access_level: string
          created_at: string
          id: number
          metadata: Json
          resource_id: number | null
          resource_type: string
          revoked_at: string | null
          source_id: number | null
          source_type: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: never
          metadata?: Json
          resource_id?: number | null
          resource_type: string
          revoked_at?: string | null
          source_id?: number | null
          source_type: string
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: never
          metadata?: Json
          resource_id?: number | null
          resource_type?: string
          revoked_at?: string | null
          source_id?: number | null
          source_type?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          allow_backorder: boolean
          created_at: string
          id: number
          low_stock_threshold: number
          product_variant_id: number
          quantity_on_hand: number
          quantity_reserved: number
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean
          created_at?: string
          id?: never
          low_stock_threshold?: number
          product_variant_id: number
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean
          created_at?: string
          id?: never
          low_stock_threshold?: number
          product_variant_id?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: true
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          order_item_id: number | null
          product_variant_id: number
          quantity_delta: number
          reason: string
          reference: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          order_item_id?: number | null
          product_variant_id: number
          quantity_delta: number
          reason: string
          reference?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          order_item_id?: number | null
          product_variant_id?: number
          quantity_delta?: number
          reason?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: number
          last_position_seconds: number
          lesson_id: number
          progress_percent: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: never
          last_position_seconds?: number
          lesson_id: number
          progress_percent?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: never
          last_position_seconds?: number
          lesson_id?: number
          progress_percent?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          external_url: string | null
          id: number
          is_downloadable: boolean
          kind: string
          lesson_id: number
          media_asset_id: number | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: never
          is_downloadable?: boolean
          kind?: string
          lesson_id: number
          media_asset_id?: number | null
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: never
          is_downloadable?: boolean
          kind?: string
          lesson_id?: number
          media_asset_id?: number | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_resources_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body: Json
          created_at: string
          duration_minutes: number | null
          id: number
          is_preview: boolean
          lesson_type: string
          module_id: number
          position: number
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: Json
          created_at?: string
          duration_minutes?: number | null
          id?: never
          is_preview?: boolean
          lesson_type?: string
          module_id: number
          position: number
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: Json
          created_at?: string
          duration_minutes?: number | null
          id?: never
          is_preview?: boolean
          lesson_type?: string
          module_id?: number
          position?: number
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country_code: string
          created_at: string
          id: number
          is_active: boolean
          kind: string
          latitude: number | null
          longitude: number | null
          name: string
          parent_id: number | null
          postal_code: string | null
          region: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          id?: never
          is_active?: boolean
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          parent_id?: number | null
          postal_code?: string | null
          region?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          id?: never
          is_active?: boolean
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          parent_id?: number | null
          postal_code?: string | null
          region?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          access_level: string
          byte_size: number | null
          caption: string | null
          checksum_sha256: string | null
          created_at: string
          default_alt_text: string | null
          duration_seconds: number | null
          height: number | null
          id: number
          kind: string
          metadata: Json
          mime_type: string | null
          owner_user_id: string | null
          status: string
          storage_bucket: string
          storage_path: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          access_level?: string
          byte_size?: number | null
          caption?: string | null
          checksum_sha256?: string | null
          created_at?: string
          default_alt_text?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: never
          kind?: string
          metadata?: Json
          mime_type?: string | null
          owner_user_id?: string | null
          status?: string
          storage_bucket: string
          storage_path: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          access_level?: string
          byte_size?: number | null
          caption?: string | null
          checksum_sha256?: string | null
          created_at?: string
          default_alt_text?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: never
          kind?: string
          metadata?: Json
          mime_type?: string | null
          owner_user_id?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      newsletter_subscriber_topics: {
        Row: {
          created_at: string
          subscriber_id: number
          topic_id: number
        }
        Insert: {
          created_at?: string
          subscriber_id: number
          topic_id: number
        }
        Update: {
          created_at?: string
          subscriber_id?: number
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscriber_topics_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscriber_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "newsletter_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: number
          normalized_email: string | null
          source: string
          status: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: never
          normalized_email?: string | null
          source?: string
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: never
          normalized_email?: string | null
          source?: string
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      newsletter_topics: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          discount_minor: number
          id: number
          metadata: Json
          order_id: number
          product_id: number | null
          product_type_snapshot: string
          product_variant_id: number | null
          quantity: number
          sku_snapshot: string | null
          tax_minor: number
          title_snapshot: string
          total_minor: number
          unit_amount_minor: number
        }
        Insert: {
          created_at?: string
          discount_minor?: number
          id?: never
          metadata?: Json
          order_id: number
          product_id?: number | null
          product_type_snapshot: string
          product_variant_id?: number | null
          quantity: number
          sku_snapshot?: string | null
          tax_minor?: number
          title_snapshot: string
          total_minor: number
          unit_amount_minor: number
        }
        Update: {
          created_at?: string
          discount_minor?: number
          id?: never
          metadata?: Json
          order_id?: number
          product_id?: number | null
          product_type_snapshot?: string
          product_variant_id?: number | null
          quantity?: number
          sku_snapshot?: string | null
          tax_minor?: number
          title_snapshot?: string
          total_minor?: number
          unit_amount_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          cancelled_at: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          discount_minor: number
          fulfillment_status: string
          id: number
          order_number: string | null
          paid_at: string | null
          payment_status: string
          placed_at: string | null
          public_id: string
          shipping_address: Json | null
          shipping_minor: number
          status: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          discount_minor?: number
          fulfillment_status?: string
          id?: never
          order_number?: string | null
          paid_at?: string | null
          payment_status?: string
          placed_at?: string | null
          public_id?: string
          shipping_address?: Json | null
          shipping_minor?: number
          status?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          discount_minor?: number
          fulfillment_status?: string
          id?: never
          order_number?: string | null
          paid_at?: string | null
          payment_status?: string
          placed_at?: string | null
          public_id?: string
          shipping_address?: Json | null
          shipping_minor?: number
          status?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          access_level: string
          access_plan_id: number
          created_at: string
          id: number
          metadata: Json
          resource_id: number | null
          resource_type: string
        }
        Insert: {
          access_level?: string
          access_plan_id: number
          created_at?: string
          id?: never
          metadata?: Json
          resource_id?: number | null
          resource_type: string
        }
        Update: {
          access_level?: string
          access_plan_id?: number
          created_at?: string
          id?: never
          metadata?: Json
          resource_id?: number | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_access_plan_id_fkey"
            columns: ["access_plan_id"]
            isOneToOne: false
            referencedRelation: "access_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          name: string
          parent_id: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
          parent_id?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
          parent_id?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          media_asset_id: number
          product_id: number
          role: string
          sort_order: number
        }
        Insert: {
          media_asset_id: number
          product_id: number
          role?: string
          sort_order?: number
        }
        Update: {
          media_asset_id?: number
          product_id?: number
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          amount_minor: number
          billing_interval: string
          compare_at_amount_minor: number | null
          created_at: string
          currency: string
          external_reference: string | null
          id: number
          is_active: boolean
          product_variant_id: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          amount_minor: number
          billing_interval?: string
          compare_at_amount_minor?: number | null
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: never
          is_active?: boolean
          product_variant_id: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          amount_minor?: number
          billing_interval?: string
          compare_at_amount_minor?: number | null
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: never
          is_active?: boolean
          product_variant_id?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          course_offering_id: number | null
          created_at: string
          id: number
          inventory_policy: string
          product_id: number
          sku: string
          status: string
          title: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          attributes?: Json
          course_offering_id?: number | null
          created_at?: string
          id?: never
          inventory_policy?: string
          product_id: number
          sku: string
          status?: string
          title: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          attributes?: Json
          course_offering_id?: number | null
          created_at?: string
          id?: never
          inventory_policy?: string
          product_id?: number
          sku?: string
          status?: string
          title?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          access_plan_id: number | null
          category_id: number | null
          course_id: number | null
          cover_media_id: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          metadata: Json
          product_type: string
          requires_shipping: boolean
          short_description: string | null
          slug: string
          status: string
          tax_code: string | null
          title: string
          tracks_inventory: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_plan_id?: number | null
          category_id?: number | null
          course_id?: number | null
          cover_media_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: never
          metadata?: Json
          product_type?: string
          requires_shipping?: boolean
          short_description?: string | null
          slug: string
          status?: string
          tax_code?: string | null
          title: string
          tracks_inventory?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_plan_id?: number | null
          category_id?: number | null
          course_id?: number | null
          cover_media_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: never
          metadata?: Json
          product_type?: string
          requires_shipping?: boolean
          short_description?: string | null
          slug?: string
          status?: string
          tax_code?: string | null
          title?: string
          tracks_inventory?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_access_plan_id_fkey"
            columns: ["access_plan_id"]
            isOneToOne: false
            referencedRelation: "access_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          exam_year: string | null
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          school: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          exam_year?: string | null
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          school?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          exam_year?: string | null
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          school?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          avatar_media_id: number | null
          bio: string | null
          created_at: string
          display_name: string
          id: number
          is_active: boolean
          is_bookable: boolean
          is_public: boolean
          slug: string
          timezone: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_media_id?: number | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: never
          is_active?: boolean
          is_bookable?: boolean
          is_public?: boolean
          slug: string
          timezone?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_media_id?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: never
          is_active?: boolean
          is_bookable?: boolean
          is_public?: boolean
          slug?: string
          timezone?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_avatar_media_id_fkey"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          name: string
          parent_id: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name: string
          parent_id?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          name?: string
          parent_id?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_plan_id: number
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_ends_at: string | null
          current_period_starts_at: string | null
          ended_at: string | null
          id: number
          public_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_plan_id: number
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          ended_at?: string | null
          id?: never
          public_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_plan_id?: number
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          ended_at?: string | null
          id?: never
          public_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_access_plan_id_fkey"
            columns: ["access_plan_id"]
            isOneToOne: false
            referencedRelation: "access_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cms_archive_content: {
        Args: {
          p_correlation_id?: string
          p_entry_id: number
        }
        Returns: Json
      }
      cms_archive_media: {
        Args: {
          p_correlation_id?: string
          p_media_id: number
        }
        Returns: Json
      }
      cms_create_content: {
        Args: {
          p_body: Json
          p_change_summary?: string
          p_correlation_id?: string
          p_kind: string
          p_snapshot: Json
        }
        Returns: Json
      }
      cms_get_content: {
        Args: {
          p_entry_id: number
        }
        Returns: Json
      }
      cms_get_revision: {
        Args: {
          p_entry_id: number
          p_revision_id: number
        }
        Returns: Json
      }
      cms_list_content: {
        Args: {
          p_author_id?: number
          p_category_id?: number
          p_kind?: string
          p_page?: number
          p_page_size?: number
          p_status?: string
        }
        Returns: Json
      }
      cms_operator_grant_admin: {
        Args: {
          p_correlation_id?: string
          p_display_name?: string
          p_operator_reference: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      cms_operator_revoke_admin: {
        Args: {
          p_correlation_id?: string
          p_operator_reference: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      cms_operator_set_local_mfa_requirement: {
        Args: {
          p_correlation_id?: string
          p_operator_reference: string
          p_reason: string
          p_require_mfa: boolean
          p_supabase_url: string
        }
        Returns: Json
      }
      cms_publish_content: {
        Args: {
          p_correlation_id?: string
          p_entry_id: number
          p_expected_working_revision_id: number
        }
        Returns: Json
      }
      cms_register_media: {
        Args: {
          p_byte_size: number
          p_caption: string
          p_checksum_sha256: string
          p_correlation_id?: string
          p_default_alt_text: string
          p_height: number
          p_metadata?: Json
          p_mime_type: string
          p_storage_path: string
          p_title: string
          p_width: number
        }
        Returns: Json
      }
      cms_save_draft: {
        Args: {
          p_body: Json
          p_change_summary?: string
          p_correlation_id?: string
          p_entry_id: number
          p_expected_working_revision_id: number
          p_snapshot: Json
        }
        Returns: Json
      }
      cms_unpublish_content: {
        Args: {
          p_correlation_id?: string
          p_entry_id: number
        }
        Returns: Json
      }
    }
    Enums: {
      smartmed_role: "user" | "premium" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      smartmed_role: ["user", "premium", "admin"],
    },
  },
} as const
