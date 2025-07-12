const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'db', 'employdex-base.db');
const db = new sqlite3.Database(dbPath);

// New password
const newPassword = 'Admin@123';

// Hash the new password
bcrypt.genSalt(10, (err, salt) => {
  if (err) {
    console.error('Error generating salt:', err);
    return;
  }
  
  bcrypt.hash(newPassword, salt, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }
    
    // Update the admin user's password
    db.run(
      'UPDATE users_master SET password_hash = ? WHERE email = ?',
      [hash, 'admin@employdex.com'],
      function(err) {
        if (err) {
          console.error('Error updating password:', err);
        } else if (this.changes === 0) {
          console.error('Admin user not found');
        } else {
          console.log('Admin password reset successfully!');
          console.log('Email: admin@employdex.com');
          console.log('New Password:', newPassword);
        }
        
        // Close the database connection
        db.close();
      }
    );
  });
});
