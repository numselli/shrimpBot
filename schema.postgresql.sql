DROP TABLE IF EXISTS "stats";

CREATE TABLE "stats" (
    "id" VARCHAR,
    "count" NUMERIC NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);