const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const loginButton = loginForm.querySelector('button[type="submit"]');

  loginButton.disabled = true;
  loginMessage.textContent = "Logging in...";
  loginMessage.style.color = "#333";

  try {
    const response = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Login failed.");
    }

    loginMessage.textContent = result.message;
    loginMessage.style.color = "green";

    // Give the customer a moment to see the success message.
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    loginMessage.textContent =
      error.message || "Could not connect to the server.";
    loginMessage.style.color = "red";
  } finally {
    loginButton.disabled = false;
  }
});
