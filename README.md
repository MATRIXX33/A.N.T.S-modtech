# A.N.T.S ModTecH
Live audience interaction for the Alumni Networking Team, SDMIMD.
No accounts needed for the audience. Zero dependencies (Node 18+).

## Use it
- Audience: open the site address (or scan the QR code on the presenter screen).
- Host: open `<site address>/host` and enter your host password.

## Run on your own computer
    HOST_PASSWORD=yourpassword node server.js
Open http://localhost:3000/host (host) and http://localhost:3000/ (audience).

## Deploy free on Render (step by step)
1. Create a free account at github.com and make a new repository (for example `ants-modtech`).
2. Upload every file from this folder to it: `server.js`, `package.json`, `render.yaml`, `.gitignore`, `README.md`, and the `public` folder.
3. Create a free account at render.com and sign in with GitHub.
4. Click New, then Web Service, and choose your repository.
5. Settings: Runtime Node, Build Command `echo ok`, Start Command `node server.js`, Instance Type Free.
6. Under Environment Variables add `HOST_PASSWORD` with a password only you know.
7. Click Create Web Service. After a few minutes you get an address like `https://ants-modtech.onrender.com`.
8. Open `https://<your address>/host`, enter the password, and present. Audience members use `https://<your address>/`.

## Things to know about the free plan
- The site goes to sleep after 15 minutes without visitors and takes up to a minute to wake up. Open the host page a few minutes before you present.
- Saved data lives on temporary storage, so the slides and responses reset when the site sleeps, restarts or redeploys. Edit your slides shortly before presenting.
- A paid instance with a persistent disk, or a database, removes both limits.

## Settings
- `HOST_PASSWORD` (required): host login. Without it the server uses a placeholder and prints a warning.
- `SECRET` (optional): signs the host token.
- `DATA_FILE` (optional): where data is saved. Default `data.json`.
- `PORT` (optional): set automatically by most hosts.
