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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_entries: {
        Row: {
          created_at: string
          id: string
          note: string | null
          organization_id: string
          shift_date: string
          shift_template_id: string
          status: Database["public"]["Enums"]["availability_status"]
          submission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          shift_date: string
          shift_template_id: string
          status: Database["public"]["Enums"]["availability_status"]
          submission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          shift_date?: string
          shift_template_id?: string
          status?: Database["public"]["Enums"]["availability_status"]
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_entries_shift_template_id_organization_id_fkey"
            columns: ["shift_template_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "availability_entries_submission_id_organization_id_fkey"
            columns: ["submission_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "availability_submissions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      availability_submissions: {
        Row: {
          created_at: string
          id: string
          manager_note: string | null
          organization_id: string
          schedule_period_id: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_note?: string | null
          organization_id: string
          schedule_period_id: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_note?: string | null
          organization_id?: string
          schedule_period_id?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_submissions_schedule_period_id_organization_i_fkey"
            columns: ["schedule_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          note: string | null
          organization_id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          note?: string | null
          organization_id: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          note?: string | null
          organization_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          organization_id: string
          payload: Json
          read_at: string | null
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template_key: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id: string
          payload?: Json
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_key: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          payload?: Json
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          branch_id: string
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          invited_by: string
          last_name: string
          last_notified_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id: string
          created_at?: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          invited_by: string
          last_name?: string
          last_notified_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          invited_by?: string
          last_name?: string
          last_notified_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          branch_id: string | null
          can_close: boolean
          can_open: boolean
          created_at: string
          employee_number: string | null
          id: string
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          seniority_level: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          can_close?: boolean
          can_open?: boolean
          created_at?: string
          employee_number?: string | null
          id?: string
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          seniority_level?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          can_close?: boolean
          can_open?: boolean
          created_at?: string
          employee_number?: string | null
          id?: string
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          seniority_level?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          color: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          first_name: string
          id: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_periods: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          month: number
          organization_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["schedule_status"]
          submission_closes_at: string
          submission_opens_at: string
          updated_at: string
          year: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          organization_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          submission_closes_at: string
          submission_opens_at: string
          updated_at?: string
          year: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          organization_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          submission_closes_at?: string
          submission_opens_at?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_periods_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "schedule_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          organization_id: string
          shift_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          shift_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_organization_id_fkey"
            columns: ["shift_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          active: boolean
          branch_id: string
          created_at: string
          end_time: string
          id: string
          name: string
          organization_id: string
          required_employees: number
          requires_senior_employee: boolean
          shift_type: string
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          created_at?: string
          end_time: string
          id?: string
          name: string
          organization_id: string
          required_employees?: number
          requires_senior_employee?: boolean
          shift_type: string
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          organization_id?: string
          required_employees?: number
          requires_senior_employee?: boolean
          shift_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "shift_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          manager_note: string | null
          name: string
          organization_id: string
          required_employees: number
          schedule_period_id: string
          shift_date: string
          shift_template_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["shift_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          manager_note?: string | null
          name: string
          organization_id: string
          required_employees?: number
          schedule_period_id: string
          shift_date: string
          shift_template_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          manager_note?: string | null
          name?: string
          organization_id?: string
          required_employees?: number
          schedule_period_id?: string
          shift_date?: string
          shift_template_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_period_id_organization_id_fkey"
            columns: ["schedule_period_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "shifts_shift_template_id_organization_id_fkey"
            columns: ["shift_template_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      swap_request_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          note: string | null
          organization_id: string
          swap_request_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          swap_request_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          swap_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swap_request_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_request_events_swap_request_id_organization_id_fkey"
            columns: ["swap_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "swap_requests"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      swap_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          manager_note: string | null
          organization_id: string
          original_assignment_id: string
          reason: string
          requested_by: string
          status: Database["public"]["Enums"]["swap_status"]
          target_shift_id: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          manager_note?: string | null
          organization_id: string
          original_assignment_id: string
          reason: string
          requested_by: string
          status?: Database["public"]["Enums"]["swap_status"]
          target_shift_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          manager_note?: string | null
          organization_id?: string
          original_assignment_id?: string
          reason?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["swap_status"]
          target_shift_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swap_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_original_assignment_id_organization_id_fkey"
            columns: ["original_assignment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "swap_requests_target_shift_id_organization_id_fkey"
            columns: ["target_shift_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_token: string }
        Returns: string
      }
      approve_shift_swap: {
        Args: { decision_note?: string; target_request_id: string }
        Returns: boolean
      }
      create_organization_invitation: {
        Args: {
          target_branch_id: string
          target_email: string
          target_first_name: string
          target_last_name?: string
          target_organization_id: string
          target_role?: Database["public"]["Enums"]["member_role"]
        }
        Returns: string
      }
      create_organization_workspace: {
        Args: {
          business_name: string
          first_branch_name: string
          organization_slug: string
          owner_first_name: string
          owner_last_name?: string
        }
        Returns: string
      }
      duplicate_schedule_period: {
        Args: { source_period_id: string; target_period_id: string }
        Returns: {
          assignments_created: number
          assignments_skipped_inactive: number
          shifts_created: number
        }[]
      }
      mark_my_notifications_read: { Args: never; Returns: number }
      publish_schedule_period: {
        Args: { target_period_id: string }
        Returns: number
      }
      transfer_organization_ownership: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      unpublish_schedule_period: {
        Args: { target_period_id: string }
        Returns: number
      }
    }
    Enums: {
      availability_status:
        | "available"
        | "preferred"
        | "only_if_needed"
        | "unavailable"
      leave_type: "vacation" | "sick"
      member_role: "owner" | "admin" | "manager" | "employee"
      member_status: "invited" | "active" | "suspended"
      notification_status: "pending" | "sent" | "failed" | "cancelled"
      schedule_status: "collecting" | "draft" | "published" | "archived"
      shift_status: "draft" | "published" | "cancelled"
      swap_status:
        | "pending_employee"
        | "pending_manager"
        | "approved"
        | "rejected"
        | "cancelled"
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
      availability_status: [
        "available",
        "preferred",
        "only_if_needed",
        "unavailable",
      ],
      leave_type: ["vacation", "sick"],
      member_role: ["owner", "admin", "manager", "employee"],
      member_status: ["invited", "active", "suspended"],
      notification_status: ["pending", "sent", "failed", "cancelled"],
      schedule_status: ["collecting", "draft", "published", "archived"],
      shift_status: ["draft", "published", "cancelled"],
      swap_status: [
        "pending_employee",
        "pending_manager",
        "approved",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
