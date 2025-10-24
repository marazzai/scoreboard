This is a [Next.js](https://nextjs.org) project with a custom Node server, Prisma + SQLite, Docker, and Portainer-friendly deployment options.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font).

## Deployment

Two options:

1) Pull prebuilt image (recommended for Portainer)

- Use `docker-compose.image.yml` which references `ghcr.io/marazzai/scoreboard:latest`.
- Ensure the GHCR package is Public or configure Portainer with GHCR credentials.
- No bind mounts required; the app auto-initializes the SQLite DB inside the container at `/app/var/db/dev.db`, runs schema migrations (db push), and seeds default OBS settings from environment variables.

2) Build from repository

- Use `docker-compose.remote.yml` to build on the target host.
- Requires Portainer's `/data` volume to be mounted and writable so it can clone the repository under `/data/compose`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Runtime initialization

On first start the container will:
- generate the Prisma client;
- create the DB directory if missing;
- push the Prisma schema to SQLite;
- run `prisma db seed` to ensure a default `ObsSetting` row, using `OBS_HOST`, `OBS_PORT`, `OBS_PASSWORD`.
