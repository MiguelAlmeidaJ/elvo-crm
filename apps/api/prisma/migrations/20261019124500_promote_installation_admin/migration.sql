UPDATE "Membership"
SET "role" = 'SYSTEM_ADMIN'
WHERE "id" = (
  SELECT "id"
  FROM "Membership"
  ORDER BY "createdAt" ASC
  LIMIT 1
);
