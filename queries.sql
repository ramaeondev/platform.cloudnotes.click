-- Check if profile was created
SELECT *
FROM public.profiles
WHERE id = 'YOUR_USER_UUID_HERE';

-- Check if the root folder was created
SELECT *
FROM public.folders
WHERE user_id = 'YOUR_USER_UUID_HERE'
AND name = 'Root'
AND is_system = true;

-- Check if default category was created
SELECT *
FROM public.categories
WHERE user_id = 'YOUR_USER_UUID_HERE'
AND name = 'Default'
AND is_system = true;

-- Check if newsletter subscription exists
SELECT *
FROM public.newsletter_subscribers
WHERE email = 'USER_EMAIL_HERE'; -- You'll need the user's email

-- Check everything at once (except newsletter which requires email)
SELECT 
  p.id AS profile_id,
  p.name AS profile_name,
  f.id AS folder_id,
  f.name AS folder_name,
  c.id AS category_id,
  c.name AS category_name,
  c.sequence AS category_sequence
FROM public.profiles p
LEFT JOIN public.folders f ON p.id = f.user_id AND f.is_system = true
LEFT JOIN public.categories c ON p.id = c.user_id AND c.is_system = true
WHERE p.id = 'YOUR_USER_UUID_HERE'; 