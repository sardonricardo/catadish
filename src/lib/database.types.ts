export type DishCategory = 'entrante' | 'principal' | 'postre' | 'bebida'
export type GroupRole = 'owner' | 'admin' | 'member'
export type GroupInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          username: string | null
          avatar_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          latitude: number | null
          longitude: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dishes: {
        Row: {
          id: string
          restaurant_id: string | null
          name: string
          description: string | null
          price: number | null
          category: DishCategory | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id?: string | null
          name: string
          description?: string | null
          price?: number | null
          category?: DishCategory | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string | null
          name?: string
          description?: string | null
          price?: number | null
          category?: DishCategory | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          dish_id: string | null
          user_id: string | null
          rating: number
          comment: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dish_id?: string | null
          user_id?: string | null
          rating: number
          comment?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dish_id?: string | null
          user_id?: string | null
          rating?: number
          comment?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: GroupRole
          invited_by: string | null
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: GroupRole
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: GroupRole
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          id: string
          group_id: string
          email: string | null
          invited_by: string
          token: string
          status: GroupInviteStatus
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          email?: string | null
          invited_by: string
          token?: string
          status?: GroupInviteStatus
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          email?: string | null
          invited_by?: string
          token?: string
          status?: GroupInviteStatus
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_restaurants: {
        Row: {
          group_id: string
          restaurant_id: string
          added_by: string
          created_at: string
        }
        Insert: {
          group_id: string
          restaurant_id: string
          added_by: string
          created_at?: string
        }
        Update: {
          group_id?: string
          restaurant_id?: string
          added_by?: string
          created_at?: string
        }
        Relationships: []
      }
      dish_photos: {
        Row: {
          id: string
          dish_id: string
          uploaded_by: string
          storage_path: string
          caption: string | null
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dish_id: string
          uploaded_by: string
          storage_path: string
          caption?: string | null
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dish_id?: string
          uploaded_by?: string
          storage_path?: string
          caption?: string | null
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_group_invite: {
        Args: { _token: string }
        Returns: string
      }
      is_group_member: {
        Args: { _group_id: string }
        Returns: boolean
      }
      is_group_admin_or_owner: {
        Args: { _group_id: string }
        Returns: boolean
      }
    }
    Enums: {
      dish_category: DishCategory
      group_role: GroupRole
      group_invite_status: GroupInviteStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
