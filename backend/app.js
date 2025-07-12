/**
 * EmployDEX Base Platform - Main Application Entry Point
 * Created: 2025-06-26
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const EventEmitter = require('events');

// Create a global event bus for inter-module communication
const eventBus = new EventEmitter();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const dbPath = path.join(__dirname, '..', 'db', 'employdex-base.db');
const dbExists = fs.existsSync(dbPath);

// Create db directory if it doesn't exist
const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    
    // If database doesn't exist, initialize it with schema
    if (!dbExists) {
      const sqlScript = fs.readFileSync(path.join(__dirname, '..', 'db', 'base_v1_db_script.sql'), 'utf8');
      
      // Split the script by semicolons to execute each statement separately
      const sqlStatements = sqlScript.split(';').filter(stmt => stmt.trim() !== '');
      
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');
        
        // Execute each SQL statement in the script
        sqlStatements.forEach(statement => {
          if (statement.trim()) {
            db.run(statement, (err) => {
              if (err) {
                console.error('Error executing SQL statement:', err.message);
                console.error('Statement:', statement);
              }
            });
          }
        });
        
        console.log('Database initialized successfully');
      });
    }
  }
});

// Make database connection available to all routes
app.locals.db = db;
app.locals.eventBus = eventBus;

// Register module routers
// Load and register all modules from the modules directory
const modulesPath = path.join(__dirname, '..', 'modules');

// Array of module names that should be loaded
const moduleNames = [
  'authentication', 
  'user_management', 
  'role_management', 
  'permission_management', 
  'logging',
  'database'
];

// Register each module's backend routes
moduleNames.forEach(moduleName => {
  try {
    const modulePath = path.join(modulesPath, moduleName, 'backend', 'index.js');
    if (fs.existsSync(modulePath)) {
      const moduleRouter = require(modulePath);
      app.use(`/api/${moduleName}`, moduleRouter);
      console.log(`Registered module: ${moduleName}`);
    } else {
      console.warn(`Module ${moduleName} does not have an index.js file`);
    }
  } catch (err) {
    console.error(`Error loading module ${moduleName}:`, err);
  }
});

// --- Feature Toggle API ---
//const jwt = require('jsonwebtoken');
function requireAdminOrFullAccess(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing auth header' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    if (decoded.role === 'admin' || decoded.role === 'full_access') {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// List all feature toggles
app.get('/api/feature-toggles', requireAdminOrFullAccess, (req, res) => {
  db.all('SELECT * FROM feature_toggles', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create a new feature toggle
app.post('/api/feature-toggles', requireAdminOrFullAccess, (req, res) => {
  console.log('POST /api/feature-toggles body:', req.body);
  const { feature_name, enabled, description, feature } = req.body;
  if (!feature_name) return res.status(400).json({ error: 'feature_name required' });
  db.run(
    'INSERT INTO feature_toggles (feature_name, enabled, description, feature) VALUES (?, ?, ?, ?)',
    [feature_name, enabled ? 1 : 0, description || '', feature || 'user_management'],
    function (err) {
      if (err) {
        console.error('SQL error (INSERT feature_toggles):', err.message);
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM feature_toggles WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('SQL error (SELECT feature_toggles after insert):', err.message);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(row);
      });
    }
  );
});

// Update a feature toggle
app.put('/api/feature-toggles/:id', requireAdminOrFullAccess, (req, res) => {
  console.log('PUT /api/feature-toggles/:id body:', req.body);
  const { enabled, description, feature } = req.body;
  db.run(
    'UPDATE feature_toggles SET enabled = ?, description = ?, feature = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [enabled ? 1 : 0, description || '', feature || 'user_management', req.params.id],
    function (err) {
      if (err) {
        console.error('SQL error (UPDATE feature_toggles):', err.message);
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM feature_toggles WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
          console.error('SQL error (SELECT feature_toggles after update):', err.message);
          return res.status(500).json({ error: err.message });
        }
        res.json(row);
      });
    }
  );
});

// Delete a feature toggle
app.delete('/api/feature-toggles/:id', requireAdminOrFullAccess, (req, res) => {
  db.run('DELETE FROM feature_toggles WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const errorLogger = app.locals.eventBus;
  errorLogger.emit('log:error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      id: Date.now().toString()
    }
  });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  eventBus.emit('system:startup', { timestamp: new Date() });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Close database connection
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = app;