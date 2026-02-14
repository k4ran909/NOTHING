/* ============================================
   BUY NOTHING — Razorpay Payment Integration
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initQuantitySelector();
    initExtrasToggle();
    initCheckoutForm();
    updatePrices();
});

/* === Configuration === */
const CONFIG = {
    RAZORPAY_KEY: 'rzp_test_YourTestKeyHere', // Replace with your Razorpay Test/Live key
    PRODUCT_NAME: 'NOTHING™ — Premium Edition',
    PRODUCT_PRICE: 50, // Base price in INR
    CURRENCY: 'INR',
    GST_RATE: 0.18,
    COMPANY_NAME: 'BUY NOTHING',
    COMPANY_LOGO: '', // Add your logo URL here
    THEME_COLOR: '#7c5cff',
    DESCRIPTION: 'Purchase of premium NOTHING™ — The world\'s first premium nothing.',
};

let currentQuantity = 1;

/* === Quantity Selector === */
function initQuantitySelector() {
    const minusBtn = document.getElementById('qtyMinus');
    const plusBtn = document.getElementById('qtyPlus');
    const qtyDisplay = document.getElementById('qtyValue');

    if (!minusBtn || !plusBtn) return;

    minusBtn.addEventListener('click', () => {
        if (currentQuantity > 1) {
            currentQuantity--;
            qtyDisplay.textContent = currentQuantity;
            updatePrices();
        }
    });

    plusBtn.addEventListener('click', () => {
        if (currentQuantity < 10) {
            currentQuantity++;
            qtyDisplay.textContent = currentQuantity;
            updatePrices();
        }
    });
}

/* === Extras Toggle === */
function initExtrasToggle() {
    const extras = document.querySelectorAll('.extra-option input[type="checkbox"]');
    extras.forEach(cb => {
        cb.addEventListener('change', updatePrices);
    });
}

/* === Price Calculations === */
function getExtrasTotal() {
    let total = 0;
    document.querySelectorAll('.extra-option input[type="checkbox"]:checked').forEach(cb => {
        total += parseInt(cb.value) || 0;
    });
    return total;
}

function updatePrices() {
    const subtotal = CONFIG.PRODUCT_PRICE * currentQuantity;
    const extras = getExtrasTotal();
    const taxable = subtotal + extras;
    const tax = Math.round(taxable * CONFIG.GST_RATE);
    const total = taxable + tax;

    // Update DOM elements
    const itemPriceEl = document.getElementById('itemPrice');
    const subtotalEl = document.getElementById('subtotal');
    const extrasTotalEl = document.getElementById('extrasTotal');
    const taxAmountEl = document.getElementById('taxAmount');
    const totalAmountEl = document.getElementById('totalAmount');
    const payAmountEl = document.getElementById('payAmount');

    if (itemPriceEl) itemPriceEl.textContent = formatCurrency(subtotal);
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (extrasTotalEl) extrasTotalEl.textContent = formatCurrency(extras);
    if (taxAmountEl) taxAmountEl.textContent = formatCurrency(tax);
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(total);
    if (payAmountEl) payAmountEl.textContent = formatCurrency(total);
}

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

function getTotalAmountInPaise() {
    const subtotal = CONFIG.PRODUCT_PRICE * currentQuantity;
    const extras = getExtrasTotal();
    const taxable = subtotal + extras;
    const tax = Math.round(taxable * CONFIG.GST_RATE);
    const total = taxable + tax;
    return total * 100; // Razorpay expects amount in paise
}

/* === Checkout Form === */
function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Check terms
        const termsAccepted = document.getElementById('termsAccept').checked;
        if (!termsAccepted) {
            alert('Please accept the Terms of Nothing to proceed.');
            return;
        }

        // Collect form data
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value.trim(),
            giftMessage: document.getElementById('giftMessage').value.trim(),
        };

        // Initiate Razorpay payment
        initiatePayment(formData);
    });
}

/* === Razorpay Payment === */
function initiatePayment(customerData) {
    const payBtn = document.getElementById('payBtn');
    payBtn.classList.add('loading');

    const totalPaise = getTotalAmountInPaise();
    const totalINR = totalPaise / 100;

    const options = {
        key: CONFIG.RAZORPAY_KEY,
        amount: totalPaise,
        currency: CONFIG.CURRENCY,
        name: CONFIG.COMPANY_NAME,
        description: CONFIG.DESCRIPTION,
        image: CONFIG.COMPANY_LOGO,
        handler: function (response) {
            // Payment successful
            handlePaymentSuccess(response, customerData, totalINR);
        },
        prefill: {
            name: `${customerData.firstName} ${customerData.lastName}`,
            email: customerData.email,
            contact: customerData.phone,
        },
        notes: {
            product: CONFIG.PRODUCT_NAME,
            quantity: currentQuantity,
            address: `${customerData.address}, ${customerData.city}, ${customerData.state} - ${customerData.pincode}`,
            gift_message: customerData.giftMessage || 'N/A',
        },
        theme: {
            color: CONFIG.THEME_COLOR,
            backdrop_color: 'rgba(10, 10, 15, 0.85)',
        },
        modal: {
            ondismiss: function () {
                payBtn.classList.remove('loading');
            },
            escape: true,
            animation: true,
        },
        method: {
            netbanking: true,
            card: true,
            upi: true,
            wallet: true,
        },
    };

    try {
        const rzp = new Razorpay(options);
        
        rzp.on('payment.failed', function (response) {
            handlePaymentFailure(response);
            payBtn.classList.remove('loading');
        });

        rzp.open();
        payBtn.classList.remove('loading');
    } catch (error) {
        console.error('Razorpay initialization error:', error);
        payBtn.classList.remove('loading');
        alert('Payment system could not be loaded. Please check your internet connection and try again.');
    }
}

/* === Payment Success Handler === */
function handlePaymentSuccess(response, customerData, amount) {
    console.log('Payment Success:', response);

    // Store order details in sessionStorage for success page
    const orderDetails = {
        paymentId: response.razorpay_payment_id,
        orderId: 'ORD-' + Date.now().toString(36).toUpperCase(),
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        email: customerData.email,
        phone: customerData.phone,
        amount: amount,
        quantity: currentQuantity,
        address: `${customerData.address}, ${customerData.city}, ${customerData.state} - ${customerData.pincode}`,
        date: new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }),
        product: CONFIG.PRODUCT_NAME,
    };

    sessionStorage.setItem('orderDetails', JSON.stringify(orderDetails));

    // Redirect to success page
    window.location.href = 'success.html';
}

/* === Payment Failure Handler === */
function handlePaymentFailure(response) {
    console.error('Payment Failed:', response.error);

    const errorMessages = {
        'BAD_REQUEST_ERROR': 'There was an issue with the payment request. Please try again.',
        'GATEWAY_ERROR': 'Payment gateway error. Please try a different payment method.',
        'SERVER_ERROR': 'Server error. Please try again in a few moments.',
    };

    const errorCode = response.error?.code || 'UNKNOWN';
    const message = errorMessages[errorCode] || `Payment failed: ${response.error?.description || 'Unknown error'}. Please try again.`;

    alert(message);
}
