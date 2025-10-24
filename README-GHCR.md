Scoreboard — pubblicazione immagine Docker su GHCR / Docker Hub

Questo repository contiene tutto il necessario per buildare e pubblicare l'immagine Docker del progetto `scoreboard` tramite GitHub Actions.

Cosa fa il workflow
- Builda l'immagine Docker con BuildKit/Buildx.
- Pubblica su GitHub Container Registry (`ghcr.io/<owner>/scoreboard`) i tag: `latest`, `<sha>`, e il nome del branch (`main`).
- Se presenti i secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`, pubblica anche su Docker Hub.

Passi raccomandati (breve):

1) Controlla che il workflow sia presente in `.github/workflows/publish.yml` (già aggiunto).

2) Abilita il package su GitHub (se necessario):
   - Vai su GitHub → la tua repository → tab `Packages` (oppure https://github.com/users/<tuo-username>/packages).
   - Se il package `scoreboard` esiste, aprilo e assicurati che la Visibility sia `Public` se vuoi poterlo pullare senza credenziali.

3) Impostare i secrets (opzionale, per Docker Hub):
   - Vai su Settings → Secrets and variables → Actions → New repository secret.
   - Aggiungi `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` (quest'ultimo è un access token della tua Docker Hub account).

4) Eseguire il push su GitHub.
   - Se vuoi che io provi a fare il push al repository remoto per te, confermalo esplicitamente.
   - In alternativa, esegui localmente i comandi git standard per committare e pushare.

5) Sul NAS: se il package GHCR è privato, effettua il login con un PAT che abbia `read:packages`:

```bash
echo "<PAT>" | docker login ghcr.io --username "<GITHUB_USERNAME>" --password-stdin
docker pull ghcr.io/<your-username>/scoreboard:main
```

Se vuoi, posso:
- Aggiungere ulteriori automazioni (es. tag semantici, pubblicazione su più registry, pin a digest).
- Tentare di pushare direttamente su GitHub da qui (ho già eseguito push per altri commit in questa macchina) — dillo esplicitamente se vuoi che proceda.
