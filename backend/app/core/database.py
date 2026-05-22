from supabase import create_client, Client
from app.core.config import settings

# Anonim client (kullanıcı işlemleri)
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY
)

# Service role client (admin işlemleri — dikkatli kullan)
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)
