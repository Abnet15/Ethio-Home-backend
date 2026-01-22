# Test and Population Script

This script tests all backend API endpoints and creates 30 documents for each model in the database.

## Usage

### Prerequisites
1. Make sure MongoDB is running (either locally or Atlas)
2. Ensure the backend server is running on port 5000
3. Install all dependencies: `npm install`

### Run the Script

```bash
# From the backend directory
npm run populate

# Or directly with node
node scripts/testAndPopulate.js
```

### What it does:

1. **Tests Backend API Connectivity**
   - Tests GET endpoints for users, properties, and reviews
   - Reports connection status and response codes

2. **Creates Test Data (30 documents each)**
   - Users (buyers, sellers, agents, admins, employees)
   - Properties (houses, apartments, villas, land, commercial)
   - Interest Forms
   - Reviews (property and website service)
   - Sellings
   - Messages
   - Contacts
   - Notifications
   - Subscription Plans
   - Predefined Plans
   - FAQs
   - Departments

3. **Generates Summary Report**
   - Shows how many documents were created for each model
   - Lists any errors encountered
   - Displays backend connection status

## Configuration

The script uses environment variables from `config.env`:
- `DATABASE` or `MONGODB_URI` - MongoDB connection string
- `API_BASE_URL` - Backend API base URL (default: http://localhost:5000/api/v1)

## Notes

- The script handles duplicate key errors gracefully
- Some models require relationships (e.g., properties need owners, interests need buyers and properties)
- The script creates users first, then uses them for related documents
- All test users have password: `Test1234!`

## Troubleshooting

### Database Connection Failed
- Check if MongoDB is running
- Verify connection string in `config.env`
- For Atlas: Ensure your IP is whitelisted

### API Connection Failed
- Ensure backend server is running: `npm run start:dev`
- Check if port 5000 is available
- Verify CORS settings in `server.js`

### Duplicate Key Errors
- Some models have unique constraints (email, FAQ ID, Department ID)
- The script skips duplicates and continues



