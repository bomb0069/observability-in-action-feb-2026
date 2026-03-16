CREATE TABLE "users" (
"id" SERIAL NOT NULL,
"org_id" integer NOT NULL,
"name" character varying NOT NULL,
"created" TIMESTAMP DEFAULT now(),
"updated" TIMESTAMP DEFAULT now()
);

-- Insert seed data with 20 users
INSERT INTO users (org_id, "name", created, updated) VALUES
(1, 'Somchai', now(), now()),
(1, 'Ekkasit', now(), now()),
(1, 'Boonchuay', now(), now()),
(1, 'Manee', now(), now()),
(1, 'Prasert', now(), now()),
(2, 'Suda', now(), now()),
(2, 'Anong', now(), now()),
(2, 'Wichai', now(), now()),
(2, 'Kulap', now(), now()),
(2, 'Somjai', now(), now()),
(3, 'Nittaya', now(), now()),
(3, 'Chalerm', now(), now()),
(3, 'Rattana', now(), now()),
(3, 'Siriporn', now(), now()),
(3, 'Surasak', now(), now()),
(4, 'Pirom', now(), now()),
(4, 'Waraporn', now(), now()),
(4, 'Chaiyaporn', now(), now()),
(4, 'Nopparat', now(), now()),
(4, 'Monthira', now(), now());
