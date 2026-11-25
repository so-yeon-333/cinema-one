-- Run once only after the foundation migration; these are the only seeded records.
WITH added AS (
  INSERT INTO public.screen (name, block1_rows, block1_cols, block2_rows, block2_cols, block3_rows, block3_cols)
  VALUES ('Screen 1', 8, 2, 8, 10, 8, 2), ('Screen 2', 6, 2, 6, 6, 6, 2), ('Screen 3', 5, 2, 5, 4, 5, 2)
  RETURNING id, name
)
SELECT a.name, public.generate_seats(a.id) FROM added a ORDER BY a.name;
