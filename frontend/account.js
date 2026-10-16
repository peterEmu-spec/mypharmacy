const accountDetails = document.getElementById("account-details");
const ordersContainer = document.getElementById("my-orders");

async function loadAccount() {
  try {
    const response = await fetch("http://localhost:3000/api/me", {
      credentials: "include",
    });

    if (!response.ok) {
      accountDetails.textContent =
        "Your account details are unavailable. Please log in first.";
      ordersContainer.textContent = "Log in to view your order history.";
      return;
    }

    const result = await response.json();
    const user = result.user;

    accountDetails.replaceChildren();

    const name = document.createElement("p");
    name.textContent = `Name: ${user.full_name}`;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    accountDetails.append(name, email);

    await loadOrders();
  } catch (error) {
    accountDetails.textContent =
      "Could not connect to the server. Please try again.";
    console.error("Account error:", error);
  }
}

async function loadOrders() {
  ordersContainer.textContent = "Loading your orders...";

  try {
    const response = await fetch("http://localhost:3000/api/my-orders", {
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Could not load orders.");
    }

    ordersContainer.replaceChildren();

    if (result.orders.length === 0) {
      ordersContainer.textContent = "You have not placed any orders yet.";
      return;
    }

    result.orders.forEach((order) => {
      const card = document.createElement("article");
      card.className = "medicine-card";

      const heading = document.createElement("h3");
      heading.textContent = `Order #${order.order_id}`;

      const status = document.createElement("p");
      status.textContent = `Status: ${order.status}`;

      const total = document.createElement("p");
      total.textContent = `Total: KSh ${Number(order.total_amount).toFixed(2)}`;

      const itemsHeading = document.createElement("h4");
      itemsHeading.textContent = "Medicines ordered:";

      const list = document.createElement("ul");

      (order.items || []).forEach((item) => {
        const listItem = document.createElement("li");

        listItem.textContent =
          `${item.medicine_name} × ${item.quantity} — ` +
          `KSh ${(Number(item.unit_price) * item.quantity).toFixed(2)}`;

        list.appendChild(listItem);
      });

      card.append(heading, status, itemsHeading, list, total);
      ordersContainer.appendChild(card);
    });
  } catch (error) {
    ordersContainer.textContent = error.message;
  }
}

loadAccount();
