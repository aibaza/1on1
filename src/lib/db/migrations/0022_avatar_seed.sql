DO $$ BEGIN
  ALTER TABLE "user" ADD COLUMN "avatar_seed" varchar(50);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
