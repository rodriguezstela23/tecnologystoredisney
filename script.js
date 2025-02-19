document.getElementById("emailForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    var email = document.getElementById("email").value;

    const response = await fetch("/.netlify/functions/getLastEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();

    // Si encontramos un enlace de Disney+
    if (data.alert) {
        // Mostrar el cuerpo del mensaje de Disney+ en el modal
        document.getElementById("messageBody").innerHTML = data.body; // Insertar el HTML del cuerpo
        document.getElementById("messageModal").style.display = 'block'; // Mostrar el modal
    } 
    // Si encontramos un enlace de Netflix
    else if (data.link) {
        window.location.href = data.link; // Redirige automáticamente
    } 
    // Si no se encuentra nada
    else {
        alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
    }
});

// Función para cerrar el modal
document.getElementById("closeModal").addEventListener("click", function() {
    document.getElementById("messageModal").style.display = 'none'; // Ocultar el modal
});
