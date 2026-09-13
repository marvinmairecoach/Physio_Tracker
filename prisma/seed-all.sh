#!/bin/bash
# Run inside Railway deployment to seed databases
set -e
cd /app

echo "Seeding PhysioData..."
DATABASE_URL="$PHYSIO_DATABASE_URL" npx tsx prisma/seed-physio.ts

echo ""
echo "Seeding ClubData..."
DATABASE_URL="$CLUB_DATABASE_URL" npx tsx prisma/seed-club.ts

echo ""
echo "✅ All seeds completed!"