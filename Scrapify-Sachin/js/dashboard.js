document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            window.location.href = '../login.html';
            return;
        }
        
        // Determine if we're on seller or buyer dashboard and check user role
        const isSeller = window.location.pathname.includes('seller-dashboard');
        const isBuyer = window.location.pathname.includes('buyer-dashboard');
        
        if ((isSeller && currentUser.role !== 'seller') || (isBuyer && currentUser.role !== 'buyer')) {
            window.location.href = `../dashboard/${currentUser.role}-dashboard.html`;
            return;
        }
        
        // Initialize dashboard
        await initializeDashboard(currentUser);
        
        // Tab navigation
        setupTabNavigation();
        
        // Responsive dashboard handling
        handleResponsiveDashboard();
        
        // Setup mobile menu toggle
        setupMobileMenu();
        
        // Logout functionality
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = '../index.html';
        });
        
        // Window resize event for responsive handling
        window.addEventListener('resize', handleResponsiveDashboard);
    } catch (error) {
        console.error('Error setting up dashboard:', error);
    }
});

// Setup mobile menu functionality
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const overlay = document.querySelector('.overlay');
    const navLinks = document.querySelectorAll('nav ul li a');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close menu when a nav link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

// Handle responsive dashboard behavior
function handleResponsiveDashboard() {
    const isMobile = window.innerWidth < 992;
    
    if (isMobile) {
        // For mobile, make sidebar more accessible
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar && mainContent) {
            // Make sure the layout works on mobile
            sidebar.style.marginBottom = '20px';
        }
    }
}

// Initialize dashboard with user data
async function initializeDashboard(user) {
    // Set user info in sidebar
    document.getElementById('sidebar-user-name').textContent = user.name;
    
    if (user.profileImage) {
        document.getElementById('sidebar-user-img').src = user.profileImage;
    }
    
    try {
        // Load appropriate dashboard content based on user role
        if (user.role === 'seller') {
            await loadSellerDashboard(user);
        } else {
            await loadBuyerDashboard(user);
        }
        
        // Load profile data
        loadProfileData(user);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Load seller dashboard data
async function loadSellerDashboard(user) {
    try {
        // Get listings from Firestore first if available
        let userListings = [];
        
        if (window.db && window.firestoreCollection && window.firestoreQuery && window.firestoreWhere && window.firestoreGetDocs) {
            try {
                console.log('Attempting to fetch seller listings from Firestore');
                const listingsRef = window.firestoreCollection(window.db, "listings");
                const q = window.firestoreQuery(listingsRef, window.firestoreWhere("sellerId", "==", user.id));
                const querySnapshot = await window.firestoreGetDocs(q);
                
                if (!querySnapshot.empty) {
                    querySnapshot.forEach((doc) => {
                        userListings.push(doc.data());
                    });
                    console.log(`Found ${userListings.length} listings in Firestore for seller ${user.id}`);
                }
            } catch (error) {
                console.error('Error fetching listings from Firestore:', error);
            }
        }
        
        // If no listings found in Firestore, fall back to localStorage
        if (userListings.length === 0) {
            console.log('No Firestore listings found, falling back to localStorage');
            const listings = JSON.parse(localStorage.getItem('listings')) || [];
            userListings = listings.filter(listing => listing.sellerId === user.id);
        }
        
        // Load bids
        const bids = JSON.parse(localStorage.getItem('bids')) || [];
        
        // Get all bids for this seller's listings
        const listingIds = userListings.map(listing => listing.id);
        const receivedBids = bids.filter(bid => listingIds.includes(bid.listingId));
        
        // Calculate stats
        const activeListings = userListings.filter(listing => listing.status === 'active').length;
        const totalBids = receivedBids.length;
        const acceptedBids = receivedBids.filter(bid => bid.status === 'accepted').length;
        
        // Calculate average rating
        let avgRating = 0;
        if (user.reviews && user.reviews.length > 0) {
            const totalRating = user.reviews.reduce((sum, review) => sum + review.rating, 0);
            avgRating = (totalRating / user.reviews.length).toFixed(1);
        }
        
        // Update dashboard stats
        document.getElementById('total-listings').textContent = activeListings;
        document.getElementById('total-bids').textContent = totalBids;
        document.getElementById('accepted-bids').textContent = acceptedBids;
        document.getElementById('avg-rating').textContent = avgRating;
        
        // Populate recent activity
        populateRecentActivity(user, userListings, receivedBids);
        
        // Populate listings tab
        populateListingsTab(userListings);
        
        // Populate bids tab
        populateReceivedBidsTab(receivedBids, userListings);
        
        // Populate reviews tab
        populateReviewsTab(user);
    } catch (error) {
        console.error('Error loading seller dashboard:', error);
        alert('Error loading dashboard. Please refresh the page and try again.');
    }
}

// Load buyer dashboard data
async function loadBuyerDashboard(user) {
    try {
        // Load bids placed by this buyer
        const bids = JSON.parse(localStorage.getItem('bids')) || [];
        let userBids = bids.filter(bid => bid.buyerId === user.id);
        
        // Check if user has bids array but no bids are found in the filter
        if (userBids.length === 0 && user.bids && user.bids.length > 0) {
            // Get all bids where the bid ID is in the user's bids array
            userBids = bids.filter(bid => user.bids.includes(bid.id));
            
            // If still no bids found, initialize the user's bids array
            if (userBids.length === 0) {
                console.log("No bids found for user. Initializing with dummy bid for testing.");
                // Create a dummy bid for the first listing
                const listings = JSON.parse(localStorage.getItem('listings')) || [];
                if (listings.length > 0) {
                    const dummyBid = {
                        id: 'bid' + Date.now(),
                        buyerId: user.id,
                        listingId: listings[0].id,
                        amount: listings[0].startingPrice + 50,
                        message: 'Test bid',
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    
                    // Add to bids in localStorage
                    bids.push(dummyBid);
                    localStorage.setItem('bids', JSON.stringify(bids));
                    
                    // Add to user's bids array
                    if (!user.bids) user.bids = [];
                    user.bids.push(dummyBid.id);
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    
                    // Update users in localStorage
                    const users = JSON.parse(localStorage.getItem('users')) || [];
                    const userIndex = users.findIndex(u => u.id === user.id);
                    if (userIndex !== -1) {
                        users[userIndex] = user;
                        localStorage.setItem('users', JSON.stringify(users));
                    }
                    
                    // Add the dummy bid to userBids for display
                    userBids = [dummyBid];
                }
            }
        }
        
        // Calculate stats
        const totalBids = userBids.length;
        const pendingBids = userBids.filter(bid => bid.status === 'pending').length;
        const acceptedBids = userBids.filter(bid => bid.status === 'accepted').length;
        const rejectedBids = userBids.filter(bid => bid.status === 'rejected').length;
        
        // Update dashboard stats
        document.getElementById('total-bids').textContent = totalBids;
        document.getElementById('pending-bids').textContent = pendingBids;
        document.getElementById('accepted-bids').textContent = acceptedBids;
        document.getElementById('rejected-bids').textContent = rejectedBids;
        
        // Populate recent activity
        populateBuyerRecentActivity(user, userBids);
        
        // Populate my bids tab
        populateMyBidsTab(userBids);
    } catch (error) {
        console.error('Error loading buyer dashboard:', error);
    }
}

// Populate recent activity for seller
function populateRecentActivity(user, listings, bids) {
    const activityContainer = document.getElementById('recent-activity');
    activityContainer.innerHTML = '';
    
    // Sort bids by date (newest first)
    bids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get recent bids (last 5)
    const recentBids = bids.slice(0, 5);
    
    if (recentBids.length === 0) {
        activityContainer.innerHTML = '<p>No recent activity.</p>';
        return;
    }
    
    // Get all users for buyer names
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    recentBids.forEach(bid => {
        const listing = listings.find(l => l.id === bid.listingId);
        const buyer = users.find(u => u.id === bid.buyerId);
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        activityItem.innerHTML = `
            <div class="activity-content">
                <p>
                    <strong>${buyer ? buyer.name : 'Anonymous'}</strong> placed a bid of 
                    <strong>₹${bid.amount}</strong> on your listing 
                    <a href="../listings/listing-details.html?id=${listing.id}">${listing.title}</a>
                </p>
                <div class="activity-date">${formatDate(bid.createdAt)}</div>
            </div>
            <div class="activity-actions">
                ${bid.status === 'pending' ? `
                    <button class="btn btn-success bid-action" data-action="accept" data-bid="${bid.id}">Accept</button>
                    <button class="btn btn-danger bid-action" data-action="reject" data-bid="${bid.id}">Reject</button>
                ` : `
                    <span class="status-${bid.status}">${capitalizeFirstLetter(bid.status)}</span>
                `}
            </div>
        `;
        
        activityContainer.appendChild(activityItem);
    });
    
    // Add event listeners to bid action buttons
    document.querySelectorAll('.bid-action').forEach(button => {
        button.addEventListener('click', handleBidAction);
    });
}

// Populate recent activity for buyer
function populateBuyerRecentActivity(user, bids) {
    const activityContainer = document.getElementById('recent-activity');
    activityContainer.innerHTML = '';
    
    // Sort bids by date (newest first)
    bids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get recent bids (last 5)
    const recentBids = bids.slice(0, 5);
    
    if (recentBids.length === 0) {
        activityContainer.innerHTML = '<p>No recent activity.</p>';
        return;
    }
    
    // Get all listings
    const listings = JSON.parse(localStorage.getItem('listings')) || [];
    
    recentBids.forEach(bid => {
        const listing = listings.find(l => l.id === bid.listingId);
        
        if (!listing) return;
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        activityItem.innerHTML = `
            <div class="activity-content">
                <p>
                    You placed a bid of <strong>₹${bid.amount}</strong> on 
                    <a href="../listings/listing-details.html?id=${listing.id}">${listing.title}</a>
                </p>
                <div class="activity-date">${formatDate(bid.createdAt)}</div>
            </div>
            <div class="activity-status">
                <span class="status-${bid.status}">${capitalizeFirstLetter(bid.status)}</span>
            </div>
        `;
        
        activityContainer.appendChild(activityItem);
    });
}

// Populate listings tab
function populateListingsTab(listings) {
    const listingsContainer = document.getElementById('my-listings');
    
    if (!listingsContainer) return;
    
    listingsContainer.innerHTML = '';
    
    if (listings.length === 0) {
        listingsContainer.innerHTML = '<p class="no-listings">You haven\'t created any listings yet.</p>';
        return;
    }
    
    // Sort listings by date (newest first)
    listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Create listing cards
    listings.forEach(listing => {
        // Get default image
        let imageUrl = '../img/placeholder.jpg';
        
        // Try to get the first image from the listing
        if (listing.images && listing.images.length > 0) {
            if (typeof listing.images[0] === 'string' && listing.images[0].trim() !== '') {
                imageUrl = listing.images[0];
            }
        }
        
        const listingCard = document.createElement('div');
        listingCard.className = 'listing-card dashboard-card';
        listingCard.innerHTML = `
            <div class="listing-img">
                <img src="${imageUrl}" alt="${listing.title}" onerror="this.src='../img/placeholder.jpg';">
                <div class="listing-status ${listing.status}">${capitalizeFirstLetter(listing.status)}</div>
            </div>
            <div class="listing-info">
                <h3 class="listing-title">${listing.title}</h3>
                <p class="listing-price">₹${listing.startingPrice}</p>
                <p>${truncateText(listing.description, 80)}</p>
                <div class="listing-details">
                    <span>${listing.location}</span>
                    <span>${formatDate(listing.createdAt)}</span>
                </div>
                <div class="listing-actions">
                    <a href="../listings/listing-details.html?id=${listing.id}" class="btn btn-sm" target="_blank">View</a>
                    <button class="btn btn-sm btn-danger delete-listing" data-id="${listing.id}">Delete</button>
                </div>
            </div>
        `;
        
        listingsContainer.appendChild(listingCard);
    });
    
    // Use event delegation for delete buttons
    listingsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-listing')) {
            handleDeleteListing.call(e.target, e);
        }
    });
}

// Populate received bids tab for seller
function populateReceivedBidsTab(bids, listings) {
    const bidsContainer = document.getElementById('received-bids');
    bidsContainer.innerHTML = '';
    
    if (bids.length === 0) {
        bidsContainer.innerHTML = '<p>You have no bids yet.</p>';
        return;
    }
    
    // Sort bids by date (newest first)
    bids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get all users for buyer names
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Group bids by listing
    const bidsByListing = {};
    
    listings.forEach(listing => {
        const listingBids = bids.filter(bid => bid.listingId === listing.id);
        
        if (listingBids.length > 0) {
            bidsByListing[listing.id] = {
                listing,
                bids: listingBids
            };
        }
    });
    
    // Create bid groups by listing
    Object.values(bidsByListing).forEach(group => {
        const listingSection = document.createElement('div');
        listingSection.className = 'listing-bids-section';
        
        // Listing header
        const listingHeader = document.createElement('div');
        listingHeader.className = 'listing-bids-header';
        listingHeader.innerHTML = `
            <h3>${group.listing.title}</h3>
            <a href="../listings/listing-details.html?id=${group.listing.id}" class="btn btn-secondary">View Listing</a>
        `;
        
        listingSection.appendChild(listingHeader);
        
        // Bids for this listing
        group.bids.forEach(bid => {
            const buyer = users.find(u => u.id === bid.buyerId);
            
            const bidCard = document.createElement('div');
            bidCard.className = 'bid-card';
            
            bidCard.innerHTML = `
                <div class="bid-info">
                    <h4>${buyer ? buyer.name : 'Anonymous'}</h4>
                    <div class="bid-amount">₹${bid.amount}</div>
                    <div class="bid-message">${bid.message || 'No message'}</div>
                    <div class="bid-date">${formatDate(bid.createdAt)}</div>
                </div>
                <div class="bid-actions">
                    ${bid.status === 'pending' ? `
                        <button class="btn btn-success bid-action" data-action="accept" data-bid="${bid.id}">Accept</button>
                        <button class="btn btn-danger bid-action" data-action="reject" data-bid="${bid.id}">Reject</button>
                    ` : `
                        <span class="bid-status status-${bid.status}">${capitalizeFirstLetter(bid.status)}</span>
                    `}
                </div>
            `;
            
            listingSection.appendChild(bidCard);
        });
        
        bidsContainer.appendChild(listingSection);
    });
    
    // Add event listeners to bid action buttons
    document.querySelectorAll('.bid-action').forEach(button => {
        button.addEventListener('click', handleBidAction);
    });
}

// Populate my bids tab for buyer
function populateMyBidsTab(bids) {
    const bidsContainer = document.getElementById('my-bids');
    bidsContainer.innerHTML = '';
    
    if (bids.length === 0) {
        bidsContainer.innerHTML = '<p>You have no bids yet. Visit the <a href="../index.html#listings">listings page</a> to browse and place bids.</p>';
        return;
    }
    
    // Sort bids by date (newest first)
    bids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get all listings
    const listings = JSON.parse(localStorage.getItem('listings')) || [];
    
    let noValidBidsFound = true;
    
    bids.forEach(bid => {
        const listing = listings.find(l => l.id === bid.listingId);
        
        // Create card even if listing doesn't exist
        const bidCard = document.createElement('div');
        bidCard.className = 'bid-card';
        
        if (listing) {
            bidCard.innerHTML = `
                <div class="bid-info">
                    <h3><a href="../listings/listing-details.html?id=${listing.id}">${listing.title}</a></h3>
                    <div class="bid-amount">Your Bid: ₹${bid.amount}</div>
                    <div class="bid-details">
                        <span>Listing Price: ₹${listing.startingPrice}</span>
                        <span>${formatDate(bid.createdAt)}</span>
                    </div>
                </div>
                <div class="bid-status status-${bid.status}">${capitalizeFirstLetter(bid.status)}</div>
            `;
            noValidBidsFound = false;
        } else {
            // Listing doesn't exist anymore
            bidCard.innerHTML = `
                <div class="bid-info">
                    <h3>Listing no longer available</h3>
                    <div class="bid-amount">Your Bid: ₹${bid.amount}</div>
                    <div class="bid-details">
                        <span>${formatDate(bid.createdAt)}</span>
                    </div>
                </div>
                <div class="bid-status status-unavailable">Unavailable</div>
            `;
        }
        
        bidsContainer.appendChild(bidCard);
    });
    
    // If no valid bids were found but we had bid IDs
    if (noValidBidsFound && bids.length > 0) {
        // Add a message at the top
        const messageElement = document.createElement('div');
        messageElement.className = 'notification warning';
        messageElement.innerHTML = 'Some of your bids refer to listings that no longer exist.';
        bidsContainer.insertBefore(messageElement, bidsContainer.firstChild);
    }
}

// Populate reviews tab
function populateReviewsTab(user) {
    const reviewsContainer = document.getElementById('my-reviews');
    
    if (!user.reviews || user.reviews.length === 0) {
        reviewsContainer.innerHTML = '<p>You have no reviews yet.</p>';
        return;
    }
    
    // Calculate rating summary
    const totalReviews = user.reviews.length;
    const ratingsCount = [0, 0, 0, 0, 0]; // 1-5 stars
    
    user.reviews.forEach(review => {
        const ratingIndex = Math.floor(review.rating) - 1;
        if (ratingIndex >= 0 && ratingIndex < 5) {
            ratingsCount[ratingIndex]++;
        }
    });
    
    // Update rating summary
    const ratingSummary = document.getElementById('rating-summary');
    
    if (ratingSummary) {
        const avgRating = user.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
        
        ratingSummary.innerHTML = `
            <div class="avg-rating">${avgRating.toFixed(1)} ★</div>
            <div class="total-reviews">${totalReviews} reviews</div>
        `;
    }
    
    // Clear loading message
    reviewsContainer.innerHTML = '';
    
    // Sort reviews by date (newest first)
    user.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get all users for buyer names
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    user.reviews.forEach(review => {
        const buyer = users.find(u => u.id === review.buyerId);
        
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        
        reviewCard.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        <img src="../${buyer?.profileImage || 'img/default-buyer.jpg'}" alt="Reviewer">
                    </div>
                    <div>
                        <div class="reviewer-name">${buyer ? buyer.name : 'Anonymous Buyer'}</div>
                        <div class="review-date">${formatDate(review.createdAt)}</div>
                    </div>
                </div>
                <div class="review-rating">
                    ${review.rating} ★
                </div>
            </div>
            <div class="review-comment">
                ${review.comment}
            </div>
        `;
        
        reviewsContainer.appendChild(reviewCard);
    });
}

// Load user profile data
function loadProfileData(user) {
    // Set initial form values
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-location').value = user.location || '';
    document.getElementById('profile-bio').value = user.bio || '';
    
    if (user.profileImage) {
        document.getElementById('profile-image-preview').src = user.profileImage;
    }
    
    // Handle profile image change
    const profileImageInput = document.getElementById('profile-image');
    const changeImageBtn = document.getElementById('change-image-btn');
    
    changeImageBtn.addEventListener('click', () => {
        profileImageInput.click();
    });
    
    profileImageInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            try {
                // First create a preview with FileReader
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Update the preview image immediately
                    document.getElementById('profile-image-preview').src = event.target.result;
                };
                reader.readAsDataURL(file);
                
                // Then if Firebase Storage is available, upload it
                if (window.storage && window.storageRef && window.uploadBytes && window.getDownloadURL) {
                    console.log('Uploading profile image to Firebase Storage');
                    
                    try {
                        // Create unique filename
                        const timestamp = Date.now();
                        const fileName = `profiles/${user.id}_${timestamp}.${file.name.split('.').pop()}`;
                        
                        // Upload to Firebase
                        const fileRef = window.storageRef(window.storage, fileName);
                        const snapshot = await window.uploadBytes(fileRef, file);
                        
                        // Get the download URL
                        const downloadURL = await window.getDownloadURL(fileRef);
                        console.log('Image uploaded to Firebase:', downloadURL);
                        
                        // Update user object with new image URL
                        user.profileImage = downloadURL;
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        
                        // Update sidebar image
                        document.getElementById('sidebar-user-img').src = downloadURL;
                        
                        // Also update the preview with the final URL
                        document.getElementById('profile-image-preview').src = downloadURL;
                    } catch (uploadError) {
                        console.error('Error uploading to Firebase:', uploadError);
                        // We already have the preview, so no need to show an error
                    }
                }
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Error processing image. Please try again with a different image.');
            }
        }
    });
    
    // Handle save profile button
    document.getElementById('save-profile').addEventListener('click', () => {
        // Get form values
        const name = document.getElementById('profile-name').value;
        const email = document.getElementById('profile-email').value;
        const phone = document.getElementById('profile-phone').value;
        const location = document.getElementById('profile-location').value;
        const bio = document.getElementById('profile-bio').value;
        const profileImage = document.getElementById('profile-image-preview').src;
        
        // Validate required fields
        if (!name || !email) {
            alert('Name and email are required!');
            return;
        }
        
        // Update user object
        user.name = name;
        user.email = email;
        user.phone = phone;
        user.location = location;
        user.bio = bio;
        user.profileImage = profileImage;
        
        // Update in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Update users array in localStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.id === user.id);
        
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // Update sidebar user name
        document.getElementById('sidebar-user-name').textContent = name;
        
        // Show success message
        alert('Profile updated successfully!');
    });
}

// Handle bid action (accept or reject)
function handleBidAction(e) {
    const action = e.target.dataset.action;
    const bidId = e.target.dataset.bid;
    
    if (!action || !bidId) return;
    
    // Get bids from local storage
    const bids = JSON.parse(localStorage.getItem('bids')) || [];
    const bidIndex = bids.findIndex(bid => bid.id === bidId);
    
    if (bidIndex === -1) return;
    
    // Update bid status
    bids[bidIndex].status = action;
    localStorage.setItem('bids', JSON.stringify(bids));
    
    // Reload dashboard
    location.reload();
}

// Handle delete listing button click
async function handleDeleteListing(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this listing?')) {
        return;
    }
    
    // Get listing ID from the data attribute
    const listingId = this.getAttribute('data-id');
    if (!listingId) {
        console.error('No listing ID found in delete button');
        return;
    }
    
    console.log('Deleting listing:', listingId);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    try {
        // First try to delete from Firestore if available
        if (window.db && window.firestoreDoc && window.firestoreDeleteDoc) {
            try {
                const listingDocRef = window.firestoreDoc(window.db, "listings", listingId);
                await window.firestoreDeleteDoc(listingDocRef);
                console.log('Listing deleted from Firestore');
            } catch (error) {
                console.error('Error deleting from Firestore:', error);
                // Continue with localStorage deletion as fallback
            }
        }
        
        // Delete from localStorage always
        const listings = JSON.parse(localStorage.getItem('listings')) || [];
        const updatedListings = listings.filter(listing => listing.id !== listingId);
        localStorage.setItem('listings', JSON.stringify(updatedListings));
        
        // Update currentUser's listings array
        if (currentUser.listings) {
            currentUser.listings = currentUser.listings.filter(id => id !== listingId);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update user in users array
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const userIndex = users.findIndex(user => user.id === currentUser.id);
            
            if (userIndex !== -1) {
                users[userIndex].listings = currentUser.listings;
                localStorage.setItem('users', JSON.stringify(users));
            }
        }
        
        // Remove the listing card from the DOM
        const listingCard = this.closest('.listing-card');
        if (listingCard) {
            listingCard.remove();
        }
        
        // Check if there are no more listings and show message
        const listingsContainer = document.getElementById('my-listings');
        if (listingsContainer && !listingsContainer.querySelector('.listing-card')) {
            listingsContainer.innerHTML = '<p class="no-listings">You haven\'t created any listings yet.</p>';
        }
        
        // Show success message
        alert('Listing deleted successfully');
    } catch (error) {
        console.error('Error deleting listing:', error);
        alert('Error deleting listing. Please try again.');
    }
}

// Setup tab navigation in dashboard
function setupTabNavigation() {
    const tabLinks = document.querySelectorAll('.sidebar-menu a[data-tab]');
    const tabs = document.querySelectorAll('.dashboard-tab');
    
    if (!tabLinks.length || !tabs.length) return;
    
    // First ensure all tabs are properly hidden except the active one
    let activeTab = document.querySelector('.sidebar-menu a.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        tabs.forEach(tab => {
            if (tab.id === `${tabId}-tab`) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the tab to show
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and links
            tabLinks.forEach(tl => tl.classList.remove('active'));
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked link and corresponding tab
            this.classList.add('active');
            
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
                
                // For mobile, scroll to the tab content
                if (window.innerWidth < 992) {
                    targetTab.scrollIntoView({ behavior: 'smooth' });
                }
            }
            
            console.log(`Switched to ${tabId} tab`);
        });
    });
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