-- Drop the trigger first
DROP TRIGGER IF EXISTS set_category_color_trigger ON public.categories;

-- Then drop the functions
DROP FUNCTION IF EXISTS public.set_category_color();
DROP FUNCTION IF EXISTS public.generate_category_color(uuid);