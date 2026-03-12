-- CreateTable
CREATE TABLE "friends" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "profile_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT NOT NULL DEFAULT '',
    "unfriended_at" DATETIME,
    "blocked_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "activity_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "friend_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content_preview" TEXT NOT NULL DEFAULT '',
    "facebook_url" TEXT NOT NULL DEFAULT '',
    "interaction_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "discovered_via" TEXT NOT NULL DEFAULT 'manual',
    "batch_id" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "activity_items_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cleanup_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "friend_id" INTEGER NOT NULL,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "items_total" INTEGER NOT NULL DEFAULT 0,
    "items_completed" INTEGER NOT NULL DEFAULT 0,
    "items_skipped" INTEGER NOT NULL DEFAULT 0,
    "items_remaining" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "cleanup_sessions_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
