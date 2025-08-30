// MongoDB initialization script for DaorsAgro
print('Starting MongoDB initialization for DaorsAgro...');

// Switch to admin database
db = db.getSiblingDB('admin');

// Create application user
db.createUser({
  user: 'daorsagro_user',
  pwd: 'daorsagro_password',
  roles: [
    { role: 'readWrite', db: 'daorsagro' },
    { role: 'readWrite', db: 'daorsagro_documents' },
    { role: 'readWrite', db: 'daorsagro_analytics' }
  ]
});

// Switch to main application database
db = db.getSiblingDB('daorsagro');

// Create initial collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: { bsonType: 'string' },
        password: { bsonType: 'string' },
        role: { enum: ['farmer', 'admin', 'agent'] }
      }
    }
  }
});

db.createCollection('subsidies', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'eligibility', 'amount'],
      properties: {
        name: { bsonType: 'string' },
        eligibility: { bsonType: 'object' },
        amount: { bsonType: 'number' }
      }
    }
  }
});

db.createCollection('insurance_policies', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['provider', 'type', 'coverage'],
      properties: {
        provider: { bsonType: 'string' },
        type: { bsonType: 'string' },
        coverage: { bsonType: 'object' }
      }
    }
  }
});

db.createCollection('documents');
db.createCollection('notifications');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.subsidies.createIndex({ eligibility: 1 });
db.insurance_policies.createIndex({ provider: 1, type: 1 });
db.documents.createIndex({ userId: 1, type: 1 });
db.notifications.createIndex({ userId: 1, createdAt: -1 });

print('MongoDB initialization completed successfully!');