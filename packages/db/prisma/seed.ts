import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import vocabJson from "./data/vocab.json";

config();

const adapter = new PrismaMssql({
  server: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "1433", 10),
  database: process.env.DB_NAME ?? "mydb",
  user: process.env.DB_USER ?? "sa",
  password: process.env.DB_PASSWORD ?? "YourPassword123",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== "false",
  },
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const entries = Object.entries(vocabJson as Record<string, string>);

  console.log(`Seeding ${entries.length} MogVocab entries...`);

  for (const [rawName, normalizedName] of entries) {
    await prisma.mogVocab.upsert({
      where: { rawName },
      update: { normalizedName },
      create: { rawName, normalizedName },
    });
  }

  console.log("MogVocab seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
