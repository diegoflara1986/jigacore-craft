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
      incidents: {
        Row: {
          actual_result: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string | null
          expected_result: string | null
          id: string
          project_id: string
          reported_by_email: string | null
          severity: string
          status: string
          steps_to_reproduce: string | null
          ticket_code: string | null
          title: string
        }
        Insert: {
          actual_result?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expected_result?: string | null
          id?: string
          project_id: string
          reported_by_email?: string | null
          severity?: string
          status?: string
          steps_to_reproduce?: string | null
          ticket_code?: string | null
          title: string
        }
        Update: {
          actual_result?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expected_result?: string | null
          id?: string
          project_id?: string
          reported_by_email?: string | null
          severity?: string
          status?: string
          steps_to_reproduce?: string | null
          ticket_code?: string | null
          title?: string
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
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
          timezone: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
          timezone?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
          timezone?: string | null
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
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          description: string | null
          epic_id: string | null
          id: string
          priority: string
          project_id: string
          sprint_id: string | null
          status: string
          story_points: number | null
          title: string
          type: string
        }
        Insert: {
          acceptance_criteria?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          epic_id?: string | null
          id?: string
          priority?: string
          project_id: string
          sprint_id?: string | null
          status?: string
          story_points?: number | null
          title: string
          type?: string
        }
        Update: {
          acceptance_criteria?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          epic_id?: string | null
          id?: string
          priority?: string
          project_id?: string
          sprint_id?: string | null
          status?: string
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
            foreignKeyName: "user_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      [_ in never]: never
    }
    Functions: {
      ensure_user_workspace: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_workspace_id: { Args: never; Returns: string }
      has_management_role: { Args: { _user_id: string }; Returns: boolean }
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
