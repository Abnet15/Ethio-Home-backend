require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const axios = require('axios');
const bcrypt = require('bcryptjs');

// Import all models
const User = require('../models/userModel');
const Property = require('../models/propertyModel');
const InterestForm = require('../models/InterestFormModel');
const Review = require('../models/reviewModel');
const Selling = require('../models/sellingModel');
const Message = require('../models/messageModel');
const Contact = require('../models/contactModel');
const Notification = require('../models/notificationModel');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const PredefinedPlan = require('../models/PredefinedPlan');
const FAQ = require('../models/faqModel');
const Department = require('../models/departmentModel');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
// Try local MongoDB first, then fallback to DATABASE from env
const DB_URI = process.env.MONGODB_URI || process.env.DATABASE || 'mongodb://localhost:27017/ethiohome';

// Test data generators
const generateRandomString = (length = 10) => {
  return Math.random().toString(36).substring(2, length + 2);
};

const generateEmail = (index) => {
  return `testuser${index}@example.com`;
};

const generatePhone = (index) => {
  const phones = ['0912345678', '0923456789', '0934567890', '0945678901', '0956789012'];
  return phones[index % phones.length];
};

const generateEthiopianLocation = () => {
  const locations = [
    'Addis Ababa, Bole', 'Addis Ababa, CMC', 'Addis Ababa, Piassa',
    'Addis Ababa, Meskel Square', 'Addis Ababa, Arat Kilo',
    'Bahir Dar', 'Gondar', 'Hawassa', 'Dire Dawa', 'Mekelle'
  ];
  return locations[Math.floor(Math.random() * locations.length)];
};

const propertyTypes = ['house', 'apartment', 'villa', 'land', 'commercial'];
const propertyStatuses = ['for-sale', 'for-rent'];
const currencies = ['ETB', 'USD'];
const roles = ['buyer', 'seller', 'agent', 'admin', 'employee'];
const interestStatuses = ['pending', 'contacted', 'schedule', 'visited', 'rejected'];
const reviewTypes = ['property', 'website_service'];
const notificationTypes = ['contact_response', 'property_approved', 'property_rejected', 'message_received', 'subscription_expired', 'payment_success', 'general'];
const intervals = ['weekly', 'monthly', '3-monthly', '6-monthly', 'annually'];
const inquiryTypes = ['general', 'property', 'technical', 'billing', 'sales', 'support', 'partnership', 'other'];
const faqCategories = ['property', 'process', 'financing', 'account', 'search', 'technical', 'billing', 'general'];

// Test results
const testResults = {
  backend: { connected: false, endpoints: [] },
  frontend: { connected: false },
  models: {},
  errors: []
};

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    testResults.errors.push(`Database connection: ${error.message}`);
    return false;
  }
}

// Test backend API
async function testBackendAPI() {
  console.log('\n🔍 Testing Backend API...');
  const endpoints = [
    { method: 'GET', path: '/users', auth: false },
    { method: 'GET', path: '/properties', auth: false },
    { method: 'GET', path: '/reviews', auth: false },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.path}`,
        timeout: 5000
      });
      console.log(`✅ ${endpoint.method} ${endpoint.path} - Status: ${response.status}`);
      testResults.backend.endpoints.push({
        method: endpoint.method,
        path: endpoint.path,
        status: response.status,
        success: true
      });
    } catch (error) {
      const status = error.response?.status || 'Connection Failed';
      console.log(`⚠️  ${endpoint.method} ${endpoint.path} - Status: ${status}`);
      testResults.backend.endpoints.push({
        method: endpoint.method,
        path: endpoint.path,
        status: status,
        success: false,
        error: error.message
      });
    }
  }
  testResults.backend.connected = true;
}

// Create Users
async function createUsers(count = 30) {
  console.log(`\n👥 Creating ${count} users...`);
  const users = [];
  
  for (let i = 1; i <= count; i++) {
    try {
      const hashedPassword = await bcrypt.hash('Test1234!', 12);
      const user = new User({
        name: `Test User ${i}`,
        email: generateEmail(i),
        phone: generatePhone(i),
        password: hashedPassword,
        passwordConfirm: 'Test1234!',
        role: roles[i % roles.length],
        location: generateEthiopianLocation(),
        city: 'Addis Ababa',
        state: 'Addis Ababa',
        isVerified: i % 3 !== 0, // Some unverified users
        active: true
      });
      
      await user.save();
      users.push(user);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} users`);
    } catch (error) {
      if (error.code !== 11000) { // Skip duplicate key errors
        console.error(`  Error creating user ${i}:`, error.message);
        testResults.errors.push(`User ${i}: ${error.message}`);
      }
    }
  }
  
  testResults.models.users = { created: users.length, total: count };
  console.log(`✅ Created ${users.length} users`);
  return users;
}

// Create Properties
async function createProperties(count = 30, owners) {
  console.log(`\n🏠 Creating ${count} properties...`);
  const properties = [];
  const sellerOwners = owners.filter(u => ['seller', 'agent', 'admin'].includes(u.role));
  
  if (sellerOwners.length === 0) {
    console.log('⚠️  No seller users found, skipping properties');
    return [];
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      const owner = sellerOwners[i % sellerOwners.length];
      const property = new Property({
        title: `Beautiful ${propertyTypes[i % propertyTypes.length]} in ${generateEthiopianLocation()}`,
        description: `This is a wonderful property ${i} with great features and amenities. Located in a prime area with easy access to transportation and shopping centers.`,
        price: Math.floor(Math.random() * 5000000) + 500000,
        currency: currencies[i % currencies.length],
        priceDiscount: Math.floor(Math.random() * 200000) + 50000,
        location: generateEthiopianLocation(),
        type: propertyTypes[i % propertyTypes.length],
        status: propertyStatuses[i % propertyStatuses.length],
        features: {
          bedrooms: Math.floor(Math.random() * 5) + 1,
          bathrooms: Math.floor(Math.random() * 3) + 1,
          area: Math.floor(Math.random() * 500) + 50,
          parking: i % 2 === 0,
          furnished: i % 3 === 0,
          yearBuilt: 2000 + Math.floor(Math.random() * 24)
        },
        images: [
          `https://images.unsplash.com/photo-${1500000000000 + i}?w=800`,
          `https://images.unsplash.com/photo-${1500000000001 + i}?w=800`
        ],
        owner: owner._id,
        isVerified: i % 2 === 0,
        sold: i % 10 === 0
      });
      
      await property.save();
      properties.push(property);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} properties`);
    } catch (error) {
      console.error(`  Error creating property ${i}:`, error.message);
      testResults.errors.push(`Property ${i}: ${error.message}`);
    }
  }
  
  testResults.models.properties = { created: properties.length, total: count };
  console.log(`✅ Created ${properties.length} properties`);
  return properties;
}

// Create Interest Forms
async function createInterestForms(count = 30, buyers, properties) {
  console.log(`\n💼 Creating ${count} interest forms...`);
  const interests = [];
  const buyerUsers = buyers.filter(u => u.role === 'buyer');
  
  if (buyerUsers.length === 0 || properties.length === 0) {
    console.log('⚠️  No buyers or properties found, skipping interest forms');
    return [];
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      const buyer = buyerUsers[i % buyerUsers.length];
      const property = properties[i % properties.length];
      
      const interest = new InterestForm({
        buyerId: buyer._id,
        propertyId: property._id,
        contactInfo: {
          name: buyer.name,
          phone: buyer.phone,
          email: buyer.email
        },
        message: `I am very interested in this property ${i}. Please contact me as soon as possible.`,
        status: interestStatuses[i % interestStatuses.length],
        visitScheduled: i % 3 === 0,
        visitDate: i % 3 === 0 ? new Date(Date.now() + i * 86400000) : undefined
      });
      
      await interest.save();
      interests.push(interest);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} interest forms`);
    } catch (error) {
      console.error(`  Error creating interest form ${i}:`, error.message);
      testResults.errors.push(`Interest ${i}: ${error.message}`);
    }
  }
  
  testResults.models.interests = { created: interests.length, total: count };
  console.log(`✅ Created ${interests.length} interest forms`);
  return interests;
}

// Create Reviews
async function createReviews(count = 30, buyers, properties) {
  console.log(`\n⭐ Creating ${count} reviews...`);
  const reviews = [];
  const buyerUsers = buyers.filter(u => u.role === 'buyer');
  
  if (buyerUsers.length === 0) {
    console.log('⚠️  No buyers found, skipping reviews');
    return [];
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      const buyer = buyerUsers[i % buyerUsers.length];
      const reviewType = reviewTypes[i % reviewTypes.length];
      
      const review = new Review({
        review: `This is review number ${i}. ${reviewType === 'property' ? 'The property was excellent!' : 'The website service was great!'}`,
        rating: Math.floor(Math.random() * 4) + 1, // 1-5
        reviewType: reviewType,
        property: reviewType === 'property' && properties.length > 0 ? properties[i % properties.length]._id : undefined,
        buyer: buyer._id,
        title: `Review Title ${i}`,
        location: generateEthiopianLocation(),
        isVerified: i % 2 === 0,
        status: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'pending' : 'rejected'
      });
      
      await review.save();
      reviews.push(review);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} reviews`);
    } catch (error) {
      console.error(`  Error creating review ${i}:`, error.message);
      testResults.errors.push(`Review ${i}: ${error.message}`);
    }
  }
  
  testResults.models.reviews = { created: reviews.length, total: count };
  console.log(`✅ Created ${reviews.length} reviews`);
  return reviews;
}

// Create Sellings
async function createSellings(count = 30, buyers, properties) {
  console.log(`\n💰 Creating ${count} sellings...`);
  const sellings = [];
  const buyerUsers = buyers.filter(u => u.role === 'buyer');
  
  if (buyerUsers.length === 0 || properties.length === 0) {
    console.log('⚠️  No buyers or properties found, skipping sellings');
    return [];
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      const buyer = buyerUsers[i % buyerUsers.length];
      const property = properties[i % properties.length];
      
      const selling = new Selling({
        property: property._id,
        buyer: buyer._id,
        amount: property.price,
        currency: property.currency,
        chapa_charge: property.price * 0.02,
        tx_ref: `TXN-${Date.now()}-${i}`,
        payment_method: 'chapa',
        paid: i % 5 !== 0 // Most are paid
      });
      
      await selling.save();
      sellings.push(selling);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} sellings`);
    } catch (error) {
      console.error(`  Error creating selling ${i}:`, error.message);
      testResults.errors.push(`Selling ${i}: ${error.message}`);
    }
  }
  
  testResults.models.sellings = { created: sellings.length, total: count };
  console.log(`✅ Created ${sellings.length} sellings`);
  return sellings;
}

// Create Messages
async function createMessages(count = 30, users) {
  console.log(`\n💬 Creating ${count} messages...`);
  const messages = [];
  
  if (users.length < 2) {
    console.log('⚠️  Need at least 2 users for messages, skipping');
    return [];
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      const sender = users[i % users.length];
      const recipient = users[(i + 1) % users.length];
      
      const message = new Message({
        sender: sender._id,
        recipient: recipient._id,
        subject: `Message Subject ${i}`,
        content: `This is message content ${i}. It contains important information about the property or inquiry.`,
        messageType: ['inquiry', 'support', 'general', 'property', 'system'][i % 5],
        priority: ['low', 'medium', 'high', 'urgent'][i % 4],
        isRead: i % 3 === 0,
        isArchived: i % 5 === 0,
        readAt: i % 3 === 0 ? new Date() : null
      });
      
      await message.save();
      messages.push(message);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} messages`);
    } catch (error) {
      console.error(`  Error creating message ${i}:`, error.message);
      testResults.errors.push(`Message ${i}: ${error.message}`);
    }
  }
  
  testResults.models.messages = { created: messages.length, total: count };
  console.log(`✅ Created ${messages.length} messages`);
  return messages;
}

// Create Contacts
async function createContacts(count = 30, users) {
  console.log(`\n📧 Creating ${count} contacts...`);
  const contacts = [];
  
  for (let i = 1; i <= count; i++) {
    try {
      const sender = users.length > 0 ? users[i % users.length] : null;
      
      const contact = new Contact({
        name: `Contact User ${i}`,
        email: `contact${i}@example.com`,
        phone: generatePhone(i),
        subject: `Contact Subject ${i}`,
        message: `This is contact message ${i}. I need help with something important.`,
        inquiryType: inquiryTypes[i % inquiryTypes.length],
        status: ['new', 'in-progress', 'resolved', 'closed'][i % 4],
        priority: ['low', 'medium', 'high', 'urgent'][i % 4],
        sender: sender ? sender._id : undefined
      });
      
      await contact.save();
      contacts.push(contact);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} contacts`);
    } catch (error) {
      console.error(`  Error creating contact ${i}:`, error.message);
      testResults.errors.push(`Contact ${i}: ${error.message}`);
    }
  }
  
  testResults.models.contacts = { created: contacts.length, total: count };
  console.log(`✅ Created ${contacts.length} contacts`);
  return contacts;
}

// Create Notifications
async function createNotifications(count = 30, users, properties, contacts) {
  console.log(`\n🔔 Creating ${count} notifications...`);
  const notifications = [];
  
  if (users.length === 0) {
    console.log('⚠️  No users found, skipping notifications');
    return [];
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      const recipient = users[i % users.length];
      const sender = users.length > 1 ? users[(i + 1) % users.length] : null;
      
      const notification = new Notification({
        recipient: recipient._id,
        type: notificationTypes[i % notificationTypes.length],
        title: `Notification Title ${i}`,
        message: `This is notification message ${i}. Important information here.`,
        relatedProperty: properties.length > 0 && i % 3 === 0 ? properties[i % properties.length]._id : undefined,
        relatedContact: contacts.length > 0 && i % 4 === 0 ? contacts[i % contacts.length]._id : undefined,
        sender: sender ? sender._id : undefined,
        isRead: i % 2 === 0,
        priority: ['low', 'medium', 'high', 'urgent'][i % 4]
      });
      
      await notification.save();
      notifications.push(notification);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} notifications`);
    } catch (error) {
      console.error(`  Error creating notification ${i}:`, error.message);
      testResults.errors.push(`Notification ${i}: ${error.message}`);
    }
  }
  
  testResults.models.notifications = { created: notifications.length, total: count };
  console.log(`✅ Created ${notifications.length} notifications`);
  return notifications;
}

// Create Subscription Plans
async function createSubscriptionPlans(count = 30, sellers) {
  console.log(`\n💳 Creating ${count} subscription plans...`);
  const plans = [];
  const sellerUsers = sellers.filter(u => ['seller', 'agent'].includes(u.role));
  
  if (sellerUsers.length === 0) {
    console.log('⚠️  No sellers found, skipping subscription plans');
    return [];
  }
  
  for (let i = 1; i <= count; i++) {
    try {
      const seller = sellerUsers[i % sellerUsers.length];
      
      const plan = new SubscriptionPlan({
        seller: seller._id,
        interval: intervals[i % intervals.length],
        amount: Math.floor(Math.random() * 50000) + 1000,
        currency: currencies[i % currencies.length],
        tx_ref: [`TXN-SUB-${Date.now()}-${i}`],
        frequency: Math.floor(Math.random() * 12) + 1,
        paymentDate: [new Date()],
        maxProperties: Math.floor(Math.random() * 50) + 10,
        active: i % 10 !== 0
      });
      
      await plan.save();
      plans.push(plan);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} subscription plans`);
    } catch (error) {
      console.error(`  Error creating subscription plan ${i}:`, error.message);
      testResults.errors.push(`SubscriptionPlan ${i}: ${error.message}`);
    }
  }
  
  testResults.models.subscriptionPlans = { created: plans.length, total: count };
  console.log(`✅ Created ${plans.length} subscription plans`);
  return plans;
}

// Create Predefined Plans
async function createPredefinedPlans(count = 30) {
  console.log(`\n📋 Creating ${count} predefined plans...`);
  const plans = [];
  
  for (let i = 1; i <= count; i++) {
    try {
      const plan = new PredefinedPlan({
        name: `Plan ${i} - ${intervals[i % intervals.length]}`,
        interval: intervals[i % intervals.length],
        amount: Math.floor(Math.random() * 50000) + 1000,
        frequency: Math.floor(Math.random() * 12) + 1,
        currency: currencies[i % currencies.length],
        description: `This is predefined plan ${i} description with great features.`,
        features: [
          `Feature ${i}-1`,
          `Feature ${i}-2`,
          `Feature ${i}-3`
        ],
        maxProperties: Math.floor(Math.random() * 50) + 10,
        isActive: i % 10 !== 0
      });
      
      await plan.save();
      plans.push(plan);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} predefined plans`);
    } catch (error) {
      console.error(`  Error creating predefined plan ${i}:`, error.message);
      testResults.errors.push(`PredefinedPlan ${i}: ${error.message}`);
    }
  }
  
  testResults.models.predefinedPlans = { created: plans.length, total: count };
  console.log(`✅ Created ${plans.length} predefined plans`);
  return plans;
}

// Create FAQs
async function createFAQs(count = 30) {
  console.log(`\n❓ Creating ${count} FAQs...`);
  const faqs = [];
  
  for (let i = 1; i <= count; i++) {
    try {
      const faq = new FAQ({
        id: `faq-${i}`,
        question: `FAQ Question ${i}: How do I ${generateRandomString(10)}?`,
        answer: `This is the answer to FAQ ${i}. It provides detailed information about the question.`,
        category: faqCategories[i % faqCategories.length],
        isActive: i % 10 !== 0,
        order: i,
        tags: [`tag${i}`, `category${i % 5}`],
        viewCount: Math.floor(Math.random() * 1000),
        helpful: Math.floor(Math.random() * 100),
        notHelpful: Math.floor(Math.random() * 20)
      });
      
      await faq.save();
      faqs.push(faq);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} FAQs`);
    } catch (error) {
      if (error.code !== 11000) { // Skip duplicate key errors
        console.error(`  Error creating FAQ ${i}:`, error.message);
        testResults.errors.push(`FAQ ${i}: ${error.message}`);
      }
    }
  }
  
  testResults.models.faqs = { created: faqs.length, total: count };
  console.log(`✅ Created ${faqs.length} FAQs`);
  return faqs;
}

// Create Departments
async function createDepartments(count = 30) {
  console.log(`\n🏢 Creating ${count} departments...`);
  const departments = [];
  
  const departmentNames = [
    'Sales', 'Support', 'Technical', 'Billing', 'Property Management',
    'Customer Service', 'Marketing', 'Legal', 'Finance', 'Operations'
  ];
  
  for (let i = 1; i <= count; i++) {
    try {
      const deptName = departmentNames[i % departmentNames.length];
      const dept = new Department({
        id: `dept-${i}`,
        icon: `icon-${i}`,
        title: `${deptName} Department ${i}`,
        description: `This is the ${deptName} department description ${i}.`,
        contact: `contact${i}@example.com`,
        phone: generatePhone(i),
        email: `dept${i}@example.com`,
        isActive: i % 10 !== 0,
        order: i
      });
      
      await dept.save();
      departments.push(dept);
      if (i % 10 === 0) console.log(`  Created ${i}/${count} departments`);
    } catch (error) {
      if (error.code !== 11000) { // Skip duplicate key errors
        console.error(`  Error creating department ${i}:`, error.message);
        testResults.errors.push(`Department ${i}: ${error.message}`);
      }
    }
  }
  
  testResults.models.departments = { created: departments.length, total: count };
  console.log(`✅ Created ${departments.length} departments`);
  return departments;
}

// Main execution
async function main() {
  console.log('🚀 Starting Test and Population Script...\n');
  console.log('='.repeat(60));
  
  // Connect to database
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.log('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Test backend API
  await testBackendAPI();
  
  // Create all documents
  console.log('\n📦 Creating test data...');
  console.log('='.repeat(60));
  
  const users = await createUsers(30);
  const properties = await createProperties(30, users);
  const interests = await createInterestForms(30, users, properties);
  const reviews = await createReviews(30, users, properties);
  const sellings = await createSellings(30, users, properties);
  const messages = await createMessages(30, users);
  const contacts = await createContacts(30, users);
  const notifications = await createNotifications(30, users, properties, contacts);
  const subscriptionPlans = await createSubscriptionPlans(30, users);
  const predefinedPlans = await createPredefinedPlans(30);
  const faqs = await createFAQs(30);
  const departments = await createDepartments(30);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log('\n✅ Backend Status:', testResults.backend.connected ? 'Connected' : 'Not Connected');
  console.log('\n📈 Documents Created:');
  Object.entries(testResults.models).forEach(([model, data]) => {
    console.log(`  ${model}: ${data.created}/${data.total}`);
  });
  
  if (testResults.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    testResults.errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
    if (testResults.errors.length > 10) {
      console.log(`  ... and ${testResults.errors.length - 10} more errors`);
    }
  }
  
  console.log('\n✅ Script completed!');
  await mongoose.connection.close();
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

