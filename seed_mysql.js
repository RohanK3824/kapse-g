require('dotenv').config();
const mysqlService = require('./services/mysqlService');

async function seed() {
  console.log('==================================================');
  console.log('       ✂️  MYSQL DATABASE SEEDING WIZARD  ✂️       ');
  console.log('==================================================');
  console.log(`Connecting to MySQL host: ${mysqlService.DB_CONFIG.host}:${mysqlService.DB_CONFIG.port}`);
  console.log(`Database name: ${mysqlService.DB_CONFIG.database}`);
  console.log(`Database user: ${mysqlService.DB_CONFIG.user}`);

  const success = await mysqlService.initDatabase();

  if (!success) {
    console.error('\n❌ Could not connect to MySQL.');
    console.error(`Error: ${mysqlService.getLastError()}`);
    console.error('\nPlease check your .env file:');
    console.error('   DB_HOST=localhost');
    console.error('   DB_PORT=3306');
    console.error('   DB_USER=root');
    console.error('   DB_PASSWORD=your_actual_mysql_password');
    console.error('   DB_NAME=tailor_shop_db');
    process.exit(1);
  }

  const customers = await mysqlService.getAllCustomers();
  console.log(`\n✅ MySQL database is ready and seeded!`);
  console.log(`Total Customer Records: ${customers.length}`);
  customers.slice(0, 5).forEach(c => {
    console.log(`   - [${c.id}] ${c.name} (${c.mobile}) - Book ${c.billBook}/P.${c.pageNo} [${c.place}]`);
  });
  console.log('==================================================');
  process.exit(0);
}

seed();
