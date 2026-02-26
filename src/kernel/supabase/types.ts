/**
 * Supabase Database type definitions for StickerNest V5.
 *
 * Generated from:
 *   supabase/migrations/00001_initial_schema.sql
 *   supabase/migrations/00002_add_datasource_revision.sql
 *   supabase/migrations/00003_add_widget_snapshots.sql
 *   supabase/migrations/00004_add_marketplace_tables.sql
 *   supabase/migrations/00005_add_social_graph.sql
 *   supabase/migrations/00008_add_gallery_assets.sql
 *
 * Tables: users, canvases, canvas_members, entities, widgets, stickers,
 *         pipelines, widget_connections, presence, data_sources,
 *         data_source_acl, widget_instances, user_installed_widgets,
 *         user_widget_state, widget_snapshots, widget_reviews,
 *         widget_versions, user_profiles, follows, posts, reactions,
 *         comments, notifications, bookmarks, blocks, direct_messages,
 *         gallery_assets
 */

/**
 * Helper type for JSON columns.
 * Supabase stores JSONB as this recursive union.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          tier: Database['public']['Enums']['user_tier'];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          tier?: Database['public']['Enums']['user_tier'];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          tier?: Database['public']['Enums']['user_tier'];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };

      canvases: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string | null;
          description: string | null;
          thumbnail_url: string | null;
          is_public: boolean;
          default_role: Database['public']['Enums']['canvas_role'];
          settings: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
          default_role?: Database['public']['Enums']['canvas_role'];
          settings?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string | null;
          description?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
          default_role?: Database['public']['Enums']['canvas_role'];
          settings?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };

      canvas_members: {
        Row: {
          canvas_id: string;
          user_id: string;
          role: Database['public']['Enums']['canvas_role'];
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          canvas_id: string;
          user_id: string;
          role?: Database['public']['Enums']['canvas_role'];
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          canvas_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['canvas_role'];
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      entities: {
        Row: {
          id: string;
          canvas_id: string;
          type: Database['public']['Enums']['entity_type'];
          position_x: number;
          position_y: number;
          position_z: number | null;
          width: number;
          height: number;
          rotation: number;
          scale_x: number;
          scale_y: number;
          z_order: number;
          is_visible: boolean;
          is_locked: boolean;
          parent_id: string | null;
          properties: Json;
          spatial_position: Json | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          canvas_id: string;
          type: Database['public']['Enums']['entity_type'];
          position_x?: number;
          position_y?: number;
          position_z?: number | null;
          width?: number;
          height?: number;
          rotation?: number;
          scale_x?: number;
          scale_y?: number;
          z_order?: number;
          is_visible?: boolean;
          is_locked?: boolean;
          parent_id?: string | null;
          properties?: Json;
          spatial_position?: Json | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          canvas_id?: string;
          type?: Database['public']['Enums']['entity_type'];
          position_x?: number;
          position_y?: number;
          position_z?: number | null;
          width?: number;
          height?: number;
          rotation?: number;
          scale_x?: number;
          scale_y?: number;
          z_order?: number;
          is_visible?: boolean;
          is_locked?: boolean;
          parent_id?: string | null;
          properties?: Json;
          spatial_position?: Json | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      widgets: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          version: string;
          author_id: string | null;
          html_content: string;
          manifest: Json;
          thumbnail_url: string | null;
          icon_url: string | null;
          category: string | null;
          tags: string[];
          license: string;
          is_published: boolean;
          is_deprecated: boolean;
          install_count: number;
          rating_average: number | null;
          rating_count: number;
          price_cents: number | null;
          currency: string;
          stripe_price_id: string | null;
          is_free: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          version?: string;
          author_id?: string | null;
          html_content: string;
          manifest: Json;
          thumbnail_url?: string | null;
          icon_url?: string | null;
          category?: string | null;
          tags?: string[];
          license?: string;
          is_published?: boolean;
          is_deprecated?: boolean;
          install_count?: number;
          rating_average?: number | null;
          rating_count?: number;
          price_cents?: number | null;
          currency?: string;
          stripe_price_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          version?: string;
          author_id?: string | null;
          html_content?: string;
          manifest?: Json;
          thumbnail_url?: string | null;
          icon_url?: string | null;
          category?: string | null;
          tags?: string[];
          license?: string;
          is_published?: boolean;
          is_deprecated?: boolean;
          install_count?: number;
          rating_average?: number | null;
          rating_count?: number;
          price_cents?: number | null;
          currency?: string;
          stripe_price_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };

      stickers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          file_url: string;
          thumbnail_url: string | null;
          file_type: string;
          width: number | null;
          height: number | null;
          file_size: number | null;
          tags: string[];
          is_public: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          file_url: string;
          thumbnail_url?: string | null;
          file_type: string;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          tags?: string[];
          is_public?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          file_url?: string;
          thumbnail_url?: string | null;
          file_type?: string;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          tags?: string[];
          is_public?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };

      pipelines: {
        Row: {
          id: string;
          canvas_id: string;
          name: string | null;
          description: string | null;
          is_active: boolean;
          nodes: Json;
          edges: Json;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          canvas_id: string;
          name?: string | null;
          description?: string | null;
          is_active?: boolean;
          nodes?: Json;
          edges?: Json;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          canvas_id?: string;
          name?: string | null;
          description?: string | null;
          is_active?: boolean;
          nodes?: Json;
          edges?: Json;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      widget_connections: {
        Row: {
          id: string;
          pipeline_id: string;
          source_widget_instance_id: string;
          source_port: string;
          target_widget_instance_id: string;
          target_port: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          source_widget_instance_id: string;
          source_port: string;
          target_widget_instance_id: string;
          target_port: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          pipeline_id?: string;
          source_widget_instance_id?: string;
          source_port?: string;
          target_widget_instance_id?: string;
          target_port?: string;
          metadata?: Json;
          created_at?: string;
        };
      };

      presence: {
        Row: {
          id: string;
          canvas_id: string;
          user_id: string;
          display_name: string;
          color: string;
          cursor_x: number | null;
          cursor_y: number | null;
          status: string | null;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          canvas_id: string;
          user_id: string;
          display_name: string;
          color: string;
          cursor_x?: number | null;
          cursor_y?: number | null;
          status?: string | null;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          canvas_id?: string;
          user_id?: string;
          display_name?: string;
          color?: string;
          cursor_x?: number | null;
          cursor_y?: number | null;
          status?: string | null;
          last_seen_at?: string;
        };
      };

      data_sources: {
        Row: {
          id: string;
          type: Database['public']['Enums']['data_source_type'];
          owner_id: string;
          scope: Database['public']['Enums']['data_source_scope'];
          canvas_id: string | null;
          name: string | null;
          schema: Json | null;
          content: Json | null;
          revision: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: Database['public']['Enums']['data_source_type'];
          owner_id: string;
          scope?: Database['public']['Enums']['data_source_scope'];
          canvas_id?: string | null;
          name?: string | null;
          schema?: Json | null;
          content?: Json | null;
          revision?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: Database['public']['Enums']['data_source_type'];
          owner_id?: string;
          scope?: Database['public']['Enums']['data_source_scope'];
          canvas_id?: string | null;
          name?: string | null;
          schema?: Json | null;
          content?: Json | null;
          revision?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };

      data_source_acl: {
        Row: {
          data_source_id: string;
          user_id: string;
          role: Database['public']['Enums']['acl_role'];
          granted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data_source_id: string;
          user_id: string;
          role?: Database['public']['Enums']['acl_role'];
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          data_source_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['acl_role'];
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      widget_instances: {
        Row: {
          id: string;
          entity_id: string;
          widget_id: string;
          config: Json;
          state: Json;
          state_size: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          widget_id: string;
          config?: Json;
          state?: Json;
          state_size?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          widget_id?: string;
          config?: Json;
          state?: Json;
          state_size?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };

      user_installed_widgets: {
        Row: {
          user_id: string;
          widget_id: string;
          installed_at: string;
        };
        Insert: {
          user_id: string;
          widget_id: string;
          installed_at?: string;
        };
        Update: {
          user_id?: string;
          widget_id?: string;
          installed_at?: string;
        };
      };

      user_widget_state: {
        Row: {
          id: string;
          user_id: string;
          widget_id: string;
          key: string;
          value: Json;
          value_size: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          widget_id: string;
          key: string;
          value: Json;
          value_size?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          widget_id?: string;
          key?: string;
          value?: Json;
          value_size?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      widget_snapshots: {
        Row: {
          id: string;
          widget_id: string;
          label: string;
          html_content: string;
          manifest: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          widget_id: string;
          label: string;
          html_content: string;
          manifest: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          widget_id?: string;
          label?: string;
          html_content?: string;
          manifest?: Json;
          created_by?: string | null;
          created_at?: string;
        };
      };

      widget_reviews: {
        Row: {
          id: string;
          widget_id: string;
          user_id: string;
          rating: number;
          review_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          widget_id: string;
          user_id: string;
          rating: number;
          review_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          widget_id?: string;
          user_id?: string;
          rating?: number;
          review_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      widget_versions: {
        Row: {
          id: string;
          widget_id: string;
          version: string;
          html_content: string;
          manifest: Json;
          changelog: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          widget_id: string;
          version: string;
          html_content: string;
          manifest: Json;
          changelog?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          widget_id?: string;
          version?: string;
          html_content?: string;
          manifest?: Json;
          changelog?: string | null;
          created_at?: string;
        };
      };

      user_profiles: {
        Row: {
          user_id: string;
          display_name: string;
          username: string;
          bio: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          location: string | null;
          website_url: string | null;
          visibility: 'public' | 'followers' | 'private';
          follower_count: number;
          following_count: number;
          post_count: number;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          username: string;
          bio?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          location?: string | null;
          website_url?: string | null;
          visibility?: 'public' | 'followers' | 'private';
          follower_count?: number;
          following_count?: number;
          post_count?: number;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          username?: string;
          bio?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          location?: string | null;
          website_url?: string | null;
          visibility?: 'public' | 'followers' | 'private';
          follower_count?: number;
          following_count?: number;
          post_count?: number;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      gallery_assets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          storage_path: string;
          file_type: string;
          file_size: number;
          width: number | null;
          height: number | null;
          description: string | null;
          tags: string[];
          thumbnail_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          storage_path: string;
          file_type: string;
          file_size?: number;
          width?: number | null;
          height?: number | null;
          description?: string | null;
          tags?: string[];
          thumbnail_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          storage_path?: string;
          file_type?: string;
          file_size?: number;
          width?: number | null;
          height?: number | null;
          description?: string | null;
          tags?: string[];
          thumbnail_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          status: 'active' | 'pending' | 'blocked';
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          status?: 'active' | 'pending' | 'blocked';
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          status?: 'active' | 'pending' | 'blocked';
          created_at?: string;
        };
      };

      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };

      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };

    Enums: {
      user_tier: 'free' | 'creator' | 'pro' | 'enterprise';
      canvas_role: 'owner' | 'editor' | 'commenter' | 'viewer';
      entity_type: 'sticker' | 'text' | 'widget_container' | 'shape' | 'drawing' | 'group';
      pipeline_node_type: 'widget' | 'transform_filter' | 'transform_map' | 'transform_merge' | 'transform_delay' | 'input' | 'output';
      data_source_type: 'doc' | 'table' | 'note' | 'folder' | 'file' | 'custom';
      data_source_scope: 'canvas' | 'user' | 'shared' | 'public';
      acl_role: 'owner' | 'editor' | 'commenter' | 'viewer';
    };
  };
}
