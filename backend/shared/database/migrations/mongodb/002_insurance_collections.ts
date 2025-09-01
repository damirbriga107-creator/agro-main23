import { MongoClient, Db } from 'mongodb';
import { Migration } from '../../src/types';

export const migration: Migration = {
  id: '002_insurance_collections',
  name: 'Create insurance management collections',
  timestamp: 1703004000000,
  
  async up(): Promise<void> {
    const client = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017');
    
    try {
      await client.connect();
      const db = client.db('daorsagro');

      // Create insurance_providers collection
      await db.createCollection('insurance_providers', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'description', 'contactInfo', 'coverageTypes', 'isActive'],
            properties: {
              name: {
                bsonType: 'string',
                description: 'Provider name is required'
              },
              description: {
                bsonType: 'string',
                description: 'Provider description is required'
              },
              website: { bsonType: 'string' },
              contactInfo: {
                bsonType: 'object',
                required: ['phone', 'email'],
                properties: {
                  agency: { bsonType: 'string' },
                  phone: { bsonType: 'string' },
                  email: { bsonType: 'string' },
                  website: { bsonType: 'string' },
                  address: {
                    bsonType: 'object',
                    properties: {
                      street: { bsonType: 'string' },
                      city: { bsonType: 'string' },
                      state: { bsonType: 'string' },
                      zipCode: { bsonType: 'string' },
                      country: { bsonType: 'string' }
                    }
                  }
                }
              },
              coverageTypes: {
                bsonType: 'array',
                items: { bsonType: 'string' },
                description: 'Coverage types are required'
              },
              isActive: {
                bsonType: 'bool',
                description: 'Active status is required'
              },
              rating: {
                bsonType: 'object',
                properties: {
                  amBest: { bsonType: 'string' },
                  moodys: { bsonType: 'string' },
                  standardPoors: { bsonType: 'string' },
                  fitch: { bsonType: 'string' }
                }
              },
              licenses: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  properties: {
                    state: { bsonType: 'string' },
                    licenseNumber: { bsonType: 'string' },
                    expiryDate: { bsonType: 'date' }
                  }
                }
              },
              specialties: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              }
            }
          }
        }
      });

      // Create indexes for insurance_providers
      await db.collection('insurance_providers').createIndexes([
        { key: { name: 1 } },
        { key: { isActive: 1 } },
        { key: { coverageTypes: 1 } },
        { key: { specialties: 1 } },
        { key: { 'contactInfo.email': 1 } },
        { key: { name: 'text', description: 'text', specialties: 'text' }, name: 'text_search' }
      ]);

      // Create insurance_policies collection
      await db.createCollection('insurance_policies', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['providerId', 'name', 'description', 'coverageType', 'premiumBase', 'deductible', 'maxCoverage'],
            properties: {
              providerId: {
                bsonType: 'string',
                description: 'Provider ID is required'
              },
              name: {
                bsonType: 'string',
                description: 'Policy name is required'
              },
              description: {
                bsonType: 'string',
                description: 'Policy description is required'
              },
              coverageType: {
                bsonType: 'string',
                enum: ['crop', 'livestock', 'property', 'liability', 'equipment', 'business_interruption', 'weather'],
                description: 'Coverage type is required'
              },
              premiumBase: {
                bsonType: 'number',
                minimum: 0,
                description: 'Premium base is required'
              },
              deductible: {
                bsonType: 'number',
                minimum: 0,
                description: 'Deductible is required'
              },
              maxCoverage: {
                bsonType: 'number',
                minimum: 0,
                description: 'Maximum coverage is required'
              },
              terms: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              exclusions: {
                bsonType: 'array',
                items: { bsonType: 'string' }
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
                  location: {
                    bsonType: 'array',
                    items: { bsonType: 'string' }
                  },
                  experience: {
                    bsonType: 'object',
                    properties: {
                      minYears: { bsonType: 'int' }
                    }
                  }
                }
              },
              riskFactors: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  properties: {
                    factor: { bsonType: 'string' },
                    multiplier: { bsonType: 'number' },
                    description: { bsonType: 'string' }
                  }
                }
              },
              isActive: { bsonType: 'bool' },
              effectiveDate: { bsonType: 'date' },
              expiryDate: { bsonType: 'date' }
            }
          }
        }
      });

      // Create indexes for insurance_policies
      await db.collection('insurance_policies').createIndexes([
        { key: { providerId: 1 } },
        { key: { name: 1 } },
        { key: { coverageType: 1 } },
        { key: { isActive: 1 } },
        { key: { effectiveDate: 1, expiryDate: 1 } },
        { key: { premiumBase: 1 } },
        { key: { maxCoverage: 1 } },
        { key: { 'eligibilityCriteria.cropTypes': 1 } },
        { key: { 'eligibilityCriteria.location': 1 } }
      ]);

      // Create insurance_quotes collection
      await db.createCollection('insurance_quotes', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['farmId', 'userId', 'providerId', 'policyId', 'coverageAmount', 'premium', 'deductible', 'status'],
            properties: {
              farmId: {
                bsonType: 'string',
                description: 'Farm ID is required'
              },
              userId: {
                bsonType: 'string',
                description: 'User ID is required'
              },
              providerId: {
                bsonType: 'string',
                description: 'Provider ID is required'
              },
              policyId: {
                bsonType: 'string',
                description: 'Policy ID is required'
              },
              coverageAmount: {
                bsonType: 'number',
                minimum: 0,
                description: 'Coverage amount is required'
              },
              premium: {
                bsonType: 'number',
                minimum: 0,
                description: 'Premium is required'
              },
              deductible: {
                bsonType: 'number',
                minimum: 0,
                description: 'Deductible is required'
              },
              quoteData: {
                bsonType: 'object',
                description: 'Quote calculation data'
              },
              validUntil: {
                bsonType: 'date',
                description: 'Quote validity date'
              },
              status: {
                bsonType: 'string',
                enum: ['pending', 'active', 'expired', 'accepted', 'declined'],
                description: 'Quote status is required'
              },
              riskAssessment: {
                bsonType: 'object',
                properties: {
                  riskScore: { bsonType: 'number' },
                  riskLevel: {
                    bsonType: 'string',
                    enum: ['low', 'medium', 'high', 'very_high']
                  },
                  factors: {
                    bsonType: 'array',
                    items: {
                      bsonType: 'object',
                      properties: {
                        factor: { bsonType: 'string' },
                        impact: { bsonType: 'string' },
                        score: { bsonType: 'number' }
                      }
                    }
                  }
                }
              },
              paymentTerms: {
                bsonType: 'object',
                properties: {
                  frequency: {
                    bsonType: 'string',
                    enum: ['monthly', 'quarterly', 'semi_annual', 'annual']
                  },
                  installments: { bsonType: 'int' },
                  firstPaymentDate: { bsonType: 'date' }
                }
              },
              notes: { bsonType: 'string' },
              agentId: { bsonType: 'string' },
              referenceNumber: { bsonType: 'string' }
            }
          }
        }
      });

      // Create indexes for insurance_quotes
      await db.collection('insurance_quotes').createIndexes([
        { key: { farmId: 1 } },
        { key: { userId: 1 } },
        { key: { providerId: 1 } },
        { key: { policyId: 1 } },
        { key: { status: 1 } },
        { key: { validUntil: 1 } },
        { key: { createdAt: -1 } },
        { key: { farmId: 1, status: 1 } },
        { key: { userId: 1, status: 1 } },
        { key: { referenceNumber: 1 } },
        { key: { agentId: 1 } }
      ]);

      // Create insurance_claims collection
      await db.createCollection('insurance_claims', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['farmId', 'userId', 'policyId', 'claimAmount', 'description', 'incidentDate', 'status'],
            properties: {
              farmId: {
                bsonType: 'string',
                description: 'Farm ID is required'
              },
              userId: {
                bsonType: 'string',
                description: 'User ID is required'
              },
              policyId: {
                bsonType: 'string',
                description: 'Policy ID is required'
              },
              providerId: { bsonType: 'string' },
              claimNumber: { bsonType: 'string' },
              claimAmount: {
                bsonType: 'number',
                minimum: 0,
                description: 'Claim amount is required'
              },
              approvedAmount: { bsonType: 'number' },
              paidAmount: { bsonType: 'number' },
              description: {
                bsonType: 'string',
                description: 'Claim description is required'
              },
              incidentDate: {
                bsonType: 'date',
                description: 'Incident date is required'
              },
              claimDate: { bsonType: 'date' },
              status: {
                bsonType: 'string',
                enum: ['draft', 'submitted', 'under_review', 'approved', 'denied', 'paid', 'closed'],
                description: 'Claim status is required'
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
              adjusterInfo: {
                bsonType: 'object',
                properties: {
                  name: { bsonType: 'string' },
                  phone: { bsonType: 'string' },
                  email: { bsonType: 'string' },
                  assignedDate: { bsonType: 'date' }
                }
              },
              incidentDetails: {
                bsonType: 'object',
                properties: {
                  cause: { bsonType: 'string' },
                  weather: { bsonType: 'string' },
                  location: {
                    bsonType: 'object',
                    properties: {
                      latitude: { bsonType: 'number' },
                      longitude: { bsonType: 'number' },
                      description: { bsonType: 'string' }
                    }
                  },
                  affectedArea: { bsonType: 'number' },
                  estimatedLoss: { bsonType: 'number' }
                }
              },
              denialReason: { bsonType: 'string' },
              notes: { bsonType: 'string' }
            }
          }
        }
      });

      // Create indexes for insurance_claims
      await db.collection('insurance_claims').createIndexes([
        { key: { farmId: 1 } },
        { key: { userId: 1 } },
        { key: { policyId: 1 } },
        { key: { providerId: 1 } },
        { key: { claimNumber: 1 }, unique: true, sparse: true },
        { key: { status: 1 } },
        { key: { incidentDate: -1 } },
        { key: { claimDate: -1 } },
        { key: { farmId: 1, status: 1 } },
        { key: { userId: 1, status: 1 } },
        { key: { createdAt: -1 } }
      ]);

      // Create insurance_policies_active collection (for active policies)
      await db.createCollection('insurance_policies_active', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['farmId', 'userId', 'providerId', 'policyId', 'quoteId', 'coverageAmount', 'premium', 'status'],
            properties: {
              farmId: { bsonType: 'string' },
              userId: { bsonType: 'string' },
              providerId: { bsonType: 'string' },
              policyId: { bsonType: 'string' },
              quoteId: { bsonType: 'string' },
              policyNumber: { bsonType: 'string' },
              coverageAmount: { bsonType: 'number' },
              premium: { bsonType: 'number' },
              deductible: { bsonType: 'number' },
              status: {
                bsonType: 'string',
                enum: ['active', 'suspended', 'cancelled', 'expired']
              },
              effectiveDate: { bsonType: 'date' },
              expiryDate: { bsonType: 'date' },
              renewalDate: { bsonType: 'date' },
              paymentSchedule: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  properties: {
                    dueDate: { bsonType: 'date' },
                    amount: { bsonType: 'number' },
                    status: {
                      bsonType: 'string',
                      enum: ['pending', 'paid', 'overdue', 'cancelled']
                    },
                    paidDate: { bsonType: 'date' }
                  }
                }
              },
              beneficiaries: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  properties: {
                    name: { bsonType: 'string' },
                    relationship: { bsonType: 'string' },
                    percentage: { bsonType: 'number' }
                  }
                }
              },
              modifications: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  properties: {
                    date: { bsonType: 'date' },
                    type: { bsonType: 'string' },
                    description: { bsonType: 'string' },
                    oldValue: { bsonType: 'string' },
                    newValue: { bsonType: 'string' }
                  }
                }
              }
            }
          }
        }
      });

      // Create indexes for insurance_policies_active
      await db.collection('insurance_policies_active').createIndexes([
        { key: { farmId: 1 } },
        { key: { userId: 1 } },
        { key: { providerId: 1 } },
        { key: { policyNumber: 1 }, unique: true, sparse: true },
        { key: { status: 1 } },
        { key: { expiryDate: 1 } },
        { key: { renewalDate: 1 } },
        { key: { effectiveDate: 1 } },
        { key: { farmId: 1, status: 1 } }
      ]);

      // Create insurance_agents collection
      await db.createCollection('insurance_agents', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'email', 'phone', 'providerId', 'isActive'],
            properties: {
              name: { bsonType: 'string' },
              email: { bsonType: 'string' },
              phone: { bsonType: 'string' },
              providerId: { bsonType: 'string' },
              licenseNumber: { bsonType: 'string' },
              specialties: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              territories: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              },
              isActive: { bsonType: 'bool' },
              rating: { bsonType: 'number' },
              reviewCount: { bsonType: 'int' }
            }
          }
        }
      });

      // Create indexes for insurance_agents
      await db.collection('insurance_agents').createIndexes([
        { key: { providerId: 1 } },
        { key: { email: 1 } },
        { key: { licenseNumber: 1 } },
        { key: { specialties: 1 } },
        { key: { territories: 1 } },
        { key: { isActive: 1 } },
        { key: { rating: -1 } }
      ]);

      console.log('✅ Insurance collections created successfully');
    } catch (error) {
      console.error('❌ Error creating insurance collections:', error);
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
        'insurance_providers',
        'insurance_policies',
        'insurance_quotes',
        'insurance_claims',
        'insurance_policies_active',
        'insurance_agents'
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

      console.log('✅ Insurance collections dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping insurance collections:', error);
      throw error;
    } finally {
      await client.close();
    }
  }
};