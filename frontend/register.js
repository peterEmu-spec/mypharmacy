const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = document.getElementById("full-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  registerMessage.textContent = "Creating your account...";

  const submitButton = registerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch("http://localhost:3000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        fullName,
        email,
        password,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Registration failed.");
    }

    registerMessage.textContent = result.message;
    registerMessage.style.color = "green";

    registerForm.reset();
  } catch (error) {
    registerMessage.textContent =
      error.message || "Could not connect to the server.";
    registerMessage.style.color = "red";
  } finally {
    submitButton.disabled = false;
  }
});
