import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

describe('New API Implementation', () => {
  let testUserId: string
  let testAnalysisId: number

  beforeAll(async () => {
    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'test123456',
      email_confirm: true
    })
    
    if (error || !user) throw new Error('Failed to create test user')
    testUserId = user.id
  })

  afterAll(async () => {
    if (testAnalysisId) {
      await supabase.from('analyses').delete().eq('id', testAnalysisId)
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  test('Upload creates analysis record', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        user_id: testUserId,
        file_name: 'test.json',
        file_path: `${testUserId}/test.json`,
        file_size: 1024,
        status: 'pending',
        is_paid: false
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.id).toBeDefined()
    
    testAnalysisId = data.id
  })

  test('Get analysis returns correct record', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', testAnalysisId)
      .eq('user_id', testUserId)
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.user_id).toBe(testUserId)
    expect(data.status).toBe('pending')
  })

  test('Update analysis status works', async () => {
    const { error } = await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', testAnalysisId)
      .eq('user_id', testUserId)

    expect(error).toBeNull()

    const { data } = await supabase
      .from('analyses')
      .select('status')
      .eq('id', testAnalysisId)
      .single()

    expect(data?.status).toBe('processing')
  })

  test('Complete analysis updates all fields', async () => {
    const { error } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        result_text: 'Full analysis result',
        result_teaser: 'Teaser text',
        is_paid: true
      })
      .eq('id', testAnalysisId)
      .eq('user_id', testUserId)

    expect(error).toBeNull()

    const { data } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', testAnalysisId)
      .single()

    expect(data?.status).toBe('completed')
    expect(data?.result_text).toBe('Full analysis result')
    expect(data?.result_teaser).toBe('Teaser text')
    expect(data?.is_paid).toBe(true)
  })
})
