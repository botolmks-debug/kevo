-- Fitur Carousel: potong beberapa token sekaligus secara atomik.
-- Mengembalikan sisa token setelah dipotong, atau -1 kalau token tidak cukup.
create or replace function consume_tokens(p_business_id uuid, p_amount int)
returns int
language plpgsql
security definer
as $$
declare
  v_remaining int;
begin
  update business_profile
     set tokens = tokens - p_amount
   where business_id = p_business_id
     and tokens >= p_amount
  returning tokens into v_remaining;

  if v_remaining is null then
    return -1;
  end if;
  return v_remaining;
end;
$$;

grant execute on function consume_tokens(uuid, int) to authenticated;
grant execute on function consume_tokens(uuid, int) to service_role;
