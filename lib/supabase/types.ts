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
      collection_bookmarks: {
        Row: {
          collection_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_bookmarks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_bookmarks_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      collection_games: {
        Row: {
          added_at: string
          collection_id: string
          igdb_id: number
        }
        Insert: {
          added_at?: string
          collection_id: string
          igdb_id: number
        }
        Update: {
          added_at?: string
          collection_id?: string
          igdb_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_games_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_games_igdb_id_fkey"
            columns: ["igdb_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["igdb_id"]
          },
        ]
      }
      collections: {
        Row: {
          comment_count: number
          created_at: string
          description: string | null
          id: string
          like_count: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_count?: number
          created_at?: string
          description?: string | null
          id?: string
          like_count?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_count?: number
          created_at?: string
          description?: string | null
          id?: string
          like_count?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          collection_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          like_count: number
          parent_id: string | null
          reply_count: number
          review_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          collection_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          reply_count?: number
          review_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          collection_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          reply_count?: number
          review_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      featured_collection: {
        Row: {
          collection_id: string | null
          fetched_at: string
          id: number
        }
        Insert: {
          collection_id?: string | null
          fetched_at?: string
          id?: number
        }
        Update: {
          collection_id?: string | null
          fetched_at?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_collection_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_games: {
        Row: {
          fetched_at: string
          game_ids: number[]
          id: number
        }
        Insert: {
          fetched_at?: string
          game_ids?: number[]
          id?: number
        }
        Update: {
          fetched_at?: string
          game_ids?: number[]
          id?: number
        }
        Relationships: []
      }
      game_screenshots: {
        Row: {
          cached_at: string
          igdb_id: number
          image_ids: string[]
        }
        Insert: {
          cached_at?: string
          igdb_id: number
          image_ids?: string[]
        }
        Update: {
          cached_at?: string
          igdb_id?: number
          image_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "game_screenshots_igdb_id_fkey"
            columns: ["igdb_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["igdb_id"]
          },
        ]
      }
      game_searches: {
        Row: {
          fetched_at: string
          game_ids: number[]
          query: string
        }
        Insert: {
          fetched_at?: string
          game_ids?: number[]
          query: string
        }
        Update: {
          fetched_at?: string
          game_ids?: number[]
          query?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          banner_url: string | null
          cached_at: string
          cover_url: string | null
          description: string | null
          genres: string[]
          igdb_id: number
          platforms: string[]
          publisher: string | null
          rating: number | null
          rating_count: number | null
          release_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          cached_at?: string
          cover_url?: string | null
          description?: string | null
          genres?: string[]
          igdb_id: number
          platforms?: string[]
          publisher?: string | null
          rating?: number | null
          rating_count?: number | null
          release_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          cached_at?: string
          cover_url?: string | null
          description?: string | null
          genres?: string[]
          igdb_id?: number
          platforms?: string[]
          publisher?: string | null
          rating?: number | null
          rating_count?: number | null
          release_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          collection_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          review_id: string | null
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          review_id?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          review_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          collection_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          review_id: string | null
          type: string
        }
        Insert: {
          actor_id: string
          collection_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          review_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string
          collection_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          review_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_games: {
        Row: {
          fetched_at: string
          game_ids: number[]
          id: number
        }
        Insert: {
          fetched_at?: string
          game_ids?: number[]
          id?: number
        }
        Update: {
          fetched_at?: string
          game_ids?: number[]
          id?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          comment_count: number
          created_at: string
          id: string
          igdb_id: number
          like_count: number
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          igdb_id: number
          like_count?: number
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          igdb_id?: number
          like_count?: number
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_igdb_id_fkey"
            columns: ["igdb_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["igdb_id"]
          },
          {
            foreignKeyName: "reviews_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_games: {
        Row: {
          created_at: string
          id: string
          igdb_id: number
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          igdb_id: number
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          igdb_id?: number
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_games_igdb_id_fkey"
            columns: ["igdb_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["igdb_id"]
          },
          {
            foreignKeyName: "user_games_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_collections: {
        Args: {
          result_limit?: number
          result_offset?: number
          search_term?: string
        }
        Returns: {
          comment_count: number
          created_at: string
          description: string | null
          id: string
          like_count: number
          name: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "collections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_featured_collection: {
        Args: { _collection_id?: string }
        Returns: undefined
      }
      upsert_featured_games: {
        Args: { _game_ids: number[] }
        Returns: undefined
      }
      upsert_game_search: {
        Args: { _game_ids: number[]; _query: string }
        Returns: undefined
      }
      update_game_descriptions: { Args: { _games: Json }; Returns: undefined }
      upsert_games: { Args: { _games: Json }; Returns: undefined }
      upsert_popular_games: {
        Args: { _game_ids: number[] }
        Returns: undefined
      }
    }
    Enums: {
      game_status: "backlog" | "wishlist" | "playing" | "completed" | "dropped"
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
      game_status: ["backlog", "wishlist", "playing", "completed", "dropped"],
    },
  },
} as const
