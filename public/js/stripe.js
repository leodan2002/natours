import axios from 'axios';
import { showAlert } from './alerts';

// Declare the stripe variable at the top level
let stripe;

// Ensure scripts are loaded after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Stripe !== 'undefined') {
    // Initialize Stripe if it is loaded
    stripe = Stripe('pk_test_51Pv1DF09nyT1hLetmzIIxztEiEiTgVjaH2JNcozjSgOjcvL0N9aEqAyDeQuofK48w3kGjJlWU0gywtPlpRdtbCRI00NDPcdINJ');
  } else {
    console.error('Stripe is not loaded properly');
  }
});

export const bookTour = async (tourId) => {
  try {
    if (!stripe) {
      throw new Error('Stripe is not initialized properly.');
    }

    // 1) Get the session from the server
    const session = await axios(`http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err.message);
  }
};
