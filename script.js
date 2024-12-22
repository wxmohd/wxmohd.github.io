document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const token = await login(username, password);
        localStorage.setItem('jwt', token);
        window.location.href = 'profile.html'; // Redirect to profile page
    } catch (error) {
        document.getElementById('errorMessage').innerText = 'Invalid credentials';
    }
});

async function login(username, password) {
    const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa(username + ':' + password),
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    if (!data) throw new Error('Login failed');
    return data;
}
