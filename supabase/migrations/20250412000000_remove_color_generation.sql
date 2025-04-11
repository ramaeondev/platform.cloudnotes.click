-- Drop the category color trigger if it exists
DROP TRIGGER IF EXISTS set_category_color ON public.categories;

-- Drop the function that generates colors
DROP FUNCTION IF EXISTS public.generate_category_color();