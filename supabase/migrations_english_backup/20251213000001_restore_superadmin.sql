-- Restaurar rol de superadmin para Lucas Echavarria
UPDATE profiles 
SET role = 'superadmin' 
WHERE email = 'echavarrialucas1986@gmail.com';

-- Verificar el cambio
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'echavarrialucas1986@gmail.com';
