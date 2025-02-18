<script>
    document.getElementById("emailForm").addEventListener("submit", async function(event) {
      event.preventDefault();
      var email = document.getElementById("email").value;

      const response = await fetch("/.netlify/functions/getLastEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.message && data.message.includes("Es necesario que verifiques la dirección de correo electrónico asociada a tu cuenta de MyDisney")) {
        // Si se encuentra el código de Disney+
        alert(data.message); // Muestra el mensaje con el código de Disney
      } else if (data.link) {
        // Si se encuentra el link de Netflix
        window.location.href = data.link; // Redirige automáticamente
      } else {
        alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
      }
    });
  </script>
</body>
</html>
