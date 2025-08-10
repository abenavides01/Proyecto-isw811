// Función para verificar el OTP
document.getElementById('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otpCode = document.getElementById('otpCode').value;
    const userId = localStorage.getItem('userId'); // Recupera el userId guardado al iniciar sesión

    if (!userId) {
        alert('Error: usuario no autenticado');
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch('/login/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, token: otpCode })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            alert(result.message); // Mensaje de éxito de la verificación de OTP
            localStorage.setItem('token', result.token); // Guarda el token en el almacenamiento local
            window.location.href = '/welcome.html'; // Redirige a la página protegida o de bienvenida
        } else {
            alert(result.message || 'Error al verificar el código OTP');
        }
    } catch (error) {
        console.error('Error en la conexión con el servidor:', error);
        alert('Error en la conexión con el servidor');
    }
});
