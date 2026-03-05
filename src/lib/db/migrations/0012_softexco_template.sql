-- SoftexCo "1:1 Check-in (2 săptămâni)" Template
-- Run after 0012_score_weight.sql
-- SoftexCo tenant already exists: 62771e7d-1c88-4a7e-9d10-94a4a0327c0b

-- 1. Insert template
INSERT INTO questionnaire_template (id, tenant_id, name, description, is_default, is_published, version, created_at, updated_at)
VALUES (
  'dddddddd-0005-4000-a000-000000000005',
  '62771e7d-1c88-4a7e-9d10-94a4a0327c0b',
  '1:1 Check-in (2 săptămâni)',
  'Template bilunar pentru 1:1 structurat — stare generală, retrospectivă, mediu de lucru, creștere.',
  true,
  true,
  1,
  now(), now()
);

-- 3. Insert sections
INSERT INTO template_section (id, template_id, tenant_id, name, sort_order, created_at)
VALUES
  ('55550001-0001-4000-a000-000000000001', 'dddddddd-0005-4000-a000-000000000005', '62771e7d-1c88-4a7e-9d10-94a4a0327c0b', 'Cum te simți?',  0, now()),
  ('55550001-0002-4000-a000-000000000002', 'dddddddd-0005-4000-a000-000000000005', '62771e7d-1c88-4a7e-9d10-94a4a0327c0b', 'Retrospectivă',  1, now()),
  ('55550001-0003-4000-a000-000000000003', 'dddddddd-0005-4000-a000-000000000005', '62771e7d-1c88-4a7e-9d10-94a4a0327c0b', 'Mediul de lucru', 2, now()),
  ('55550001-0004-4000-a000-000000000004', 'dddddddd-0005-4000-a000-000000000005', '62771e7d-1c88-4a7e-9d10-94a4a0327c0b', 'Creștere',        3, now());

-- 4. Insert questions
INSERT INTO template_question (id, template_id, section_id, question_text, help_text, answer_type, answer_config, is_required, sort_order, score_weight, created_at)
VALUES
  -- Section 1: Cum te simți?
  ('66660001-0001-4000-a000-000000000001',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0001-4000-a000-000000000001',
   'Cum te simți în general?',
   NULL,
   'mood',
   '{"labels":{"1":"😢 Foarte rău","2":"😟 Nu prea bine","3":"😐 Ok","4":"😊 Bine","5":"😄 Excelent"}}',
   true, 0, 1.0, now()),

  ('66660001-0002-4000-a000-000000000002',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0001-4000-a000-000000000001',
   'Context personal (opțional)',
   'Sănătate, situații personale, orice relevant. Confidențial.',
   'text',
   '{}',
   false, 1, 1.0, now()),

  -- Section 2: Retrospectivă
  ('66660001-0003-4000-a000-000000000003',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0002-4000-a000-000000000002',
   'Taskurile de la ultima întâlnire au fost rezolvate?',
   NULL,
   'rating_1_5',
   '{"labels":{"1":"Nerezolvat","3":"Parțial","5":"Rezolvat complet"}}',
   true, 2, 2.0, now()),

  ('66660001-0004-4000-a000-000000000004',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0002-4000-a000-000000000002',
   'Cum evaluezi energia și progresul tău?',
   NULL,
   'rating_1_5',
   '{"labels":{"1":"Foarte scăzut","3":"Moderat","5":"Excelent"}}',
   true, 3, 2.0, now()),

  ('66660001-0005-4000-a000-000000000005',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0002-4000-a000-000000000002',
   'Ce ai realizat concret? Blocaje?',
   'Max 3 bullet-uri. Menționează și blocajele.',
   'text',
   '{}',
   true, 4, 1.0, now()),

  -- Section 3: Mediul de lucru
  ('66660001-0006-4000-a000-000000000006',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0003-4000-a000-000000000003',
   'Cât de liber ai fost de blocaje?',
   NULL,
   'rating_1_5',
   '{"labels":{"1":"Blocaje majore","3":"Câteva minore","5":"Fără blocaje"}}',
   true, 5, 0.5, now()),

  ('66660001-0007-4000-a000-000000000007',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0003-4000-a000-000000000003',
   'Cum a fost colaborarea?',
   NULL,
   'rating_1_5',
   '{"labels":{"1":"Problematică","3":"Normală","5":"Excelentă"}}',
   true, 6, 0.5, now()),

  ('66660001-0008-4000-a000-000000000008',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0003-4000-a000-000000000003',
   'Nivel de încărcare',
   NULL,
   'multiple_choice',
   '{"options":["Subîncărcat","Sub normal","Echilibrat","Peste normal","Supraîncărcat"]}',
   true, 7, 1.0, now()),

  -- Section 4: Creștere
  ('66660001-0009-4000-a000-000000000009',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0004-4000-a000-000000000004',
   'Cât de mult ai învățat/crescut?',
   NULL,
   'rating_1_5',
   '{"labels":{"1":"Nimic nou","3":"Ceva util","5":"Mult și aplicabil"}}',
   true, 8, 1.5, now()),

  ('66660001-0010-4000-a000-000000000010',
   'dddddddd-0005-4000-a000-000000000005',
   '55550001-0004-4000-a000-000000000004',
   'Detalii sau ce vrei să explorezi',
   'Opțional. Exemple concrete sau direcții de interes.',
   'text',
   '{}',
   false, 9, 1.0, now());
