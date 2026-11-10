export const currentUser = {
  name: "Nidhi Palandurkar",
  role: "Student · Passenger",
  college: "G H Raisoni College",
  avatarInitials: "NP",
  verified: true,
  stats: { rides: 12, rating: 4.8, onTime: 92 },
};

export const rides = [
  {
    id: 1,
    driver: "Rohit Sharma",
    initials: "RS",
    rating: "4.8",
    reviews: 120,
    car: "Toyota Etios · MH 12 AB 1234",
    time: "8:00 AM",
    price: 40,
    badges: ["Verified driver", "Student friendly"],
  },
  {
    id: 2,
    driver: "Sneha Patil",
    initials: "SP",
    rating: "4.6",
    reviews: 85,
    car: "Hyundai i20 · MH 31 CD 5678",
    time: "8:15 AM",
    price: 45,
    badges: ["Female driver", "Verified"],
  },
  {
    id: 3,
    driver: "Amit Verma",
    initials: "AV",
    rating: "4.7",
    reviews: 98,
    car: "Honda City · MH 12 XY 3456",
    time: "8:20 AM",
    price: 50,
    badges: ["Popular", "Verified"],
  },
];

export const rideHistory = [
  { id: 1, route: "College → Home", price: 45, date: "12 Aug, 8:15 AM", driver: "Rohit Sharma", rating: "4.8", status: "Completed" },
  { id: 2, route: "Home → College", price: 40, date: "10 Aug, 7:50 AM", driver: "Sneha Patil", rating: "4.6", status: "Completed" },
  { id: 3, route: "College → Railway Station", price: 60, date: "8 Aug, 5:30 PM", driver: "Amit Verma", rating: "4.7", status: "Completed" },
  { id: 4, route: "Railway Station → College", price: 55, date: "5 Aug, 10:10 AM", driver: "Pooja Deshmukh", rating: "4.9", status: "Completed" },
];

export const chatMessages = [
  { id: 1, from: "them", text: "Hi! I'm on my way. I'll reach in 5 mins.", time: "8:02 AM" },
  { id: 2, from: "me", text: "Okay! I'm waiting near the main gate.", time: "8:03 AM" },
  { id: 3, from: "them", text: "Got it", time: "8:04 AM" },
];

export const notifications = [
  { id: 1, title: "Your ride has been confirmed!", subtitle: "Rohit Sharma · 8:02 AM", type: "ride" },
  { id: 2, title: "Payment received", subtitle: "\u20b940 · 8:05 AM", type: "payment" },
  { id: 3, title: "New message", subtitle: "Rohit Sharma · 8:03 AM", type: "message" },
  { id: 4, title: "Ride cancelled", subtitle: "Amit Verma · 7:45 AM", type: "cancel" },
  { id: 5, title: "Welcome to along.", subtitle: "Explore your ride options · 6:30 AM", type: "info" },
];

export const transactions = [
  { id: 1, title: "Ride payment", amount: -40, date: "Today, 8:02 AM", to: "Rohit Sharma" },
  { id: 2, title: "Added money", amount: 500, date: "Yesterday, 5:14 PM" },
  { id: 3, title: "Ride refund", amount: 40, date: "12 Aug, 2025" },
];
