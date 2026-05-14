const supabase = require('./supabase')

async function testLogin() {
  console.log('🔍 Testing login with Supabase Auth...\n')
  
  const email = 'karthik@agency.com'
  const password = 'password123'
  
  console.log(`📧 Email: ${email}`)
  console.log(`🔑 Password: ${password}\n`)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.log('❌ LOGIN FAILED!')
    console.log('Error:', error.message)
  } else {
    console.log('✅ LOGIN SUCCESSFUL!')
    console.log('User ID:', data.user.id)
    console.log('User Email:', data.user.email)
    console.log('User Metadata:', data.user.user_metadata)
  }
}

testLogin()