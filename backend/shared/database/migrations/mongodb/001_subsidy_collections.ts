import { MongoClient, Db } from 'mongodb';
import { Migration } from '../../src/types';

export const migration: Migration = {
  id: '001_subsidy_collections',
  name: 'Create subsidy management collections',
  timestamp: 1703003000000,
  
  async up(): Promise<void> {
    const client = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017');
    
    try {
      await client.connect();
      const db = client.db('daorsagro');

      // Create subsidy_programs collection
      await db.createCollection('subsidy_programs', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'description', 'programType', 'eligibilityCriteria', 'benefits', 'applicationPeriod', 'isActive'],
            properties: {
              name: {
                bsonType: 'string',
                description: 'Program name is required'
              },
              description: {
                bsonType: 'string',
                description: 'Program description is required'
              },
              programType: {
                bsonType: 'string',
                enum: ['federal', 'state', 'local'],
                description: 'Program type must be federal, state, or local'
              },
              eligibilityCriteria: {
                bsonType: 'object',
                properties: {
                  farmSize: {
                    bsonType: 'object',
                    properties: {
                      min: { bsonType: 'number' },
                      max: { bsonType: 'number' }
                    }
                  },
                  cropTypes: {
                    bsonType: 'array',
                    items: { bsonType: 'string' }
                  },
                  income: {
                    bsonType: 'object',
                    properties: {
                      max: { bsonType: 'number' }
                    }
                  },
                  location: {
                    bsonType: 'array',
                    items: { bsonType: 'string' }
                  },
                  certifications: {
                    bsonType: 'array',
                    items: { bsonType: 'string' }
                  }
                }
              },
              benefits: {
                bsonType: 'object',
                required: ['type'],
                properties: {
                  type: {
                    bsonType: 'string',
                    enum: ['direct_payment', 'cost_share', 'loan_guarantee', 'insurance_premium'],
                    description: 'Benefit type is required'
                  },
                  amount: { bsonType: 'number' },
                  percentage: { bsonType: 'number' },
                  maxAmount: { bsonType: 'number' }
                }
              },
              applicationPeriod: {
                bsonType: 'object',
                required: ['startDate', 'endDate'],
                properties: {
                  startDate: { bsonType: 'date' },
                  endDate: { bsonType: 'date' },
                  deadlines: {
                    bsonType: 'array',
                    items: { bsonType: 'date' }
                  }
                }
              },
              requiredDocuments: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              contactInfo: {
                bsonType: 'object',
                properties: {
                  agency: { bsonType: 'string' },
                  phone: { bsonType: 'string' },
                  email: { bsonType: 'string' },
                  website: { bsonType: 'string' }
                }
              },
              isActive: {
                bsonType: 'bool',
                description: 'Active status is required'
              },
              lastUpdated: {
                bsonType: 'date'
              },
              tags: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              priority: {
                bsonType: 'int',
                minimum: 1,
                maximum: 5
              }
            }
          }
        }
      });

      // Create indexes for subsidy_programs
      await db.collection('subsidy_programs').createIndexes([
        { key: { name: 1 } },
        { key: { programType: 1 } },
        { key: { isActive: 1 } },
        { key: { 'applicationPeriod.startDate': 1, 'applicationPeriod.endDate': 1 } },
        { key: { 'eligibilityCriteria.cropTypes': 1 } },
        { key: { 'eligibilityCriteria.location': 1 } },
        { key: { tags: 1 } },
        { key: { priority: 1 } },
        { key: { lastUpdated: -1 } },
        { key: { name: 'text', description: 'text', tags: 'text' }, name: 'text_search' }
      ]);

      // Create subsidy_applications collection
      await db.createCollection('subsidy_applications', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['farmId', 'userId', 'programId', 'applicationData', 'status'],
            properties: {
              farmId: {
                bsonType: 'string',
                description: 'Farm ID is required'
              },
              userId: {
                bsonType: 'string',
                description: 'User ID is required'
              },
              programId: {
                bsonType: 'string',
                description: 'Program ID is required'
              },
              applicationData: {
                bsonType: 'object',
                description: 'Application data is required'
              },
              documents: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['documentType', 'fileName', 'fileUrl', 'uploadedAt'],
                  properties: {
                    documentType: { bsonType: 'string' },
                    fileName: { bsonType: 'string' },
                    fileUrl: { bsonType: 'string' },
                    uploadedAt: { bsonType: 'date' },
                    verified: { bsonType: 'bool' },
                    fileSize: { bsonType: 'long' },
                    mimeType: { bsonType: 'string' }
                  }
                }
              },
              status: {
                bsonType: 'string',
                enum: ['draft', 'submitted', 'under_review', 'approved', 'denied', 'pending_documents'],
                description: 'Status is required'
              },
              timeline: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['stage', 'date'],
                  properties: {
                    stage: { bsonType: 'string' },
                    date: { bsonType: 'date' },
                    notes: { bsonType: 'string' },
                    updatedBy: { bsonType: 'string' }
                  }
                }
              },
              approvedAmount: { bsonType: 'number' },
              rejectionReason: { bsonType: 'string' },
              submittedAt: { bsonType: 'date' },
              reviewedAt: { bsonType: 'date' },
              completedAt: { bsonType: 'date' },
              notes: { bsonType: 'string' },
              priority: {
                bsonType: 'int',
                minimum: 1,
                maximum: 5
              }
            }
          }
        }
      });

      // Create indexes for subsidy_applications
      await db.collection('subsidy_applications').createIndexes([
        { key: { farmId: 1 } },
        { key: { userId: 1 } },
        { key: { programId: 1 } },
        { key: { status: 1 } },
        { key: { submittedAt: -1 } },
        { key: { reviewedAt: -1 } },
        { key: { farmId: 1, status: 1 } },
        { key: { userId: 1, status: 1 } },
        { key: { programId: 1, status: 1 } },
        { key: { priority: 1 } },
        { key: { createdAt: -1 } },
        { key: { updatedAt: -1 } }
      ]);

      // Create application_templates collection
      await db.createCollection('application_templates', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'programType', 'fields', 'isActive'],
            properties: {
              name: {
                bsonType: 'string',
                description: 'Template name is required'
              },
              description: { bsonType: 'string' },
              programType: {
                bsonType: 'string',
                enum: ['federal', 'state', 'local'],
                description: 'Program type is required'
              },
              fields: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['name', 'type', 'required'],
                  properties: {
                    name: { bsonType: 'string' },
                    label: { bsonType: 'string' },
                    type: {
                      bsonType: 'string',
                      enum: ['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'file', 'textarea']
                    },
                    required: { bsonType: 'bool' },
                    options: {
                      bsonType: 'array',
                      items: { bsonType: 'string' }
                    },
                    validation: { bsonType: 'object' },
                    helpText: { bsonType: 'string' },
                    order: { bsonType: 'int' }
                  }
                }
              },
              requiredDocuments: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              isActive: { bsonType: 'bool' },
              version: { bsonType: 'string' }
            }
          }
        }
      });

      // Create indexes for application_templates
      await db.collection('application_templates').createIndexes([
        { key: { name: 1 } },
        { key: { programType: 1 } },
        { key: { isActive: 1 } },
        { key: { version: 1 } }
      ]);

      // Create subsidy_notifications collection
      await db.createCollection('subsidy_notifications', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'type', 'title', 'message', 'isRead'],
            properties: {
              userId: { bsonType: 'string' },
              farmId: { bsonType: 'string' },
              applicationId: { bsonType: 'string' },
              programId: { bsonType: 'string' },
              type: {
                bsonType: 'string',
                enum: ['application_status', 'deadline_reminder', 'new_program', 'document_required', 'approval', 'rejection']
              },
              title: { bsonType: 'string' },
              message: { bsonType: 'string' },
              isRead: { bsonType: 'bool' },
              readAt: { bsonType: 'date' },
              priority: {
                bsonType: 'string',
                enum: ['low', 'medium', 'high', 'urgent']
              },
              actionUrl: { bsonType: 'string' },
              metadata: { bsonType: 'object' }
            }
          }
        }
      });

      // Create indexes for subsidy_notifications
      await db.collection('subsidy_notifications').createIndexes([
        { key: { userId: 1 } },
        { key: { farmId: 1 } },
        { key: { applicationId: 1 } },
        { key: { type: 1 } },
        { key: { isRead: 1 } },
        { key: { priority: 1 } },
        { key: { createdAt: -1 } },
        { key: { userId: 1, isRead: 1 } },
        { key: { userId: 1, createdAt: -1 } }
      ]);

      // Create program_eligibility_cache collection for performance
      await db.createCollection('program_eligibility_cache', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['farmId', 'programId', 'isEligible', 'calculatedAt'],
            properties: {
              farmId: { bsonType: 'string' },
              programId: { bsonType: 'string' },
              isEligible: { bsonType: 'bool' },
              eligibilityScore: { bsonType: 'number' },
              reasons: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              calculatedAt: { bsonType: 'date' },
              expiresAt: { bsonType: 'date' }
            }
          }
        }
      });

      // Create indexes for program_eligibility_cache
      await db.collection('program_eligibility_cache').createIndexes([
        { key: { farmId: 1, programId: 1 }, unique: true },
        { key: { farmId: 1 } },
        { key: { programId: 1 } },
        { key: { isEligible: 1 } },
        { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL index
        { key: { calculatedAt: -1 } }
      ]);

      console.log('✅ Subsidy collections created successfully');
    } catch (error) {
      console.error('❌ Error creating subsidy collections:', error);
      throw error;
    } finally {
      await client.close();
    }
  },

  async down(): Promise<void> {
    const client = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017');
    
    try {
      await client.connect();
      const db = client.db('daorsagro');

      // Drop collections
      const collections = [
        'subsidy_programs',
        'subsidy_applications',
        'application_templates',
        'subsidy_notifications',
        'program_eligibility_cache'
      ];

      for (const collection of collections) {
        try {
          await db.collection(collection).drop();
          console.log(`✅ Dropped collection: ${collection}`);
        } catch (error) {
          if (error.message.includes('ns not found')) {
            console.log(`⚠️  Collection ${collection} does not exist`);
          } else {
            throw error;
          }
        }
      }

      console.log('✅ Subsidy collections dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping subsidy collections:', error);
      throw error;
    } finally {
      await client.close();
    }
  }
};