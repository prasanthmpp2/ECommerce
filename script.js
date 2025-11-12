// --- ShopEasy Cart Logic ---

// Utility: Get cart from localStorage
function getCart() {
    const cart = localStorage.getItem('shopeasy_cart');
    return cart ? JSON.parse(cart) : [];
}

// Utility: Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('shopeasy_cart', JSON.stringify(cart));
}

// Update cart count badge in header nav
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
    // Find a Cart link in nav
    let cartLink = document.querySelector('nav a[href$="cart.html"]');
    if (!cartLink) {
        // Fallback: find link with text 'Cart'
        cartLink = Array.from(document.querySelectorAll('nav a')).find(a => /cart/i.test(a.textContent));
    }
    if (!cartLink) return;
    let badge = cartLink.querySelector('.cart-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge';
        cartLink.appendChild(badge);
    }
    badge.textContent = count > 0 ? count : '';
}

// Add product to cart (price will be stored as Number)
function addToCart(product) {
    if (!product || !product.name) return;
    let cart = getCart();
    product.price = Number(product.price) || 0;
    const idx = cart.findIndex(item => item.name === product.name);
    if (idx !== -1) {
        cart[idx].qty = (cart[idx].qty || 0) + 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);
    updateCartCount();
}

// Remove a product entirely from cart
function removeFromCart(productName) {
    let cart = getCart();
    cart = cart.filter(item => item.name !== productName);
    saveCart(cart);
    renderCart();
}

// Change quantity for a product (delta can be negative)
function changeQty(productName, delta) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.name === productName);
    if (idx === -1) return;
    cart[idx].qty = (cart[idx].qty || 0) + delta;
    if (cart[idx].qty <= 0) {
        cart.splice(idx, 1);
    }
    saveCart(cart);
    renderCart();
}

// Render cart items on cart.html
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('empty-cart-message');
    const summary = document.getElementById('cart-summary');
    if (!container || !emptyMsg) return;
    const cart = getCart();
    container.innerHTML = '';
    if (cart.length === 0) {
        emptyMsg.style.display = 'block';
        if (summary) summary.style.display = 'none';
        return;
    }
    emptyMsg.style.display = 'none';
    if (summary) summary.style.display = 'block';

    let total = 0;
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        const imgSrc = item.img || 'Photo/placeholder.png';
        const itemPrice = Number(item.price) || 0;
        total += itemPrice * (item.qty || 1);
        const subtotal = (itemPrice * (item.qty || 1));
        div.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p class="item-price">Price: $${itemPrice.toFixed(2)}</p>
                <p class="item-subtotal">Subtotal: <strong>$${subtotal.toFixed(2)}</strong></p>
                <div class="qty-controls">
                    <button class="qty-decrease" data-name="${item.name}">-</button>
                    <span class="qty-value">${item.qty}</span>
                    <button class="qty-increase" data-name="${item.name}">+</button>
                </div>
            </div>
            <button class="remove-cart-btn" data-name="${item.name}">Remove</button>
        `;
        container.appendChild(div);
    });

    // Attach event listeners
    container.querySelectorAll('.remove-cart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            removeFromCart(this.getAttribute('data-name'));
        });
    });
    container.querySelectorAll('.qty-increase').forEach(btn => {
        btn.addEventListener('click', function() {
            changeQty(this.getAttribute('data-name'), +1);
        });
    });
    container.querySelectorAll('.qty-decrease').forEach(btn => {
        btn.addEventListener('click', function() {
            changeQty(this.getAttribute('data-name'), -1);
        });
    });

    // Update summary
    if (summary) {
        summary.innerHTML = `
            <p>Total: <strong>$${total.toFixed(2)}</strong></p>
            <button id="checkoutBtn">Proceed to Checkout</button>
        `;
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', function() {
            alert('Checkout is not implemented in this demo.');
        });
    }
    // Keep header cart count in sync
    updateCartCount();
}

// Run renderCart once the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Make sure header cart badge is updated on every page
    updateCartCount();
    // Render cart only if we're on the cart page
    renderCart();
    // Inject a search form into the header on every page
    injectHeaderSearch();
    // If the URL contains a query param `q`, try to perform a local search on this page
    const q = getQueryParam('q');
    if (q) {
        const did = performLocalSearch(q);
        if (did) showToast(`Results for "${q}"`);
    }
});

// Helper: return value of query param
function getQueryParam(name) {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    } catch (e) {
        // older browsers fallback
        const m = window.location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
        return m ? decodeURIComponent(m[1]) : null;
    }
}

// Perform a local search over .product-card elements; returns true if search applied
function performLocalSearch(query) {
    if (!query) return false;
    const cards = Array.from(document.querySelectorAll('.product-card'));
    if (!cards || cards.length === 0) return false;
    const q = query.trim().toLowerCase();
    cards.forEach(card => {
        const title = (card.querySelector('h3')?.textContent || '') .toLowerCase();
        const parentLink = card.closest('.product-card-link') || card;
        if (title.includes(q)) {
            parentLink.style.display = '';
        } else {
            parentLink.style.display = 'none';
        }
    });
    return true;
}

// Inject a simple search form into the header and wire up submit behavior
function injectHeaderSearch() {
    const header = document.querySelector('header');
    if (!header) return;
    if (header.querySelector('.search-form')) return; // already injected
    const nav = header.querySelector('nav');
    const form = document.createElement('form');
    form.className = 'search-form';
    form.setAttribute('role', 'search');
    form.innerHTML = `
        <input class="search-input" type="search" name="q" placeholder="Search products..." aria-label="Search products">
        <button class="search-btn" type="submit">Search</button>
    `;
    // Insert form before nav (so it's visible in header)
    header.insertBefore(form, nav);

    // If there's an existing q param, populate the input
    const existing = getQueryParam('q');
    if (existing) form.q.value = existing;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const q = (form.q.value || '').trim();
        if (!q) return;
        // If current page lists products, perform local filter
        const didLocal = performLocalSearch(q);
        if (didLocal) {
            showToast(`Showing results for "${q}"`);
            // Update url without reload so users can share
            if (history && history.replaceState) {
                const u = new URL(window.location.href);
                u.searchParams.set('q', q);
                history.replaceState({}, '', u.toString());
            }
            return;
        }
        // Otherwise redirect to frontpage with query
        const target = 'frontpage.html?q=' + encodeURIComponent(q);
        window.location.href = target;
    });
}

// Listen for storage changes (another tab) and update
window.addEventListener('storage', function(e) {
    if (e.key === 'shopeasy_cart') renderCart();
    updateCartCount();
});

// --- Add to Cart Button Logic on product pages ---
function getProductDetailsFromPage() {
    const name = document.querySelector('.product-details h1')?.textContent?.trim();
    const priceEl = document.querySelector('.product-details .price');
    const priceText = priceEl ? priceEl.textContent.replace(/[^\d.]/g, '') : null;
    const img = document.querySelector('.product-image img')?.getAttribute('src');
    if (!name || !priceText) return null;
    return { name, price: Number(priceText) || 0, img: img || 'Photo/placeholder.png' };
}

const addToCartBtn = document.getElementById('addToCartBtn');
if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function() {
        const product = getProductDetailsFromPage();
        if (product) {
            addToCart(product);
            // Show toast then redirect
            showToast('Add to cart successfully');
            setTimeout(() => { window.location.href = 'cart.html'; }, 700);
        }
    });
}

// Toast UI: create container and helper
function createToastContainer() {
    if (document.getElementById('toast-container')) return;
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
}

function showToast(message, ms = 2000) {
    createToastContainer();
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    container.appendChild(t);
    // Trigger show
    requestAnimationFrame(() => t.classList.add('show'));
    // Remove after ms
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => { t.remove(); }, 260);
    }, ms);
}
