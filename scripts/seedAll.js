const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/userModel');
const Property = require('../models/propertyModel');
const Message = require('../models/messageModel');
const Notification = require('../models/notificationModel');
const Review = require('../models/reviewModel');
const Contact = require('../models/contactModel');
const Department = require('../models/departmentModel');
const FAQ = require('../models/faqModel');
const InterestForm = require('../models/InterestFormModel');
const Selling = require('../models/sellingModel');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const PredefinedPlan = require('../models/PredefinedPlan');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ethiohome';

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB at', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to MongoDB!');

    // 1. SEED 10 USERS
    console.log('--- Seeding Users ---');
    const existingUsers = await User.find();
    let users = [];
    if (existingUsers.length < 10) {
      await User.deleteMany({});
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const userSeeds = [
        { name: 'Abnet Sisay', email: 'abnet@ethiohome.com', role: 'admin', phone: '+251911223344', location: 'Addis Ababa', address: 'Bole Medhanealem', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Dawit Bekele', email: 'dawit@ethiohome.com', role: 'agent', phone: '+251911234567', location: 'Addis Ababa', address: 'Kazanchis', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Bethlehem Tadesse', email: 'bethlehem@ethiohome.com', role: 'seller', phone: '+251911345678', location: 'Addis Ababa', address: 'CMC', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Yohannes Haile', email: 'yohannes@ethiohome.com', role: 'buyer', phone: '+251911456789', location: 'Addis Ababa', address: 'Old Airport', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Almaz Tefera', email: 'almaz@ethiohome.com', role: 'employee', phone: '+251911567890', location: 'Addis Ababa', address: 'Sarbet', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Kassahun Melaku', email: 'kassahun@ethiohome.com', role: 'seller', phone: '+251911678901', location: 'Addis Ababa', address: 'Gerji', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Selamawit Kebede', email: 'selamawit@ethiohome.com', role: 'agent', phone: '+251911789012', location: 'Addis Ababa', address: 'Ayat', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Mulugeta Assefa', email: 'mulugeta@ethiohome.com', role: 'buyer', phone: '+251911890123', location: 'Addis Ababa', address: 'Gotera', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Tigist Worku', email: 'tigist@ethiohome.com', role: 'buyer', phone: '+251911901234', location: 'Addis Ababa', address: 'Summit', city: 'Addis Ababa', state: 'Addis Ababa' },
        { name: 'Ephrem Girma', email: 'ephrem@ethiohome.com', role: 'seller', phone: '+251911012345', location: 'Addis Ababa', address: 'Bole Atlas', city: 'Addis Ababa', state: 'Addis Ababa' },
      ];

      for (const u of userSeeds) {
        const created = await User.create({
          ...u,
          password: hashedPassword,
          passwordConfirm: hashedPassword,
          isVerified: true
        });
        users.push(created);
      }
      console.log(`Created ${users.length} Users`);
    } else {
      users = existingUsers;
      console.log(`Found ${users.length} existing Users`);
    }

    const adminUser = users.find(u => u.role === 'admin') || users[0];
    const sellerUser = users.find(u => u.role === 'seller') || users[2];
    const buyerUser = users.find(u => u.role === 'buyer') || users[3];
    const agentUser = users.find(u => u.role === 'agent') || users[1];

    // 2. SEED 10 PROPERTIES
    console.log('--- Seeding Properties ---');
    await Property.deleteMany({});
    const propertySeeds = [
      {
        title: 'Luxury 3-Bedroom Apartment in Bole Atlas',
        description: 'Immaculately finished modern apartment with high-end fixtures, panoramic Addis skyline views, underground parking, and 24/7 security backup generator.',
        price: 18500000,
        currency: 'ETB',
        location: 'Bole',
        type: 'apartment',
        status: 'for-sale',
        features: { bedrooms: 3, bathrooms: 3, area: 185, parking: true, furnished: true, yearBuilt: 2023 },
        images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Modern Executive Villa in Old Airport',
        description: 'Spacious compound villa surrounded by lush gardens, diplomatic quarter security, separate maid quarters, and premium European finishes.',
        price: 65000000,
        currency: 'ETB',
        location: 'Old Airport',
        type: 'villa',
        status: 'for-sale',
        features: { bedrooms: 5, bathrooms: 5, area: 520, parking: true, furnished: false, yearBuilt: 2022 },
        images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Contemporary 2-Bedroom Condo in Kazanchis',
        description: 'Prime central location walking distance to UNECA and financial district. Ideal for professionals and diaspora investment with strong rental yields.',
        price: 75000,
        currency: 'ETB',
        location: 'Kazanchis',
        type: 'apartment',
        status: 'for-rent',
        features: { bedrooms: 2, bathrooms: 2, area: 110, parking: true, furnished: true, yearBuilt: 2024 },
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Elegant Family Residence in CMC Sunrise',
        description: 'Peaceful residential living with G+2 architectural design, high-speed fiber internet, solar backup system, and modern open-plan kitchen.',
        price: 32000000,
        currency: 'ETB',
        location: 'CMC',
        type: 'house',
        status: 'for-sale',
        features: { bedrooms: 4, bathrooms: 4, area: 310, parking: true, furnished: false, yearBuilt: 2021 },
        images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Commercial Office Space in Bole Medhanealem',
        description: 'Floor 4 open commercial space suitable for tech firms, NGOs, and corporate headquarters. High-traffic prominent avenue frontage.',
        price: 240000,
        currency: 'ETB',
        location: 'Bole',
        type: 'commercial',
        status: 'for-rent',
        features: { bedrooms: 0, bathrooms: 4, area: 350, parking: true, furnished: false, yearBuilt: 2023 },
        images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Charming 3-Bedroom Villa in Sarbet',
        description: 'Classic stone and hardwood villa near International Community School with generous garden and covered terrace.',
        price: 42000000,
        currency: 'ETB',
        location: 'Sarbet',
        type: 'villa',
        status: 'for-sale',
        features: { bedrooms: 3, bathrooms: 3, area: 280, parking: true, furnished: false, yearBuilt: 2020 },
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Penthouse Apartment with Terrace in Gerji',
        description: 'Top-floor penthouse featuring rooftop terrace, private elevator access, sauna room, and premium marble flooring throughout.',
        price: 28000000,
        currency: 'ETB',
        location: 'Gerji',
        type: 'apartment',
        status: 'for-sale',
        features: { bedrooms: 4, bathrooms: 4, area: 245, parking: true, furnished: true, yearBuilt: 2024 },
        images: ['https://images.unsplash.com/photo-1502005229762-ee1b2b8100ff?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Spacious Townhouse in Ayat Zone 3',
        description: 'Newly completed townhouse in gated secure community. Proximity to LRT train station and top private schools.',
        price: 19500000,
        currency: 'ETB',
        location: 'Ayat',
        type: 'house',
        status: 'for-sale',
        features: { bedrooms: 3, bathrooms: 2, area: 190, parking: true, furnished: false, yearBuilt: 2023 },
        images: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Fully Furnished Studio in Bole Brass',
        description: 'Turnkey luxury studio apartment catering to expat consultants and business visitors. Includes weekly housekeeping and utilities.',
        price: 45000,
        currency: 'ETB',
        location: 'Bole',
        type: 'apartment',
        status: 'for-rent',
        features: { bedrooms: 1, bathrooms: 1, area: 55, parking: true, furnished: true, yearBuilt: 2024 },
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
      {
        title: 'Prime Commercial Plot & Showroom in Gotera',
        description: 'Direct highway exposure in Gotera industrial-commercial corridor with ample client parking and multi-truck loading docks.',
        price: 88000000,
        currency: 'ETB',
        location: 'Gotera',
        type: 'commercial',
        status: 'for-sale',
        features: { bedrooms: 0, bathrooms: 6, area: 850, parking: true, furnished: false, yearBuilt: 2022 },
        images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'],
        owner: sellerUser._id,
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminUser._id,
      },
    ];

    const properties = await Property.create(propertySeeds);
    console.log(`Created ${properties.length} Properties`);

    // 3. SEED 10 MESSAGES
    console.log('--- Seeding Messages ---');
    await Message.deleteMany({});
    const messageSeeds = [
      { sender: buyerUser._id, recipient: sellerUser._id, subject: 'Inquiry regarding Bole Atlas Apartment', content: 'Hello, I reviewed the inspection report and would like to schedule an in-person viewing this Saturday at 2:00 PM.', messageType: 'property', priority: 'high', relatedProperty: properties[0]._id },
      { sender: sellerUser._id, recipient: buyerUser._id, subject: 'Re: Inquiry regarding Bole Atlas Apartment', content: 'Saturday at 2:00 PM works perfectly. Our on-site agent will meet you at the main gate.', messageType: 'property', priority: 'medium', relatedProperty: properties[0]._id },
      { sender: buyerUser._id, recipient: adminUser._id, subject: 'Escrow Account Verification Support', content: 'Can you please confirm the official escrow account details for transaction security compliance?', messageType: 'support', priority: 'urgent' },
      { sender: adminUser._id, recipient: buyerUser._id, subject: 'Re: Escrow Account Verification Support', content: 'Official escrow account verification instructions have been dispatched to your registered email.', messageType: 'support', priority: 'high' },
      { sender: agentUser._id, recipient: sellerUser._id, subject: 'New Tour Request for Old Airport Villa', content: 'We have received an accredited diaspora buyer expressing keen interest in the Old Airport villa.', messageType: 'property', priority: 'medium', relatedProperty: properties[1]._id },
      { sender: buyerUser._id, recipient: sellerUser._id, subject: 'Kazanchis Rental Lease Terms', content: 'Are utility bills and backup generator fuel charges included in the monthly rent quote?', messageType: 'property', priority: 'low', relatedProperty: properties[2]._id },
      { sender: sellerUser._id, recipient: buyerUser._id, subject: 'Re: Kazanchis Rental Lease Terms', content: 'Generator maintenance is covered by building management. Power and water are metered independently.', messageType: 'property', priority: 'medium', relatedProperty: properties[2]._id },
      { sender: agentUser._id, recipient: adminUser._id, subject: 'Property Verification Request for CMC Residence', content: 'Forensic title documents for the CMC sunrise house have been uploaded for clearance inspection.', messageType: 'general', priority: 'high', relatedProperty: properties[3]._id },
      { sender: adminUser._id, recipient: agentUser._id, subject: 'CMC Property Inspection Approved', content: 'Title deed and municipal registry validation completed with zero encumbrances.', messageType: 'system', priority: 'medium', relatedProperty: properties[3]._id },
      { sender: buyerUser._id, recipient: agentUser._id, subject: 'Commercial Showroom Zoning Details', content: 'Could you share the commercial classification certificate for the Gotera property?', messageType: 'property', priority: 'medium', relatedProperty: properties[9]._id },
    ];
    await Message.create(messageSeeds);
    console.log(`Created ${messageSeeds.length} Messages`);

    // 4. SEED 10 NOTIFICATIONS
    console.log('--- Seeding Notifications ---');
    await Notification.deleteMany({});
    const notificationSeeds = [
      { recipient: adminUser._id, type: 'property_approved', title: 'Property Approved', message: 'Luxury 3-Bedroom Apartment in Bole Atlas has been verified.', priority: 'medium', relatedProperty: properties[0]._id },
      { recipient: buyerUser._id, type: 'message_received', title: 'New Message Received', message: 'Bethlehem Tadesse replied to your property inquiry.', priority: 'high' },
      { recipient: sellerUser._id, type: 'interest_received', title: 'New Tour Booking', message: 'Yohannes Haile scheduled a visit for Saturday.', priority: 'medium', relatedProperty: properties[0]._id },
      { recipient: adminUser._id, type: 'payment_success', title: 'Subscription Payment Received', message: 'Agent Selamawit renewed Pro Agent Monthly Subscription.', priority: 'low' },
      { recipient: buyerUser._id, type: 'general', title: 'Price Drop Alert', message: 'A verified villa in Old Airport dropped by 2,000,000 ETB.', priority: 'medium' },
      { recipient: sellerUser._id, type: 'property_approved', title: 'Inspection Complete', message: 'Your CMC property passed on-site audit with grade A.', priority: 'medium', relatedProperty: properties[3]._id },
      { recipient: agentUser._id, type: 'contact_response', title: 'Support Ticket Closed', message: 'Your inquiry regarding API mapping has been answered.', priority: 'low' },
      { recipient: adminUser._id, type: 'general', title: 'System Security Report', message: 'All escrow contracts verified with zero pending anomalies.', priority: 'low' },
      { recipient: buyerUser._id, type: 'payment_success', title: 'Deposit Confirmed', message: 'Your escrow earnest deposit is safely in custody.', priority: 'urgent' },
      { recipient: sellerUser._id, type: 'message_received', title: 'Offer Received', message: 'You have a formal offer on Bole Atlas apartment.', priority: 'urgent', relatedProperty: properties[0]._id },
    ];
    await Notification.create(notificationSeeds);
    console.log(`Created ${notificationSeeds.length} Notifications`);

    // 5. SEED 10 REVIEWS
    console.log('--- Seeding Reviews ---');
    await Review.deleteMany({});
    const reviewSeeds = [
      { buyer: buyerUser._id, reviewType: 'website_service', rating: 5, review: 'Ethio-Home completely removed the headache of unverified street brokers. Purchasing our apartment in Bole with verified municipal records was smooth and stress-free.', title: 'Outstanding PropTech Experience', location: 'Bole, Addis Ababa', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'website_service', rating: 5, review: 'Buying a home in Addis Ababa while living in Maryland used to feel full of risks. Ethio-Homes physical inspection report and escrow safety gave me complete confidence.', title: 'Diaspora Lifesaver', location: 'Silver Spring, MD', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'website_service', rating: 5, review: 'We leased our companys office in Kazanchis within a week. Direct connection to verified landlords saved us excessive broker fees and months of delay.', title: 'Fast & Reliable Commercial Lease', location: 'Kazanchis, Addis Ababa', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'property', property: properties[0]._id, rating: 5, review: 'The apartment is exactly as depicted in the 3D tour. Exceptional build quality and peaceful neighborhood.', title: 'Exceeded Expectations', location: 'Bole Atlas', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'property', property: properties[1]._id, rating: 5, review: 'A true diplomatic standard villa. The inspection certificate provided full reassurance before contract signing.', title: 'Magnificent Old Airport Villa', location: 'Old Airport', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'website_service', rating: 5, review: 'The escrow payment protection is a game changer for the Ethiopian real estate market.', title: 'Safe & Secure Platform', location: 'CMC, Addis Ababa', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'property', property: properties[2]._id, rating: 4, review: 'Great central Kazanchis apartment, high-speed elevator and reliable backup water reserves.', title: 'Very Solid Apartment', location: 'Kazanchis', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'property', property: properties[3]._id, rating: 5, review: 'Spacious garden and clean finishes. Ideal for families looking for peaceful community living.', title: 'Great Family Home', location: 'CMC Sunrise', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'website_service', rating: 5, review: 'Customer support in both Amharic and English was extremely responsive and courteous.', title: 'Bilingual Support is Superb', location: 'London, UK', isVerified: true },
      { buyer: buyerUser._id, reviewType: 'property', property: properties[6]._id, rating: 5, review: 'Stunning rooftop terrace with sunset views over Addis Ababa. Truly luxury grade.', title: 'Dream Penthouse', location: 'Gerji', isVerified: true },
    ];
    await Review.create(reviewSeeds);
    console.log(`Created ${reviewSeeds.length} Reviews`);

    // 6. SEED 10 CONTACTS
    console.log('--- Seeding Contacts ---');
    await Contact.deleteMany({});
    const contactSeeds = [
      { name: 'Dr. Girma Bekele', email: 'girma.b@gmail.com', phone: '+251911445566', subject: 'Inquiry on Bole Commercial Buildings', message: 'Looking for a verified multi-story building for healthcare clinic expansion in Bole or Sarbet.', inquiryType: 'sales', status: 'new', priority: 'high' },
      { name: 'Hiwot Asfaw', email: 'hiwot.asfaw@yahoo.com', phone: '+251911556677', subject: 'Diaspora Mortgage Financing Partners', message: 'Does Ethio-Home partner with Ethiopian commercial banks for diaspora real estate loans?', inquiryType: 'billing', status: 'in-progress', priority: 'medium' },
      { name: 'Samuel Desta', email: 'samuel.d@destagroup.et', phone: '+251911667788', subject: 'Corporate Partner Real Estate Services', message: 'We wish to onboard 15 executive residential listings for our diplomatic corporate clients.', inquiryType: 'partnership', status: 'resolved', priority: 'high' },
      { name: 'Rahel Mengistu', email: 'rahel.m@gmail.com', phone: '+251911778899', subject: 'Property Verification Process Duration', message: 'How long does the forensic document check take for a private villa in Ayat?', inquiryType: 'general', status: 'new', priority: 'low' },
      { name: 'Tewodros Kassaye', email: 'tewodros.k@gmail.com', phone: '+251911889900', subject: 'Escrow Deposit Query', message: 'Are earnest escrow funds held in a closed custodial account approved by NBE?', inquiryType: 'technical', status: 'resolved', priority: 'urgent' },
      { name: 'Eden Negash', email: 'eden.negash@outlook.com', phone: '+251911990011', subject: 'Real Estate Developer Showcase', message: 'We are completing an 80-unit apartment complex in Kazanchis and want full site verification.', inquiryType: 'sales', status: 'in-progress', priority: 'high' },
      { name: 'Fikadu Wolde', email: 'fikadu.w@gmail.com', phone: '+251911001122', subject: 'Agent Registration Verification', message: 'I submitted my municipal real estate broker license for platform certification.', inquiryType: 'support', status: 'resolved', priority: 'medium' },
      { name: 'Helen Teshome', email: 'helen.t@gmail.com', phone: '+251911112233', subject: 'Tour Booking Cancellation Notice', message: 'Requesting to reschedule my Sunday site visit due to travel commitments.', inquiryType: 'general', status: 'closed', priority: 'low' },
      { name: 'Yared Berhanu', email: 'yared.b@gmail.com', phone: '+251911223344', subject: 'Commercial Plot Legal Due Diligence', message: 'Requesting copy of certified boundary audit for Gotera plot listing.', inquiryType: 'property', status: 'in-progress', priority: 'high' },
      { name: 'Meseret Hailu', email: 'meseret.h@gmail.com', phone: '+251911334455', subject: 'Mobile App Notification Feedback', message: 'Notifications for price changes work brilliantly. Thanks for great service!', inquiryType: 'other', status: 'closed', priority: 'low' },
    ];
    await Contact.create(contactSeeds);
    console.log(`Created ${contactSeeds.length} Contacts`);

    // 7. SEED 10 DEPARTMENTS
    console.log('--- Seeding Departments ---');
    await Department.deleteMany({});
    const departmentSeeds = [
      { id: 'dept-verification', icon: 'ShieldCheck', title: 'Property Verification Division', description: 'Forensic title clearance, municipal registry audits, and certified on-site structural inspections.', contact: 'verification@ethiohome.com', phone: '+251 11 661 0001', email: 'verification@ethiohome.com', order: 1 },
      { id: 'dept-sales', icon: 'Building', title: 'Residential Sales & Acquisitions', description: 'Assisting private buyers and diaspora investors with verified apartment, villa, and home acquisitions.', contact: 'sales@ethiohome.com', phone: '+251 11 661 0002', email: 'sales@ethiohome.com', order: 2 },
      { id: 'dept-commercial', icon: 'Briefcase', title: 'Commercial Real Estate', description: 'Office buildings, retail plazas, warehouse complexes, and industrial land holdings.', contact: 'commercial@ethiohome.com', phone: '+251 11 661 0003', email: 'commercial@ethiohome.com', order: 3 },
      { id: 'dept-legal', icon: 'FileText', title: 'Legal & Escrow Services', description: 'Contract oversight, escrow custodial protection, and cadastral transfer coordination.', contact: 'legal@ethiohome.com', phone: '+251 11 661 0004', email: 'legal@ethiohome.com', order: 4 },
      { id: 'dept-diaspora', icon: 'Globe', title: 'Diaspora Investor Desk', description: 'Dedicated consultation and remote closing services for Ethiopians in North America, Europe, and Middle East.', contact: 'diaspora@ethiohome.com', phone: '+251 11 661 0005', email: 'diaspora@ethiohome.com', order: 5 },
      { id: 'dept-agents', icon: 'Users', title: 'Agent & Broker Partnerships', description: 'Accreditation, platform tools, MLS management, and professional compliance.', contact: 'agents@ethiohome.com', phone: '+251 11 661 0006', email: 'agents@ethiohome.com', order: 6 },
      { id: 'dept-support', icon: 'Headphones', title: 'Customer Success & Support', description: '24/7 bilingual support in Amharic and English for buyers, sellers, and tenants.', contact: 'support@ethiohome.com', phone: '+251 11 661 0007', email: 'support@ethiohome.com', order: 7 },
      { id: 'dept-inspections', icon: 'MapPin', title: 'Field Inspection Engineering', description: 'Licensed civil engineers conducting physical verification across Addis Ababa and regional cities.', contact: 'inspections@ethiohome.com', phone: '+251 11 661 0008', email: 'inspections@ethiohome.com', order: 8 },
      { id: 'dept-finance', icon: 'CreditCard', title: 'Billing & Escrow Payments', description: 'Chapa integration, bank wire clearing, and transparent fee schedules.', contact: 'finance@ethiohome.com', phone: '+251 11 661 0009', email: 'finance@ethiohome.com', order: 9 },
      { id: 'dept-pr', icon: 'Megaphone', title: 'Media & Corporate Communications', description: 'Press inquiries, public PropTech reports, and real estate market indices.', contact: 'media@ethiohome.com', phone: '+251 11 661 0010', email: 'media@ethiohome.com', order: 10 },
    ];
    await Department.create(departmentSeeds);
    console.log(`Created ${departmentSeeds.length} Departments`);

    // 8. SEED 10 FAQS
    console.log('--- Seeding FAQs ---');
    await FAQ.deleteMany({});
    const faqSeeds = [
      { id: 'faq-1', question: 'How does Ethio-Home verify listed properties?', answer: 'Our licensed field inspectors visit every property to audit structural conditions, verify coordinates, and cross-examine original title deeds against municipal registry records before granting our trust badge.', category: 'property', order: 1, helpful: 45 },
      { id: 'faq-2', question: 'Can diaspora buyers purchase without traveling to Ethiopia?', answer: 'Yes. With our remote closing framework, diaspora buyers can review verified physical inspection reports, authorize legal representation, and transact safely via escrow protection.', category: 'process', order: 2, helpful: 38 },
      { id: 'faq-3', question: 'What is the escrow transaction guarantee?', answer: 'Earnest payments and purchase funds are deposited into a secure custodial escrow account, releasing to the seller only upon verified transfer of ownership title.', category: 'financing', order: 3, helpful: 52 },
      { id: 'faq-4', question: 'Are there hidden broker fees on Ethio-Home?', answer: 'No. Ethio-Home operates on transparent, upfront terms. Buyers deal directly with verified owners or licensed platform agents with zero street broker commissions.', category: 'billing', order: 4, helpful: 60 },
      { id: 'faq-5', question: 'How do I schedule an on-site property visit?', answer: 'Click "Schedule Visit" on any listing page to select a convenient date and time. Our certified agent coordinates access and accompanies your tour.', category: 'process', order: 5, helpful: 29 },
      { id: 'faq-6', question: 'What property types are eligible for verification?', answer: 'We verify residential apartments, standalone villas, family residences, commercial plazas, and documented urban plots across Addis Ababa and major regional hubs.', category: 'property', order: 6, helpful: 33 },
      { id: 'faq-7', question: 'How do sellers list their properties on the platform?', answer: 'Property owners register an account, upload property details along with proof of title, and our inspection engineering team schedules a site visit within 48 hours.', category: 'account', order: 7, helpful: 41 },
      { id: 'faq-8', question: 'What payment methods are supported for subscriptions and deposits?', answer: 'We support Chapa, Telebirr, CBE Birr, Awash Bank, and international bank transfers for diaspora investors.', category: 'financing', order: 8, helpful: 47 },
      { id: 'faq-9', question: 'Is the platform available in the Amharic language?', answer: 'Yes. The entire platform features seamless bilingual support in both Amharic and English, selectable via the top navigation toggle.', category: 'general', order: 9, helpful: 35 },
      { id: 'faq-10', question: 'What documents are required to initiate property verification?', answer: 'Sellers must provide certified copy of title deed (ይዞታ ማረጋገጫ), site plan (ፕላን), valid national ID / passport, and recent property tax clearance receipt.', category: 'property', order: 10, helpful: 56 },
    ];
    await FAQ.create(faqSeeds);
    console.log(`Created ${faqSeeds.length} FAQs`);

    // 9. SEED 10 INTEREST FORMS
    console.log('--- Seeding Interest Forms ---');
    await InterestForm.deleteMany({});
    const interestSeeds = [
      { buyerId: buyerUser._id, propertyId: properties[0]._id, contactInfo: { name: 'Yohannes Haile', email: 'yohannes@ethiohome.com', phone: '+251911456789' }, message: 'Interested in purchasing the 3-Bedroom Bole Atlas apartment with immediate cash transfer.', status: 'schedule' },
      { buyerId: buyerUser._id, propertyId: properties[1]._id, contactInfo: { name: 'Mulugeta Assefa', email: 'mulugeta@ethiohome.com', phone: '+251911890123' }, message: 'Requesting diplomatic lease agreement details for Old Airport residence.', status: 'pending' },
      { buyerId: buyerUser._id, propertyId: properties[2]._id, contactInfo: { name: 'Tigist Worku', email: 'tigist@ethiohome.com', phone: '+251911901234' }, message: 'Seeking 1-year corporate rental lease for Kazanchis apartment starting next month.', status: 'schedule' },
      { buyerId: buyerUser._id, propertyId: properties[3]._id, contactInfo: { name: 'Daniel Mengistu', email: 'daniel.m@gmail.com', phone: '+251911223388' }, message: 'Would like to visit the CMC family house with my architect this weekend.', status: 'pending' },
      { buyerId: buyerUser._id, propertyId: properties[4]._id, contactInfo: { name: 'Aster Gebre', email: 'aster.g@techfirm.et', phone: '+251911334499' }, message: 'Inquiring about multi-floor leasing for our tech headquarters in Bole Medhanealem.', status: 'contacted' },
      { buyerId: buyerUser._id, propertyId: properties[5]._id, contactInfo: { name: 'Henok Tilahun', email: 'henok.t@gmail.com', phone: '+251911445500' }, message: 'Does the Sarbet villa permit residential plus home office configuration?', status: 'pending' },
      { buyerId: buyerUser._id, propertyId: properties[6]._id, contactInfo: { name: 'Meron Tesfaye', email: 'meron.t@gmail.com', phone: '+251911556611' }, message: 'Offering 26M ETB for the Gerji penthouse with 50% deposit.', status: 'visited' },
      { buyerId: buyerUser._id, propertyId: properties[7]._id, contactInfo: { name: 'Kibrom Berhane', email: 'kibrom.b@gmail.com', phone: '+251911667722' }, message: 'Requesting visit for Ayat Zone 3 townhouse on Thursday morning.', status: 'schedule' },
      { buyerId: buyerUser._id, propertyId: properties[8]._id, contactInfo: { name: 'Hanna Solomon', email: 'hanna.s@gmail.com', phone: '+251911778833' }, message: 'Booking Bole Brass studio for 6 months expat consultancy stay.', status: 'schedule' },
      { buyerId: buyerUser._id, propertyId: properties[9]._id, contactInfo: { name: 'Girma Alemayehu', email: 'girma.a@gmail.com', phone: '+251911889944' }, message: 'Requesting full due diligence folder for Gotera commercial plot.', status: 'contacted' },
    ];
    await InterestForm.create(interestSeeds);
    console.log(`Created ${interestSeeds.length} Interest Forms`);

    // 10. SEED 10 SELLINGS
    console.log('--- Seeding Sellings ---');
    await Selling.deleteMany({});
    const sellingSeeds = [
      { property: properties[0]._id, buyer: buyerUser._id, amount: 18500000, currency: 'ETB', chapa_charge: 18500, tx_ref: 'TX-ETH-2024-001', payment_method: 'Chapa', paid: true },
      { property: properties[1]._id, buyer: buyerUser._id, amount: 65000000, currency: 'ETB', chapa_charge: 65000, tx_ref: 'TX-ETH-2024-002', payment_method: 'Bank Wire', paid: true },
      { property: properties[2]._id, buyer: buyerUser._id, amount: 75000, currency: 'ETB', chapa_charge: 750, tx_ref: 'TX-ETH-2024-003', payment_method: 'Telebirr', paid: true },
      { property: properties[3]._id, buyer: buyerUser._id, amount: 32000000, currency: 'ETB', chapa_charge: 32000, tx_ref: 'TX-ETH-2024-004', payment_method: 'CBE Birr', paid: true },
      { property: properties[4]._id, buyer: buyerUser._id, amount: 240000, currency: 'ETB', chapa_charge: 2400, tx_ref: 'TX-ETH-2024-005', payment_method: 'Chapa', paid: true },
      { property: properties[5]._id, buyer: buyerUser._id, amount: 42000000, currency: 'ETB', chapa_charge: 42000, tx_ref: 'TX-ETH-2024-006', payment_method: 'Bank Wire', paid: true },
      { property: properties[6]._id, buyer: buyerUser._id, amount: 28000000, currency: 'ETB', chapa_charge: 28000, tx_ref: 'TX-ETH-2024-007', payment_method: 'Chapa', paid: true },
      { property: properties[7]._id, buyer: buyerUser._id, amount: 19500000, currency: 'ETB', chapa_charge: 19500, tx_ref: 'TX-ETH-2024-008', payment_method: 'Awash Bank', paid: true },
      { property: properties[8]._id, buyer: buyerUser._id, amount: 45000, currency: 'ETB', chapa_charge: 450, tx_ref: 'TX-ETH-2024-009', payment_method: 'Telebirr', paid: true },
      { property: properties[9]._id, buyer: buyerUser._id, amount: 88000000, currency: 'ETB', chapa_charge: 88000, tx_ref: 'TX-ETH-2024-010', payment_method: 'Bank Wire', paid: true },
    ];
    await Selling.create(sellingSeeds);
    console.log(`Created ${sellingSeeds.length} Sellings`);

    // 11. SEED 10 SUBSCRIPTION PLANS
    console.log('--- Seeding Subscription Plans ---');
    await SubscriptionPlan.deleteMany({});
    const subPlanSeeds = [
      { seller: sellerUser._id, interval: 'monthly', amount: 1500, currency: 'ETB', tx_ref: ['SUB-TX-001'], frequency: 1 },
      { seller: agentUser._id, interval: 'monthly', amount: 4500, currency: 'ETB', tx_ref: ['SUB-TX-002'], frequency: 1 },
      { seller: sellerUser._id, interval: '3-monthly', amount: 4000, currency: 'ETB', tx_ref: ['SUB-TX-003'], frequency: 1 },
      { seller: agentUser._id, interval: '6-monthly', amount: 22000, currency: 'ETB', tx_ref: ['SUB-TX-004'], frequency: 1 },
      { seller: sellerUser._id, interval: 'annually', amount: 15000, currency: 'ETB', tx_ref: ['SUB-TX-005'], frequency: 1 },
      { seller: agentUser._id, interval: 'annually', amount: 40000, currency: 'ETB', tx_ref: ['SUB-TX-006'], frequency: 1 },
      { seller: sellerUser._id, interval: 'weekly', amount: 500, currency: 'ETB', tx_ref: ['SUB-TX-007'], frequency: 1 },
      { seller: agentUser._id, interval: 'monthly', amount: 5500, currency: 'ETB', tx_ref: ['SUB-TX-008'], frequency: 1 },
      { seller: sellerUser._id, interval: 'monthly', amount: 1500, currency: 'ETB', tx_ref: ['SUB-TX-009'], frequency: 1 },
      { seller: agentUser._id, interval: 'annually', amount: 45000, currency: 'ETB', tx_ref: ['SUB-TX-010'], frequency: 1 },
    ];
    await SubscriptionPlan.create(subPlanSeeds);
    console.log(`Created ${subPlanSeeds.length} Subscription Plans`);

    // 12. SEED 10 PREDEFINED PLANS
    console.log('--- Seeding Predefined Plans ---');
    await PredefinedPlan.deleteMany({});
    const predefinedPlanSeeds = [
      { name: 'Starter Owner Weekly', interval: 'weekly', amount: 499, frequency: 1, currency: 'ETB', description: 'Quick verification test for private homeowners.', features: ['Up to 1 verified property listing', 'Basic physical audit certificate', '7-day active search visibility'], maxProperties: 1 },
      { name: 'Owner Standard Monthly', interval: 'monthly', amount: 1499, frequency: 1, currency: 'ETB', description: 'Essential tier for private property sellers.', features: ['Up to 3 verified property listings', 'Full forensic title check', 'Direct buyer messaging access', 'Escrow contract support'], maxProperties: 3 },
      { name: 'Owner Quarterly Premium', interval: '3-monthly', amount: 3999, frequency: 1, currency: 'ETB', description: 'Popular tier for sellers seeking rapid closure.', features: ['Up to 5 verified listings', 'Priority homepage featured placement', 'Professional photography assistance', 'Dedicated verification officer'], maxProperties: 5 },
      { name: 'Agent Pro Monthly', interval: 'monthly', amount: 4499, frequency: 1, currency: 'ETB', description: 'Comprehensive tools for licensed real estate brokers.', features: ['Up to 15 verified listings', 'Agent branded profile page', 'Lead capture and tour booking CRM', 'Multi-channel WhatsApp inquiry alerts'], maxProperties: 15 },
      { name: 'Agent Growth 6-Month', interval: '6-monthly', amount: 21999, frequency: 1, currency: 'ETB', description: 'Discounted growth bundle for independent agencies.', features: ['Up to 30 verified listings', 'Featured agent carousel', 'Market valuation intelligence', 'Priority escrow processing'], maxProperties: 30 },
      { name: 'Agency Enterprise Annual', interval: 'annually', amount: 39999, frequency: 1, currency: 'ETB', description: 'For corporate brokerages and multi-agent teams.', features: ['Unlimited verified property listings', 'Multi-agent account seats (up to 10)', 'Custom branded showcase microsite', 'Dedicated account manager'], maxProperties: 100 },
      { name: 'Commercial Landlord Monthly', interval: 'monthly', amount: 6999, frequency: 1, currency: 'ETB', description: 'Optimized for commercial plaza and office building owners.', features: ['Commercial lease agreement templates', 'Floor-by-floor space breakdown', 'High-volume lead generation'], maxProperties: 10 },
      { name: 'Developer Project Launch', interval: '6-monthly', amount: 49999, frequency: 1, currency: 'ETB', description: 'For real estate developers launching new buildings.', features: ['Up to 80 condo/villa listings', 'Project launch banner on homepage', 'Virtual tour 3D integration', 'Diaspora investor roadshow campaign'], maxProperties: 80 },
      { name: 'Diaspora Investor VIP Annual', interval: 'annually', amount: 18999, frequency: 1, currency: 'ETB', description: 'Exclusive buyer advisory and legal guardianship.', features: ['Personal acquisition consultant', 'Unlimited title & legal due diligence', 'Remote video inspection on demand', 'Closing deed delivery service'], maxProperties: 10 },
      { name: 'Private Villa Showcase', interval: 'monthly', amount: 2999, frequency: 1, currency: 'ETB', description: 'Highlighting high-value residential luxury estates.', features: ['Hero banner spotlight', 'Full drone and cinematic video hosting', 'Buyer pre-qualification verification'], maxProperties: 2 },
    ];
    await PredefinedPlan.create(predefinedPlanSeeds);
    console.log(`Created ${predefinedPlanSeeds.length} Predefined Plans`);

    console.log('\n========================================');
    console.log('ALL 12 MODELS SEEDED WITH 10+ REAL DOCUMENTS EACH!');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
}

seedDatabase();
