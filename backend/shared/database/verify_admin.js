const { Pool } = require('pg');

async function verifyAdminUser() {
  const pool = new Pool({
    connectionString: process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, email_verified, is_active
      FROM users
      WHERE email = $1
    `, ['admin@daorsagro.com']);

    if (result.rows.length > 0) {
      console.log('✅ Admin user found:');
      console.log('Email:', result.rows[0].email);
      console.log('Name:', result.rows[0].first_name, result.rows[0].last_name);
      console.log('Role:', result.rows[0].role);
      console.log('Email Verified:', result.rows[0].email_verified);
      console.log('Active:', result.rows[0].is_active);
      console.log('\n🔐 Login Credentials:');
      console.log('Email: admin@daorsagro.com');
      console.log('Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('❌ Error verifying admin user:', error.message || error);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

verifyAdminUser();