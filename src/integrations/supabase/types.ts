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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          incident_id: string | null
          task_id: string | null
          user_id: string
          user_story_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          incident_id?: string | null
          task_id?: string | null
          user_id: string
          user_story_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          task_id?: string | null
          user_id?: string
          user_story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_configs: {
        Row: {
          created_at: string
          currency: string | null
          hourly_rate: number
          id: string
          project_id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          hourly_rate: number
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          hourly_rate?: number
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"] | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string
          workspace_id: string
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name: string
          workspace_id: string
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          project_id: string
          start_date: string | null
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          project_id: string
          start_date?: string | null
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          project_id?: string
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "epics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_round_participants: {
        Row: {
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_round_participants_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "estimation_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_round_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_round_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_round_stories: {
        Row: {
          id: string
          result_points: number | null
          round_id: string
          user_story_id: string
        }
        Insert: {
          id?: string
          result_points?: number | null
          round_id: string
          user_story_id: string
        }
        Update: {
          id?: string
          result_points?: number | null
          round_id?: string
          user_story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_round_stories_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "estimation_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_round_stories_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_round_votes: {
        Row: {
          created_at: string
          id: string
          round_id: string
          round_story_id: string
          updated_at: string
          user_id: string
          vote_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          round_id: string
          round_story_id: string
          updated_at?: string
          user_id: string
          vote_value: number
        }
        Update: {
          created_at?: string
          id?: string
          round_id?: string
          round_story_id?: string
          updated_at?: string
          user_id?: string
          vote_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimation_round_votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "estimation_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_round_votes_round_story_id_fkey"
            columns: ["round_story_id"]
            isOneToOne: false
            referencedRelation: "estimation_round_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_round_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_round_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_rounds: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          scale: number[]
          status: string
          title: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          scale?: number[]
          status?: string
          title: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          scale?: number[]
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_rounds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_session_participants: {
        Row: {
          id: string
          is_online: boolean | null
          joined_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "estimation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          current_story_id: string | null
          id: string
          name: string
          project_id: string
          scale_type: string
          sprint_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_story_id?: string | null
          id?: string
          name: string
          project_id: string
          scale_type?: string
          sprint_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_story_id?: string | null
          id?: string
          name?: string
          project_id?: string
          scale_type?: string
          sprint_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_sessions_current_story_id_fkey"
            columns: ["current_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_sessions_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_votes: {
        Row: {
          created_at: string
          estimation_id: string
          id: string
          user_id: string
          vote_value: string
        }
        Insert: {
          created_at?: string
          estimation_id: string
          id?: string
          user_id: string
          vote_value: string
        }
        Update: {
          created_at?: string
          estimation_id?: string
          id?: string
          user_id?: string
          vote_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_votes_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "estimations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      estimations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          scale_type: string
          session_id: string | null
          user_story_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          scale_type?: string
          session_id?: string | null
          user_story_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          scale_type?: string
          session_id?: string | null
          user_story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "estimation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimations_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      hu_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          uploaded_by: string | null
          user_story_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          uploaded_by?: string | null
          user_story_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
          user_story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hu_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hu_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hu_attachments_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          incident_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          incident_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          incident_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_attachments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_generated_stories: {
        Row: {
          classification: string
          created_at: string | null
          created_by: string | null
          id: string
          incident_id: string
          user_story_id: string | null
        }
        Insert: {
          classification: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          incident_id: string
          user_story_id?: string | null
        }
        Update: {
          classification?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          incident_id?: string
          user_story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_generated_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_generated_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_generated_stories_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_generated_stories_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_history: {
        Row: {
          created_at: string
          field_name: string
          id: string
          incident_id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          incident_id: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          incident_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_history_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_linked_stories: {
        Row: {
          created_at: string | null
          id: string
          incident_id: string
          linked_by: string | null
          user_story_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          incident_id: string
          linked_by?: string | null
          user_story_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          incident_id?: string
          linked_by?: string | null
          user_story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_linked_stories_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_linked_stories_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_linked_stories_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_linked_stories_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          incident_id: string
          is_internal: boolean
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          incident_id: string
          is_internal?: boolean
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          incident_id?: string
          is_internal?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_notes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_permission_configs: {
        Row: {
          can_close: boolean
          can_create: boolean
          can_manage: boolean
          created_at: string
          id: string
          role: string
          workspace_id: string
        }
        Insert: {
          can_close?: boolean
          can_create?: boolean
          can_manage?: boolean
          created_at?: string
          id?: string
          role: string
          workspace_id: string
        }
        Update: {
          can_close?: boolean
          can_create?: boolean
          can_manage?: boolean
          created_at?: string
          id?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_permission_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          actual_result: string | null
          assigned_to: string | null
          browser_info: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expected_result: string | null
          id: string
          is_requirement: boolean
          linked_user_story_id: string | null
          project_id: string
          reported_by_email: string | null
          reporter_name: string | null
          resolution_date: string | null
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string | null
          status: string
          steps_to_reproduce: string | null
          suspension_reason: string | null
          ticket_code: string | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          actual_result?: string | null
          assigned_to?: string | null
          browser_info?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_result?: string | null
          id?: string
          is_requirement?: boolean
          linked_user_story_id?: string | null
          project_id: string
          reported_by_email?: string | null
          reporter_name?: string | null
          resolution_date?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          status?: string
          steps_to_reproduce?: string | null
          suspension_reason?: string | null
          ticket_code?: string | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          actual_result?: string | null
          assigned_to?: string | null
          browser_info?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_result?: string | null
          id?: string
          is_requirement?: boolean
          linked_user_story_id?: string | null
          project_id?: string
          reported_by_email?: string | null
          reporter_name?: string | null
          resolution_date?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          status?: string
          steps_to_reproduce?: string | null
          suspension_reason?: string | null
          ticket_code?: string | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_linked_user_story_id_fkey"
            columns: ["linked_user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          by_email: boolean
          created_at: string
          id: string
          in_app: boolean
          notification_type: string
          user_id: string
        }
        Insert: {
          by_email?: boolean
          created_at?: string
          id?: string
          in_app?: boolean
          notification_type: string
          user_id: string
        }
        Update: {
          by_email?: boolean
          created_at?: string
          id?: string
          in_app?: boolean
          notification_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          project_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          role_id: string | null
          timezone: string | null
          user_type: string
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          job_title?: string | null
          project_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          timezone?: string | null
          user_type?: string
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          project_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          timezone?: string | null
          user_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          project_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          project_role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          project_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_name: string | null
          color: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          git_url: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          technologies: string[] | null
          workspace_id: string
        }
        Insert: {
          budget?: number | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          git_url?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          technologies?: string[] | null
          workspace_id: string
        }
        Update: {
          budget?: number | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          git_url?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          technologies?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_incident_permissions: {
        Row: {
          can_close: boolean | null
          can_create: boolean | null
          can_manage: boolean | null
          created_at: string | null
          id: string
          role_id: string
        }
        Insert: {
          can_close?: boolean | null
          can_create?: boolean | null
          can_manage?: boolean | null
          created_at?: string | null
          id?: string
          role_id: string
        }
        Update: {
          can_close?: boolean | null
          can_create?: boolean | null
          can_manage?: boolean | null
          created_at?: string | null
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_incident_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: true
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string
          created_at: string | null
          id: string
          is_allowed: boolean | null
          module: string
          role_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          module: string
          role_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          module?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      sig_flow_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          form_code: string
          form_name: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          form_code: string
          form_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          form_code?: string
          form_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sig_flow_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_flow_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_flow_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sig_flow_step_users: {
        Row: {
          created_at: string | null
          id: string
          step_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          step_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sig_flow_step_users_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "sig_flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_flow_step_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_flow_step_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sig_flow_steps: {
        Row: {
          created_at: string | null
          flow_config_id: string
          id: string
          step_order: number
          step_type: string
        }
        Insert: {
          created_at?: string | null
          flow_config_id: string
          id?: string
          step_order: number
          step_type: string
        }
        Update: {
          created_at?: string | null
          flow_config_id?: string
          id?: string
          step_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sig_flow_steps_flow_config_id_fkey"
            columns: ["flow_config_id"]
            isOneToOne: false
            referencedRelation: "sig_flow_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      sig_form_001: {
        Row: {
          accion_contencion: string | null
          ambiente_afectado: string | null
          area_proceso: string | null
          cliente_afectado: string | null
          codigo: string | null
          como_ocurrio: string | null
          contencion_exitosa: boolean | null
          created_at: string | null
          cuando_ocurrio: string | null
          descripcion: string
          detectado_por: string | null
          escalo_gerencia: boolean | null
          escalo_sgsi: boolean | null
          fecha_deteccion: string | null
          fecha_registro: string | null
          forma_deteccion: string | null
          id: string
          impacto_confidencialidad: string | null
          impacto_disponibilidad: string | null
          impacto_integridad: string | null
          impacto_operativo: string | null
          informacion_afectada: string | null
          involucra_datos_personales: boolean | null
          involucra_produccion: boolean | null
          medio_reporte: string | null
          notifico_cliente: boolean | null
          origen_estimado: string | null
          prioridad: string | null
          que_ocurrio: string | null
          reportado_por: string | null
          request_id: string
          requiere_reporte_externo: boolean | null
          responsable_contencion: string | null
          severidad: string | null
          sistema_afectado: string | null
          sistema_deteccion: string | null
          tipo_incidente: string | null
          titulo: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          accion_contencion?: string | null
          ambiente_afectado?: string | null
          area_proceso?: string | null
          cliente_afectado?: string | null
          codigo?: string | null
          como_ocurrio?: string | null
          contencion_exitosa?: boolean | null
          created_at?: string | null
          cuando_ocurrio?: string | null
          descripcion: string
          detectado_por?: string | null
          escalo_gerencia?: boolean | null
          escalo_sgsi?: boolean | null
          fecha_deteccion?: string | null
          fecha_registro?: string | null
          forma_deteccion?: string | null
          id?: string
          impacto_confidencialidad?: string | null
          impacto_disponibilidad?: string | null
          impacto_integridad?: string | null
          impacto_operativo?: string | null
          informacion_afectada?: string | null
          involucra_datos_personales?: boolean | null
          involucra_produccion?: boolean | null
          medio_reporte?: string | null
          notifico_cliente?: boolean | null
          origen_estimado?: string | null
          prioridad?: string | null
          que_ocurrio?: string | null
          reportado_por?: string | null
          request_id: string
          requiere_reporte_externo?: boolean | null
          responsable_contencion?: string | null
          severidad?: string | null
          sistema_afectado?: string | null
          sistema_deteccion?: string | null
          tipo_incidente?: string | null
          titulo: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          accion_contencion?: string | null
          ambiente_afectado?: string | null
          area_proceso?: string | null
          cliente_afectado?: string | null
          codigo?: string | null
          como_ocurrio?: string | null
          contencion_exitosa?: boolean | null
          created_at?: string | null
          cuando_ocurrio?: string | null
          descripcion?: string
          detectado_por?: string | null
          escalo_gerencia?: boolean | null
          escalo_sgsi?: boolean | null
          fecha_deteccion?: string | null
          fecha_registro?: string | null
          forma_deteccion?: string | null
          id?: string
          impacto_confidencialidad?: string | null
          impacto_disponibilidad?: string | null
          impacto_integridad?: string | null
          impacto_operativo?: string | null
          informacion_afectada?: string | null
          involucra_datos_personales?: boolean | null
          involucra_produccion?: boolean | null
          medio_reporte?: string | null
          notifico_cliente?: boolean | null
          origen_estimado?: string | null
          prioridad?: string | null
          que_ocurrio?: string | null
          reportado_por?: string | null
          request_id?: string
          requiere_reporte_externo?: boolean | null
          responsable_contencion?: string | null
          severidad?: string | null
          sistema_afectado?: string | null
          sistema_deteccion?: string | null
          tipo_incidente?: string | null
          titulo?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sig_form_001_detectado_por_fkey"
            columns: ["detectado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_form_001_detectado_por_fkey"
            columns: ["detectado_por"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_form_001_reportado_por_fkey"
            columns: ["reportado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_form_001_reportado_por_fkey"
            columns: ["reportado_por"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_form_001_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sig_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_form_001_responsable_contencion_fkey"
            columns: ["responsable_contencion"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_form_001_responsable_contencion_fkey"
            columns: ["responsable_contencion"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_form_001_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sig_request_history: {
        Row: {
          action_by: string
          comment: string | null
          created_at: string | null
          from_status: string | null
          id: string
          request_id: string
          step_type: string | null
          to_status: string
        }
        Insert: {
          action_by: string
          comment?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          request_id: string
          step_type?: string | null
          to_status: string
        }
        Update: {
          action_by?: string
          comment?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          request_id?: string
          step_type?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sig_request_history_action_by_fkey"
            columns: ["action_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_request_history_action_by_fkey"
            columns: ["action_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sig_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sig_request_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          request_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          request_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sig_request_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sig_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_request_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_request_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sig_requests: {
        Row: {
          closed_at: string | null
          created_at: string | null
          created_by: string
          current_assignee: string | null
          current_step_id: string | null
          flow_config_id: string | null
          form_code: string
          id: string
          status: string
          submitted_at: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          created_by: string
          current_assignee?: string | null
          current_step_id?: string | null
          flow_config_id?: string | null
          form_code: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          created_by?: string
          current_assignee?: string | null
          current_step_id?: string | null
          flow_config_id?: string | null
          form_code?: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sig_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_requests_current_assignee_fkey"
            columns: ["current_assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_requests_current_assignee_fkey"
            columns: ["current_assignee"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_requests_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "sig_flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_requests_flow_config_id_fkey"
            columns: ["flow_config_id"]
            isOneToOne: false
            referencedRelation: "sig_flow_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sig_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configs: {
        Row: {
          created_at: string
          id: string
          resolution_hours: number
          response_hours: number
          severity: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resolution_hours?: number
          response_hours?: number
          severity: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resolution_hours?: number
          response_hours?: number
          severity?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_retrospectives: {
        Row: {
          action_items: string | null
          created_at: string
          id: string
          project_id: string
          sprint_id: string
          to_improve: string | null
          updated_at: string
          went_well: string | null
        }
        Insert: {
          action_items?: string | null
          created_at?: string
          id?: string
          project_id: string
          sprint_id: string
          to_improve?: string | null
          updated_at?: string
          went_well?: string | null
        }
        Update: {
          action_items?: string | null
          created_at?: string
          id?: string
          project_id?: string
          sprint_id?: string
          to_improve?: string | null
          updated_at?: string
          went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_retrospectives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_retrospectives_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: true
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          capacity: number | null
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          name: string
          project_id: string
          start_date: string | null
          status: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          project_id: string
          start_date?: string | null
          status?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          user_story_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          user_story_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          user_story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string
          description: string | null
          hours: number
          id: string
          log_date: string
          project_id: string
          task_id: string | null
          user_id: string
          user_story_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          hours: number
          id?: string
          log_date?: string
          project_id: string
          task_id?: string | null
          user_id: string
          user_story_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          log_date?: string
          project_id?: string
          task_id?: string | null
          user_id?: string
          user_story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stories: {
        Row: {
          acceptance_criteria: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          epic_id: string | null
          id: string
          priority: string
          project_id: string
          sprint_id: string | null
          status: string
          story_number: number | null
          story_points: number | null
          title: string
          type: string
        }
        Insert: {
          acceptance_criteria?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          epic_id?: string | null
          id?: string
          priority?: string
          project_id: string
          sprint_id?: string | null
          status?: string
          story_number?: number | null
          story_points?: number | null
          title: string
          type?: string
        }
        Update: {
          acceptance_criteria?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          epic_id?: string | null
          id?: string
          priority?: string
          project_id?: string
          sprint_id?: string | null
          status?: string
          story_number?: number | null
          story_points?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stories_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          timezone: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          timezone?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_safe_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ensure_user_workspace: { Args: never; Returns: string }
      get_active_projects_public: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_external_user_project_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_workspace_id: { Args: never; Returns: string }
      has_admin_role: { Args: { _user_id: string }; Returns: boolean }
      has_incident_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_lead_role: { Args: { _user_id: string }; Returns: boolean }
      has_management_role: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_team_role: { Args: { _user_id: string }; Returns: boolean }
      is_external_user: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_incident_public: {
        Args: { p_ticket_code: string }
        Returns: {
          created_at: string
          severity: string
          status: string
          ticket_code: string
          title: string
          updated_at: string
        }[]
      }
      update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "project_manager"
        | "team_lead"
        | "developer"
        | "qa"
        | "designer"
        | "architect"
        | "analyst"
        | "stakeholder"
        | "external_user"
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
      app_role: [
        "super_admin",
        "admin",
        "project_manager",
        "team_lead",
        "developer",
        "qa",
        "designer",
        "architect",
        "analyst",
        "stakeholder",
        "external_user",
      ],
    },
  },
} as const
