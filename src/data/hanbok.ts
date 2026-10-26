export const hbDates = [["Today", "Mon, Oct 5"], ["Tomorrow", "Tue, Oct 6"], ["Wed", "Wed, Oct 7"], ["Thu", "Thu, Oct 8"]];

export const hbOptions: Record<string, number> = { Classic: 0, "Modern fusion": 3000, "Royal court": 5000 };

export const hbAcc: Record<string, number> = { "Hair accessory": 3000, "Traditional bag": 4000, "Photo props set": 5000 };

export const hanbokShops = [
  { name: "Hanbok Dream", dist: 150, rating: 4.8, reviews: 312, prices: { "2 hours": 18000, "4 hours": 25000, "Full day": 35000 } as Record<string, number>, desc: "A friendly shop beside the palace's main gate with over 300 outfits in modern and classic styles. English, Chinese and Vietnamese spoken.", included: ["Hanbok top and bottom", "Shoes", "Hair styling basics", "Locker for your belongings"], pickup: "Pickup and return at the shop, 2 min walk from Gwanghwamun Gate. Return within your rental period." },
  { name: "Gungmoon Hanbok", dist: 280, rating: 4.6, reviews: 198, prices: { "2 hours": 15000, "4 hours": 22000, "Full day": 30000 } as Record<string, number>, desc: "Classic hanbok in soft palace colours, popular for photos at Geunjeongjeon and Gyeonghoeru.", included: ["Hanbok top and bottom", "Shoes", "Locker"], pickup: "Pickup and return at the shop near Gyeongbokgung Station, Exit 5." },
  { name: "Sunrise Hanbok Atelier", dist: 620, rating: 4.9, reviews: 87, prices: { "4 hours": 32000, "Full day": 45000 } as Record<string, number>, desc: "Premium royal-court style outfits with professional hair styling. Limited slots each day.", included: ["Premium hanbok set", "Shoes and bag", "Professional hair styling", "Locker"], pickup: "Pickup and return at the atelier in Samcheong-dong. Free shuttle to the palace gate." },
  { name: "Bukchon Hanbok House", dist: 1100, rating: 4.5, reviews: 143, prices: { "2 hours": 14000, "4 hours": 20000, "Full day": 28000 } as Record<string, number> , desc: "Budget-friendly rentals in the Bukchon hanok village, a short walk from the palace.", included: ["Hanbok top and bottom", "Shoes"], pickup: "Pickup and return at the shop in Bukchon, 12 min walk from the palace." },
];
