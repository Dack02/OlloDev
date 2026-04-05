export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          org_id: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_shared: boolean
          org_id: string
          shortcut: string | null
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          org_id: string
          shortcut?: string | null
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          org_id?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          joined_at: string
          last_read_at: string | null
          notifications: string
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          joined_at?: string
          last_read_at?: string | null
          notifications?: string
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          name: string
          org_id: string
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          org_id: string
          slug: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          org_id?: string
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string | null
          body: string | null
          body_html: string | null
          created_at: string
          discussion_id: string
          id: string
          is_accepted: boolean
          parent_id: string | null
          updated_at: string
          upvotes: number
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          body_html?: string | null
          created_at?: string
          discussion_id: string
          id?: string
          is_accepted?: boolean
          parent_id?: string | null
          updated_at?: string
          upvotes?: number
        }
        Update: {
          author_id?: string | null
          body?: string | null
          body_html?: string | null
          created_at?: string
          discussion_id?: string
          id?: string
          is_accepted?: boolean
          parent_id?: string | null
          updated_at?: string
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          assignee_id: string | null
          author_id: string | null
          body: string | null
          body_html: string | null
          category: string | null
          close_reason: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          org_id: string
          priority: string | null
          project_id: string | null
          reply_count: number
          requester_email: string | null
          requester_name: string | null
          source_id: string | null
          source_type: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          upvotes: number
        }
        Insert: {
          assignee_id?: string | null
          author_id?: string | null
          body?: string | null
          body_html?: string | null
          category?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          org_id: string
          priority?: string | null
          project_id?: string | null
          reply_count?: number
          requester_email?: string | null
          requester_name?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          upvotes?: number
        }
        Update: {
          assignee_id?: string | null
          author_id?: string | null
          body?: string | null
          body_html?: string | null
          category?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          org_id?: string
          priority?: string | null
          project_id?: string | null
          reply_count?: number
          requester_email?: string | null
          requester_name?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "discussions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_bugs: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: string
          priority: string
          severity: string
          assignee_id: string | null
          reporter_id: string | null
          labels: string[]
          discussion_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          severity?: string
          assignee_id?: string | null
          reporter_id?: string | null
          labels?: string[]
          discussion_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          severity?: string
          assignee_id?: string | null
          reporter_id?: string | null
          labels?: string[]
          discussion_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bugs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bugs_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          type: string
          status: string
          priority: string
          assignee_id: string | null
          due_at: string | null
          tags: string[]
          sort_order: number
          discussion_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          type?: string
          status?: string
          priority?: string
          assignee_id?: string | null
          due_at?: string | null
          tags?: string[]
          sort_order?: number
          discussion_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          type?: string
          status?: string
          priority?: string
          assignee_id?: string | null
          due_at?: string | null
          tags?: string[]
          sort_order?: number
          discussion_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tickets: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: string
          priority: string
          type: string
          requester_name: string | null
          requester_email: string | null
          assignee_id: string | null
          discussion_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          type?: string
          requester_name?: string | null
          requester_email?: string | null
          assignee_id?: string | null
          discussion_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          type?: string
          requester_name?: string | null
          requester_email?: string | null
          assignee_id?: string | null
          discussion_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tickets_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          author_id: string | null
          channel_id: string
          content: string | null
          content_html: string | null
          created_at: string
          id: string
          is_deleted: boolean
          is_edited: boolean
          metadata: Json
          parent_id: string | null
          reactions: Json
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          channel_id: string
          content?: string | null
          content_html?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json
          parent_id?: string | null
          reactions?: Json
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          channel_id?: string
          content?: string | null
          content_html?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json
          parent_id?: string | null
          reactions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          metadata: Json
          org_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          org_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          org_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          id: string
          joined_at: string
          org_id: string
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          org_id: string
          permissions?: Json
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          org_id?: string
          permissions?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          locale: string
          status: string
          status_text: string | null
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          locale?: string
          status?: string
          status_text?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          locale?: string
          status?: string
          status_text?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          business_hours: boolean
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          org_id: string
          resolution_times: Json
          response_times: Json
          updated_at: string
        }
        Insert: {
          business_hours?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          resolution_times?: Json
          response_times?: Json
          updated_at?: string
        }
        Update: {
          business_hours?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          resolution_times?: Json
          response_times?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_activity: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_value: Json | null
          old_value: Json | null
          ticket_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          ticket_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          attachments: Json
          author_id: string | null
          body: string | null
          body_html: string | null
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          body?: string | null
          body_html?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          body?: string | null
          body_html?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_queues: {
        Row: {
          auto_assign: boolean
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          sla_policy_id: string | null
          slug: string
        }
        Insert: {
          auto_assign?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          sla_policy_id?: string | null
          slug: string
        }
        Update: {
          auto_assign?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          sla_policy_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket_queues_sla_policy"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_queues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assignee_id: string | null
          closed_at: string | null
          created_at: string
          custom_fields: Json
          description: string | null
          description_html: string | null
          due_at: string | null
          first_response_at: string | null
          id: string
          metadata: Json
          org_id: string
          priority: string
          queue_id: string | null
          requester_id: string | null
          resolved_at: string | null
          satisfaction_comment: string | null
          satisfaction_rating: number | null
          sla_breach_at: string | null
          sla_policy_id: string | null
          status: string
          subject: string
          tags: string[]
          type: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          closed_at?: string | null
          created_at?: string
          custom_fields?: Json
          description?: string | null
          description_html?: string | null
          due_at?: string | null
          first_response_at?: string | null
          id?: string
          metadata?: Json
          org_id: string
          priority?: string
          queue_id?: string | null
          requester_id?: string | null
          resolved_at?: string | null
          satisfaction_comment?: string | null
          satisfaction_rating?: number | null
          sla_breach_at?: string | null
          sla_policy_id?: string | null
          status?: string
          subject: string
          tags?: string[]
          type?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          closed_at?: string | null
          created_at?: string
          custom_fields?: Json
          description?: string | null
          description_html?: string | null
          due_at?: string | null
          first_response_at?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          priority?: string
          queue_id?: string | null
          requester_id?: string | null
          resolved_at?: string | null
          satisfaction_comment?: string | null
          satisfaction_rating?: number | null
          sla_breach_at?: string | null
          sla_policy_id?: string | null
          status?: string
          subject?: string
          tags?: string[]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tickets_sla_policy"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "ticket_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_versions: {
        Row: {
          change_note: string | null
          content: string | null
          created_at: string
          edited_by: string | null
          id: string
          page_id: string
          version: number
        }
        Insert: {
          change_note?: string | null
          content?: string | null
          created_at?: string
          edited_by?: string | null
          id?: string
          page_id: string
          version: number
        }
        Update: {
          change_note?: string | null
          content?: string | null
          created_at?: string
          edited_by?: string | null
          id?: string
          page_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_pages: {
        Row: {
          author_id: string | null
          content: string | null
          content_html: string | null
          created_at: string
          id: string
          is_published: boolean
          last_edited_by: string | null
          metadata: Json
          parent_id: string | null
          slug: string
          sort_order: number
          space_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          content_html?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          last_edited_by?: string | null
          metadata?: Json
          parent_id?: string | null
          slug: string
          sort_order?: number
          space_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          content_html?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          last_edited_by?: string | null
          metadata?: Json
          parent_id?: string | null
          slug?: string
          sort_order?: number
          space_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "wiki_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_spaces: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_public: boolean
          name: string
          org_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean
          name: string
          org_id: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean
          name?: string
          org_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_spaces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
