const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const indianGroceryDataset = [
  // ===== Grains & Rice =====
  { name: "Basmati Rice (1kg)", barcode: "8901030000101", price: 85, category: "Groceries", unit: "kg", stock: 50, lowStockThreshold: 10 },
  { name: "Sona Masoori Rice (1kg)", barcode: "8901030000102", price: 55, category: "Groceries", unit: "kg", stock: 60, lowStockThreshold: 10 },
  { name: "Ponni Rice (1kg)", barcode: "8901030000103", price: 48, category: "Groceries", unit: "kg", stock: 40, lowStockThreshold: 10 },
  { name: "Wheat Flour / Atta (1kg)", barcode: "8901030000104", price: 42, category: "Groceries", unit: "kg", stock: 45, lowStockThreshold: 10 },
  { name: "Maida (1kg)", barcode: "8901030000105", price: 38, category: "Groceries", unit: "kg", stock: 30, lowStockThreshold: 8 },
  { name: "Rava / Sooji (500g)", barcode: "8901030000106", price: 32, category: "Groceries", unit: "pack", stock: 35, lowStockThreshold: 8 },
  { name: "Besan / Gram Flour (500g)", barcode: "8901030000107", price: 55, category: "Groceries", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Rice Flour (500g)", barcode: "8901030000108", price: 30, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Poha / Flattened Rice (500g)", barcode: "8901030000109", price: 35, category: "Groceries", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Idli Rava (500g)", barcode: "8901030000110", price: 38, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },

  // ===== Pulses & Dals =====
  { name: "Toor Dal / Arhar Dal (1kg)", barcode: "8901030000201", price: 130, category: "Groceries", unit: "kg", stock: 40, lowStockThreshold: 8 },
  { name: "Moong Dal (1kg)", barcode: "8901030000202", price: 120, category: "Groceries", unit: "kg", stock: 35, lowStockThreshold: 8 },
  { name: "Chana Dal (1kg)", barcode: "8901030000203", price: 95, category: "Groceries", unit: "kg", stock: 35, lowStockThreshold: 8 },
  { name: "Urad Dal (1kg)", barcode: "8901030000204", price: 110, category: "Groceries", unit: "kg", stock: 30, lowStockThreshold: 8 },
  { name: "Masoor Dal (1kg)", barcode: "8901030000205", price: 90, category: "Groceries", unit: "kg", stock: 30, lowStockThreshold: 8 },
  { name: "Rajma / Kidney Beans (500g)", barcode: "8901030000206", price: 75, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Kabuli Chana / Chickpeas (500g)", barcode: "8901030000207", price: 65, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Black Chana (500g)", barcode: "8901030000208", price: 55, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Moong Whole (500g)", barcode: "8901030000209", price: 70, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Lobiya / Black Eyed Peas (500g)", barcode: "8901030000210", price: 60, category: "Groceries", unit: "pack", stock: 15, lowStockThreshold: 5 },

  // ===== Cooking Oils =====
  { name: "Sunflower Oil (1L)", barcode: "8901030000301", price: 140, category: "Groceries", unit: "litre", stock: 30, lowStockThreshold: 8 },
  { name: "Mustard Oil (1L)", barcode: "8901030000302", price: 160, category: "Groceries", unit: "litre", stock: 25, lowStockThreshold: 8 },
  { name: "Groundnut Oil (1L)", barcode: "8901030000303", price: 180, category: "Groceries", unit: "litre", stock: 20, lowStockThreshold: 5 },
  { name: "Coconut Oil (500ml)", barcode: "8901030000304", price: 95, category: "Groceries", unit: "ml", stock: 25, lowStockThreshold: 5 },
  { name: "Refined Oil / Soybean (1L)", barcode: "8901030000305", price: 120, category: "Groceries", unit: "litre", stock: 20, lowStockThreshold: 5 },
  { name: "Sesame Oil / Gingelly Oil (500ml)", barcode: "8901030000306", price: 180, category: "Groceries", unit: "ml", stock: 15, lowStockThreshold: 5 },
  { name: "Ghee (500g)", barcode: "8901030000307", price: 280, category: "Groceries", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Vanaspati Ghee (500g)", barcode: "8901030000308", price: 95, category: "Groceries", unit: "pack", stock: 12, lowStockThreshold: 5 },

  // ===== Spices =====
  { name: "Turmeric Powder / Haldi (100g)", barcode: "8901030000401", price: 30, category: "Groceries", unit: "pack", stock: 50, lowStockThreshold: 10 },
  { name: "Red Chilli Powder (100g)", barcode: "8901030000402", price: 35, category: "Groceries", unit: "pack", stock: 50, lowStockThreshold: 10 },
  { name: "Coriander Powder / Dhaniya (100g)", barcode: "8901030000403", price: 25, category: "Groceries", unit: "pack", stock: 45, lowStockThreshold: 10 },
  { name: "Cumin Powder / Jeera (100g)", barcode: "8901030000404", price: 45, category: "Groceries", unit: "pack", stock: 40, lowStockThreshold: 8 },
  { name: "Garam Masala (100g)", barcode: "8901030000405", price: 55, category: "Groceries", unit: "pack", stock: 40, lowStockThreshold: 8 },
  { name: "Cumin Seeds / Jeera (100g)", barcode: "8901030000406", price: 40, category: "Groceries", unit: "pack", stock: 35, lowStockThreshold: 8 },
  { name: "Mustard Seeds / Rai (100g)", barcode: "8901030000407", price: 15, category: "Groceries", unit: "pack", stock: 35, lowStockThreshold: 8 },
  { name: "Black Pepper / Kali Mirch (50g)", barcode: "8901030000408", price: 55, category: "Groceries", unit: "pack", stock: 30, lowStockThreshold: 5 },
  { name: "Cinnamon / Dalchini (50g)", barcode: "8901030000409", price: 40, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Cardamom / Elaichi (25g)", barcode: "8901030000410", price: 60, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Bay Leaves / Tej Patta (25g)", barcode: "8901030000411", price: 15, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Cloves / Laung (25g)", barcode: "8901030000412", price: 45, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Asafoetida / Hing (10g)", barcode: "8901030000413", price: 30, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Fennel Seeds / Saunf (100g)", barcode: "8901030000414", price: 30, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Fenugreek Seeds / Methi (100g)", barcode: "8901030000415", price: 20, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Kitchen King Masala (100g)", barcode: "8901030000416", price: 50, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Chole Masala (100g)", barcode: "8901030000417", price: 40, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Pav Bhaji Masala (100g)", barcode: "8901030000418", price: 45, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Biryani Masala (50g)", barcode: "8901030000419", price: 45, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Sambar Powder (100g)", barcode: "8901030000420", price: 35, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Rasam Powder (100g)", barcode: "8901030000421", price: 35, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },

  // ===== Sugar, Salt & Essentials =====
  { name: "Sugar (1kg)", barcode: "8901030000501", price: 45, category: "Groceries", unit: "kg", stock: 50, lowStockThreshold: 10 },
  { name: "Jaggery / Gur (500g)", barcode: "8901030000502", price: 40, category: "Groceries", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Salt / Namak (1kg)", barcode: "8901030000503", price: 22, category: "Groceries", unit: "kg", stock: 50, lowStockThreshold: 10 },
  { name: "Rock Salt / Sendha Namak (500g)", barcode: "8901030000504", price: 30, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Vinegar (200ml)", barcode: "8901030000505", price: 25, category: "Groceries", unit: "ml", stock: 15, lowStockThreshold: 5 },
  { name: "Tamarind / Imli (200g)", barcode: "8901030000506", price: 30, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Dry Mango Powder / Amchur (100g)", barcode: "8901030000507", price: 30, category: "Groceries", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Baking Soda (100g)", barcode: "8901030000508", price: 15, category: "Groceries", unit: "pack", stock: 20, lowStockThreshold: 5 },

  // ===== Dairy =====
  { name: "Milk (500ml)", barcode: "8901030000601", price: 28, category: "Dairy", unit: "ml", stock: 40, lowStockThreshold: 10 },
  { name: "Milk (1L)", barcode: "8901030000602", price: 54, category: "Dairy", unit: "litre", stock: 30, lowStockThreshold: 10 },
  { name: "Curd / Dahi (400g)", barcode: "8901030000603", price: 30, category: "Dairy", unit: "pack", stock: 25, lowStockThreshold: 8 },
  { name: "Paneer (200g)", barcode: "8901030000604", price: 80, category: "Dairy", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Butter (100g)", barcode: "8901030000605", price: 52, category: "Dairy", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Cheese Slice (10 slices)", barcode: "8901030000606", price: 95, category: "Dairy", unit: "pack", stock: 10, lowStockThreshold: 3 },
  { name: "Buttermilk / Chaas (200ml)", barcode: "8901030000607", price: 15, category: "Dairy", unit: "ml", stock: 30, lowStockThreshold: 8 },
  { name: "Lassi (200ml)", barcode: "8901030000608", price: 25, category: "Dairy", unit: "ml", stock: 25, lowStockThreshold: 5 },
  { name: "Cream / Malai (200ml)", barcode: "8901030000609", price: 45, category: "Dairy", unit: "ml", stock: 10, lowStockThreshold: 3 },

  // ===== Beverages =====
  { name: "Tea / Chai Patti (250g)", barcode: "8901030000701", price: 95, category: "Beverages", unit: "pack", stock: 40, lowStockThreshold: 8 },
  { name: "Coffee Powder (100g)", barcode: "8901030000702", price: 75, category: "Beverages", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Bournvita (500g)", barcode: "8901030000703", price: 230, category: "Beverages", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Horlicks (500g)", barcode: "8901030000704", price: 250, category: "Beverages", unit: "pack", stock: 12, lowStockThreshold: 5 },
  { name: "Rooh Afza (750ml)", barcode: "8901030000705", price: 140, category: "Beverages", unit: "ml", stock: 10, lowStockThreshold: 3 },
  { name: "Limca (250ml)", barcode: "8901030000706", price: 20, category: "Beverages", unit: "ml", stock: 48, lowStockThreshold: 12 },
  { name: "Thums Up (250ml)", barcode: "8901030000707", price: 20, category: "Beverages", unit: "ml", stock: 48, lowStockThreshold: 12 },
  { name: "Maaza (250ml)", barcode: "8901030000708", price: 20, category: "Beverages", unit: "ml", stock: 48, lowStockThreshold: 12 },
  { name: "Frooti (200ml)", barcode: "8901030000709", price: 10, category: "Beverages", unit: "ml", stock: 60, lowStockThreshold: 15 },
  { name: "Coca-Cola (250ml)", barcode: "8901030000710", price: 20, category: "Beverages", unit: "ml", stock: 48, lowStockThreshold: 12 },
  { name: "Sprite (250ml)", barcode: "8901030000711", price: 20, category: "Beverages", unit: "ml", stock: 48, lowStockThreshold: 12 },
  { name: "Pepsi (250ml)", barcode: "8901030000712", price: 20, category: "Beverages", unit: "ml", stock: 48, lowStockThreshold: 12 },
  { name: "Mineral Water (1L)", barcode: "8901030000713", price: 20, category: "Beverages", unit: "litre", stock: 60, lowStockThreshold: 15 },
  { name: "Glucon-D (100g)", barcode: "8901030000714", price: 42, category: "Beverages", unit: "pack", stock: 20, lowStockThreshold: 5 },

  // ===== Snacks =====
  { name: "Parle-G Biscuit (80g)", barcode: "8901030000801", price: 10, category: "Snacks", unit: "pack", stock: 100, lowStockThreshold: 20 },
  { name: "Marie Gold Biscuit (100g)", barcode: "8901030000802", price: 20, category: "Snacks", unit: "pack", stock: 60, lowStockThreshold: 15 },
  { name: "Good Day Biscuit (75g)", barcode: "8901030000803", price: 20, category: "Snacks", unit: "pack", stock: 50, lowStockThreshold: 10 },
  { name: "Hide & Seek (75g)", barcode: "8901030000804", price: 30, category: "Snacks", unit: "pack", stock: 40, lowStockThreshold: 10 },
  { name: "Bourbon (60g)", barcode: "8901030000805", price: 20, category: "Snacks", unit: "pack", stock: 50, lowStockThreshold: 10 },
  { name: "Maggi Noodles (70g)", barcode: "8901030000806", price: 14, category: "Snacks", unit: "pack", stock: 80, lowStockThreshold: 20 },
  { name: "Lays Chips (30g)", barcode: "8901030000807", price: 20, category: "Snacks", unit: "pack", stock: 60, lowStockThreshold: 15 },
  { name: "Kurkure (30g)", barcode: "8901030000808", price: 10, category: "Snacks", unit: "pack", stock: 60, lowStockThreshold: 15 },
  { name: "Haldiram Namkeen (200g)", barcode: "8901030000809", price: 55, category: "Snacks", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Haldiram Bhujia (200g)", barcode: "8901030000810", price: 50, category: "Snacks", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Bikaji Papad (200g)", barcode: "8901030000811", price: 45, category: "Snacks", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Aloo Bhujia (200g)", barcode: "8901030000812", price: 45, category: "Snacks", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Rusk / Toast (200g)", barcode: "8901030000813", price: 30, category: "Snacks", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Bread (400g)", barcode: "8901030000814", price: 35, category: "Snacks", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Khari Biscuit (200g)", barcode: "8901030000815", price: 25, category: "Snacks", unit: "pack", stock: 25, lowStockThreshold: 5 },
  { name: "Cream Roll", barcode: "8901030000816", price: 15, category: "Snacks", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "5 Star Chocolate (22g)", barcode: "8901030000817", price: 10, category: "Snacks", unit: "piece", stock: 50, lowStockThreshold: 10 },
  { name: "Dairy Milk Chocolate (25g)", barcode: "8901030000818", price: 20, category: "Snacks", unit: "piece", stock: 50, lowStockThreshold: 10 },

  // ===== Vegetables =====
  { name: "Onion / Pyaz (1kg)", barcode: "8901030000901", price: 35, category: "Vegetables", unit: "kg", stock: 50, lowStockThreshold: 10 },
  { name: "Potato / Aloo (1kg)", barcode: "8901030000902", price: 30, category: "Vegetables", unit: "kg", stock: 50, lowStockThreshold: 10 },
  { name: "Tomato / Tamatar (1kg)", barcode: "8901030000903", price: 40, category: "Vegetables", unit: "kg", stock: 40, lowStockThreshold: 10 },
  { name: "Green Chilli / Hari Mirch (100g)", barcode: "8901030000904", price: 10, category: "Vegetables", unit: "pack", stock: 40, lowStockThreshold: 10 },
  { name: "Ginger / Adrak (100g)", barcode: "8901030000905", price: 15, category: "Vegetables", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Garlic / Lehsun (100g)", barcode: "8901030000906", price: 20, category: "Vegetables", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Coriander Leaves / Dhaniya (bunch)", barcode: "8901030000907", price: 10, category: "Vegetables", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "Cauliflower / Gobi (1pc)", barcode: "8901030000908", price: 30, category: "Vegetables", unit: "piece", stock: 20, lowStockThreshold: 5 },
  { name: "Cabbage / Patta Gobi (1pc)", barcode: "8901030000909", price: 25, category: "Vegetables", unit: "piece", stock: 20, lowStockThreshold: 5 },
  { name: "Brinjal / Baingan (500g)", barcode: "8901030000910", price: 25, category: "Vegetables", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Lady Finger / Bhindi (250g)", barcode: "8901030000911", price: 20, category: "Vegetables", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Spinach / Palak (bunch)", barcode: "8901030000912", price: 15, category: "Vegetables", unit: "piece", stock: 25, lowStockThreshold: 5 },
  { name: "Carrot / Gajar (500g)", barcode: "8901030000913", price: 25, category: "Vegetables", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Beans / Sem (250g)", barcode: "8901030000914", price: 20, category: "Vegetables", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Bottle Gourd / Lauki (1pc)", barcode: "8901030000915", price: 25, category: "Vegetables", unit: "piece", stock: 15, lowStockThreshold: 5 },
  { name: "Bitter Gourd / Karela (250g)", barcode: "8901030000916", price: 20, category: "Vegetables", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Peas / Matar (250g)", barcode: "8901030000917", price: 30, category: "Vegetables", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Curry Leaves / Kadi Patta", barcode: "8901030000918", price: 5, category: "Vegetables", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "Mint Leaves / Pudina (bunch)", barcode: "8901030000919", price: 10, category: "Vegetables", unit: "piece", stock: 25, lowStockThreshold: 5 },
  { name: "Lemon / Nimbu (4pcs)", barcode: "8901030000920", price: 10, category: "Vegetables", unit: "pack", stock: 30, lowStockThreshold: 8 },

  // ===== Fruits =====
  { name: "Banana / Kela (1 dozen)", barcode: "8901030001001", price: 40, category: "Fruits", unit: "dozen", stock: 30, lowStockThreshold: 8 },
  { name: "Apple / Seb (1kg)", barcode: "8901030001002", price: 150, category: "Fruits", unit: "kg", stock: 20, lowStockThreshold: 5 },
  { name: "Orange / Santra (1kg)", barcode: "8901030001003", price: 80, category: "Fruits", unit: "kg", stock: 20, lowStockThreshold: 5 },
  { name: "Grapes / Angoor (500g)", barcode: "8901030001004", price: 60, category: "Fruits", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Guava / Amrood (500g)", barcode: "8901030001005", price: 40, category: "Fruits", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Papaya / Papita (1pc)", barcode: "8901030001006", price: 40, category: "Fruits", unit: "piece", stock: 10, lowStockThreshold: 3 },
  { name: "Pomegranate / Anar (1pc)", barcode: "8901030001007", price: 50, category: "Fruits", unit: "piece", stock: 15, lowStockThreshold: 5 },
  { name: "Watermelon / Tarbooz (1pc)", barcode: "8901030001008", price: 40, category: "Fruits", unit: "piece", stock: 8, lowStockThreshold: 3 },

  // ===== Household =====
  { name: "Vim Dishwash Bar (200g)", barcode: "8901030001101", price: 20, category: "Household", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "Surf Excel (500g)", barcode: "8901030001102", price: 85, category: "Household", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Wheel Washing Powder (1kg)", barcode: "8901030001103", price: 60, category: "Household", unit: "kg", stock: 20, lowStockThreshold: 5 },
  { name: "Harpic Toilet Cleaner (500ml)", barcode: "8901030001104", price: 85, category: "Household", unit: "ml", stock: 15, lowStockThreshold: 5 },
  { name: "Lizol Floor Cleaner (500ml)", barcode: "8901030001105", price: 95, category: "Household", unit: "ml", stock: 15, lowStockThreshold: 5 },
  { name: "Colin Glass Cleaner (500ml)", barcode: "8901030001106", price: 85, category: "Household", unit: "ml", stock: 10, lowStockThreshold: 3 },
  { name: "Scotch Brite Scrub Pad", barcode: "8901030001107", price: 25, category: "Household", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "Room Freshener (200ml)", barcode: "8901030001108", price: 95, category: "Household", unit: "ml", stock: 10, lowStockThreshold: 3 },
  { name: "Phenyl (500ml)", barcode: "8901030001109", price: 30, category: "Household", unit: "ml", stock: 15, lowStockThreshold: 5 },
  { name: "Agarbatti / Incense Sticks", barcode: "8901030001110", price: 25, category: "Household", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Matchbox", barcode: "8901030001111", price: 2, category: "Household", unit: "piece", stock: 100, lowStockThreshold: 20 },
  { name: "Candle (4pcs)", barcode: "8901030001112", price: 20, category: "Household", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Garbage Bags (10pcs)", barcode: "8901030001113", price: 30, category: "Household", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Aluminium Foil (9m)", barcode: "8901030001114", price: 50, category: "Household", unit: "pack", stock: 10, lowStockThreshold: 3 },
  { name: "Cling Wrap (30m)", barcode: "8901030001115", price: 65, category: "Household", unit: "pack", stock: 8, lowStockThreshold: 3 },
  { name: "Steel Wool", barcode: "8901030001116", price: 10, category: "Household", unit: "piece", stock: 25, lowStockThreshold: 5 },
  { name: "Mosquito Coil (10pcs)", barcode: "8901030001117", price: 35, category: "Household", unit: "pack", stock: 20, lowStockThreshold: 5 },
  { name: "Good Knight Liquid Refill", barcode: "8901030001118", price: 55, category: "Household", unit: "piece", stock: 12, lowStockThreshold: 3 },

  // ===== Personal Care =====
  { name: "Lifebuoy Soap (100g)", barcode: "8901030001201", price: 35, category: "Personal Care", unit: "piece", stock: 40, lowStockThreshold: 10 },
  { name: "Lux Soap (100g)", barcode: "8901030001202", price: 42, category: "Personal Care", unit: "piece", stock: 35, lowStockThreshold: 8 },
  { name: "Dettol Soap (75g)", barcode: "8901030001203", price: 40, category: "Personal Care", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "Head & Shoulders Shampoo (180ml)", barcode: "8901030001204", price: 160, category: "Personal Care", unit: "ml", stock: 15, lowStockThreshold: 5 },
  { name: "Clinic Plus Shampoo (80ml)", barcode: "8901030001205", price: 48, category: "Personal Care", unit: "ml", stock: 20, lowStockThreshold: 5 },
  { name: "Shampoo Sachet (Re 1)", barcode: "8901030001206", price: 1, category: "Personal Care", unit: "piece", stock: 200, lowStockThreshold: 50 },
  { name: "Colgate Toothpaste (100g)", barcode: "8901030001207", price: 52, category: "Personal Care", unit: "pack", stock: 30, lowStockThreshold: 8 },
  { name: "Toothbrush", barcode: "8901030001208", price: 25, category: "Personal Care", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "Coconut Hair Oil (200ml)", barcode: "8901030001209", price: 65, category: "Personal Care", unit: "ml", stock: 20, lowStockThreshold: 5 },
  { name: "Vaseline (100ml)", barcode: "8901030001210", price: 75, category: "Personal Care", unit: "ml", stock: 15, lowStockThreshold: 5 },
  { name: "Fair & Lovely Cream (50g)", barcode: "8901030001211", price: 90, category: "Personal Care", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Navratna Oil (100ml)", barcode: "8901030001212", price: 45, category: "Personal Care", unit: "ml", stock: 20, lowStockThreshold: 5 },
  { name: "Talcum Powder (100g)", barcode: "8901030001213", price: 40, category: "Personal Care", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Dettol Antiseptic (60ml)", barcode: "8901030001214", price: 45, category: "Personal Care", unit: "ml", stock: 12, lowStockThreshold: 3 },
  { name: "Band-Aid (10pcs)", barcode: "8901030001215", price: 30, category: "Personal Care", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Cotton (25g)", barcode: "8901030001216", price: 20, category: "Personal Care", unit: "pack", stock: 15, lowStockThreshold: 5 },
  { name: "Sanitary Pads (8pcs)", barcode: "8901030001217", price: 35, category: "Personal Care", unit: "pack", stock: 20, lowStockThreshold: 5 },

  // ===== Stationery =====
  { name: "Notebook (200 pages)", barcode: "8901030001301", price: 40, category: "Stationery", unit: "piece", stock: 30, lowStockThreshold: 8 },
  { name: "Pen (Blue)", barcode: "8901030001302", price: 10, category: "Stationery", unit: "piece", stock: 50, lowStockThreshold: 10 },
  { name: "Pencil", barcode: "8901030001303", price: 5, category: "Stationery", unit: "piece", stock: 60, lowStockThreshold: 15 },
  { name: "Eraser", barcode: "8901030001304", price: 5, category: "Stationery", unit: "piece", stock: 40, lowStockThreshold: 10 },
  { name: "Sharpener", barcode: "8901030001305", price: 5, category: "Stationery", unit: "piece", stock: 40, lowStockThreshold: 10 },
  { name: "Ruler (30cm)", barcode: "8901030001306", price: 10, category: "Stationery", unit: "piece", stock: 20, lowStockThreshold: 5 },
  { name: "Glue Stick", barcode: "8901030001307", price: 15, category: "Stationery", unit: "piece", stock: 20, lowStockThreshold: 5 },
  { name: "Fevicol (50g)", barcode: "8901030001308", price: 20, category: "Stationery", unit: "piece", stock: 15, lowStockThreshold: 5 },
  { name: "Tape / Cello Tape", barcode: "8901030001309", price: 15, category: "Stationery", unit: "piece", stock: 20, lowStockThreshold: 5 },
  { name: "Stapler", barcode: "8901030001310", price: 40, category: "Stationery", unit: "piece", stock: 8, lowStockThreshold: 3 },
];

async function seed() {
  console.log("Starting grocery seed...\n");

  // Find the shop owner
  const owner = await prisma.user.findFirst({
    where: { role: "SHOP_OWNER" },
  });

  if (!owner) {
    console.error("No SHOP_OWNER user found. Please login first and select Shop Owner role.");
    process.exit(1);
  }

  console.log(`Found owner: ${owner.name} (${owner.id})`);

  // Find or create shop
  let shop = await prisma.shop.findUnique({
    where: { ownerId: owner.id },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: `${owner.name}'s Shop`,
        address: "Village Store",
        phone: "",
      },
    });
    console.log(`Created shop: ${shop.name} (${shop.id})`);
  } else {
    console.log(`Found existing shop: ${shop.name} (${shop.id})`);
  }

  // Check existing items
  const existingCount = await prisma.item.count({
    where: { shopId: shop.id },
  });

  if (existingCount > 0) {
    console.log(`\nShop already has ${existingCount} items. Deleting old items first...`);
    await prisma.item.deleteMany({ where: { shopId: shop.id } });
    console.log("Old items cleared.");
  }

  // Bulk insert
  const result = await prisma.item.createMany({
    data: indianGroceryDataset.map((item) => ({
      shopId: shop.id,
      name: item.name,
      barcode: item.barcode,
      price: item.price,
      category: item.category,
      unit: item.unit,
      stock: item.stock,
      lowStockThreshold: item.lowStockThreshold,
    })),
  });

  console.log(`\nSuccessfully loaded ${result.count} Indian grocery items!`);
  console.log("\nCategories loaded:");
  console.log("  - Grains & Rice (10 items)");
  console.log("  - Pulses & Dals (10 items)");
  console.log("  - Cooking Oils (8 items)");
  console.log("  - Spices (21 items)");
  console.log("  - Sugar, Salt & Essentials (8 items)");
  console.log("  - Dairy (9 items)");
  console.log("  - Beverages (14 items)");
  console.log("  - Snacks (18 items)");
  console.log("  - Vegetables (20 items)");
  console.log("  - Fruits (8 items)");
  console.log("  - Household (18 items)");
  console.log("  - Personal Care (17 items)");
  console.log("  - Stationery (10 items)");
  console.log("\nAll prices are in INR and can be edited from the Inventory page.");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
