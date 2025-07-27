# Scrapify - Scrap Material Marketplace
🔗 [Live Demo](https://sachinbhanu7.github.io/Scrapify) | 📁 [GitHub Repository](https://github.com/sachinbhanu7/Scrapify)

Scrapify is a web-based platform that connects scrap material sellers with potential buyers. The platform allows sellers to list their scrap materials in bulk, and buyers can place bids on these listings.

## Features

### For Sellers:
- Create detailed listings with images and descriptions of scrap materials
- Manage all listings from a personal dashboard
- Create & manage premium listings with exclusive visibility
- View and respond to bids from interested buyers
- Track transaction history
- Receive reviews from buyers

### For Buyers:

- Browse available scrap material listings
- Place bids on listings
- Access premium listings and seller contact info through premium membership
- Track all placed bids and their status
- Leave reviews for sellers


## Technology Stack

- HTML5, CSS3, JavaScript (Vanilla)
- Firebase Firestore (for data handling)
- Firebase Storage (for user-uploaded images)
- Local Storage (used in initial prototype/demo)

This project uses a frontend-only approach with local storage and firebase database for data persistence and image storage respectively, making it easy to demo and test without requiring a backend server.

## Project Structure

```
/scrapify
├── index.html                     ⟶ Homepage (View all scrap listings)
│
├── login.html                     ⟶ Login/Register (For both roles)
│
├── dashboard/
│   ├── seller-dashboard.html      ⟶ Seller dashboard: listings + bids
│   └── buyer-dashboard.html       ⟶ Buyer dashboard: bids placed
│
├── listings/
│   ├── add-listing.html           ⟶ Seller adds new scrap item
│   └── listing-details.html       ⟶ View single listing + place bid
│
├── plans.html                     ⟶ Premium plans page (upgrade plans)
│
├── about.html                     ⟶ Info about platform
│
├── contact.html                   ⟶ Contact form
│
├── css/
│   └── style.css                  ⟶ All styles
│
├── js/
│   ├── auth.js                    ⟶ Login/Register logic
│   ├── listings.js                ⟶ Create, render, and manage listings
│   ├── dashboard.js               ⟶ Dashboard data handling
│
└── data/
    └── dummy.json                 ⟶ Dummy data for listings, bids, users
```

## Getting Started

1. Clone the repository or download the files
2. Open `index.html` in a modern web browser
3. No server setup required - the app runs entirely in the browser

## Demo Accounts

For testing purposes, you can use these pre-configured accounts:

### Seller Accounts:
- Email: john@example.com
- Password: password

### Buyer Accounts:
- Email: sarah@example.com
- Password: password

## Local Storage

This application uses the browser's local storage to persist data. The following data structures are stored:

- `users`: Array of user objects (sellers and buyers)
- `listings`: Array of scrap material listings
- `bids`: Array of bids placed on listings

## Development

To modify or extend this project:

1. Edit the HTML files for structure and layout changes  
2. Modify `css/style.css` for styling updates  
3. Update JavaScript files in the `js/` directory for functionality changes  
4. Modify Firebase Storage logic for image upload and retrieval  
5. LocalStorage logic can be updated for managing users, listings, and bids

## Premium Plans

- Both buyers and sellers can upgrade to premium plans
- Premium sellers get boosted listing visibility
- Premium buyers can view seller contact details
- Premium plans page is designed and functional (payment gateway not integrated)


## Future Scope

- Integrate secure payment gateway for premium plan purchases  
- Add real-time chat system for direct communication between buyers and sellers  
- Include chatbot support for FAQs and automated help  
- Enable real-time notifications for bids and messages  
- Implement user analytics dashboard for sellers


## License

This project is open source and available under the [MIT License](LICENSE). 
