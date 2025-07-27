// Add necessary imports and setup for Firestore at the top of file (kept in comments for documentation)
// import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', () => {
    // Force update images in localStorage
    forceUpdateImages();
    
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    updateHeaderForLoggedInUser();
    
    // Setup the page based on current location
    setupPage().catch(error => {
        console.error('Error during page setup:', error);
    });
    
    // Add smooth scrolling for the listings link
    const scrollLinks = document.querySelectorAll('.scroll-to');
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Initialize testimonial carousel
    initTestimonialCarousel();
    
    // Set up Start Listing button
    setupStartListingButton();
    
    // Set up all Add Listing buttons
    setupAllListingButtons();
});

// Function to update header for logged in users
function updateHeaderForLoggedInUser() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const loginBtn = document.querySelector('.btn-login');
    
    // Always show the "List Your Scrap" button
    const addListingContainer = document.getElementById('add-listing-container');
    if (addListingContainer) {
        addListingContainer.style.display = 'block';
    }
    
    if (!loginBtn) return;
    
    if (currentUser) {
        // Create dropdown for user
        loginBtn.innerHTML = `${currentUser.name} <span>▼</span>`;
        loginBtn.href = '#';
        loginBtn.classList.add('user-menu');
        
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        
        // Fix dashboard link path to work from any page by using absolute path from root
        const dashboardLink = document.createElement('a');
        const isInListingsDir = window.location.pathname.includes('/listings/');
        dashboardLink.href = isInListingsDir 
            ? '../dashboard/seller-dashboard.html' 
            : 'dashboard/seller-dashboard.html';
        
        if (currentUser.role === 'buyer') {
            dashboardLink.href = isInListingsDir 
                ? '../dashboard/buyer-dashboard.html' 
                : 'dashboard/buyer-dashboard.html';
        }
        
        dashboardLink.textContent = 'Dashboard';
        
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.reload();
        });
        
        dropdown.appendChild(dashboardLink);
        dropdown.appendChild(logoutLink);
        
        // Add dropdown to login button parent
        loginBtn.parentNode.style.position = 'relative';
        loginBtn.parentNode.appendChild(dropdown);
        
        // Toggle dropdown on click
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!loginBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }
}

// Load listings from Firestore and local storage
async function loadListings() {
    // First attempt to load from localStorage as a quick start
    let listings = JSON.parse(localStorage.getItem('listings')) || [];
    const listingsContainer = document.getElementById('listings-container');
    
    // Display loading state
    if (listingsContainer) {
        listingsContainer.innerHTML = '<div class="loading">Loading listings...</div>';
    }
    
    // Attempt to load from Firestore if available
    if (window.db && window.firestoreCollection && window.firestoreGetDocs) {
        try {
            console.log('Attempting to fetch listings from Firestore...');
            
            const listingsCollectionRef = window.firestoreCollection(window.db, "listings");
            const querySnapshot = await window.firestoreGetDocs(listingsCollectionRef);
            
            // Convert Firestore documents to listings
            const firestoreListings = [];
            querySnapshot.forEach((doc) => {
                firestoreListings.push(doc.data());
            });
            
            console.log(`Fetched ${firestoreListings.length} listings from Firestore`);
            
            if (firestoreListings.length > 0) {
                // Merge with localStorage listings, preferring Firestore versions of the same listing ID
                const existingIds = new Set(firestoreListings.map(listing => listing.id));
                const localOnlyListings = listings.filter(listing => !existingIds.has(listing.id));
                
                // Combine Firestore listings with local-only listings
                listings = [...firestoreListings, ...localOnlyListings];
                
                // Update localStorage with the combined listings for offline access
                try {
                    localStorage.setItem('listings', JSON.stringify(listings));
                    console.log('Updated localStorage with Firestore listings');
                } catch (error) {
                    console.error('Failed to update localStorage with Firestore listings:', error);
                }
            }
        } catch (error) {
            console.error('Error fetching listings from Firestore:', error);
            // Continue with localStorage listings as fallback
        }
    }
    
    // If no listings exist after all attempts, create dummy data for demonstration
    if (listings.length === 0) {
        createDummyListings();
        listings = JSON.parse(localStorage.getItem('listings')) || [];
    }
    
    // Clear container before adding listings
    if (listingsContainer) {
        listingsContainer.innerHTML = '';
        
        // Display listings
        if (listings.length === 0) {
            listingsContainer.innerHTML = '<p class="no-listings">No listings available at the moment.</p>';
        } else {
            listings.forEach(listing => {
                const listingCard = createListingCard(listing);
                listingsContainer.appendChild(listingCard);
            });
        }
    }
    
    return listings;
}

// Create a listing card element
function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    
    // Default image in case the listing has no images or they fail to load
    let imageUrl = 'https://via.placeholder.com/300x200?text=No+Image';
    
    console.log('Creating card for listing:', listing.id, 'Images:', listing.images);
    
    // Try to get the first image from the listing if it exists
    if (listing.images && listing.images.length > 0) {
        // Check if the image URL is valid
        if (typeof listing.images[0] === 'string' && listing.images[0].trim() !== '') {
            imageUrl = listing.images[0];
            console.log('Using image URL:', imageUrl.substring(0, 50) + '...');
        }
    }
    
    card.innerHTML = `
        <div class="listing-img">
            <img src="${imageUrl}" alt="${listing.title}" 
                onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Image+Failed+To+Load'; console.error('Image load failed for listing ${listing.id}');" 
                onload="console.log('Image loaded successfully for listing ${listing.id}');"
                loading="lazy">
        </div>
        <div class="listing-info">
            <h3 class="listing-title">${listing.title}</h3>
            <p class="listing-price">₹${listing.startingPrice}</p>
            <p>${truncateText(listing.description, 100)}</p>
            <div class="listing-details">
                <span>${listing.location}</span>
                <span>${formatDate(listing.createdAt)}</span>
            </div>
            <a href="listings/listing-details.html?id=${listing.id}" class="btn" style="margin-top: 15px; display: block; text-align: center; background-color: #1565c0; color: white; font-weight: 600; padding: 10px 15px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">View Details</a>
        </div>
    `;
    
    // Add a direct event handler for the image
    const img = card.querySelector('img');
    img.addEventListener('error', function() {
        console.error('Error loading image via event listener for listing:', listing.id);
        this.src = 'https://via.placeholder.com/300x200?text=Error+Loading+Image';
    });
    
    return card;
}

// Load listing details
async function loadListingDetails(listingId) {
    // Try to fetch from Firestore first
    let listing = null;
    
    if (window.db && window.firestoreDoc && window.firestoreGetDoc) {
        try {
            console.log('Attempting to fetch listing details from Firestore for ID:', listingId);
            
            // Get the document reference and use getDoc for a single document
            const listingDocRef = window.firestoreDoc(window.db, "listings", listingId);
            const docSnap = await window.firestoreGetDoc(listingDocRef);
            
            if (docSnap.exists()) {
                listing = docSnap.data();
                console.log('Found listing in Firestore:', listing);
            } else {
                console.log('Listing not found in Firestore, checking localStorage');
            }
        } catch (error) {
            console.error('Error fetching listing from Firestore:', error);
            // Continue to localStorage as fallback
        }
    }
    
    // If not found in Firestore, check localStorage
    if (!listing) {
        const listings = JSON.parse(localStorage.getItem('listings')) || [];
        listing = listings.find(l => l.id === listingId);
    }
    
    if (!listing) {
        console.error('Listing not found:', listingId);
        window.location.href = '../index.html';
        return;
    }
    
    // Update main image
    const mainImageElem = document.querySelector('.main-image img');
    mainImageElem.src = listing.images[0] || '../img/placeholder.jpg';
    mainImageElem.onerror = function() {
        console.error('Error loading main image:', this.src);
        this.src = 'https://via.placeholder.com/600x400?text=No+Image+Available';
    };
    
    // Update thumbnails
    const thumbnailsContainer = document.querySelector('.gallery-thumbnails');
    thumbnailsContainer.innerHTML = '';
    
    console.log('Loading thumbnails for listing:', listing.id);
    console.log('Image URLs:', listing.images);
    
    listing.images.forEach((image, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        
        const imgElement = document.createElement('img');
        imgElement.alt = "Thumbnail";
        imgElement.src = image;
        
        // Add event listeners for loading and error handling
        imgElement.onload = function() {
            console.log('Thumbnail loaded successfully:', image);
        };
        
        imgElement.onerror = function() {
            console.error('Error loading thumbnail:', image);
            this.src = 'https://via.placeholder.com/100x100?text=Error';
        };
        
        thumbnail.appendChild(imgElement);
        
        thumbnail.addEventListener('click', () => {
            mainImageElem.src = image;
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumbnail.classList.add('active');
        });
        
        thumbnailsContainer.appendChild(thumbnail);
    });
    
    // Update listing info
    document.querySelector('.listing-header h2').textContent = listing.title;
    document.querySelector('.listing-header .price').textContent = `₹${listing.startingPrice}`;
    document.querySelector('.listing-meta').innerHTML = `
        <span>${listing.category}</span>
        <span>${listing.location}</span>
        <span>${formatDate(listing.createdAt)}</span>
    `;
    document.querySelector('.listing-description').textContent = listing.description;
    
    // Load seller info
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const seller = users.find(u => u.id === listing.sellerId);
    
    if (seller) {
        document.querySelector('.seller-avatar img').src = seller.profileImage || '../img/default-seller.jpg';
        document.querySelector('.seller-name').textContent = seller.name;
        
        // Calculate seller rating
        const reviews = seller.reviews || [];
        let avgRating = 0;
        
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            avgRating = (totalRating / reviews.length).toFixed(1);
        }
        
        document.querySelector('.seller-rating').innerHTML = `${avgRating} ★ (${reviews.length} reviews)`;
    }
    
    // Load current bids
    loadCurrentBids(listingId);
    
    // Setup bid form
    setupBidForm(listingId);
    
    return listing;
}

// Load current bids for a listing
function loadCurrentBids(listingId) {
    const bids = JSON.parse(localStorage.getItem('bids')) || [];
    const listingBids = bids.filter(bid => bid.listingId === listingId);
    
    const bidsContainer = document.querySelector('.current-bids-list');
    
    if (listingBids.length === 0) {
        bidsContainer.innerHTML = '<p class="no-bids">No bids yet. Be the first to place a bid!</p>';
        return;
    }
    
    bidsContainer.innerHTML = '';
    
    // Sort bids by amount (highest first)
    listingBids.sort((a, b) => b.amount - a.amount);
    
    // Get users for buyer names
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    listingBids.forEach(bid => {
        const buyer = users.find(u => u.id === bid.buyerId);
        const bidElement = document.createElement('div');
        bidElement.className = 'bid-card';
        
        bidElement.innerHTML = `
            <div class="bid-info">
                <h4>${buyer ? buyer.name : 'Anonymous'}</h4>
                <div class="bid-amount">₹${bid.amount}</div>
                <div class="bid-date">${formatDate(bid.createdAt)}</div>
            </div>
            <div class="bid-status status-${bid.status}">${capitalizeFirstLetter(bid.status)}</div>
        `;
        
        bidsContainer.appendChild(bidElement);
    });
}

// Setup bid form
function setupBidForm(listingId) {
    const bidForm = document.getElementById('bid-form');
    
    if (!bidForm) return;
    
    // Remove any existing event listeners
    const newForm = bidForm.cloneNode(true);
    bidForm.parentNode.replaceChild(newForm, bidForm);
    
    // Add new event listener
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            window.location.href = '../login.html';
            return;
        }
        
        // Verify user is a buyer
        if (currentUser.role !== 'buyer') {
            alert('Only buyers can place bids!');
            return;
        }
        
        const bidAmount = parseFloat(document.getElementById('bid-amount').value);
        const bidMessage = document.getElementById('bid-message').value;
        
        // Get listing details for validation
        const listings = JSON.parse(localStorage.getItem('listings')) || [];
        const listing = listings.find(l => l.id === listingId);
        
        // Validate bid amount
        if (isNaN(bidAmount) || bidAmount <= 0) {
            alert('Please enter a valid bid amount');
            return;
        }
        
        if (bidAmount < listing.startingPrice) {
            alert(`Bid amount must be at least ₹${listing.startingPrice}`);
            return;
        }
        
        // Create new bid
        const newBid = {
            id: Date.now().toString(),
            listingId,
            buyerId: currentUser.id,
            amount: bidAmount,
            message: bidMessage,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Add bid to local storage
        const bids = JSON.parse(localStorage.getItem('bids')) || [];
        bids.push(newBid);
        localStorage.setItem('bids', JSON.stringify(bids));
        
        // Add bid to user's bids
        if (!currentUser.bids) {
            currentUser.bids = [];
        }
        currentUser.bids.push(newBid.id);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update users in local storage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex !== -1) {
            // Make sure the user in the users array has a bids array
            if (!users[userIndex].bids) {
                users[userIndex].bids = [];
            }
            users[userIndex].bids.push(newBid.id);
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // Show success message
        alert('Bid placed successfully!');
        
        // Reload current bids
        loadCurrentBids(listingId);
        
        // Reset form
        newForm.reset();
    });
}

// Setup add listing form
function setupAddListingForm() {
    const addListingForm = document.getElementById('add-listing-form');
    const imageUpload = document.getElementById('image-upload');
    const imageInput = document.getElementById('listing-images');
    const imagePreview = document.getElementById('image-preview');
    
    // Handle image upload UI
    if (imageUpload && imageInput) {
        console.log('Image upload and input elements found, setting up event handlers');
        
        // Show file input when clicking on upload area
        imageUpload.addEventListener('click', () => {
            console.log('Upload area clicked, triggering file input click');
            imageInput.click();
        });
        
        // Preview selected images
        let selectedImages = [];
        imageInput.addEventListener('change', async (e) => {
            console.log('File input change event triggered');
            const files = e.target.files;
            console.log('Files selected:', files ? files.length : 0);
            
            if (files.length > 0) {
                imagePreview.innerHTML = '';
                selectedImages = [];
                
                // Limit to 5 images
                const maxImages = Math.min(files.length, 5);
                console.log(`Processing ${maxImages} images`);
                
                for (let i = 0; i < maxImages; i++) {
                    const file = files[i];
                    console.log(`Processing file ${i+1}/${maxImages}: ${file.name}, size: ${file.size} bytes`);
                    
                    try {
                        // Process and resize the image
                        console.log('Calling processImage for', file.name);
                        const imageUrl = await processImage(file);
                        console.log('Received image URL:', imageUrl.substring(0, 50) + '...');
                        selectedImages.push(imageUrl);
                        
                        // Create preview element
                        const previewItem = document.createElement('div');
                        previewItem.className = 'preview-item';
                        previewItem.innerHTML = `
                            <img src="${imageUrl}" alt="Preview">
                            <span class="preview-remove" data-index="${i}">×</span>
                        `;
                        imagePreview.appendChild(previewItem);
                        console.log('Preview element added to DOM');
                        
                        // Add event listener to remove button
                        previewItem.querySelector('.preview-remove').addEventListener('click', (e) => {
                            e.stopPropagation();
                            const index = parseInt(e.target.getAttribute('data-index'));
                            selectedImages.splice(index, 1);
                            previewItem.remove();
                            
                            // Update indices
                            const removeButtons = imagePreview.querySelectorAll('.preview-remove');
                            removeButtons.forEach((btn, idx) => {
                                btn.setAttribute('data-index', idx);
                            });
                        });
                    } catch (error) {
                        console.error('Error processing image:', error);
                        // Show error notification
                        alert('Error processing image: ' + error.message);
                    }
                }
            }
        });
        
        // Handle drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            imageUpload.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            imageUpload.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            imageUpload.addEventListener(eventName, unhighlight, false);
        });

        function highlight() {
            imageUpload.classList.add('highlight');
        }

        function unhighlight() {
            imageUpload.classList.remove('highlight');
        }
        
        imageUpload.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            console.log('Drop event triggered');
            const dt = e.dataTransfer;
            const files = dt.files;
            console.log('Dropped files:', files ? files.length : 0);
            
            if (files.length > 0) {
                // Process the dropped files directly instead of using the file input
                imagePreview.innerHTML = '';
                selectedImages = [];
                
                // Limit to 5 images
                const maxImages = Math.min(files.length, 5);
                console.log(`Processing ${maxImages} dropped files`);
                
                // Process each file
                for (let i = 0; i < maxImages; i++) {
                    const file = files[i];
                    console.log(`Processing dropped file ${i+1}/${maxImages}: ${file.name}, size: ${file.size} bytes`);
                    
                    // Use the same processing function we have for the file input
                    (async function() {
                        try {
                            console.log('Calling processImage for dropped file', file.name);
                            const imageUrl = await processImage(file);
                            console.log('Received image URL for dropped file:', imageUrl.substring(0, 50) + '...');
                            selectedImages.push(imageUrl);
                            
                            // Create preview element
                            const previewItem = document.createElement('div');
                            previewItem.className = 'preview-item';
                            previewItem.innerHTML = `
                                <img src="${imageUrl}" alt="Preview">
                                <span class="preview-remove" data-index="${selectedImages.length - 1}">×</span>
                            `;
                            imagePreview.appendChild(previewItem);
                            console.log('Preview element added to DOM for dropped file');
                            
                            // Add event listener to remove button
                            previewItem.querySelector('.preview-remove').addEventListener('click', (e) => {
                                e.stopPropagation();
                                const index = parseInt(e.target.getAttribute('data-index'));
                                selectedImages.splice(index, 1);
                                previewItem.remove();
                                
                                // Update indices
                                const removeButtons = imagePreview.querySelectorAll('.preview-remove');
                                removeButtons.forEach((btn, idx) => {
                                    btn.setAttribute('data-index', idx);
                                });
                            });
                        } catch (error) {
                            console.error('Error processing dropped image:', error);
                        }
                    })();
                }
            }
        }
    }

    addListingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            window.location.href = '../login.html';
            return;
        }
        
        // Verify user is a seller
        if (currentUser.role !== 'seller') {
            alert('Only sellers can add listings!');
            return;
        }
        
        // Get form values
        const title = document.getElementById('listing-title').value;
        const category = document.getElementById('listing-category').value;
        const description = document.getElementById('listing-description').value;
        const startingPrice = parseFloat(document.getElementById('listing-price').value);
        const quantity = parseInt(document.getElementById('listing-quantity').value);
        const location = document.getElementById('listing-location').value;
        
        // Validate form
        if (!title || !category || !description || isNaN(startingPrice) || isNaN(quantity) || !location) {
            alert('Please fill in all fields');
            return;
        }
        
        // Check if we have the selected images array defined
        let images = [];
        if (typeof selectedImages !== 'undefined' && selectedImages.length > 0) {
            images = [...selectedImages];
        } else {
            // If no images, use placeholder images
            images = [
                'https://via.placeholder.com/300x200?text=No+Image+Provided'
            ];
        }
        
        // Create new listing with a unique ID
        const listingId = Date.now().toString();
        const newListing = {
            id: listingId,
            sellerId: currentUser.id,
            title,
            category,
            description,
            startingPrice,
            quantity,
            location,
            images: images,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        try {
            // 1. Try to save to Firestore if available
            if (window.db) {
                try {
                    console.log('Attempting to save listing to Firestore...');
                    
                    // Use the global Firestore functions
                    const listingsCollection = window.firestoreCollection(window.db, "listings");
                    const listingDocRef = window.firestoreDoc(window.db, "listings", listingId);
                    
                    // Save listing to Firestore
                    await window.firestoreSetDoc(listingDocRef, newListing);
                    console.log('Listing saved to Firestore:', listingId);
                } catch (firestoreError) {
                    console.error('Error saving to Firestore:', firestoreError);
                    // Continue with localStorage as fallback
                }
            }
            
            // 2. Always save to localStorage as a backup/fallback
            const listings = JSON.parse(localStorage.getItem('listings')) || [];
            listings.push(newListing);
            
            try {
                localStorage.setItem('listings', JSON.stringify(listings));
                console.log('Listing saved successfully to localStorage!');
            } catch (storageError) {
                console.error('localStorage error:', storageError);
                alert('Warning: Your browser storage is full. The listing was saved to the cloud but may not appear in all places.');
            }
            
            // 3. Update user's listings array
            if (!currentUser.listings) {
                currentUser.listings = [];
            }
            currentUser.listings.push(newListing.id);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // 4. Update users in local storage
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            
            if (userIndex !== -1) {
                users[userIndex] = currentUser;
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            // Show success message and redirect
            alert('Listing created successfully!');
            window.location.href = '../dashboard/seller-dashboard.html';
            
        } catch (error) {
            console.error('Error creating listing:', error);
            alert('Error creating listing. Please try again.');
        }
    });
}

// Create dummy listings for demonstration
function createDummyListings() {
    const dummyListings = [
        {
            id: '1',
            sellerId: 'seller1',
            title: 'Scrap Metal - Mixed Aluminum',
            category: 'Metal',
            description: 'Approximately 500kg of mixed aluminum scrap. Mostly composed of old window frames, gutters, and some machinery parts. All clean and sorted.',
            startingPrice: 750,
            quantity: 500,
            location: 'Maharashtra',
            images: [
                'https://5.imimg.com/data5/SELLER/Default/2024/12/473299537/FT/FW/RM/31907690/aluminium-scrap.jpg',
                'https://tiimg.tistatic.com/fp/1/005/104/low-price-metal-scrap-001.jpg',
                'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgABw20SuUeQjXV2qdTSxQX6_16Gcy7l-kKQ&s'
            ],
            status: 'active',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        },
        {
            id: '2',
            sellerId: 'seller2',
            title: 'Copper Wiring - Industrial Grade',
            category: 'Metal',
            description: 'High-quality copper wiring from decommissioned factory. Clean, no insulation. Approximately 200kg total weight.',
            startingPrice: 1200,
            quantity: 200,
            location: 'Gujarat',
            images: [
                'https://5.imimg.com/data5/SELLER/Default/2022/12/GV/JN/XC/18458210/scrap5-500x500.jpg',
                'https://sgt-scrap.com/wp-content/uploads/2023/06/Household-appliances-ideal-for-scrapping.jpg',
                'https://thumbs.dreamstime.com/b/broken-household-appliances-collected-recycling-pile-refrigerators-washing-machines-other-electronic-yard-purposes-338245354.jpg'
            ],
            status: 'active',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
        },
        {
            id: '3',
            sellerId: 'seller1',
            title: 'Scrap Electronics - Computer Parts',
            category: 'Electronics',
            description: 'Mixed lot of computer parts including motherboards, CPUs, RAM, and other components. Perfect for gold and precious metal recovery.',
            startingPrice: 500,
            quantity: 150,
            location: 'Karnataka',
            images: [
                'https://media.istockphoto.com/id/155421314/photo/computer-parts.jpg?s=612x612&w=0&k=20&c=gjw5eWyvQQwd0Fb7XcU1L2IJJIgUQ8d6fIeTgSKu43k=',
                'https://images.unsplash.com/photo-1622376727185-71e011e9911c',
                'https://images.unsplash.com/photo-1572204099230-6c1f595a6b90'
            ],
            status: 'active',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        },
        {
            id: '4',
            sellerId: 'seller3',
            title: 'Steel Beams - Construction Surplus',
            category: 'Metal',
            description: 'Unused steel beams from abandoned construction project. All in excellent condition, minimal rust. Approximately 1000kg total.',
            startingPrice: 850,
            quantity: 1000,
            location: 'Tamil Nadu',
            images: [
                'https://midcitysteel.com/wp-content/gallery/beams-surplus-steel-various-sizes/surplus-beams-00012.jpg',
                'https://images.unsplash.com/photo-1602605761463-e769cfa0b388',
                'https://images.unsplash.com/photo-1617782719494-d9dd071e4cfc'
            ],
            status: 'active',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        }
    ];
    
    // Create dummy users if they don't exist
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    if (!users.some(user => user.id === 'seller1')) {
        users.push({
            id: 'seller1',
            name: 'John Smith',
            email: 'john@example.com',
            password: 'password',
            role: 'seller',
            profileImage: 'img/default-seller.jpg',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            listings: ['1', '3'],
            reviews: [
                {
                    id: 'review1',
                    buyerId: 'buyer1',
                    rating: 4.5,
                    comment: 'Great seller, fast response!',
                    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
                }
            ]
        });
    }
    
    if (!users.some(user => user.id === 'seller2')) {
        users.push({
            id: 'seller2',
            name: 'Jane Doe',
            email: 'jane@example.com',
            password: 'password',
            role: 'seller',
            profileImage: 'img/default-seller.jpg',
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            listings: ['2'],
            reviews: []
        });
    }
    
    if (!users.some(user => user.id === 'seller3')) {
        users.push({
            id: 'seller3',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            password: 'password',
            role: 'seller',
            profileImage: 'img/default-seller.jpg',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            listings: ['4'],
            reviews: []
        });
    }
    
    if (!users.some(user => user.id === 'buyer1')) {
        users.push({
            id: 'buyer1',
            name: 'Sarah Williams',
            email: 'sarah@example.com',
            password: 'password',
            role: 'buyer',
            profileImage: 'img/default-buyer.jpg',
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            bids: ['bid1', 'bid2'],
            reviews: []
        });
    }
    
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('listings', JSON.stringify(dummyListings));
    
    // Create dummy bids
    const dummyBids = [
        {
            id: 'bid1',
            listingId: '1',
            buyerId: 'buyer1',
            amount: 800,
            message: 'I can pick it up immediately if accepted.',
            status: 'pending',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'bid2',
            listingId: '2',
            buyerId: 'buyer1',
            amount: 1300,
            message: 'Interested in the full lot. Can arrange transport.',
            status: 'pending',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    
    localStorage.setItem('bids', JSON.stringify(dummyBids));
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Force update images in localStorage to use new URLs
function forceUpdateImages() {
    const listings = JSON.parse(localStorage.getItem('listings')) || [];
    
    // If there are listings with old image paths, update them
    let needsUpdate = false;
    
    // Keep track of whether default listings exist
    let hasDefaultListings = false;
    
    // Only update images for default listings (IDs 1-4)
    // and preserve any custom listings
    if (listings.length > 0) {
        const imageMap = {
            '1': [
                'https://5.imimg.com/data5/SELLER/Default/2024/12/473299537/FT/FW/RM/31907690/aluminium-scrap.jpg',
                'https://tiimg.tistatic.com/fp/1/005/104/low-price-metal-scrap-001.jpg',
                'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgABw20SuUeQjXV2qdTSxQX6_16Gcy7l-kKQ&s'
            ],
            '2': [
                'https://5.imimg.com/data5/SELLER/Default/2022/12/GV/JN/XC/18458210/scrap5-500x500.jpg',
                'https://sgt-scrap.com/wp-content/uploads/2023/06/Household-appliances-ideal-for-scrapping.jpg',
                'https://thumbs.dreamstime.com/b/broken-household-appliances-collected-recycling-pile-refrigerators-washing-machines-other-electronic-yard-purposes-338245354.jpg'
            ],
            '3': [
                'https://media.istockphoto.com/id/155421314/photo/computer-parts.jpg?s=612x612&w=0&k=20&c=gjw5eWyvQQwd0Fb7XcU1L2IJJIgUQ8d6fIeTgSKu43k=',
                'https://images.unsplash.com/photo-1622376727185-71e011e9911c',
                'https://images.unsplash.com/photo-1572204099230-6c1f595a6b90'
            ],
            '4': [
                'https://midcitysteel.com/wp-content/gallery/beams-surplus-steel-various-sizes/surplus-beams-00012.jpg',
                'https://images.unsplash.com/photo-1602605761463-e769cfa0b388',
                'https://images.unsplash.com/photo-1617782719494-d9dd071e4cfc'
            ]
        };
        
        // Check for default listings
        ['1', '2', '3', '4'].forEach(id => {
            if (listings.some(listing => listing.id === id)) {
                hasDefaultListings = true;
            }
        });
        
        listings.forEach(listing => {
            // Only update default listings with IDs 1-4
            const id = listing.id;
            if (imageMap[id]) {
                listing.images = [...imageMap[id]];
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem('listings', JSON.stringify(listings));
            console.log('Updated listing images in localStorage');
        }
    }
    
    // Update only the default users to have profile images 
    // (not any new users that register)
    const users = JSON.parse(localStorage.getItem('users')) || [];
    let usersNeedUpdate = false;
    
    // Define default user IDs
    const defaultUserIds = ['seller1', 'seller2', 'seller3', 'buyer1'];
    
    users.forEach(user => {
        // Only update profile images for default users
        if (defaultUserIds.includes(user.id)) {
            if (user.role === 'seller') {
                // Randomly select one of the seller profile images
                const sellerImages = [
                    'https://randomuser.me/api/portraits/women/44.jpg',
                    'https://randomuser.me/api/portraits/women/25.jpg',
                    'https://randomuser.me/api/portraits/women/37.jpg'
                ];
                user.profileImage = sellerImages[Math.floor(Math.random() * sellerImages.length)];
                usersNeedUpdate = true;
            } else if (user.role === 'buyer') {
                // Randomly select one of the buyer profile images
                const buyerImages = [
                    'https://randomuser.me/api/portraits/men/45.jpg',
                    'https://randomuser.me/api/portraits/men/32.jpg',
                    'https://randomuser.me/api/portraits/men/28.jpg'
                ];
                user.profileImage = buyerImages[Math.floor(Math.random() * buyerImages.length)];
                usersNeedUpdate = true;
            }
        }
    });
    
    if (usersNeedUpdate) {
        localStorage.setItem('users', JSON.stringify(users));
        console.log('Updated user profile images in localStorage');
    }
    
    // Only create dummy listings if none of the default listings exist
    if (!hasDefaultListings && listings.length === 0) {
        createDummyListings();
        console.log('Created dummy listings');
    }
}

// Setup the page based on the path
async function setupPage() {
    const path = window.location.pathname;
    
    try {
        // Home page setup
        if (path.endsWith('/index.html') || path.endsWith('/')) {
            // Load and display listings
            await loadListings();
            
            // Initialize search and filters
            initSearchAndFilters();
        }
        
        // Listing details page setup
        else if (path.includes('/listing-details.html')) {
            // Get listing ID from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const listingId = urlParams.get('id');
            
            if (listingId) {
                // Load the specific listing details
                const listing = await loadListingDetails(listingId);
                
                // Load current bids
                loadCurrentBids(listingId);
                
                // Setup bid form
                setupBidForm(listingId);
            } else {
                // Redirect to home page if no listing ID provided
                window.location.href = '../index.html';
            }
        }
        
        // Add listing page setup
        else if (path.includes('/add-listing.html')) {
            setupAddListingForm();
        }
    } catch (error) {
        console.error('Error setting up page:', error);
        const listingsContainer = document.getElementById('listings-container');
        if (listingsContainer) {
            listingsContainer.innerHTML = '<p class="error">An error occurred while loading the page. Please try again later.</p>';
        }
    }
}

// Initialize search and filter functionality
function initSearchAndFilters() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const categoryFilter = document.getElementById('category-filter');
    const locationFilter = document.getElementById('location-filter');
    const priceFilter = document.getElementById('price-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    if (!searchInput || !categoryFilter || !locationFilter || !priceFilter) {
        return;
    }
    
    // Debounce function to prevent excessive filtering on input
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    // Load initial listings
    loadListings().catch(error => {
        console.error('Error loading initial listings:', error);
    });
    
    // Apply filters when search input changes (with debounce)
    searchInput.addEventListener('input', debounce(function() {
        applyFilters();
    }, 300));
    
    // Apply filters when search button is clicked
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            applyFilters();
        });
    }
    
    // Apply filters when category filter changes
    categoryFilter.addEventListener('change', function() {
        applyFilters();
    });
    
    // Apply filters when location filter changes
    locationFilter.addEventListener('change', function() {
        applyFilters();
    });
    
    // Apply filters when price filter changes
    priceFilter.addEventListener('change', function() {
        applyFilters();
    });
    
    // Reset filters
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            searchInput.value = '';
            categoryFilter.value = '';
            locationFilter.value = '';
            priceFilter.value = '';
            
            // Reset filters and load all listings
            loadListings().catch(error => {
                console.error('Error loading listings after reset:', error);
            });
        });
    }
}

// Apply search and filters to listings
async function applyFilters() {
    console.log('Applying filters...');
    
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const locationFilter = document.getElementById('location-filter');
    const priceFilter = document.getElementById('price-filter');
    
    // Load the latest listings from Firestore/localStorage
    let listings = await loadListings().catch(error => {
        console.error('Error loading listings for filtering:', error);
        return []; // Return empty array if loading fails
    });
    
    // Get filter values
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const categoryValue = categoryFilter ? categoryFilter.value : '';
    const locationValue = locationFilter ? locationFilter.value : '';
    const priceValue = priceFilter ? priceFilter.value : '';
    
    console.log('Filter values:', { searchQuery, categoryValue, locationValue, priceValue });
    
    // Apply filters to listings
    let filteredListings = listings;
    
    // Apply search query filter
    if (searchQuery) {
        filteredListings = filteredListings.filter(listing => 
            listing.title.toLowerCase().includes(searchQuery) || 
            listing.description.toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply category filter
    if (categoryValue) {
        filteredListings = filteredListings.filter(listing => 
            listing.category === categoryValue
        );
    }
    
    // Apply location filter
    if (locationValue) {
        filteredListings = filteredListings.filter(listing => 
            listing.location === locationValue
        );
    }
    
    // Apply price filter
    if (priceValue) {
        const [min, max] = priceValue.split('-').map(val => 
            val === '+' ? Infinity : Number(val)
        );
        
        filteredListings = filteredListings.filter(listing => {
            const price = Number(listing.startingPrice);
            if (max === Infinity) {
                return price >= min;
            }
            return price >= min && price <= max;
        });
    }
    
    // Display filtered listings
    displayListings(filteredListings);
    
    console.log(`Filters applied, showing ${filteredListings.length} of ${listings.length} listings`);
}

// Display listings in the container
function displayListings(listings) {
    const listingsContainer = document.getElementById('listings-container');
    if (!listingsContainer) {
        console.error('Listings container not found!');
        return;
    }
    
    console.log(`Displaying ${listings.length} listings in container`);
    
    // Clear previous listings
    listingsContainer.innerHTML = '';
    
    // Display listings
    if (listings.length === 0) {
        console.log('No listings to display, showing empty message');
        listingsContainer.innerHTML = '<p class="no-listings">No listings match your search criteria.</p>';
    } else {
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        listings.forEach((listing, index) => {
            console.log(`Creating card for listing ${index+1}/${listings.length}: ${listing.title}`);
            const listingCard = createListingCard(listing);
            fragment.appendChild(listingCard);
        });
        
        // Append all cards at once
        listingsContainer.appendChild(fragment);
        console.log('All listing cards have been added to the container');
    }
}

// Process the uploaded image file - Upload to Firebase Storage
function processImage(file) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Processing image in listings.js processImage:', file.name, file.type, file.size);
            
            // First create a preview with FileReader for immediate display
            const reader = new FileReader();
            
            reader.onload = (e) => {
                console.log('FileReader loaded successfully');
                const previewUrl = e.target.result;
                
                try {
                    // If Firebase Storage is available, upload the image
                    if (window.storage && window.storageRef && window.uploadBytes && window.getDownloadURL) {
                        console.log('Firebase Storage is available, attempting upload');
                        
                        // Create a unique filename
                        const timestamp = Date.now();
                        const fileName = `images/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                        console.log('Generated filename:', fileName);
                        
                        // Upload the file to Firebase Storage
                        const fileRef = window.storageRef(window.storage, fileName);
                        console.log('Created storage reference');
                        
                        window.uploadBytes(fileRef, file)
                            .then(snapshot => {
                                console.log('Image uploaded successfully to Firebase');
                                // Get the download URL
                                return window.getDownloadURL(fileRef);
                            })
                            .then(downloadURL => {
                                console.log('Download URL obtained:', downloadURL.substring(0, 50) + '...');
                                // Return the Firebase URL
                                resolve(downloadURL);
                            })
                            .catch(error => {
                                console.error('Error during Firebase upload or URL retrieval:', error);
                                // Fall back to the data URL if Firebase upload fails
                                console.log('Falling back to data URL due to Firebase error');
                                resolve(previewUrl);
                            });
                    } else {
                        // If Firebase is not available, use the data URL
                        console.warn('Firebase Storage not available. Using data URL instead.');
                        resolve(previewUrl);
                    }
                } catch (innerError) {
                    console.error('Error during Firebase processing:', innerError);
                    resolve(previewUrl);
                }
            };
            
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(new Error('Error reading file'));
            };
            
            // Start reading the file as a data URL
            reader.readAsDataURL(file);
            console.log('FileReader started');
        } catch (outerError) {
            console.error('Fatal error in processImage:', outerError);
            reject(outerError);
        }
    });
}

// Function to check if data can be stored in localStorage
function canStoreInLocalStorage(data) {
    try {
        const testKey = `test_${Date.now()}`;
        localStorage.setItem(testKey, data);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        console.error('LocalStorage test failed:', e);
        return false;
    }
}

// Function to check image URLs before saving to localStorage
function prepareImagesForStorage(images) {
    console.log('Preparing images for storage, count:', images.length);
    
    // Filter out any invalid images
    const validImages = images.filter(img => 
        typeof img === 'string' && img.trim() !== ''
    );
    
    if (validImages.length === 0) {
        console.warn('No valid images found, using placeholder');
        return ['https://via.placeholder.com/300x200?text=No+Valid+Image'];
    }
    
    // With Firebase Storage, we don't need to worry about storage limits
    // as images are stored in the cloud, so we can return all valid image URLs
    return validImages;
}

// Initialize testimonial carousel
function initTestimonialCarousel() {
    const testimonialItems = document.querySelectorAll('.testimonial-item');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (!testimonialItems.length) return;
    
    let currentIndex = 0;
    
    // Function to show a specific testimonial
    function showTestimonial(index) {
        // Hide all testimonials
        testimonialItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Remove active class from all dots
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // Show the selected testimonial and activate its dot
        testimonialItems[index].classList.add('active');
        dots[index].classList.add('active');
        
        // Update current index
        currentIndex = index;
    }
    
    // Next button click
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            let newIndex = currentIndex + 1;
            if (newIndex >= testimonialItems.length) {
                newIndex = 0;
            }
            showTestimonial(newIndex);
        });
    }
    
    // Previous button click
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) {
                newIndex = testimonialItems.length - 1;
            }
            showTestimonial(newIndex);
        });
    }
    
    // Dot click events
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.getAttribute('data-index'));
            showTestimonial(index);
        });
    });
    
    // Auto rotate testimonials every 5 seconds
    setInterval(() => {
        let newIndex = currentIndex + 1;
        if (newIndex >= testimonialItems.length) {
            newIndex = 0;
        }
        showTestimonial(newIndex);
    }, 5000);
}

// Set up the Start Listing button to check login status
function setupStartListingButton() {
    const startListingBtn = document.getElementById('start-listing-btn');
    if (!startListingBtn) return;
    
    startListingBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            // If not logged in, redirect to login page
            window.location.href = 'login.html';
            return;
        }
        
        // If logged in, check if user is a seller
        if (currentUser.role !== 'seller') {
            alert('You need a seller account to list scrap. Please register as a seller.');
            return;
        }
        
        // If user is logged in and is a seller, redirect to add listing page
        window.location.href = 'listings/add-listing.html';
    });
}

// Also modify any other Add Listing buttons on the page
function setupAllListingButtons() {
    // Select all buttons that lead to add-listing.html
    const listingButtons = document.querySelectorAll('a[href*="add-listing.html"]');
    
    listingButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Check if user is logged in
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (!currentUser) {
                // If not logged in, redirect to login page
                window.location.href = window.location.pathname.includes('/listings/') 
                    ? '../login.html' 
                    : 'login.html';
                return;
            }
            
            // If logged in, check if user is a seller
            if (currentUser.role !== 'seller') {
                alert('You need a seller account to list scrap. Please register as a seller.');
                return;
            }
            
            // If user is logged in and is a seller, proceed to the original link
            window.location.href = this.href;
        });
    });
} 