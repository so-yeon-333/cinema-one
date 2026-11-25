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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      booking: {
        Row: {
          booked_at: string
          booking_no: string
          cancelled_at: string | null
          id: string
          member_id: string
          refund_amount: number | null
          screening_id: string
          status: string
          total_amount: number
        }
        Insert: {
          booked_at?: string
          booking_no: string
          cancelled_at?: string | null
          id?: string
          member_id: string
          refund_amount?: number | null
          screening_id: string
          status: string
          total_amount: number
        }
        Update: {
          booked_at?: string
          booking_no?: string
          cancelled_at?: string | null
          id?: string
          member_id?: string
          refund_amount?: number | null
          screening_id?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screening"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_seat: {
        Row: {
          booking_id: string
          id: string
          is_active: boolean
          is_discounted: boolean
          screening_id: string
          seat_id: string
          unit_price: number
        }
        Insert: {
          booking_id: string
          id?: string
          is_active?: boolean
          is_discounted?: boolean
          screening_id: string
          seat_id: string
          unit_price: number
        }
        Update: {
          booking_id?: string
          id?: string
          is_active?: boolean
          is_discounted?: boolean
          screening_id?: string
          seat_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_seat_booking_id_screening_id_fkey"
            columns: ["booking_id", "screening_id"]
            isOneToOne: false
            referencedRelation: "booking"
            referencedColumns: ["id", "screening_id"]
          },
          {
            foreignKeyName: "booking_seat_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seat"
            referencedColumns: ["id"]
          },
        ]
      }
      member: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      movie: {
        Row: {
          created_at: string
          genre: string
          id: string
          rating: string
          running_minutes: number
          title: string
        }
        Insert: {
          created_at?: string
          genre: string
          id?: string
          rating: string
          running_minutes: number
          title: string
        }
        Update: {
          created_at?: string
          genre?: string
          id?: string
          rating?: string
          running_minutes?: number
          title?: string
        }
        Relationships: []
      }
      screen: {
        Row: {
          block1_cols: number
          block1_rows: number
          block2_cols: number
          block2_rows: number
          block3_cols: number
          block3_rows: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          block1_cols?: number
          block1_rows?: number
          block2_cols?: number
          block2_rows?: number
          block3_cols?: number
          block3_rows?: number
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          block1_cols?: number
          block1_rows?: number
          block2_cols?: number
          block2_rows?: number
          block3_cols?: number
          block3_rows?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      screening: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          movie_id: string
          price: number
          screen_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          movie_id: string
          price: number
          screen_id: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          movie_id?: string
          price?: number
          screen_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen"
            referencedColumns: ["id"]
          },
        ]
      }
      seat: {
        Row: {
          block_no: number
          col_no: number
          id: string
          row_index: number
          row_label: string
          screen_id: string
        }
        Insert: {
          block_no: number
          col_no: number
          id?: string
          row_index: number
          row_label: string
          screen_id: string
        }
        Update: {
          block_no?: number
          col_no?: number
          id?: string
          row_index?: number
          row_label?: string
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screen"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_seats: {
        Args: { p_screening_id: string; p_seat_ids: string[] }
        Returns: Json
      }
      cancel_booking: {
        Args: { p_booking_id: string }
        Returns: {
          booking_no: string
          cancelled_at: string
          refund_amount: number
        }[]
      }
      configure_screen: {
        Args: {
          p_b1_cols: number
          p_b1_rows: number
          p_b2_cols: number
          p_b2_rows: number
          p_b3_cols: number
          p_b3_rows: number
          p_name: string
        }
        Returns: {
          max_seats: number
          screen_id: string
          seats_created: number
        }[]
      }
      count_new_isolated_seats: {
        Args: { p_screening_id: string; p_seat_ids: string[] }
        Returns: number
      }
      create_movie: {
        Args: {
          p_genre: string
          p_rating: string
          p_running_minutes: number
          p_title: string
        }
        Returns: string
      }
      create_screening: {
        Args: {
          p_movie_id: string
          p_price: number
          p_screen_id: string
          p_starts_at: string
        }
        Returns: {
          ends_at: string
          screening_id: string
        }[]
      }
      generate_seats: { Args: { p_screen_id: string }; Returns: number }
      get_my_bookings: {
        Args: never
        Returns: {
          booked_at: string
          booking_id: string
          booking_no: string
          can_cancel: boolean
          cancel_deadline: string
          cancelled_at: string
          category: string
          has_discount: boolean
          movie_title: string
          refund_amount: number
          screen_name: string
          seat_count: number
          seat_labels: string[]
          starts_at: string
          status: string
          total_amount: number
        }[]
      }
      get_schedule: {
        Args: { p_date: string }
        Returns: {
          ends_at: string
          genre: string
          movie_id: string
          price: number
          rating: string
          remaining_seats: number
          running_minutes: number
          screen_name: string
          screening_id: string
          starts_at: string
          status: string
          title: string
        }[]
      }
      get_schedule_dates: {
        Args: never
        Returns: {
          schedule_date: string
        }[]
      }
      get_seat_status: {
        Args: { p_screening_id: string }
        Returns: {
          block_no: number
          col_no: number
          discount_active: boolean
          discount_pct: number
          is_isolated: boolean
          max_seats: number
          price: number
          row_index: number
          row_label: string
          screening_started: boolean
          seat_id: string
          starts_at: string
          status: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      isolated_seats: {
        Args: { p_assume_booked?: string[]; p_screening_id: string }
        Returns: string[]
      }
      max_seats_per_booking: { Args: { p_screen_id: string }; Returns: number }
      row_label: { Args: { p_index: number }; Returns: string }
      stats_by_movie: {
        Args: { p_period: string }
        Returns: {
          movie_id: string
          movie_title: string
          occupancy_pct: number
          offered_seats: number
          revenue: number
          screenings: number
          sold_seats: number
        }[]
      }
      stats_by_screen: {
        Args: { p_period: string }
        Returns: {
          cancel_rate_pct: number
          discount_amount: number
          discounted_seats: number
          isolated_ratio_pct: number
          layout: string
          occupancy_pct: number
          offered_seats: number
          revenue: number
          screen_id: string
          screen_name: string
          screenings: number
          sold_seats: number
          total_seats: number
        }[]
      }
      stats_screening_rows: {
        Args: { p_period: string }
        Returns: {
          cancelled_bookings: number
          cancelled_seats: number
          discount_amount: number
          discounted_seats: number
          isolated_seats: number
          movie_id: string
          movie_title: string
          offered_seats: number
          refund_total: number
          revenue: number
          screen_id: string
          screen_name: string
          screening_id: string
          sold_seats: number
          starts_at: string
        }[]
      }
      stats_screenings: {
        Args: { p_day?: string; p_period: string; p_screen_id?: string }
        Returns: {
          cancel_rate_pct: number
          cancelled_bookings: number
          cancelled_seats: number
          discount_amount: number
          discounted_seats: number
          isolated_seats: number
          movie_id: string
          movie_title: string
          occupancy_pct: number
          offered_seats: number
          refund_total: number
          revenue: number
          screen_id: string
          screen_name: string
          screening_id: string
          sold_seats: number
          starts_at: string
        }[]
      }
      stats_seat_heatmap: {
        Args: { p_period: string; p_screen_id: string }
        Returns: {
          block_no: number
          cancel_count: number
          col_no: number
          isolated_count: number
          row_index: number
          row_label: string
          screenings: number
          seat_id: string
          sold_count: number
          sold_rate_pct: number
        }[]
      }
      stats_summary: {
        Args: { p_period: string }
        Returns: {
          cancelled_bookings: number
          discount_amount: number
          discounted_seats: number
          occupancy_pct: number
          offered_seats: number
          refund_total: number
          revenue: number
          screenings: number
          sold_seats: number
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
