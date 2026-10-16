const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutButton = document.getElementById("checkout-button");

function getCart() {
  return JSON.parse(localStorage.getItem("pharmacyCart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("pharmacyCart", JSON.stringify(cart));
  displayCart();
}

function displayCart() {
  const cart = getCart();
  cartItemsContainer.replaceChildren();

  if (cart.length === 0) {
    cartItemsContainer.textContent = "Your cart is empty.";
    cartTotal.textContent = "Total: KSh 0.00";
    checkoutButton.disabled = true;
    return;
  }

  checkoutButton.disabled = false;
  let total = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const card = document.createElement("article");
    card.className = "medicine-card";

    const name = document.createElement("h3");
    name.textContent = item.medicine_name;

    const price = document.createElement("p");
    price.textContent = `Price: KSh ${item.price.toFixed(2)}`;

    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = String(item.stock_quantity);
    quantity.value = item.quantity;
    quantity.setAttribute("aria-label", `Quantity for ${item.medicine_name}`);

    quantity.addEventListener("change", () => {
      const newQuantity = Number(quantity.value);

      if (
        !Number.isInteger(newQuantity) ||
        newQuantity < 1 ||
        newQuantity > item.stock_quantity
      ) {
        alert(`Enter a quantity between 1 and ${item.stock_quantity}.`);
        displayCart();
        return;
      }

      const updatedCart = getCart();
      updatedCart[index].quantity = newQuantity;
      saveCart(updatedCart);
    });

    const subtotal = document.createElement("p");
    subtotal.textContent = `Subtotal: KSh ${itemTotal.toFixed(2)}`;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const updatedCart = getCart();
      updatedCart.splice(index, 1);
      saveCart(updatedCart);
    });

    card.append(name, price, quantity, subtotal, removeButton);
    cartItemsContainer.appendChild(card);
  });

  cartTotal.textContent = `Total: KSh ${total.toFixed(2)}`;
}

checkoutButton.addEventListener("click", () => {
  window.location.href = "checkout.html";
});

displayCart();
