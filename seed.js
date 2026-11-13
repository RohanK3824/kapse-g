const excelService = require('./services/excelService');
const fs = require('fs');

async function seedSampleData() {
  // If file exists, remove to start clean
  if (fs.existsSync(excelService.FILE_PATH)) {
    fs.unlinkSync(excelService.FILE_PATH);
  }

  await excelService.initExcelFile();

  const today = new Date().toISOString().split('T')[0];

  const sampleCustomers = [
    {
      name: 'Rajesh Sharma',
      mobile: '9876543210',
      place: 'Main Bazaar, Shop No. 4',
      billBook: 'B-01',
      pageNo: '24',
      date: today,
      notes: '3-Piece Italian Wool Suit (Navy Blue). Chest 40, Waist 34, Length 31. Urgent delivery for wedding.'
    },
    {
      name: 'Mohammad Alvi',
      mobile: '9811223344',
      place: 'Gandhi Chowk, Sector 2',
      billBook: 'B-01',
      pageNo: '48',
      date: today,
      notes: 'Cotton Kurta Pajama set with Mandarin collar and hand-embroidered cuffs.'
    },
    {
      name: 'Suresh Patel',
      mobile: '9898761234',
      place: 'Station Road, Near Clock Tower',
      billBook: 'B-02',
      pageNo: '12',
      date: today,
      notes: '2 Formal Trousers (Charcoal & Olive, Pleated) and 3 Linen Shirts.'
    },
    {
      name: 'Anand Verma',
      mobile: '9765432109',
      place: 'Ring Road Market, Flat 3B',
      billBook: 'B-02',
      pageNo: '35',
      date: today,
      notes: 'Classic Safari Suit with double breast pockets and horn buttons.'
    }
  ];

  for (const c of sampleCustomers) {
    const added = await excelService.addCustomer(c);
    console.log(`Seeded: ${added.id} - ${added.name}`);
  }

  console.log('Seeding completed successfully!');
}

seedSampleData().catch(console.error);
