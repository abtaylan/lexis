-- Döviz bazlı Premium fiyatlandırma (TRY/USD/EUR) desteği için.
-- subscriptions tablosuna hangi para biriminde satın alındığını kaydeden
-- bir kolon ekliyor. Mevcut kayıtlar TRY varsayılanıyla dolduruluyor
-- (bugüne kadarki tüm abonelikler zaten TRY'ydi).
alter table public.subscriptions
  add column if not exists currency varchar(3) not null default 'TRY';
