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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };

      posts: {
        Row: {
          id: string;
          author_id: string;
          content_type: string;
          content: string;
          visibility: string;
          attachments: Json;
          canvas_id: string | null;
          widget_id: string | null;
          reply_to_id: string | null;
          repost_of_id: string | null;
          mentioned_user_ids: string[];
          reply_count: number;
          repost_count: number;
          reaction_count: number;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          content_type?: string;
          content: string;
          visibility?: string;
          attachments?: Json;
          canvas_id?: string | null;
          widget_id?: string | null;
          reply_to_id?: string | null;
          repost_of_id?: string | null;
          mentioned_user_ids?: string[];
          reply_count?: number;
          repost_count?: number;
          reaction_count?: number;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          content_type?: string;
          content?: string;
          visibility?: string;
          attachments?: Json;
          canvas_id?: string | null;
          widget_id?: string | null;
          reply_to_id?: string | null;
          repost_of_id?: string | null;
          mentioned_user_ids?: string[];
          reply_count?: number;
          repost_count?: number;
          reaction_count?: number;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      comments: {
        Row: {
          id: string;
          author_id: string;
          target_type: string;
          target_id: string;
          content: string;
          parent_id: string | null;
          mentioned_user_ids: string[];
          reply_count: number;
          reaction_count: number;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          target_type: string;
          target_id: string;
          content: string;
          parent_id?: string | null;
          mentioned_user_ids?: string[];
          reply_count?: number;
          reaction_count?: number;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          target_type?: string;
          target_id?: string;
          content?: string;
          parent_id?: string | null;
          mentioned_user_ids?: string[];
          reply_count?: number;
          reaction_count?: number;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string;
          type: string;
          target_type: string | null;
          target_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id: string;
          type: string;
          target_type?: string | null;
          target_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string;
          type?: string;
          target_type?: string | null;
          target_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      reactions: {
        Row: {
          id: string;
          user_id: string;
          target_type: string;
          target_id: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: string;
          target_id: string;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          target_type?: string;
          target_id?: string;
          type?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      bookmarks: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          tier: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          tier?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          tier?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      tier_quotas: {
        Row: {
          tier: string;
          max_canvases: number;
          max_storage_mb: number;
          max_widgets_per_canvas: number;
          max_collaborators_per_canvas: number;
          can_use_custom_domain: boolean;
          can_use_integrations: boolean;
          can_publish_widgets: boolean;
          can_sell: boolean;
        };
        Insert: {
          tier: string;
          max_canvases?: number;
          max_storage_mb?: number;
          max_widgets_per_canvas?: number;
          max_collaborators_per_canvas?: number;
          can_use_custom_domain?: boolean;
          can_use_integrations?: boolean;
          can_publish_widgets?: boolean;
          can_sell?: boolean;
        };
        Update: {
          tier?: string;
          max_canvases?: number;
          max_storage_mb?: number;
          max_widgets_per_canvas?: number;
          max_collaborators_per_canvas?: number;
          can_use_custom_domain?: boolean;
          can_use_integrations?: boolean;
          can_publish_widgets?: boolean;
          can_sell?: boolean;
        };
        Relationships: [];
      };

      creator_accounts: {
        Row: {
          id: string;
          user_id: string;
          stripe_account_id: string;
          charges_enabled: boolean;
          payouts_enabled: boolean;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_account_id: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_account_id?: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      canvas_subscription_tiers: {
        Row: {
          id: string;
          creator_id: string;
          canvas_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          interval: string;
          benefits: Json;
          is_active: boolean;
          sort_order: number;
          revision: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          canvas_id: string;
          name: string;
          description?: string | null;
          price_cents: number;
          currency?: string;
          interval?: string;
          benefits?: Json;
          is_active?: boolean;
          sort_order?: number;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          canvas_id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          currency?: string;
          interval?: string;
          benefits?: Json;
          is_active?: boolean;
          sort_order?: number;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      canvas_subscriptions: {
        Row: {
          id: string;
          buyer_id: string;
          tier_id: string;
          canvas_id: string;
          status: string;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          tier_id: string;
          canvas_id: string;
          status?: string;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          tier_id?: string;
          canvas_id?: string;
          status?: string;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          item_id: string;
          canvas_id: string;
          status: string;
          total_cents: number;
          currency: string;
          stripe_payment_intent_id: string | null;
          fulfillment_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          item_id: string;
          canvas_id: string;
          status?: string;
          total_cents: number;
          currency?: string;
          stripe_payment_intent_id?: string | null;
          fulfillment_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          seller_id?: string;
          item_id?: string;
          canvas_id?: string;
          status?: string;
          total_cents?: number;
          currency?: string;
          stripe_payment_intent_id?: string | null;
          fulfillment_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      shop_items: {
        Row: {
          id: string;
          seller_id: string;
          canvas_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          item_type: string;
          fulfillment: string;
          stock_count: number | null;
          requires_shipping: boolean;
          is_active: boolean;
          revision: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          canvas_id: string;
          name: string;
          description?: string | null;
          price_cents: number;
          currency?: string;
          item_type?: string;
          fulfillment?: string;
          stock_count?: number | null;
          requires_shipping?: boolean;
          is_active?: boolean;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          canvas_id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          currency?: string;
          item_type?: string;
          fulfillment?: string;
          stock_count?: number | null;
          requires_shipping?: boolean;
          is_active?: boolean;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: 'notion' | 'google_sheets' | 'airtable' | 'github' | 'spotify' | 'weather' | 'openai';
          access_token: string;
          refresh_token: string | null;
          token_type: string | null;
          expires_at: string | null;
          provider_data: Json;
          scopes: string[];
          status: 'active' | 'expired' | 'revoked' | 'error';
          last_error: string | null;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: 'notion' | 'google_sheets' | 'airtable' | 'github' | 'spotify' | 'weather' | 'openai';
          access_token: string;
          refresh_token?: string | null;
          token_type?: string | null;
          expires_at?: string | null;
          provider_data?: Json;
          scopes?: string[];
          status?: 'active' | 'expired' | 'revoked' | 'error';
          last_error?: string | null;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: 'notion' | 'google_sheets' | 'airtable' | 'github' | 'spotify' | 'weather' | 'openai';
          access_token?: string;
          refresh_token?: string | null;
          token_type?: string | null;
          expires_at?: string | null;
          provider_data?: Json;
          scopes?: string[];
          status?: 'active' | 'expired' | 'revoked' | 'error';
          last_error?: string | null;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      widget_integration_permissions: {
        Row: {
          id: string;
          user_id: string;
          widget_id: string;
          integration_id: string;
          allowed_resources: Json;
          can_read: boolean;
          can_write: boolean;
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          widget_id: string;
          integration_id: string;
          allowed_resources?: Json;
          can_read?: boolean;
          can_write?: boolean;
          granted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          widget_id?: string;
          integration_id?: string;
          allowed_resources?: Json;
          can_read?: boolean;
          can_write?: boolean;
          granted_at?: string;
        };
        Relationships: [];
      };

      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          is_completed: boolean;
          priority: Database['public']['Enums']['todo_priority'];
          due_date: string | null;
          completed_at: string | null;
          sort_order: number;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          is_completed?: boolean;
          priority?: Database['public']['Enums']['todo_priority'];
          due_date?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          is_completed?: boolean;
          priority?: Database['public']['Enums']['todo_priority'];
          due_date?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: Record<string, never>;

    Enums: {
      user_tier: 'free' | 'creator' | 'pro' | 'enterprise';
      canvas_role: 'owner' | 'editor' | 'commenter' | 'viewer';
      entity_type: 'sticker' | 'text' | 'widget_container' | 'shape' | 'drawing' | 'group';
      pipeline_node_type: 'widget' | 'transform_filter' | 'transform_map' | 'transform_merge' | 'transform_delay' | 'input' | 'output';
      data_source_type: 'doc' | 'table' | 'note' | 'folder' | 'file' | 'custom';
      data_source_scope: 'canvas' | 'user' | 'shared' | 'public';
      acl_role: 'owner' | 'editor' | 'commenter' | 'viewer';
      todo_priority: 'low' | 'medium' | 'high' | 'urgent';
    };
  };
}
