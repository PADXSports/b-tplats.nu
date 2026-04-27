import { createClient as createSharedClient } from '../lib/supabase/client'

export function createClient() {
  return createSharedClient()
}