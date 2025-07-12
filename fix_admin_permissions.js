const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'employdex-base.db');
const db = new sqlite3.Database(dbPath);

// Function to run SQL queries with promises
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Function to get a single row
const getRow = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Function to get all rows
const getAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Main function to fix admin permissions
const fixAdminPermissions = async () => {
  try {
    // Start transaction
    await runQuery('BEGIN TRANSACTION');

    // 1. Get or create admin user
    let adminUser = await getRow('SELECT * FROM users_master WHERE email = ?', ['admin@employdex.com']);
    
    if (!adminUser) {
      console.log('Admin user not found, creating one...');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      const result = await runQuery(
        'INSERT INTO users_master (email, password_hash, first_name, last_name, mobile_number, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin@employdex.com', hashedPassword, 'Admin', 'User', '9999999999', 1]
      );
      adminUser = { user_id: result.lastID };
    }

    // 2. Get or create Admin role
    let adminRole = await getRow('SELECT * FROM roles_master WHERE name = ?', ['Admin']);
    
    if (!adminRole) {
      console.log('Admin role not found, creating one...');
      const result = await runQuery(
        'INSERT INTO roles_master (name, description) VALUES (?, ?)',
        ['Admin', 'Administrator with full system access']
      );
      adminRole = { role_id: result.lastID };
    }

    // 3. Ensure all permissions exist
    const permissions = [
      'user_view', 'user_create', 'user_edit', 'user_delete',
      'role_view', 'role_create', 'role_edit', 'role_delete',
      'permission_view', 'permission_assign'
    ];

    for (const permName of permissions) {
      let perm = await getRow('SELECT * FROM permissions_master WHERE name = ?', [permName]);
      
      if (!perm) {
        console.log(`Creating permission: ${permName}`);
        await runQuery(
          'INSERT INTO permissions_master (name, description) VALUES (?, ?)',
          [permName, `Can ${permName.replace('_', ' ')}`]
        );
      }
    }

    // 4. Assign all permissions to Admin role
    const allPermissions = await getAll('SELECT permission_id, name FROM permissions_master');
    
    for (const perm of allPermissions) {
      const existing = await getRow(
        'SELECT 1 FROM role_permissions_tx WHERE role_id = ? AND permission_id = ?',
        [adminRole.role_id, perm.permission_id]
      );
      
      if (!existing) {
        console.log(`Assigning permission ${perm.name} to Admin role`);
        await runQuery(
          'INSERT INTO role_permissions_tx (role_id, permission_id) VALUES (?, ?)',
          [adminRole.role_id, perm.permission_id]
        );
      }
    }

    // 5. Assign Admin role to admin user
    const existingUserRole = await getRow(
      'SELECT 1 FROM user_roles_tx WHERE user_id = ? AND role_id = ?',
      [adminUser.user_id, adminRole.role_id]
    );
    
    if (!existingUserRole) {
      console.log('Assigning Admin role to admin user');
      await runQuery(
        'INSERT INTO user_roles_tx (user_id, role_id) VALUES (?, ?)',
        [adminUser.user_id, adminRole.role_id]
      );
    }

    // Commit transaction
    await runQuery('COMMIT');
    console.log('Admin permissions fixed successfully!');
    console.log('Admin email: admin@employdex.com');
    console.log('Admin password: Admin@123');
    
  } catch (error) {
    await runQuery('ROLLBACK');
    console.error('Error fixing admin permissions:', error);
  } finally {
    db.close();
  }
};

// Run the script
fixAdminPermissions();
