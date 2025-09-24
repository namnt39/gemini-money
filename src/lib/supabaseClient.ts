import { createClient } from '@supabase/supabase-js'

// Lấy các biến môi trường đã tạo ở file .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Khởi tạo và export một client Supabase duy nhất để dùng trong toàn bộ ứng dụng
export const supabase = createClient(supabaseUrl, supabaseAnonKey)