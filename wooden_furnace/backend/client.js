const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const dbUrl = process.env.DATABASE_URL || 'file:./data/db.sqlite';
console.log('[INIT] DATABASE_URL: ' + dbUrl);

const adapter = new PrismaBetterSqlite3({
    url: dbUrl
})



const prisma = new PrismaClient({ adapter });

module.exports = prisma;