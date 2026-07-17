import {createClient} from '@supabase/supabase-js'
const u=import.meta.env.VITE_SUPABASE_URL,k=import.meta.env.VITE_SUPABASE_ANON_KEY
if(!u||!k)throw new Error('Missing Supabase environment variables.')
export const supabase=createClient(u,k)
