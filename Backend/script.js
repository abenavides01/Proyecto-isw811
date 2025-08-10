// Función para registrar un usuario
// Función para registrar un usuario
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const result = await response.json();

    if (response.ok) {
      alert(result.message); // Muestra el mensaje de éxito
      // Muestra el código QR en el contenedor correspondiente
      document.getElementById('qrCode').src = result.qrCodeUrl;
      document.getElementById('qrCodeContainer').style.display = 'block';
    } else {
      alert(result.error || 'Error al registrar el usuario');
    }
  } catch (error) {
    console.error('Error en la conexión con el servidor:', error);
    alert('Error en la conexión con el servidor');
  }
});



  
  // Función para iniciar sesión
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
  
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
  
      if (response.ok && result.require2FA) {
        if (result.qrCodeUrl) {
          document.getElementById('qrCode').src = result.qrCodeUrl;
          document.getElementById('qrCodeContainer').style.display = 'block';
        } else {
          localStorage.setItem('userId', result.userId);
          window.location.href = '/verify-otp.html';
        }
      } else {
        alert(result.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en la conexión con el servidor:', error);
      alert('Error en la conexión con el servidor');
    }
  });
  