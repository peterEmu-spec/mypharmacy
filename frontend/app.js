const medicinesContainer = document.getElementById("medicines");
const searchInput = document.getElementById("search");
const adminLink = document.getElementById("admin-link");
const logoutButton = document.getElementById("logout-button");
const loginLink = document.getElementById("login-link");
const registerLink = document.getElementById("register-link");
const welcomeMessage = document.getElementById("welcome-message");

let medicines = [];

// Check whether the user is logged in.
async function requireUserLogin() {
  try {
    const response = await fetch("http://localhost:3000/api/me", {
      credentials: "include",
    });

    if (response.status === 401) {
      window.location.replace("login.html");
      return false;
    }

    if (!response.ok) {
      console.error("Login check failed:", response.status);
      if (medicinesContainer) {
        medicinesContainer.textContent =
          "Unable to verify your login. Please refresh the page or try again.";
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error("Could not connect to the login service:", error);

    if (medicinesContainer) {
      medicinesContainer.textContent =
        "Cannot connect to the server. Please check that the backend is running.";
    }

    return false;
  }
}

// Display the logged-in user's information and role-based links.
async function checkLoginStatus() {
  try {
    const response = await fetch("http://localhost:3000/api/me", {
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();
    const user = result.user;

    if (!user) {
      console.error("The server did not return user information.");
      return;
    }

    if (welcomeMessage) {
      welcomeMessage.textContent = `Welcome, ${user.full_name}`;
    }

    if (loginLink) loginLink.hidden = true;
    if (registerLink) registerLink.hidden = true;
    if (logoutButton) logoutButton.hidden = false;

    if (adminLink) {
      adminLink.hidden = user.role !== "admin";
    }
  } catch (error) {
    console.error("Could not check login status:", error);
  }
}

// Log out the current user.
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      const response = await fetch("http://localhost:3000/api/logout", {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not log out.");
      }

      window.location.replace("login.html");
    } catch (error) {
      console.error("Logout error:", error);
      alert(error.message || "Could not log out. Please try again.");
      logoutButton.disabled = false;
    }
  });
}

// Load medicines from the backend.
async function loadMedicines() {
  try {
    const response = await fetch("http://localhost:3000/api/medicines");

    if (!response.ok) {
      throw new Error("Failed to load medicines.");
    }

    medicines = await response.json();
    displayMedicines(medicines);
  } catch (error) {
    console.error("Medicine loading error:", error);

    if (medicinesContainer) {
      medicinesContainer.textContent =
        "Could not load medicines. Please check that the server is running.";
    }
  }
}

// Display medicine cards.
function displayMedicines(items) {
  if (!medicinesContainer) return;

  medicinesContainer.replaceChildren();

  if (items.length === 0) {
    medicinesContainer.textContent = "No medicines found.";
    return;
  }

  items.forEach((medicine) => {
    const card = document.createElement("article");
    card.className = "medicine-card";

    const name = document.createElement("h3");
    name.textContent = medicine.medicine_name;

    const description = document.createElement("p");
    description.textContent =
      medicine.description || "No description available";

    const category = document.createElement("p");
    category.textContent = `Category: ${medicine.category_name}`;

    const price = document.createElement("p");
    price.textContent = `Price: KSh ${Number(medicine.price).toFixed(2)}`;

    const stock = document.createElement("p");
    stock.textContent = `In stock: ${medicine.stock_quantity}`;

    const addButton = document.createElement("button");
    addButton.textContent = "Add to Cart";
    addButton.disabled = Number(medicine.stock_quantity) <= 0;

    addButton.addEventListener("click", () => {
      try {
        const cart = JSON.parse(localStorage.getItem("pharmacyCart")) || [];

        const existingItem = cart.find(
          (item) => item.medicine_id === medicine.medicine_id,
        );

        if (existingItem) {
          if (existingItem.quantity >= Number(medicine.stock_quantity)) {
            alert("You cannot add more than the available stock.");
            return;
          }

          existingItem.quantity += 1;
        } else {
          cart.push({
            medicine_id: medicine.medicine_id,
            medicine_name: medicine.medicine_name,
            price: Number(medicine.price),
            quantity: 1,
            stock_quantity: Number(medicine.stock_quantity),
          });
        }

        localStorage.setItem("pharmacyCart", JSON.stringify(cart));
        alert(`${medicine.medicine_name} added to cart!`);
      } catch (error) {
        console.error("Cart error:", error);
        alert("Could not update your cart.");
      }
    });

    card.append(name, description, category, price, stock, addButton);
    medicinesContainer.appendChild(card);
  });
}

// Filter medicines by name or category.
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();

    const filteredMedicines = medicines.filter(
      (medicine) =>
        (medicine.medicine_name || "").toLowerCase().includes(searchTerm) ||
        (medicine.category_name || "").toLowerCase().includes(searchTerm),
    );

    displayMedicines(filteredMedicines);
  });
}

// Start the homepage only after confirming the session.
async function startHomepage() {
  const loggedIn = await requireUserLogin();

  if (!loggedIn) return;

  await checkLoginStatus();
  await loadMedicines();
}

startHomepage();
