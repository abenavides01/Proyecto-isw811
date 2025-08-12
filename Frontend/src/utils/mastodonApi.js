
export const redirectToMastodonAuth = () => {
    const clientId = process.env.REACT_APP_MASTODON_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/mastodon-auth';
    const scope = 'read write';
    const authUrl = `${process.env.REACT_APP_MASTODON_API_URL}/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl; // Redirige al usuario a Mastodon
};
