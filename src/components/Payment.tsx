import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe("your-public-key-here");

const Payment: React.FC = () => {
  const [isPaymentInitialized, setIsPaymentInitialized] =
    useState<boolean>(false);
  const stripe = useStripe();
  const elements = useElements();

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Hi clicked");
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable form submission until it loads.
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (!error) {
      console.log("PaymentMethod created successfully:", paymentMethod);
      setIsPaymentInitialized(true);
    } else {
      console.error("Error creating PaymentMethod:", error);
    }
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center text-white bg-black">
      <div className="bg-green-700 w-fit h-fit ">
        {!isPaymentInitialized ? (
          <button
            onClick={handlePaymentSubmit}
            className="border p-2 rounded-md "
          >
            Topup to Start Using Xpress-voice
          </button>
        ) : (
          <form onSubmit={handlePaymentSubmit}>
            <CardElement />
            <button type="submit" disabled={!stripe} className="pay-button">
              Pay Now
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const PaymentWrapper: React.FC = () => {
  return (
    <Elements stripe={stripePromise}>
      <Payment />
    </Elements>
  );
};

export default PaymentWrapper;
