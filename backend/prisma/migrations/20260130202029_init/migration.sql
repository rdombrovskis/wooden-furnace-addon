-- CreateTable
CREATE TABLE "SensorGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    "groupId" INTEGER NOT NULL,
    CONSTRAINT "Sensor_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SensorGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartName" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Part" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorGroupId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "partNamesId" INTEGER NOT NULL,
    CONSTRAINT "Part_sensorGroupId_fkey" FOREIGN KEY ("sensorGroupId") REFERENCES "SensorGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Part_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Part_partNamesId_fkey" FOREIGN KEY ("partNamesId") REFERENCES "PartName" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tag" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "stateId" INTEGER NOT NULL,
    CONSTRAINT "Session_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "SessionState" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sensorEntityId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "sensorId" INTEGER NOT NULL,
    CONSTRAINT "Log_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Log_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Log_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SensorGroup_name_version_key" ON "SensorGroup"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_entityId_key" ON "Sensor"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_entityId_groupId_key" ON "Sensor"("entityId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "PartName_name_key" ON "PartName"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tag_key" ON "Session"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "SessionState_name_key" ON "SessionState"("name");

-- CreateIndex
CREATE INDEX "Log_sessionId_timestamp_idx" ON "Log"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "Log_partId_timestamp_idx" ON "Log"("partId", "timestamp");

-- CreateIndex
CREATE INDEX "Log_sensorEntityId_timestamp_idx" ON "Log"("sensorEntityId", "timestamp");

-- CreateIndex
CREATE INDEX "Log_sessionId_partId_timestamp_idx" ON "Log"("sessionId", "partId", "timestamp");
