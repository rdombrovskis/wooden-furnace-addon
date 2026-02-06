-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tag" TEXT NOT NULL,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "stateId" INTEGER NOT NULL,
    CONSTRAINT "Session_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "SessionState" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "endTime", "id", "startTime", "stateId", "tag") SELECT "createdAt", "endTime", "id", "startTime", "stateId", "tag" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_tag_key" ON "Session"("tag");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
