import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn(
    'Supabase environment variables not found. Messages will be stored locally only.'
  )
  // Create a mock supabase client that works without throwing errors
  const createMockQuery = () => {
    const query = {
      select: () => query,
      order: () => query,
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      })
    }
    // Make the final query return a promise
    query.then = (resolve) => resolve({ data: [], error: null })
    return query
  }

  supabase = {
    from: () => createMockQuery(),
    channel: () => ({
      on: function() { return this },
      subscribe: () => ({})
    }),
    removeChannel: () => {}
  }
}

export { supabase }
