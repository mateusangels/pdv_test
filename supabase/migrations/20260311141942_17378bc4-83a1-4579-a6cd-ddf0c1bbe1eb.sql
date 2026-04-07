
-- Update handle_new_user to use the cargo from metadata for role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'cargo', '')::app_role,
    'funcionario'::app_role
  ));
  
  RETURN NEW;
END;
$$;
