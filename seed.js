const mongoose = require('mongoose');
const Product = require('./models/Product');

const dbURI = 'mongodb://127.0.0.1:27017/flexbase';

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedProducts = [
  // ================= ROW 1 =================
  // --- New Arrivals (10 shoes) ---
  { name: "Red Airmax Pro", section: "row1", category: "new-arrivals", price: 25.00, oldPrice: 39.00, image: "/images/red-airmax.png", tag: "sale" },
  { name: "Blue Jordan Retro", section: "row1", category: "new-arrivals", price: 120.00, image: "/images/blue-jordan-retro.png", tag: "new" },
  { name: "Green Nike Air", section: "row1", category: "new-arrivals", price: 95.00, oldPrice: 120.00, image: "/images/green-nike.png", tag: "sale" },
  { name: "Black Adidas Runner", section: "row1", category: "new-arrivals", price: 75.00, image: "/images/black-adidas.png", tag: "new" },
  { name: "Purple Reebok Classic", section: "row1", category: "new-arrivals", price: 65.00, image: "/images/purple-reebok.png" },
  { name: "Yellow Puma Speed", section: "row1", category: "new-arrivals", price: 55.00, oldPrice: 70.00, image: "/images/yellow-puma.png", tag: "sale" },
  { name: "Nike Dunk Shadow", section: "row1", category: "new-arrivals", price: 42.00, oldPrice: 55.00, image: "/images/nike-dunk-shadow.png", tag: "new" },
  { name: "Converse Classic Black", section: "row1", category: "new-arrivals", price: 30.00, oldPrice: 39.00, image: "/images/converse-black.png" },
  { name: "Fila Disruptor II", section: "row1", category: "new-arrivals", price: 45.00, oldPrice: 59.00, image: "/images/fila-disruptor.png", tag: "sale" },
  { name: "Saucony Jazz Original", section: "row1", category: "new-arrivals", price: 38.00, oldPrice: 49.00, image: "/images/saucony-jazz.png" },

  // --- Best Seller (10 shoes) ---
  { name: "Classic White Runner", section: "row1", category: "best-seller", price: 90.00, image: "/images/classic-white.png", tag: "hot" },
  { name: "Sport Black Elite", section: "row1", category: "best-seller", price: 110.00, image: "/images/sport-black.png", tag: "hot" },
  { name: "Premium Gold Edition", section: "row1", category: "best-seller", price: 150.00, image: "/images/gold-premium.png", tag: "limited" },
  { name: "Silver Sport Classic", section: "row1", category: "best-seller", price: 130.00, image: "/images/silver-sport.png" },
  { name: "Elite Performance Pro", section: "row1", category: "best-seller", price: 175.00, image: "/images/elite-pro.png", tag: "limited" },
  { name: "Marathon Runner Special", section: "row1", category: "best-seller", price: 140.00, image: "/images/marathon-special.png" },
  { name: "Nike Air Max Black", section: "row1", category: "best-seller", price: 65.00, oldPrice: 79.00, image: "/images/airmax-black.png" },
  { name: "Adidas Superstar White", section: "row1", category: "best-seller", price: 60.00, oldPrice: 70.00, image: "/images/superstar-white.png" },
  { name: "Vans Checkerboard Slip-On", section: "row1", category: "best-seller", price: 35.00, oldPrice: 45.00, image: "/images/vans-checkerboard.png" },
  { name: "Nike Blazer Mid '77", section: "row1", category: "best-seller", price: 55.00, oldPrice: 69.00, image: "/images/nike-blazer.png" },

  // --- Most Popular (10 shoes) ---
  { name: "Trending Red Sport", section: "row1", category: "most-popular", price: 80.00, image: "/images/trending-red.png", tag: "hot" },
  { name: "Popular Blue Max", section: "row1", category: "most-popular", price: 95.00, image: "/images/popular-blue.png" },
  { name: "Ultra Boost Neon", section: "row1", category: "most-popular", price: 105.00, image: "/images/ultra-neon.png", tag: "hot" },
  { name: "Retro Style White", section: "row1", category: "most-popular", price: 85.00, image: "/images/retro-white.png" },
  { name: "Street Style Urban", section: "row1", category: "most-popular", price: 88.00, image: "/images/street-urban.png", tag: "trending" },
  { name: "Comfort Walk Daily", section: "row1", category: "most-popular", price: 72.00, image: "/images/comfort-daily.png" },
  { name: "Jordan 1 Retro High OG Bred", section: "row1", category: "most-popular", price: 150.00, oldPrice: 175.00, image: "/images/jordan1-bred.png" },
  { name: "Nike Dunk Low Panda", section: "row1", category: "most-popular", price: 95.00, oldPrice: 110.00, image: "/images/dunk-low-panda.png" },
  { name: "Air Jordan 3 White Cement", section: "row1", category: "most-popular", price: 160.00, oldPrice: 180.00, image: "/images/jordan3-whitecement.png" },
  { name: "Nike Air Force 1 Low Black", section: "row1", category: "most-popular", price: 60.00, oldPrice: 75.00, image: "/images/airforce1-black.png" },

  // ================= ROW 2 =================
  // --- New Arrivals (10 shoes) ---
  { name: "Nike Pegasus 40", section: "row2", category: "new-arrivals", price: 70.00, oldPrice: 85.00, image: "/images/nike-pegasus-40.png", tag: "hot" },
  { name: "Adidas Ultraboost Neon", section: "row2", category: "new-arrivals", price: 60.00, oldPrice: 75.00, image: "/images/ultraboost-neon.png", tag: "hot" },
  { name: "Jordan 1 Low Panda", section: "row2", category: "new-arrivals", price: 72.00, oldPrice: 89.00, image: "/images/jordan1-panda.png" },
  { name: "Reebok Club C85", section: "row2", category: "new-arrivals", price: 35.00, oldPrice: 49.00, image: "/images/reebok-clubc85.png" },
  { name: "Yeezy Foam Runner Sand", section: "row2", category: "new-arrivals", price: 80.00, oldPrice: 95.00, image: "/images/yeezy-foam-sand.png" },
  { name: "Nike Air Force White", section: "row2", category: "new-arrivals", price: 55.00, oldPrice: 69.00, image: "/images/airforce-white.png" },
  { name: "Vans Old Skool Blue", section: "row2", category: "new-arrivals", price: 28.00, oldPrice: 39.00, image: "/images/vans-oldskool-blue.png" },
  { name: "Asics Gel Lyte III", section: "row2", category: "new-arrivals", price: 40.00, oldPrice: 52.00, image: "/images/asics-gel-lyte.png" },
  { name: "New Balance 550 White Green", section: "row2", category: "new-arrivals", price: 68.00, oldPrice: 79.00, image: "/images/nb550-white-green.png" },
  { name: "On Cloudswift Grey", section: "row2", category: "new-arrivals", price: 95.00, oldPrice: 110.00, image: "/images/on-cloudswift.png" },

  // --- Best Seller (10 shoes) ---
  { name: "Nike Air Max 97 Silver Bullet", section: "row2", category: "best-seller", price: 100.00, oldPrice: 120.00, image: "/images/airmax97-silver.png", tag: "hot" },
  { name: "Jordan 4 Retro Fire Red", section: "row2", category: "best-seller", price: 120.00, oldPrice: 150.00, image: "/images/jordan4-fire-red.png" },
  { name: "Yeezy 350 Zebra", section: "row2", category: "best-seller", price: 90.00, oldPrice: 110.00, image: "/images/yeezy-350-zebra.png" },
  { name: "Converse Chuck 70", section: "row2", category: "best-seller", price: 50.00, oldPrice: 65.00, image: "/images/converse-chuck70.png" },
  { name: "Reebok Pump Omni Zone", section: "row2", category: "best-seller", price: 72.00, oldPrice: 85.00, image: "/images/reebok-pump.png" },
  { name: "Jordan 11 Cool Grey", section: "row2", category: "best-seller", price: 130.00, oldPrice: 150.00, image: "/images/jordan11-coolgrey.png" },
  { name: "Nike SB Dunk Low Orange Lobster", section: "row2", category: "best-seller", price: 140.00, oldPrice: 170.00, image: "/images/dunk-orange-lobster.png" },
  { name: "Puma Suede Classic Red", section: "row2", category: "best-seller", price: 45.00, oldPrice: 59.00, image: "/images/puma-suede.png" },
  { name: "New Balance 990v5", section: "row2", category: "best-seller", price: 85.00, oldPrice: 99.00, image: "/images/nb990.png" },
  { name: "Under Armour HOVR Sonic", section: "row2", category: "best-seller", price: 95.00, oldPrice: 110.00, image: "/images/ua-hovr.png" },

  // --- Most Popular (10 shoes) ---
  { name: "Yeezy 350 V2 Black", section: "row2", category: "most-popular", price: 180.00, oldPrice: 200.00, image: "/images/yeezy-350-black.png" },
  { name: "Adidas Yeezy Slide Bone", section: "row2", category: "most-popular", price: 70.00, oldPrice: 85.00, image: "/images/yeezy-slide-bone.png" },
  { name: "Nike Air Max Plus TN", section: "row2", category: "most-popular", price: 120.00, oldPrice: 135.00, image: "/images/airmax-tn.png" },
  { name: "Jordan 6 Infrared", section: "row2", category: "most-popular", price: 140.00, oldPrice: 160.00, image: "/images/jordan6-infrared.png" },
  { name: "New Balance 327 Grey", section: "row2", category: "most-popular", price: 80.00, oldPrice: 99.00, image: "/images/nb327-grey.png" },
  { name: "Converse CDG Play White", section: "row2", category: "most-popular", price: 90.00, oldPrice: 110.00, image: "/images/converse-cdg.png" },
  { name: "Yeezy 700 Wave Runner", section: "row2", category: "most-popular", price: 200.00, oldPrice: 230.00, image: "/images/yeezy-700-wave.png" },
  { name: "Jordan 5 Grape", section: "row2", category: "most-popular", price: 125.00, oldPrice: 145.00, image: "/images/jordan5-grape.png" },
  { name: "Nike Kobe 6 Protro Grinch", section: "row2", category: "most-popular", price: 220.00, oldPrice: 250.00, image: "/images/kobe6-grinch.png" },
  { name: "Adidas NMD R1 Black", section: "row2", category: "most-popular", price: 100.00, oldPrice: 120.00, image: "/images/nmd-r1-black.png" },

  // ================= ROW 3 =================
  // --- New Arrivals (10 shoes) ---
  { name: "Nike React Infinity Run", section: "row3", category: "new-arrivals", price: 85.00, oldPrice: 100.00, image: "/images/nike-react.png" },
  { name: "Adidas Forum Low White", section: "row3", category: "new-arrivals", price: 70.00, oldPrice: 85.00, image: "/images/adidas-forum.png" },
  { name: "Jordan MA2 Black Red", section: "row3", category: "new-arrivals", price: 90.00, oldPrice: 110.00, image: "/images/jordan-ma2.png" },
  { name: "Reebok Zig Kinetica", section: "row3", category: "new-arrivals", price: 95.00, oldPrice: 110.00, image: "/images/reebok-zig.png" },
  { name: "Puma Future Rider", section: "row3", category: "new-arrivals", price: 65.00, oldPrice: 80.00, image: "/images/puma-future.png" },
  { name: "New Balance Fresh Foam", section: "row3", category: "new-arrivals", price: 88.00, oldPrice: 105.00, image: "/images/nb-freshfoam.png" },
  { name: "Nike Air Zoom Tempo", section: "row3", category: "new-arrivals", price: 110.00, oldPrice: 125.00, image: "/images/nike-tempo.png" },
  { name: "Asics Novablast", section: "row3", category: "new-arrivals", price: 95.00, oldPrice: 115.00, image: "/images/asics-novablast.png" },
  { name: "On Running Cloud X", section: "row3", category: "new-arrivals", price: 105.00, oldPrice: 120.00, image: "/images/on-cloudx.png" },
  { name: "Hoka Clifton 9", section: "row3", category: "new-arrivals", price: 125.00, oldPrice: 140.00, image: "/images/hoka-clifton.png" },

  // --- Best Seller (10 shoes) ---
  { name: "Nike Air Max 97 Black", section: "row3", category: "best-seller", price: 120.00, oldPrice: 140.00, image: "/images/airmax97-black.png", tag: "hot" },
  { name: "Jordan 11 Retro", section: "row3", category: "best-seller", price: 130.00, oldPrice: 150.00, image: "/images/jordan11-retro.png" },
  { name: "Reebok Classic", section: "row3", category: "best-seller", price: 90.00, oldPrice: 110.00, image: "/images/reebok-classic.png" },
  { name: "Adidas Ultraboost 20", section: "row3", category: "best-seller", price: 60.00, oldPrice: 75.00, image: "/images/ultraboost-20.png" },
  { name: "Nike Air Max 97 White", section: "row3", category: "best-seller", price: 100.00, oldPrice: 120.00, image: "/images/airmax97-white.png" },
  { name: "Jordan 7 Retro", section: "row3", category: "best-seller", price: 140.00, oldPrice: 160.00, image: "/images/jordan7-retro.png" },
  { name: "New Balance 327 White", section: "row3", category: "best-seller", price: 80.00, oldPrice: 99.00, image: "/images/nb327-white.png" },
  { name: "Under Armour Charged Black", section: "row3", category: "best-seller", price: 95.00, oldPrice: 110.00, image: "/images/ua-charged.png" },
  { name: "Puma 7.0 Superlite", section: "row3", category: "best-seller", price: 110.00, oldPrice: 130.00, image: "/images/puma-superlite.png" },
  { name: "Nike Air Max 270 React", section: "row3", category: "best-seller", price: 120.00, oldPrice: 140.00, image: "/images/airmax270-react.png" },

  // --- Most Popular (10 shoes) ---
  { name: "Nike Air Max 97 Black", section: "row3", category: "most-popular", price: 120.00, oldPrice: 140.00, image: "/images/airmax97-black.png" },
  { name: "Jordan 11 Retro", section: "row3", category: "most-popular", price: 130.00, oldPrice: 150.00, image: "/images/jordan11-retro.png" },
  { name: "Reebok Classic", section: "row3", category: "most-popular", price: 90.00, oldPrice: 110.00, image: "/images/reebok-classic.png" },
  { name: "Adidas Ultraboost 20", section: "row3", category: "most-popular", price: 60.00, oldPrice: 75.00, image: "/images/ultraboost-20.png" },
  { name: "Nike Air Max 97 White", section: "row3", category: "most-popular", price: 100.00, oldPrice: 120.00, image: "/images/airmax97-white.png" },
  { name: "Jordan 7 Retro", section: "row3", category: "most-popular", price: 140.00, oldPrice: 160.00, image: "/images/jordan7-retro.png" },
  { name: "New Balance 327 White", section: "row3", category: "most-popular", price: 80.00, oldPrice: 99.00, image: "/images/nb327-white.png" },
  { name: "Reebok Classic Black", section: "row3", category: "most-popular", price: 90.00, oldPrice: 110.00, image: "/images/reebok-classic-black.png" },
  { name: "Under Armour Charged Black", section: "row3", category: "most-popular", price: 95.00, oldPrice: 110.00, image: "/images/ua-charged.png" },
  { name: "Puma 7.0 Superlite", section: "row3", category: "most-popular", price: 110.00, oldPrice: 130.00, image: "/images/puma-superlite.png" }

];


Product.deleteMany({})
  .then(() => Product.insertMany(seedProducts))
  .then(() => {
    console.log('Database seeded with sneakers!');
    mongoose.connection.close();
  });
