async function checkAdminAccess() {
  try {
    const response = await fetch("http://localhost:3000/api/me", {
      credentials: "include",
    });

    if (!response.ok) {
      window.location.href = "login.html";
      return false;
    }

    const result = await response.json();

    if (result.user.role !== "admin") {
      alert("Access denied. This page is for administrators only.");
      window.location.href = "index.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Admin access error:", error);
    alert("Could not verify your account. Please try again.");
    window.location.href = "login.html";
    return false;
  }
}

const ordersContainer = document.getElementById("orders-container");
const adminMessage = document.getElementById("admin-message");
const refreshButton = document.getElementById("refresh-orders");

async function loadOrders() {
  ordersContainer.textContent = "Loading orders...";
  adminMessage.textContent = "";

  try {
    const response = await fetch("http://localhost:3000/api/orders", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(
        response.status === 403
          ? "Access denied. Admin privileges are required."
          : "Could not load orders.",
      );
    }

    const orders = await response.json();
    ordersContainer.replaceChildren();

    if (orders.length === 0) {
      ordersContainer.textContent = "No orders have been placed yet.";
      return;
    }

    orders.forEach((order) => {
      const card = document.createElement("article");
      card.className = "medicine-card";

      const heading = document.createElement("h3");
      heading.textContent = `Order #${order.order_id}`;

      const customer = document.createElement("p");
      customer.textContent = `Customer: ${order.customer_name}`;

      const phone = document.createElement("p");
      phone.textContent = `Phone: ${order.customer_phone}`;

      const address = document.createElement("p");
      address.textContent = `Delivery address: ${order.delivery_address}`;

      const total = document.createElement("p");
      total.textContent = `Total: KSh ${Number(order.total_amount).toFixed(2)}`;

      const statusLabel = document.createElement("p");
      statusLabel.textContent = `Current status: ${order.status}`;

      const statusSelect = document.createElement("select");
      statusSelect.setAttribute(
        "aria-label",
        `Status for order ${order.order_id}`,
      );

      const statuses = ["pending", "processing", "completed", "cancelled"];

      statuses.forEach((statusValue) => {
        const option = document.createElement("option");
        option.value = statusValue;
        option.textContent =
          statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
        option.selected = statusValue === order.status;
        statusSelect.appendChild(option);
      });

      const saveButton = document.createElement("button");
      saveButton.textContent = "Save Status";

      saveButton.addEventListener("click", async () => {
        saveButton.disabled = true;
        adminMessage.textContent = "";

        try {
          const response = await fetch(
            `http://localhost:3000/api/orders/${order.order_id}/status`,
            {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: statusSelect.value,
              }),
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
                result.message ||
                "Could not update order status.",
            );
          }

          adminMessage.textContent = `Order #${order.order_id} updated to ${result.status}.`;

          await loadOrders();
        } catch (error) {
          adminMessage.textContent = error.message;
        } finally {
          saveButton.disabled = false;
        }
      });

      const itemsHeading = document.createElement("h4");
      itemsHeading.textContent = "Medicines ordered:";

      const itemsList = document.createElement("ul");

      (order.items || []).forEach((item) => {
        const listItem = document.createElement("li");
        const subtotal = Number(item.unit_price) * item.quantity;

        listItem.textContent =
          `${item.medicine_name} × ${item.quantity} — ` +
          `KSh ${subtotal.toFixed(2)}`;

        itemsList.appendChild(listItem);
      });

      card.append(
        heading,
        customer,
        phone,
        address,
        itemsHeading,
        itemsList,
        total,
        statusLabel,
        statusSelect,
        saveButton,
      );

      ordersContainer.appendChild(card);
    });
  } catch (error) {
    ordersContainer.textContent = "Could not load orders.";
    adminMessage.textContent = error.message;
  }
}

async function startAdminPage() {
  if (!ordersContainer || !adminMessage || !refreshButton) {
    console.error("Admin page HTML is missing a required element.");
    return;
  }

  const hasAccess = await checkAdminAccess();

  if (!hasAccess) {
    return;
  }

  refreshButton.addEventListener("click", loadOrders);

  await loadOrders();
}

startAdminPage();
