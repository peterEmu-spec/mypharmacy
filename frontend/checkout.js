const summary = document.getElementById("checkout-summary");
const form = document.getElementById("checkout-form");
const message = document.getElementById("checkout-message");

const checkoutButton = form.querySelector('button[type="submit"]');

function getCart() {
  return JSON.parse(localStorage.getItem("pharmacyCart")) || [];
}

function displaySummary() {
  const cart = getCart();
  summary.replaceChildren();

  if (cart.length === 0) {
    summary.textContent = "Your cart is empty. Add medicines before checkout.";
    checkoutButton.disabled = true;
    return;
  }

  checkoutButton.disabled = false;
  let total = 0;

  cart.forEach((item) => {
    const line = document.createElement("p");
    const subtotal = Number(item.price) * item.quantity;
    total += subtotal;

    line.textContent = `${item.medicine_name} × ${item.quantity} — KSh ${subtotal.toFixed(2)}`;

    summary.appendChild(line);
  });

  const totalLine = document.createElement("h3");
  totalLine.textContent = `Estimated total: KSh ${total.toFixed(2)}`;
  summary.appendChild(totalLine);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const cart = getCart();

  if (cart.length === 0) {
    message.textContent = "Your cart is empty.";
    return;
  }

  checkoutButton.disabled = true;
  message.textContent = "Submitting your order...";

  const orderData = {
    customerName: document.getElementById("customer-name").value.trim(),
    customerPhone: document.getElementById("customer-phone").value.trim(),
    deliveryAddress: document.getElementById("delivery-address").value.trim(),
    items: cart.map((item) => ({
      medicine_id: Number(item.medicine_id),
      quantity: Number(item.quantity),
    })),
  };

  try {
    const response = await fetch("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not place your order.");
    }

    localStorage.removeItem("pharmacyCart");

    message.textContent =
      `Order placed successfully! Order number: ${result.order_id}. ` +
      `Total: KSh ${Number(result.total_amount).toFixed(2)}.`;

    form.reset();
    displaySummary();
  } catch (error) {
    message.textContent = error.message;
    checkoutButton.disabled = false;
  }
});

displaySummary();
