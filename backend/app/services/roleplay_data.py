"""
backend/app/services/roleplay_data.py

Dallanan diyalog agaci modeli (25 Kasim 2026 kullanici istegi -- "Diyalog
Pratigi"nde serbest metin yazmak yerine hazir cumleleri isaretleyerek
konusma pratigi). Tamamen statik veri -- CANLI ANTHROPIC API CAGRISI YOK,
roleplay_service.py'deki eski _call_model/_build_system_prompt/
_lang_name_en/_get_current_level kaldirildi, cunku icerik artik
AI-uretimi degil, onceden yazilmis.

Her senaryo bir "dallan ve tekrar birles" agaci: bir node'da bot bir
replik soyler (node["bot"]), kullaniciya 3 hazir secenek sunulur
(node["options"], her biri quality="good"/"ok"/"poor"). Kullanici
hangisini secerse secsin kisa bir tepki gosterilir (option["reaction"]),
sonra agac bir sonraki ortak node'da (option["next"]) tekrar birlesir.
next=None son node demektir -- senaryo oraya varinca biter.

Kalite dagilimi (XP hesaplamasinda kullanilir, bkz. roleplay_service.py):
"good" = en uygun/dogal cevap, "ok" = anlasilir ama daha az ideal (kaba/
tereddutlu/soru), "poor" = uygunsuz/kaba/konuyu dagitan -- ama hicbiri
"yanlis cevap verdin, bastan basla" demiyor, akis her zaman devam eder.

KAPSAM NOTU: Icerik su an SADECE Ingilizce (hedef dil=en). Diger
ogrenilen diller icin ceviri/yerellestirme henuz yapilmadi -- bilinen bir
sinir, ilerleyen bir asamada ele alinacak.

ILERLEME NOTU (25 Kasim 2026): Onaylanan 14 kategori / 102 senaryoluk
katalogun SCENARIO_META'si (slug+basliklar+kategori) TAMAMI yazildi.
SCENARIO_TREES (gercek dallanan diyalog icerigi) ise once 28 senaryo icin
tam olarak yazildi (her kategoriden en az 2 tane) -- geri kalan ~74
senaryo icin agac henuz yazilmadi. list_categories() SADECE SCENARIO_TREES
icinde agaci olan senaryolari listeler, boylece secilebilir ama calismayan
bir senaryo asla kullaniciya gosterilmez. Kalan senaryolarin agaclari
ilerleyen turlarda eklenecek (bkz. gorev listesi).
"""

CATEGORIES: list[dict] = [
    {"slug": "travel", "title_tr": "Seyahat & Ulaşım", "title_en": "Travel & Transport", "icon": "plane"},
    {"slug": "food_drink", "title_tr": "Yeme-İçme", "title_en": "Food & Drink", "icon": "utensils"},
    {"slug": "shopping", "title_tr": "Alışveriş", "title_en": "Shopping", "icon": "shopping-bag"},
    {"slug": "home_housing", "title_tr": "Konaklama & Ev İşleri", "title_en": "Housing & Home Life", "icon": "home"},
    {"slug": "work_career", "title_tr": "İş & Kariyer", "title_en": "Work & Career", "icon": "briefcase"},
    {"slug": "education", "title_tr": "Eğitim & Okul", "title_en": "Education & School", "icon": "graduation-cap"},
    {"slug": "social_life", "title_tr": "Sosyal Hayat & Arkadaşlık", "title_en": "Social Life & Friendship", "icon": "users"},
    {"slug": "family", "title_tr": "Aile & İlişkiler", "title_en": "Family & Relationships", "icon": "heart"},
    {"slug": "health", "title_tr": "Sağlık & Acil Durumlar", "title_en": "Health & Emergencies", "icon": "stethoscope"},
    {"slug": "finance", "title_tr": "Bankacılık, Finans & Resmi İşlemler", "title_en": "Banking, Finance & Official Matters", "icon": "landmark"},
    {"slug": "tech_support", "title_tr": "Teknoloji & Müşteri Hizmetleri", "title_en": "Tech & Customer Support", "icon": "headphones"},
    {"slug": "leisure", "title_tr": "Eğlence, Spor & Hobi", "title_en": "Leisure, Sports & Hobbies", "icon": "ticket"},
    {"slug": "immigration", "title_tr": "Göç & Yerleşim İşlemleri", "title_en": "Immigration & Settling In", "icon": "file-text"},
    {"slug": "vehicle", "title_tr": "Araç & Trafik", "title_en": "Vehicles & Traffic", "icon": "car"},
]

# slug -> {category_slug, title_tr, title_en} -- TUM 102 senaryonun basligi
# (onaylanan son liste, 25 Kasim 2026). Agaci henuz yazilmamis olanlar da
# burada yer alir; list_categories() bunlari SCENARIO_TREES'te yoksa filtreler.
SCENARIO_META: dict[str, dict] = {
    # 1. Seyahat & Ulaşım
    "hotel_checkin": {"category_slug": "travel", "title_tr": "Otelde Check-in", "title_en": "Hotel Check-in"},
    "directions": {"category_slug": "travel", "title_tr": "Yol Tarifi Sorma", "title_en": "Asking for Directions"},
    "airport_checkin": {"category_slug": "travel", "title_tr": "Havaalanında Check-in", "title_en": "Airport Check-in"},
    "passport_control": {"category_slug": "travel", "title_tr": "Gümrükte Pasaport Kontrolü", "title_en": "Passport Control at Customs"},
    "taxi_uber": {"category_slug": "travel", "title_tr": "Taksi/Uber Çağırma", "title_en": "Calling a Taxi or Rideshare"},
    "bus_train_ticket": {"category_slug": "travel", "title_tr": "Tren/Otobüs Bileti Alma", "title_en": "Buying a Train or Bus Ticket"},
    "lost_luggage": {"category_slug": "travel", "title_tr": "Kayıp Bagaj Bildirme", "title_en": "Reporting Lost Luggage"},
    "car_rental": {"category_slug": "travel", "title_tr": "Araç Kiralama", "title_en": "Renting a Car"},
    "tour_guide_info": {"category_slug": "travel", "title_tr": "Tur Rehberinden Bilgi Alma", "title_en": "Asking a Tour Guide for Info"},

    # 2. Yeme-İçme
    "cafe_order": {"category_slug": "food_drink", "title_tr": "Kafede Sipariş", "title_en": "Ordering at a Café"},
    "restaurant_reservation": {"category_slug": "food_drink", "title_tr": "Restoranda Masa Ayırtma", "title_en": "Booking a Restaurant Table"},
    "restaurant_order": {"category_slug": "food_drink", "title_tr": "Restoranda Sipariş Verme", "title_en": "Ordering at a Restaurant"},
    "bill_dispute": {"category_slug": "food_drink", "title_tr": "Hesap İsteme/Faturaya İtiraz", "title_en": "Asking for the Bill / Disputing a Charge"},
    "fastfood_order": {"category_slug": "food_drink", "title_tr": "Fast-Food Sipariş", "title_en": "Ordering Fast Food"},
    "phone_food_order": {"category_slug": "food_drink", "title_tr": "Telefonla Yemek Siparişi", "title_en": "Ordering Food by Phone"},
    "allergy_notice": {"category_slug": "food_drink", "title_tr": "Alerjisi Olduğunu Belirtme", "title_en": "Mentioning a Food Allergy"},
    "drink_menu_advice": {"category_slug": "food_drink", "title_tr": "İçecek Menüsü Danışma", "title_en": "Asking About the Drinks Menu"},

    # 3. Alışveriş
    "clothes_shopping": {"category_slug": "shopping", "title_tr": "Kıyafet Mağazasında Alışveriş", "title_en": "Shopping for Clothes"},
    "electronics_inquiry": {"category_slug": "shopping", "title_tr": "Elektronik Mağazasında Ürün Sorma", "title_en": "Asking About Electronics"},
    "return_exchange": {"category_slug": "shopping", "title_tr": "Ürün İade/Değişim", "title_en": "Returning or Exchanging an Item"},
    "bargaining": {"category_slug": "shopping", "title_tr": "Pazarlık Yapma", "title_en": "Bargaining at a Market"},
    "grocery_shopping": {"category_slug": "shopping", "title_tr": "Markette Alışveriş", "title_en": "Grocery Shopping"},
    "order_tracking": {"category_slug": "shopping", "title_tr": "Online Sipariş Takibi", "title_en": "Tracking an Online Order"},
    "gift_advice": {"category_slug": "shopping", "title_tr": "Hediye Seçimi Danışma", "title_en": "Getting Gift Advice"},
    "post_package": {"category_slug": "shopping", "title_tr": "Postane/Kargo Gönderme-Alma", "title_en": "Sending or Picking Up a Package"},

    # 4. Konaklama & Ev İşleri
    "renting_apartment": {"category_slug": "home_housing", "title_tr": "Emlakçıyla Ev Kiralama", "title_en": "Renting an Apartment with an Agent"},
    "reporting_repair": {"category_slug": "home_housing", "title_tr": "Ev Sahibine Arıza Bildirme", "title_en": "Reporting a Repair to the Landlord"},
    "meeting_roommate": {"category_slug": "home_housing", "title_tr": "Ev Arkadaşıyla Tanışma", "title_en": "Meeting a New Roommate"},
    "utility_signup": {"category_slug": "home_housing", "title_tr": "Elektrik/Su Aboneliği", "title_en": "Setting Up Utilities"},
    "internet_provider": {"category_slug": "home_housing", "title_tr": "İnternet Sağlayıcısıyla Görüşme", "title_en": "Talking to an Internet Provider"},
    "neighbor_chat": {"category_slug": "home_housing", "title_tr": "Komşuyla Sohbet", "title_en": "Chatting with a Neighbor"},

    # 5. İş & Kariyer
    "job_interview": {"category_slug": "work_career", "title_tr": "İş Görüşmesi", "title_en": "Job Interview"},
    "first_day": {"category_slug": "work_career", "title_tr": "İlk İş Günü", "title_en": "First Day at Work"},
    "meeting_scheduling": {"category_slug": "work_career", "title_tr": "Toplantı Planlama", "title_en": "Scheduling a Meeting"},
    "asking_raise": {"category_slug": "work_career", "title_tr": "Zam İsteme", "title_en": "Asking for a Raise"},
    "giving_presentation": {"category_slug": "work_career", "title_tr": "Sunum Yapma", "title_en": "Giving a Presentation"},
    "requesting_leave": {"category_slug": "work_career", "title_tr": "İzin Talebi", "title_en": "Requesting Time Off"},
    "performance_review": {"category_slug": "work_career", "title_tr": "Performans Değerlendirme", "title_en": "Performance Review"},
    "resignation_talk": {"category_slug": "work_career", "title_tr": "İstifa Görüşmesi", "title_en": "Resignation Conversation"},

    # 6. Eğitim & Okul
    "teacher_parent_meeting": {"category_slug": "education", "title_tr": "Öğretmen-Veli Görüşmesi", "title_en": "Teacher-Parent Meeting"},
    "group_project_planning": {"category_slug": "education", "title_tr": "Grup Ödevi Planlama", "title_en": "Planning a Group Project"},
    "enrollment_library": {"category_slug": "education", "title_tr": "Kayıt/Kütüphane İşlemleri", "title_en": "Enrollment & Library Procedures"},
    "course_selection_advice": {"category_slug": "education", "title_tr": "Ders Seçimi Danışmanlığı", "title_en": "Course Selection Advising"},
    "exchange_program_interview": {"category_slug": "education", "title_tr": "Değişim Programı Görüşmesi", "title_en": "Exchange Program Interview"},
    "enrolling_child_school": {"category_slug": "education", "title_tr": "Çocuğunu Okula Kaydettirme", "title_en": "Enrolling Your Child in School"},
    "enrolling_self_university": {"category_slug": "education", "title_tr": "Kendin Okula/Üniversiteye Kayıt Olma", "title_en": "Enrolling Yourself in School/University"},
    "language_course_signup": {"category_slug": "education", "title_tr": "Dil Kursuna Kayıt", "title_en": "Signing Up for a Language Course"},
    "diploma_recognition": {"category_slug": "education", "title_tr": "Diploma Denklik İşlemi", "title_en": "Diploma Recognition Procedure"},
    "scholarship_application": {"category_slug": "education", "title_tr": "Burs Başvurusu", "title_en": "Scholarship Application"},

    # 7. Sosyal Hayat & Arkadaşlık
    "making_friends": {"category_slug": "social_life", "title_tr": "Yeni Biriyle Tanışma", "title_en": "Meeting Someone New"},
    "party_smalltalk": {"category_slug": "social_life", "title_tr": "Partide Küçük Sohbet", "title_en": "Small Talk at a Party"},
    "catching_up_old_friend": {"category_slug": "social_life", "title_tr": "Eski Arkadaşla Buluşma", "title_en": "Catching Up with an Old Friend"},
    "weekend_plans": {"category_slug": "social_life", "title_tr": "Hafta Sonu Planı", "title_en": "Weekend Plans"},
    "apologizing": {"category_slug": "social_life", "title_tr": "Özür Dileme", "title_en": "Apologizing"},
    "invitation_response": {"category_slug": "social_life", "title_tr": "Davet Etme/Cevap Verme", "title_en": "Inviting Someone & Responding"},
    "first_date": {"category_slug": "social_life", "title_tr": "İlk Buluşma", "title_en": "A First Date"},
    "local_event_invite": {"category_slug": "social_life", "title_tr": "Yerel Bir Törene/Etkinliğe Davet Edilme", "title_en": "Invited to a Local Event"},
    "etiquette_question": {"category_slug": "social_life", "title_tr": "Görgü Kuralları Sorma", "title_en": "Asking About Etiquette"},

    # 8. Aile & İlişkiler
    "calling_relative": {"category_slug": "family", "title_tr": "Aile Büyüğüyle Telefon", "title_en": "Phone Call with a Family Elder"},
    "spouse_daily_plan": {"category_slug": "family", "title_tr": "Eşle Günlük Plan", "title_en": "Daily Planning with a Spouse"},
    "talking_about_childs_school": {"category_slug": "family", "title_tr": "Çocuğun Okulu Hakkında Konuşma", "title_en": "Talking About Your Child's School"},
    "making_up": {"category_slug": "family", "title_tr": "Barışma", "title_en": "Making Up After an Argument"},
    "family_meeting_planning": {"category_slug": "family", "title_tr": "Aile Toplantısı Planlama", "title_en": "Planning a Family Gathering"},

    # 9. Sağlık & Acil Durumlar
    "doctor_appointment": {"category_slug": "health", "title_tr": "Doktor Randevusu", "title_en": "Doctor's Appointment"},
    "pharmacy": {"category_slug": "health", "title_tr": "Eczane", "title_en": "At the Pharmacy"},
    "dentist": {"category_slug": "health", "title_tr": "Diş Hekimi", "title_en": "At the Dentist"},
    "describing_symptoms": {"category_slug": "health", "title_tr": "Semptom Anlatma", "title_en": "Describing Symptoms"},
    "emergency_call": {"category_slug": "health", "title_tr": "Acil Durum Araması (112)", "title_en": "Making an Emergency Call"},
    "hospital_reception": {"category_slug": "health", "title_tr": "Hastane Resepsiyonu", "title_en": "Hospital Reception"},
    "insurance_company": {"category_slug": "health", "title_tr": "Sigorta Şirketi", "title_en": "Calling the Insurance Company"},
    "vet_appointment": {"category_slug": "health", "title_tr": "Veterinerde Randevu", "title_en": "Vet Appointment"},
    "pet_registration": {"category_slug": "health", "title_tr": "Evcil Hayvan Kaydı", "title_en": "Registering a Pet"},

    # 10. Bankacılık, Finans & Resmi İşlemler
    "opening_bank_account": {"category_slug": "finance", "title_tr": "Banka Hesabı Açma", "title_en": "Opening a Bank Account"},
    "credit_card_issue": {"category_slug": "finance", "title_tr": "Kredi Kartı Sorunu", "title_en": "Credit Card Issue"},
    "money_transfer": {"category_slug": "finance", "title_tr": "Para Transferi", "title_en": "Transferring Money"},
    "passport_visa_application": {"category_slug": "finance", "title_tr": "Pasaport/Vize Başvurusu", "title_en": "Passport or Visa Application"},
    "police_statement": {"category_slug": "finance", "title_tr": "Karakolda İfade", "title_en": "Giving a Statement at the Police Station"},
    "tax_office": {"category_slug": "finance", "title_tr": "Vergi Dairesi", "title_en": "At the Tax Office"},

    # 11. Teknoloji & Müşteri Hizmetleri
    "phone_carrier_call": {"category_slug": "tech_support", "title_tr": "Operatörle Görüşme", "title_en": "Calling Your Phone Carrier"},
    "tech_support_call": {"category_slug": "tech_support", "title_tr": "Teknik Destek", "title_en": "Tech Support Call"},
    "faulty_product_complaint": {"category_slug": "tech_support", "title_tr": "Arızalı Ürün Şikayeti", "title_en": "Complaining About a Faulty Product"},
    "subscription_cancellation": {"category_slug": "tech_support", "title_tr": "Abonelik İptali", "title_en": "Cancelling a Subscription"},
    "app_install_help": {"category_slug": "tech_support", "title_tr": "Uygulama Kurulum Yardımı", "title_en": "Help Installing an App"},

    # 12. Eğlence, Spor & Hobi
    "movie_tickets": {"category_slug": "leisure", "title_tr": "Sinema/Tiyatro Bileti", "title_en": "Buying Movie or Theater Tickets"},
    "gym_membership": {"category_slug": "leisure", "title_tr": "Spor Salonu Üyeliği", "title_en": "Gym Membership Signup"},
    "trainer_program": {"category_slug": "leisure", "title_tr": "Antrenörle Program", "title_en": "Planning a Program with a Trainer"},
    "concert_smalltalk": {"category_slug": "leisure", "title_tr": "Konser/Etkinlik Sohbeti", "title_en": "Small Talk at a Concert"},
    "hobby_class": {"category_slug": "leisure", "title_tr": "Hobi Kursu", "title_en": "Signing Up for a Hobby Class"},
    "book_club": {"category_slug": "leisure", "title_tr": "Kitap Kulübü", "title_en": "Book Club Meeting"},

    # 13. Göç & Yerleşim İşlemleri
    "residence_permit": {"category_slug": "immigration", "title_tr": "Oturma İzni", "title_en": "Residence Permit"},
    "address_registration": {"category_slug": "immigration", "title_tr": "Adres/Nüfus Kaydı", "title_en": "Address Registration"},
    "work_permit": {"category_slug": "immigration", "title_tr": "Çalışma İzni", "title_en": "Work Permit"},
    "drivers_license_conversion": {"category_slug": "immigration", "title_tr": "Sürücü Belgesi Dönüştürme", "title_en": "Converting a Driver's License"},
    "buying_sim_card": {"category_slug": "immigration", "title_tr": "SIM Kart Alma", "title_en": "Buying a SIM Card"},
    "moving_company": {"category_slug": "immigration", "title_tr": "Nakliye Şirketi", "title_en": "Dealing with a Moving Company"},
    "social_security_number": {"category_slug": "immigration", "title_tr": "Sosyal Güvenlik Numarası", "title_en": "Getting a Social Security Number"},

    # 14. Araç & Trafik
    "buying_a_car": {"category_slug": "vehicle", "title_tr": "Araç Satın Alma", "title_en": "Buying a Car"},
    "vehicle_inspection": {"category_slug": "vehicle", "title_tr": "Araç Muayenesi", "title_en": "Vehicle Inspection"},
    "contesting_traffic_fine": {"category_slug": "vehicle", "title_tr": "Trafik Cezasına İtiraz", "title_en": "Contesting a Traffic Fine"},
    "talking_to_traffic_police": {"category_slug": "vehicle", "title_tr": "Trafik Polisiyle Konuşma", "title_en": "Talking to Traffic Police"},
    "car_insurance": {"category_slug": "vehicle", "title_tr": "Araç Sigortası", "title_en": "Car Insurance"},
    "gas_station": {"category_slug": "vehicle", "title_tr": "Benzin İstasyonu", "title_en": "At the Gas Station"},
}

assert len(SCENARIO_META) == 102


def _opts(a_text, a_reaction, a_next, b_text, b_reaction, b_next, c_text, c_reaction, c_next):
    """Her node icin 3 secenegi (good/ok/poor) kisa yazmak icin yardimci."""
    return [
        {"id": "a", "text": a_text, "quality": "good", "reaction": a_reaction, "next": a_next},
        {"id": "b", "text": b_text, "quality": "ok", "reaction": b_reaction, "next": b_next},
        {"id": "c", "text": c_text, "quality": "poor", "reaction": c_reaction, "next": c_next},
    ]


# slug -> {start, nodes}. Ilk dalga: 28 senaryo (her kategoriden en az 2),
# onaylanan dallan-ve-birles modeliyle tam yazildi. Geri kalanlar sonraki
# asamada eklenecek.
SCENARIO_TREES: dict[str, dict] = {
    "hotel_checkin": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good evening! Welcome to Hotel Lumen. Do you have a reservation with us?",
                   "options": _opts(
                       "Yes, I have a reservation under the name Ahmet Yılmaz.", "Let me pull that up... found it! A double room for three nights.", "n2",
                       "Yes, I booked online somewhere.", "No problem — could I get the name on the booking?", "n2",
                       "Do I need one?", "It does help speed things up — what name should I look under?", "n2")},
            "n2": {"bot": "Perfect. Could I see your ID or passport, please?",
                   "options": _opts(
                       "Of course, here you go.", "Thank you, everything checks out.", "n3",
                       "Do you really need that?", "I'm afraid it's required for check-in, yes.", "n3",
                       "I don't have it on me right now.", "That could be a problem — do you have a photo of it, at least?", "n3")},
            "n3": {"bot": "Would you prefer a room on a higher floor, or is a lower floor fine?",
                   "options": _opts(
                       "A higher floor would be great, if possible.", "I'll put you on the 6th floor then, nice city view.", "n4",
                       "Doesn't matter, whatever's available.", "Alright, I'll put you on the 4th floor.", "n4",
                       "I don't know, just anything.", "No problem, I'll pick a quiet room for you.", "n4")},
            "n4": {"bot": "Breakfast is served 7 to 10 in the lobby. Will you need anything else, like help with your luggage?",
                   "options": _opts(
                       "Yes, that would be great, thank you.", "I'll have someone bring it up right away.", "n5",
                       "No, I think that's all.", "Great, here's your key then.", "n5",
                       "Just give me the key already.", "Of course, right away.", "n5")},
            "n5": {"bot": "Here's your key — room 612, elevators just behind me. Do you need a wake-up call arranged?",
                   "options": _opts(
                       "Yes, 7 AM please.", "Noted, 7 AM it is.", "n6",
                       "Maybe, I'm not sure yet.", "No worries, just call the front desk anytime.", "n6",
                       "No, I'll figure it out.", "Sure thing.", "n6")},
            "n6": {"bot": "Perfect, enjoy your stay with us!",
                   "options": _opts(
                       "Thank you very much, have a good evening!", "You too, enjoy your stay!", None,
                       "Thanks.", "You're welcome!", None,
                       "...", "Alright then, see you around!", None)},
        },
    },
    "directions": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Excuse me, can I help you with something?",
                   "options": _opts(
                       "Yes, sorry to bother you — could you tell me how to get to the Central Museum?", "Not at all! It's actually just a ten-minute walk from here.", "n2",
                       "Museum? Where?", "Ah, you mean the Central Museum? It's close by, let me show you.", "n2",
                       "Map. Museum. Where?", "Haha, I think you mean the Central Museum — it's nearby.", "n2")},
            "n2": {"bot": "Just go straight down this street, then turn left at the big clock tower.",
                   "options": _opts(
                       "Left at the clock tower, got it. Is it far after that?", "Not far at all, maybe five more minutes.", "n3",
                       "Okay... left where?", "At the clock tower — you can't miss it, it's quite tall.", "n3",
                       "Uh, can you just point?", "Sure — that way, then left at the tall clock tower.", "n3")},
            "n3": {"bot": "After the tower, the museum entrance will be on your right, next to a small park.",
                   "options": _opts(
                       "Great, thank you so much for your help!", "You're very welcome, enjoy the museum!", "n4",
                       "Okay, I think I got it.", "If you get lost, just ask anyone, everyone knows it.", "n4",
                       "Hopefully I remember all that.", "Ha, don't worry, it's really easy to find.", "n4")},
            "n4": {"bot": "Is there anything else you're looking for, maybe a place to eat afterward?",
                   "options": _opts(
                       "Actually yes, could you recommend a good restaurant nearby?", "There's a lovely little place called Dora's right across from the museum.", "n5",
                       "No, I think I'm good, thanks.", "No problem, have a great visit!", "n5",
                       "No.", "Alright, take care!", "n5")},
            "n5": {"bot": "Well, enjoy your day in the city!",
                   "options": _opts(
                       "Thank you, you too! Have a nice day.", "Thanks, bye now!", None,
                       "Thanks, bye.", "Bye!", None,
                       "...", "...Okay then, bye!", None)},
        },
    },
    "cafe_order": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi there! Welcome to Café Luna. What can I get started for you today?",
                   "options": _opts(
                       "Hi! Could I get a medium cappuccino, please?", "Of course! One medium cappuccino coming up.", "n2",
                       "Coffee.", "Sure — we have espresso, latte, or drip. I'll get you a latte, then.", "n2",
                       "Give me something, whatever.", "Ha, adventurous! I'll surprise you with our house latte.", "n2")},
            "n2": {"bot": "For here or to go?",
                   "options": _opts(
                       "For here, please.", "Great, I'll bring it to your table.", "n3",
                       "To go — actually, for here is fine.", "No worries, for here it is then.", "n3",
                       "I don't care.", "No problem, I'll go with for here.", "n3")},
            "n3": {"bot": "Would you like anything else — a pastry, maybe?",
                   "options": _opts(
                       "Yes, I'll have a croissant, please.", "Great choice, one croissant coming up!", "n4",
                       "What do you recommend?", "Our almond croissant is very popular — I'll add one of those.", "n4",
                       "No, that's too expensive.", "I haven't even told you the price yet, ha — but no worries, just the latte then.", "n4")},
            "n4": {"bot": "Can I get a name for the order?",
                   "options": _opts(
                       "It's Ayşe.", "Great, Ayşe — ready in about five minutes.", "n5",
                       "Why do you need my name?", "Just so I can call it out when it's ready!", "n5",
                       "This place is nice.", "Thank you! I'll just call out your order when it's ready.", "n5")},
            "n5": {"bot": "That'll be $6.50. How would you like to pay?",
                   "options": _opts(
                       "Card, please.", "Perfect, go ahead and tap here.", "n6",
                       "Do you take cash?", "We do, but card is a bit faster if you have it.", "n6",
                       "I forgot my wallet...", "No worries, phone payments work too — Apple Pay or Google Pay?", "n6")},
            "n6": {"bot": "All set! Your order will be ready shortly. Have a great day!",
                   "options": _opts(
                       "Thank you, you too!", "Thanks for coming by!", None,
                       "Thanks.", "You're welcome, enjoy!", None,
                       "...okay.", "Haha, no worries — enjoy your coffee!", None)},
        },
    },
    "restaurant_order": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome! Have you had a chance to look at the menu?",
                   "options": _opts(
                       "Yes, I'll have the grilled salmon, please.", "Excellent choice! How would you like that cooked?", "n2",
                       "Not yet, could I have another minute?", "Of course, take your time!", "n2",
                       "Just bring me whatever's popular.", "Sure, our grilled salmon is a favorite — I'll bring that.", "n2")},
            "n2": {"bot": "And would you like a side with that — salad, fries, or rice?",
                   "options": _opts(
                       "A side salad would be great, thank you.", "Perfect, one side salad coming up.", "n3",
                       "Hmm, which one's lighter?", "The salad is definitely the lighter option.", "n3",
                       "I don't really care, just pick one.", "No problem, I'll bring the salad then.", "n3")},
            "n3": {"bot": "Would you like something to drink with that?",
                   "options": _opts(
                       "A sparkling water, please.", "Great, I'll bring that right away.", "n4",
                       "What do you have?", "We have still or sparkling water, juices, and sodas.", "n4",
                       "Water, I guess.", "Sure, still or sparkling?", "n4")},
            "n4": {"bot": "Your food will be out shortly. Is everything alright so far?",
                   "options": _opts(
                       "Yes, everything's great, thank you.", "Wonderful, glad to hear it!", "n5",
                       "It's a bit loud in here, but okay.", "Ah, sorry about that — I'll see if we can seat you somewhere quieter next time.", "n5",
                       "Whatever.", "Alright, I'll check back shortly.", "n5")},
            "n5": {"bot": "Here you go — grilled salmon with a side salad. Enjoy!",
                   "options": _opts(
                       "This looks wonderful, thank you!", "My pleasure, let me know if you need anything.", "n6",
                       "Thanks.", "You're welcome, enjoy!", "n6",
                       "...", "Enjoy your meal!", "n6")},
            "n6": {"bot": "Would you like to see the dessert menu, or just the bill?",
                   "options": _opts(
                       "Just the bill, please — it was delicious.", "Coming right up, glad you enjoyed it!", None,
                       "Maybe just a coffee.", "Of course, one coffee coming up.", None,
                       "Bill.", "Right away.", None)},
        },
    },
    "clothes_shopping": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi there, let me know if you need any help finding something!",
                   "options": _opts(
                       "Thanks, I'm looking for a jacket for the winter.", "Great, we have a few new arrivals — follow me.", "n2",
                       "Just browsing.", "Sure, take your time, I'm right here if you need me.", "n2",
                       "...", "No problem, just let me know!", "n2")},
            "n2": {"bot": "What size are you usually, and any color in mind?",
                   "options": _opts(
                       "I'm a medium, and I like darker colors.", "Perfect, I have just the thing — a navy medium.", "n3",
                       "Not sure, maybe you can tell from looking?", "Let's see... I'd guess a medium, we can check the fit.", "n3",
                       "Size doesn't matter, just show me something.", "Alright, let's start with a medium and adjust from there.", "n3")},
            "n3": {"bot": "Here, try this one — the fitting room is right over there.",
                   "options": _opts(
                       "Thank you, I'll go try it on.", "Take your time!", "n4",
                       "Do I really need to try it on?", "It's a good idea, sizes can run differently.", "n4",
                       "Fine.", "Great, right this way.", "n4")},
            "n4": {"bot": "So, how did it fit?",
                   "options": _opts(
                       "It fits really well, I'll take it.", "Wonderful, let's get you checked out.", "n5",
                       "It's a little tight in the shoulders.", "Let me grab you a large instead, one moment.", "n5",
                       "I don't know.", "No worries, want to try a different size?", "n5")},
            "n5": {"bot": "Would you like anything else, maybe a scarf to go with it?",
                   "options": _opts(
                       "Sure, show me what you have.", "This one would go great with the jacket.", "n6",
                       "No, just the jacket, thanks.", "Perfect, let's head to the register.", "n6",
                       "No.", "Alright, let's check out then.", "n6")},
            "n6": {"bot": "That'll be $89 total. How would you like to pay?",
                   "options": _opts(
                       "Card, please.", "Great, all done — enjoy your new jacket!", None,
                       "Do you take mobile payment?", "We do — just tap your phone here.", None,
                       "Ugh, fine, card.", "No problem, here's the reader.", None)},
        },
    },
    "return_exchange": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, how can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to return this sweater — it doesn't fit.", "No problem, do you have the receipt with you?", "n2",
                       "I want to bring this back.", "Sure, can I ask what the issue is?", "n2",
                       "This is wrong, fix it.", "I'm sorry to hear that — let's see what we can do.", "n2")},
            "n2": {"bot": "Do you have the receipt or order confirmation?",
                   "options": _opts(
                       "Yes, here it is.", "Perfect, that makes this easy.", "n3",
                       "I think so, let me check my email.", "Take your time, that works too.", "n3",
                       "No, I lost it.", "That's alright, we may still be able to look it up by card.", "n3")},
            "n3": {"bot": "Would you like a refund, or would you prefer to exchange it for a different size?",
                   "options": _opts(
                       "I'd like to exchange it for a size large, please.", "Great, let me grab that for you.", "n4",
                       "What's easier for you?", "Either works — a refund is quickest if you're not sure.", "n4",
                       "Just give me my money back.", "Of course, I'll process that right away.", "n4")},
            "n4": {"bot": "All done! Is there anything else I can help you with?",
                   "options": _opts(
                       "No, that's everything, thank you for your help.", "You're very welcome, have a great day!", None,
                       "No, that's it.", "Great, take care!", None,
                       "No.", "Alright then.", None)},
        },
    },
    "renting_apartment": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, thanks for coming! So, what are you looking for in an apartment?",
                   "options": _opts(
                       "I'm looking for a two-bedroom, somewhere quiet, with good transport links.", "I have a few places in mind that could work well.", "n2",
                       "Something not too expensive, I guess.", "Sure, let's talk budget and go from there.", "n2",
                       "I don't know, just show me something.", "No problem, let's start with a popular option nearby.", "n2")},
            "n2": {"bot": "What's your monthly budget looking like?",
                   "options": _opts(
                       "Around 15,000 lira, including bills if possible.", "That's workable — I have a couple of options right in that range.", "n3",
                       "I'm not totally sure yet.", "That's alright, I can show you a range and we'll narrow it down.", "n3",
                       "As cheap as possible.", "Understood, I'll start with our most affordable listings.", "n3")},
            "n3": {"bot": "Great, this one here is on the third floor, two bedrooms, recently renovated. Want to see photos?",
                   "options": _opts(
                       "Yes, please, I'd love to see them.", "Here you go — nice and bright, isn't it?", "n4",
                       "Sure, why not.", "Here they are.", "n4",
                       "Whatever, show me.", "Alright, here.", "n4")},
            "n4": {"bot": "Would you like to schedule a viewing in person?",
                   "options": _opts(
                       "Yes, could we do this Saturday morning?", "Saturday morning works perfectly, I'll pencil you in.", "n5",
                       "Maybe, let me check my schedule.", "No rush, just let me know when works.", "n5",
                       "I guess, if I have to.", "It really does help to see it in person — I'll set something up.", "n5")},
            "n5": {"bot": "Before we go further, do you have proof of income or a guarantor?",
                   "options": _opts(
                       "Yes, I have my payslips and can provide a guarantor.", "Perfect, that'll make the process smooth.", "n6",
                       "I have payslips, not sure about a guarantor.", "That's fine, payslips alone can sometimes work too.", "n6",
                       "Do I really need all that?", "Most landlords do ask for it, I'm afraid, but let's see what's possible.", "n6")},
            "n6": {"bot": "Great, I'll send over the contract details after the viewing. Any other questions?",
                   "options": _opts(
                       "Yes, is the deposit negotiable?", "It can be, depending on the landlord — I'll ask for you.", "n7",
                       "Not right now, thanks.", "No problem, I'll follow up with you soon.", "n7",
                       "No.", "Alright, talk soon then.", "n7")},
            "n7": {"bot": "Thanks for your time today — I'll be in touch soon about the viewing!",
                   "options": _opts(
                       "Thank you, I really appreciate your help!", "My pleasure, talk soon!", None,
                       "Okay, thanks.", "You're welcome, bye for now!", None,
                       "...", "Alright then, see you Saturday!", None)},
        },
    },
    "reporting_repair": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello?",
                   "options": _opts(
                       "Hi, it's your tenant from apartment 4B — I wanted to report a leak under the kitchen sink.", "Oh no, thanks for letting me know — how bad is it?", "n2",
                       "Hey, it's 4B, something's broken in the kitchen.", "Okay, can you tell me more specifically what's wrong?", "n2",
                       "Your apartment is broken, come fix it.", "I'd be happy to help — could you tell me which apartment and what's wrong?", "n2")},
            "n2": {"bot": "How bad is the leak, is water pooling on the floor?",
                   "options": _opts(
                       "Yes, there's a small puddle forming, but it's not flooding.", "Okay, I'll send a plumber over today.", "n3",
                       "I think so, it's a bit wet under there.", "Alright, best to get someone out soon just in case.", "n3",
                       "I don't know, I just saw water.", "Better safe than sorry, I'll send someone to check.", "n3")},
            "n3": {"bot": "I can have a plumber there this afternoon, around 3 PM. Does that work?",
                   "options": _opts(
                       "Yes, 3 PM works great, thank you.", "Perfect, I'll let them know.", "n4",
                       "I might be at work, can they come a bit later?", "Sure, let's say 5 PM instead.", "n4",
                       "Fine, whatever time.", "Alright, 3 PM it is then.", "n4")},
            "n4": {"bot": "I'll text you the plumber's name so you know who to expect. Anything else going on with the apartment?",
                   "options": _opts(
                       "No, that's the only issue right now, thank you.", "Great, glad it's just the one thing.", "n5",
                       "Actually, the hallway light's been flickering too.", "Noted, I'll have that looked at as well.", "n5",
                       "No.", "Alright, let me know if anything else comes up.", "n5")},
            "n5": {"bot": "Thanks for reporting it quickly — we'll get it sorted today.",
                   "options": _opts(
                       "Thank you so much, I really appreciate it.", "Of course, that's what I'm here for!", None,
                       "Okay, thanks.", "You're welcome!", None,
                       "...", "...Alright, bye then!", None)},
        },
    },
    "job_interview": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Thanks for coming in today! Why don't you start by telling me a bit about yourself?",
                   "options": _opts(
                       "Of course — I studied marketing, and for the past two years I've worked in social media management, which I really enjoy.", "That's great background, especially for this role.", "n2",
                       "Um, I don't know, what do you want to know?", "No worries — maybe start with your most recent job?", "n2",
                       "It's all on my resume.", "Ha, fair enough — but I'd still love to hear it in your own words.", "n2")},
            "n2": {"bot": "What made you interested in this position specifically?",
                   "options": _opts(
                       "I've always admired your company's work, and this role matches my experience in content strategy perfectly.", "That's exactly the kind of fit we're looking for.", "n3",
                       "I just need a job, honestly.", "I appreciate the honesty — what about this role appeals to you specifically, though?", "n3",
                       "I don't really know much about the company.", "That's alright — I'd encourage you to look into us a bit more either way.", "n3")},
            "n3": {"bot": "Can you tell me about a time you handled a difficult situation at work?",
                   "options": _opts(
                       "Sure — a client was unhappy with a campaign, so I listened to their concerns and revised the plan, and we ended up strengthening the relationship.", "That's a great example of problem-solving under pressure.", "n4",
                       "I don't really remember a specific one.", "That's okay, take a moment — even a small example works.", "n4",
                       "I don't really have problems at work.", "Everyone runs into something eventually — even a minor example would help.", "n4")},
            "n4": {"bot": "What are your salary expectations for this role?",
                   "options": _opts(
                       "Based on my research, I'd expect something in the range of 25-30k, but I'm open to discussing it.", "That's within the range we had in mind.", "n5",
                       "I'm not sure, what's the range?", "We typically offer 25-30k for this role, depending on experience.", "n5",
                       "As much as possible.", "Ha, understandable — let's talk specifics a bit later.", "n5")},
            "n5": {"bot": "Do you have any questions for me about the role or the company?",
                   "options": _opts(
                       "Yes — what does success look like in this role after the first six months?", "Great question — I'd say hitting our content targets and settling into the team well.", "n6",
                       "Not really, I think you covered it.", "No problem, we can always follow up by email.", "n6",
                       "No.", "Alright, that's fine.", "n6")},
            "n6": {"bot": "Great, thank you for your time today. We'll be in touch within the week.",
                   "options": _opts(
                       "Thank you so much for the opportunity, I really appreciate it.", "Of course, it was a pleasure speaking with you.", "n7",
                       "Okay, thanks.", "You're welcome, take care!", "n7",
                       "Alright.", "Alright then, take care.", "n7")},
            "n7": {"bot": "Have a great rest of your day!",
                   "options": _opts(
                       "You too, thank you again!", "Thank you, goodbye!", None,
                       "Thanks, bye.", "Bye now!", None,
                       "...", "...Okay, goodbye!", None)},
        },
    },
    "requesting_leave": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, you wanted to talk to me about something?",
                   "options": _opts(
                       "Yes, I wanted to ask about taking a week off next month for a family event.", "Sure, let's see what we can work out.", "n2",
                       "Yeah, I need some time off.", "Okay, can you tell me when and for how long?", "n2",
                       "I'm taking next week off.", "Let's talk about it — when were you thinking, and is it urgent?", "n2")},
            "n2": {"bot": "What dates are you thinking, exactly?",
                   "options": _opts(
                       "The 14th through the 18th, if that works with the schedule.", "Let me check the calendar... that should be fine.", "n3",
                       "Sometime next month, I'll confirm later.", "Sure, just let me know the exact dates soon so I can plan.", "n3",
                       "I don't know yet.", "No problem, just give me a heads-up once you do.", "n3")},
            "n3": {"bot": "Is there anything urgent during that week I should know about, so we can plan coverage?",
                   "options": _opts(
                       "The quarterly report is due that week, but I can finish it before I leave.", "That would be perfect, thank you for thinking ahead.", "n4",
                       "I'm not sure, maybe the report?", "Let's check together so nothing slips through.", "n4",
                       "That's not my problem.", "I understand, but let's make sure the team isn't caught off guard.", "n4")},
            "n4": {"bot": "Alright, I'll approve the leave — just send the formal request through the system too.",
                   "options": _opts(
                       "Will do, thank you so much for approving it.", "Of course, enjoy your time off!", None,
                       "Okay, I'll do that.", "Great, thanks for letting me know in advance.", None,
                       "Fine.", "Alright.", None)},
        },
    },
    "enrolling_child_school": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good morning, how can I help you?",
                   "options": _opts(
                       "Good morning, I'd like to enroll my daughter in the first grade for next year.", "Wonderful, let's get started — could I get her full name and birth date?", "n2",
                       "I need to register my kid for school.", "Of course — could you tell me which grade, and your child's name?", "n2",
                       "School registration, hurry please.", "No problem, let's get through this quickly — your child's name and grade, please?", "n2")},
            "n2": {"bot": "Do you have her birth certificate and your proof of address with you?",
                   "options": _opts(
                       "Yes, here are both documents.", "Perfect, everything looks in order.", "n3",
                       "I have the birth certificate, but not proof of address yet.", "That's alright, you can bring that by the end of the week.", "n3",
                       "I don't have anything with me.", "No worries, you'll need to bring those documents before enrollment is finalized.", "n3")},
            "n3": {"bot": "Does she have any allergies or medical conditions we should know about?",
                   "options": _opts(
                       "Yes, she has a mild peanut allergy.", "Thank you, I'll make sure that's noted for the cafeteria staff.", "n4",
                       "I don't think so, but I'm not totally sure.", "No problem, you can update us anytime if that changes.", "n4",
                       "Why does that matter?", "It just helps us keep her safe during meals and activities.", "n4")},
            "n4": {"bot": "Great. Classes start at 8:30 and finish at 3:15. Would she like to join the school bus service?",
                   "options": _opts(
                       "Yes, that would be very helpful, thank you.", "I'll add her to the bus route near your address.", "n5",
                       "Maybe, how much does it cost?", "It's a small monthly fee — I can send you the details.", "n5",
                       "I'll figure it out later.", "No rush, you can let us know anytime before the term starts.", "n5")},
            "n5": {"bot": "Is there anything else you'd like to ask before we finish the enrollment?",
                   "options": _opts(
                       "Yes, when can we meet her homeroom teacher?", "There's an orientation day next week, I'll send you the details.", "n6",
                       "No, I think that covers it.", "Great, welcome to the school!", "n6",
                       "No.", "Alright, enrollment is complete then.", "n6")},
            "n6": {"bot": "Welcome to our school family — we're looking forward to having her!",
                   "options": _opts(
                       "Thank you so much, we're excited too!", "Wonderful, see you both soon!", None,
                       "Thanks.", "You're welcome, take care!", None,
                       "...", "Alright then, see you soon!", None)},
        },
    },
    "language_course_signup": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome to Lingua Center! Are you looking to sign up for a course?",
                   "options": _opts(
                       "Yes, I'd like to join a beginner German course, if there's one available.", "We actually have a new beginner group starting next Monday.", "n2",
                       "Maybe, what do you offer?", "We have German, French, and Spanish at several levels.", "n2",
                       "Just put me in whatever's cheapest.", "Sure, let me check what's currently available at the lowest rate.", "n2")},
            "n2": {"bot": "Would you prefer evening classes or weekend classes?",
                   "options": _opts(
                       "Evening classes would work best for me, twice a week.", "Perfect, we have a Tuesday-Thursday evening slot open.", "n3",
                       "I'm not sure which is better.", "Evenings tend to be more consistent, weekends more flexible — either works.", "n3",
                       "Whatever's available.", "Alright, I'll put you in the next evening group.", "n3")},
            "n3": {"bot": "Would you like to take a quick placement test, or do you know you're a complete beginner?",
                   "options": _opts(
                       "I'm a complete beginner, no test needed.", "Great, that makes this easy — you'll start from the basics.", "n4",
                       "I know a little, maybe I should test?", "That's a good idea, it'll help us place you correctly.", "n4",
                       "I don't want to do any test.", "That's fine, we can start you at the beginner level and adjust later.", "n4")},
            "n4": {"bot": "The course is 1,200 lira for 10 weeks, including materials. How would you like to pay?",
                   "options": _opts(
                       "I'll pay by card, please.", "Perfect, I'll process that now.", "n5",
                       "Can I pay in installments?", "Yes, we offer a two-part payment plan.", "n5",
                       "That seems expensive.", "I understand — we do have a payment plan if that helps.", "n5")},
            "n5": {"bot": "All set! Your first class is next Tuesday at 6 PM. See you then!",
                   "options": _opts(
                       "Thank you, I'm looking forward to it!", "Wonderful, welcome aboard!", None,
                       "Okay, thanks.", "You're welcome!", None,
                       "Alright.", "See you Tuesday, then!", None)},
        },
    },
    "making_friends": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi! I don't think we've met — I'm Marco. Is this your first time at one of these meetups?",
                   "options": _opts(
                       "Hi Marco, nice to meet you! Yes, it's my first time here.", "Welcome! You'll like it, everyone here is pretty friendly.", "n2",
                       "Yeah, hi.", "Nice to meet you — what brought you here tonight?", "n2",
                       "Do I know you?", "Ha, not yet! I'm Marco, I come here pretty often.", "n2")},
            "n2": {"bot": "So, where are you from originally?",
                   "options": _opts(
                       "I'm from Istanbul, actually. How about you?", "Nice! I'm originally from Italy, moved here a couple of years ago.", "n3",
                       "Around here, I guess.", "Ah, a local then! I'm actually from Italy.", "n3",
                       "Why do you ask?", "Just curious, no worries if you'd rather not say — I'm from Italy, by the way.", "n3")},
            "n3": {"bot": "What language are you learning, and what made you start?",
                   "options": _opts(
                       "I'm learning English — I need it for work, but I've also grown to really enjoy it.", "That's great, having a real reason to learn always helps.", "n4",
                       "English, I guess I just need it.", "That's a solid reason — a lot of people start that way.", "n4",
                       "I don't know, my parents made me.", "Ha, well, hopefully it grows on you!", "n4")},
            "n4": {"bot": "What do you like to do in your free time, outside of studying?",
                   "options": _opts(
                       "I love hiking and trying new restaurants, actually.", "That sounds great, there are some nice trails just outside the city.", "n5",
                       "Not much, just relax at home.", "That's fair, everyone needs downtime.", "n5",
                       "I don't really have free time.", "I hear you, work can be a lot sometimes.", "n5")},
            "n5": {"bot": "A few of us are grabbing coffee after this — want to join?",
                   "options": _opts(
                       "I'd love to, thank you for inviting me!", "Great, we'll head out in about ten minutes then.", "n6",
                       "Maybe, I'll see how I feel.", "No pressure, we'll be over by the door if you decide to come.", "n6",
                       "I don't really know you guys.", "That's exactly why you should come — easiest way to get to know everyone!", "n6")},
            "n6": {"bot": "Well, it was really nice meeting you tonight!",
                   "options": _opts(
                       "You too, Marco! I hope to see you again soon.", "Definitely, see you around!", None,
                       "Yeah, you too.", "Take care!", None,
                       "...", "...Alright, see you around!", None)},
        },
    },
    "apologizing": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey... what's up?",
                   "options": _opts(
                       "Hey, I wanted to say I'm really sorry for missing your birthday dinner last week.", "Oh... thank you for saying that, it did bother me a bit.", "n2",
                       "I heard you were upset about something.", "Yeah, you missing my birthday dinner kind of hurt.", "n2",
                       "Are you still mad about that thing?", "I mean... yeah, actually. You never even explained.", "n2")},
            "n2": {"bot": "I just felt like it wasn't a big deal to you.",
                   "options": _opts(
                       "It really was a big deal, I just got caught up with a work emergency and should have called.", "I appreciate you explaining — that actually means a lot.", "n3",
                       "I had a lot going on, sorry.", "I get that things come up, I just wish you'd told me.", "n3",
                       "You're overreacting a little, honestly.", "Wow, okay... that's not really what I wanted to hear.", "n3")},
            "n3": {"bot": "I guess I just wanted to know I mattered to you.",
                   "options": _opts(
                       "You absolutely do, and I'll make it up to you — dinner this weekend, my treat?", "That actually sounds really nice, thank you.", "n4",
                       "Of course you matter, don't be dramatic.", "...Okay. I guess I'll let it go then.", "n4",
                       "I don't really know what you want from me.", "I just wanted an apology, honestly.", "n4")},
            "n4": {"bot": "Alright... thank you for talking about it, at least.",
                   "options": _opts(
                       "Of course, I really am sorry, and I value our friendship a lot.", "That means a lot to hear. I appreciate it.", None,
                       "Yeah, no problem.", "Okay.", None,
                       "Sure, whatever.", "...Right.", None)},
        },
    },
    "making_up": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "So are we still not talking?",
                   "options": _opts(
                       "I don't want that — I'm sorry for what I said during our argument.", "Thank you... I'm sorry too, I said some things I didn't mean.", "n2",
                       "I guess we should talk about it.", "Yeah, probably. What happened really bothered me.", "n2",
                       "I don't even remember what we were fighting about.", "Seriously? It was a big deal to me.", "n2")},
            "n2": {"bot": "It really hurt when you said I never help out around the house.",
                   "options": _opts(
                       "That wasn't fair of me, I know you do a lot — I was just stressed and took it out on you.", "Thank you for saying that, it really does mean a lot.", "n3",
                       "I mean, sometimes it does feel that way.", "Maybe, but there are better ways to bring that up.", "n3",
                       "Well it's kind of true though.", "Wow. Okay, I guess we're not really making up then.", "n3")},
            "n3": {"bot": "I just want us to be okay again.",
                   "options": _opts(
                       "Me too. Let's both try to communicate better instead of yelling next time.", "I'd really like that. Love you, you know.", "n4",
                       "Yeah, me too, I guess.", "Okay, let's just move past it then.", "n4",
                       "Sure, fine, whatever makes you happy.", "...That's not really the response I was hoping for.", "n4")},
            "n4": {"bot": "Want to watch a movie tonight, like we used to?",
                   "options": _opts(
                       "I'd really like that, yeah. Thanks for not giving up on me.", "Never would. See you at 8?", None,
                       "Sure, why not.", "Okay, 8 PM then.", None,
                       "Maybe, I'll see.", "Alright, let me know.", None)},
        },
    },
    "spouse_daily_plan": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, what time are you getting home tonight?",
                   "options": _opts(
                       "I should be home by 6, do you need me to pick anything up?", "Actually yes, could you grab some milk and bread?", "n2",
                       "Not sure yet, maybe late.", "Okay, just text me when you know more.", "n2",
                       "Why, what do you need?", "I just wanted to plan dinner, that's all.", "n2")},
            "n2": {"bot": "Also, can you take the kids to practice at 5?",
                   "options": _opts(
                       "Sure, I'll leave work a bit early to make it.", "Thank you, that really helps.", "n3",
                       "I might be able to, I'll try.", "Okay, let me know if you can't — I'll figure out a backup.", "n3",
                       "I'm busy, can't you do it?", "I have a work call at that time, that's why I'm asking.", "n3")},
            "n3": {"bot": "What do you want for dinner tonight, anything in particular?",
                   "options": _opts(
                       "How about that pasta dish you make? It's been a while.", "Good idea, I'll get started once you're home.", "n4",
                       "Whatever's easiest for you.", "Okay, I'll think of something simple then.", "n4",
                       "I don't care, just feed me.", "Ha, alright, I'll come up with something.", "n4")},
            "n4": {"bot": "Sounds good. I'll see you tonight then!",
                   "options": _opts(
                       "See you tonight, love you!", "Love you too, drive safe!", None,
                       "Okay, see you.", "See you!", None,
                       "Yeah, bye.", "Bye.", None)},
        },
    },
    "doctor_appointment": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good morning, what brings you in today?",
                   "options": _opts(
                       "Good morning, I've had a sore throat and mild fever for the past three days.", "I see, let's take a closer look — when exactly did it start?", "n2",
                       "I don't feel good.", "I understand — can you tell me more specifically what's bothering you?", "n2",
                       "Just fix me, I don't have all day.", "I'll do my best — could you tell me what symptoms you're having?", "n2")},
            "n2": {"bot": "Any other symptoms — cough, body aches, trouble swallowing?",
                   "options": _opts(
                       "Yes, a dry cough and some body aches, but I can still swallow fine.", "Okay, that's helpful to know.", "n3",
                       "Maybe a little cough, I'm not totally sure.", "That's alright, let's check a few things to be sure.", "n3",
                       "I don't know, I just feel bad overall.", "No problem, let's take a look and see what we find.", "n3")},
            "n3": {"bot": "Let me check your throat and temperature... alright, it looks like a mild throat infection.",
                   "options": _opts(
                       "Okay, is it something serious?", "Not at all, it should clear up with some rest and medication.", "n4",
                       "Oh, okay.", "Nothing to worry about, I'll prescribe something to help.", "n4",
                       "Finally, so what now?", "I'll prescribe some medication, and you should feel better in a few days.", "n4")},
            "n4": {"bot": "I'm prescribing an antibiotic and something for the fever. Any allergies to medication I should know about?",
                   "options": _opts(
                       "No known allergies, thank you for asking.", "Great, I'll write that up for you now.", "n5",
                       "I don't think so, but I'm not 100% sure.", "No worries, if anything feels off after starting it, stop and call us.", "n5",
                       "Why does that matter?", "It helps make sure the medication is safe for you.", "n5")},
            "n5": {"bot": "Take this twice a day for seven days, and drink plenty of fluids. Any questions?",
                   "options": _opts(
                       "No, that's clear, thank you very much, doctor.", "You're welcome — feel better soon!", "n6",
                       "Should I come back if it doesn't improve?", "Yes, please do, especially after four or five days.", "n6",
                       "Fine.", "Alright, take care.", "n6")},
            "n6": {"bot": "Take care of yourself, and don't hesitate to come back if needed!",
                   "options": _opts(
                       "I will, thank you so much for your help today.", "My pleasure, get well soon!", None,
                       "Thanks.", "Take care!", None,
                       "...", "Alright, get well soon.", None)},
        },
    },
    "pharmacy": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I have a prescription I'd like to fill, please.", "Of course, let me take a look at that.", "n2",
                       "I need something for a headache.", "Sure, we have a few options — do you have a preference?", "n2",
                       "Give me something strong.", "I'll need a bit more detail first — what's the issue exactly?", "n2")},
            "n2": {"bot": "Have you taken this medication before, or is it your first time?",
                   "options": _opts(
                       "I've taken something similar before, no issues.", "Good to know, that's helpful.", "n3",
                       "I'm not totally sure, maybe once.", "No problem, I'll go over the instructions carefully with you.", "n3",
                       "I don't remember.", "That's alright, let's just go through the instructions together.", "n3")},
            "n3": {"bot": "This should be taken with food, twice a day. Any allergies I should know about?",
                   "options": _opts(
                       "No allergies that I know of, thank you.", "Perfect, you're all set then.", "n4",
                       "I don't think so.", "Okay, just let us know if anything unusual comes up.", "n4",
                       "Why are you asking so much?", "Just making sure it's safe for you, that's all.", "n4")},
            "n4": {"bot": "That'll be 85 lira. Will that be cash or card?",
                   "options": _opts(
                       "Card, please.", "Perfect, here's the reader.", "n5",
                       "Do you take insurance?", "Yes, I can check your coverage — do you have your card?", "n5",
                       "That's expensive.", "I understand — this is the generic version, which is the more affordable option.", "n5")},
            "n5": {"bot": "Here you go, and feel better soon!",
                   "options": _opts(
                       "Thank you very much, have a good day!", "You too, take care!", None,
                       "Thanks.", "Take care!", None,
                       "...", "Alright, feel better!", None)},
        },
    },
    "opening_bank_account": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good afternoon, how can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to open a checking account, please.", "Great, let's get that started — do you have your ID with you?", "n2",
                       "I need a bank account.", "Sure, what type were you thinking — checking or savings?", "n2",
                       "Just set me up with whatever.", "No problem, I'll walk you through our standard checking account.", "n2")},
            "n2": {"bot": "May I see your ID and proof of address, please?",
                   "options": _opts(
                       "Of course, here they are.", "Thank you, everything looks in order.", "n3",
                       "I have my ID, but not proof of address with me.", "That's alright, a utility bill or lease will work when you have it.", "n3",
                       "Why do you need all that?", "It's required to verify your identity when opening an account.", "n3")},
            "n3": {"bot": "Would you like a debit card issued with the account as well?",
                   "options": _opts(
                       "Yes, that would be great, thank you.", "Perfect, it'll arrive by mail within a week.", "n4",
                       "Sure, I guess so.", "Alright, I'll set that up for you.", "n4",
                       "Do I have a choice?", "You do, but most people find it useful to have one.", "n4")},
            "n4": {"bot": "Would you like to set up online banking as well?",
                   "options": _opts(
                       "Yes, please, that would be very convenient.", "Great, I'll send you the activation link by email.", "n5",
                       "Maybe later.", "No problem, you can always set it up anytime from our website.", "n5",
                       "I don't trust online banking.", "That's understandable — it's completely optional.", "n5")},
            "n5": {"bot": "There's a small minimum balance requirement of 500 lira. Is that something you can maintain?",
                   "options": _opts(
                       "Yes, that shouldn't be a problem at all.", "Great, you're all set then.", "n6",
                       "I think so, probably.", "No worries, just keep that in mind going forward.", "n6",
                       "That seems like a lot.", "I understand — there are also accounts with no minimum, if you'd prefer.", "n6")},
            "n6": {"bot": "Congratulations, your account is open! You'll receive your card within a week.",
                   "options": _opts(
                       "Thank you so much for your help today!", "You're very welcome, have a great day!", None,
                       "Thanks.", "You're welcome!", None,
                       "Finally.", "Glad it's done — have a good day.", None)},
        },
    },
    "money_transfer": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, what can I help you with today?",
                   "options": _opts(
                       "Hi, I'd like to transfer money to my brother's account, please.", "Sure, do you have his account number or IBAN handy?", "n2",
                       "I need to send some money somewhere.", "No problem, do you have the recipient's account details?", "n2",
                       "Send money. Fast.", "I can help with that — could I get the recipient's account details?", "n2")},
            "n2": {"bot": "And how much would you like to send?",
                   "options": _opts(
                       "2,000 lira, please.", "Got it, let me process that for you.", "n3",
                       "Around 2,000, maybe a bit more.", "Let's go with 2,000 for now, you can always send more later.", "n3",
                       "Just send all of it.", "I'd recommend specifying an amount instead, for safety.", "n3")},
            "n3": {"bot": "There's a small transfer fee of 10 lira — is that alright?",
                   "options": _opts(
                       "Yes, that's fine, go ahead.", "Great, processing the transfer now.", "n4",
                       "Is there a way around the fee?", "Not for this type of transfer, I'm afraid, but it is quite small.", "n4",
                       "Why is there even a fee?", "It covers the processing cost — still quite minimal here.", "n4")},
            "n4": {"bot": "All done — the transfer should arrive within a few minutes. Anything else?",
                   "options": _opts(
                       "No, that's everything, thank you very much.", "You're welcome, have a great day!", None,
                       "No, that's it.", "Great, take care!", None,
                       "No.", "Alright then.", None)},
        },
    },
    "tech_support_call": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Thank you for calling tech support, how can I help you today?",
                   "options": _opts(
                       "Hi, my laptop won't turn on even though it's charged.", "Okay, let's troubleshoot that together — have you tried holding the power button for 10 seconds?", "n2",
                       "My computer is broken.", "I'm sorry to hear that — can you tell me a bit more about what's happening?", "n2",
                       "Your product is garbage, fix it now.", "I understand the frustration — let's figure out what's going on so I can help.", "n2")},
            "n2": {"bot": "Have you tried holding the power button for about 10 seconds?",
                   "options": _opts(
                       "Yes, I just tried that and nothing happened.", "Okay, let's try one more thing — can you check if the charging light turns on?", "n3",
                       "No, let me try that now.", "Sure, go ahead, I'll wait.", "n3",
                       "I'm not doing random steps, just send a technician.", "I understand, but a couple of quick checks first could save you the wait.", "n3")},
            "n3": {"bot": "Is there any light at all when you plug in the charger?",
                   "options": _opts(
                       "No light at all, it seems completely dead.", "That does sound like it could be a hardware issue.", "n4",
                       "I'm not sure, let me check... yeah, a small light.", "Okay, that's actually a good sign — let's try a different approach.", "n4",
                       "I already told you, nothing works.", "I hear you — based on that, this does sound like a hardware issue.", "n4")},
            "n4": {"bot": "This sounds like it may need a repair. Would you like to book a service appointment?",
                   "options": _opts(
                       "Yes, please, as soon as possible.", "I can get you in tomorrow at 2 PM, does that work?", "n5",
                       "How much would that cost?", "It depends on the issue, but the diagnostic itself is free.", "n5",
                       "This is ridiculous, I just bought it.", "I completely understand — if it's still under warranty, the repair would be free.", "n5")},
            "n5": {"bot": "I've got you down for tomorrow at 2 PM. Does that work for you?",
                   "options": _opts(
                       "Yes, that works perfectly, thank you.", "Great, you're all set then.", "n6",
                       "I might be a little late, is that okay?", "That should be fine, just call ahead if you can.", "n6",
                       "Fine, whatever.", "Alright, see you then.", "n6")},
            "n6": {"bot": "You'll get a confirmation text shortly. Anything else I can help with today?",
                   "options": _opts(
                       "No, that's everything, thank you for your help.", "You're very welcome, have a great day!", None,
                       "No, that's all.", "Great, take care!", None,
                       "No.", "Alright then, goodbye.", None)},
        },
    },
    "subscription_cancellation": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, thanks for calling — how can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to cancel my subscription, please.", "I'm sorry to hear that — can I ask what's prompting the cancellation?", "n2",
                       "I want to stop paying for this.", "I understand — may I ask why, in case there's something I can help with?", "n2",
                       "Cancel it. Now.", "I can help with that — mind if I ask the reason first?", "n2")},
            "n2": {"bot": "I understand. Is it a matter of cost, or did something not meet your expectations?",
                   "options": _opts(
                       "It's mostly the cost — I'm just not using it enough to justify it.", "That's completely understandable, thank you for letting us know.", "n3",
                       "A bit of both, I guess.", "I appreciate you sharing that.", "n3",
                       "Does it matter? Just cancel it.", "Of course, I'll process that right away.", "n3")},
            "n3": {"bot": "Would a discounted plan change your mind, or would you still like to proceed with the cancellation?",
                   "options": _opts(
                       "I appreciate the offer, but I'd still like to cancel, thank you.", "No problem at all, I'll go ahead and process that.", "n4",
                       "Maybe, how much of a discount?", "We could offer 30% off for the next three months.", "n4",
                       "I said cancel, stop trying to upsell me.", "Understood, I'll process the cancellation right away.", "n4")},
            "n4": {"bot": "Your subscription is cancelled, effective at the end of this billing cycle. Anything else?",
                   "options": _opts(
                       "No, that's everything, thank you for your help.", "You're welcome, we hope to see you again sometime.", None,
                       "No, that's it.", "Alright, take care.", None,
                       "No.", "Goodbye then.", None)},
        },
    },
    "movie_tickets": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome! Which movie would you like to see?",
                   "options": _opts(
                       "Hi, two tickets for the 8 PM showing of 'Horizon,' please.", "Great choice, let me check seating for that showing.", "n2",
                       "What's playing tonight?", "We have a few options — 'Horizon,' a comedy, and an animated film.", "n2",
                       "Just give me tickets to something.", "Sure, our most popular showing tonight is 'Horizon' at 8 PM.", "n2")},
            "n2": {"bot": "Would you like regular or recliner seats? Recliners are a bit more expensive.",
                   "options": _opts(
                       "Regular seats are fine, thank you.", "Great, regular seats it is.", "n3",
                       "What's the price difference?", "Recliners are about 15 lira more per ticket.", "n3",
                       "Just pick for me.", "I'll go with regular seats then, to keep it simple.", "n3")},
            "n3": {"bot": "Would you like any snacks — popcorn, drinks?",
                   "options": _opts(
                       "Yes, a medium popcorn and two drinks, please.", "Great, I'll add that to your order.", "n4",
                       "Maybe just a drink.", "Sure, what size would you like?", "n4",
                       "No, too expensive.", "No problem, just the tickets then.", "n4")},
            "n4": {"bot": "Your total comes to 240 lira. How would you like to pay?",
                   "options": _opts(
                       "Card, please.", "Perfect, here's the reader.", "n5",
                       "Can I split that between two cards?", "Of course, let's do that.", "n5",
                       "That's a lot for a movie.", "I understand — the snacks did add a bit to it.", "n5")},
            "n5": {"bot": "Here are your tickets — enjoy the movie!",
                   "options": _opts(
                       "Thank you very much, have a good night!", "You too, enjoy!", None,
                       "Thanks.", "Enjoy the movie!", None,
                       "...", "...Enjoy the movie!", None)},
        },
    },
    "gym_membership": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi there, welcome to FitZone! Are you looking to sign up for a membership?",
                   "options": _opts(
                       "Hi, yes, I'd like to find out about your membership options.", "Great, we have monthly, quarterly, and annual plans — let me walk you through them.", "n2",
                       "Maybe, what do you offer?", "We have a few different plans — would you like a quick overview?", "n2",
                       "Just tell me the cheapest option.", "Sure, our monthly basic plan is the most affordable to start.", "n2")},
            "n2": {"bot": "Would you be interested in group classes, or mainly the gym equipment?",
                   "options": _opts(
                       "Mostly the equipment, but I might try a class occasionally.", "That sounds like our standard plan would suit you well.", "n3",
                       "I'm not sure yet, maybe both?", "No problem, our standard plan actually includes limited class access too.", "n3",
                       "I don't care about any of that.", "That's fine, the basic plan covers just equipment access.", "n3")},
            "n3": {"bot": "Would you like to take a free tour of the facility before deciding?",
                   "options": _opts(
                       "Yes, I'd love to see it first, thank you.", "Great, let me show you around.", "n4",
                       "Sure, if it's quick.", "It'll just take a few minutes, follow me.", "n4",
                       "No, just sign me up.", "Alright, let's get the paperwork started then.", "n4")},
            "n4": {"bot": "Would you like to commit to a 12-month plan for a better rate, or go month-to-month?",
                   "options": _opts(
                       "Month-to-month is better for me right now, thank you.", "No problem, that's a flexible option.", "n5",
                       "What's the price difference?", "The 12-month plan saves about 20% compared to month-to-month.", "n5",
                       "I don't want to commit to anything long.", "Completely understandable, month-to-month works great too.", "n5")},
            "n5": {"bot": "Great, your membership starts today. Would you like a quick intro session with a trainer?",
                   "options": _opts(
                       "Yes, that would be really helpful, thank you.", "I'll schedule that for you — how about tomorrow at 5 PM?", "n6",
                       "Maybe later, not today.", "No problem, you can book that anytime from the app.", "n6",
                       "No, I know what I'm doing.", "Fair enough, the equipment floor is right through here.", "n6")},
            "n6": {"bot": "Welcome to FitZone — here's your membership card!",
                   "options": _opts(
                       "Thank you so much, I'm excited to get started!", "That's great to hear, see you around the gym!", None,
                       "Thanks.", "You're welcome, enjoy!", None,
                       "...", "Alright, see you around!", None)},
        },
    },
    "residence_permit": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good morning, how can I help you today?",
                   "options": _opts(
                       "Good morning, I'd like to apply for a short-term residence permit, please.", "Great, let's go through what you'll need step by step.", "n2",
                       "I need a permit to stay here.", "Sure, could you tell me which type — short-term, student, or work?", "n2",
                       "Give me the paperwork.", "Of course — can I ask what type of permit you need first?", "n2")},
            "n2": {"bot": "Do you have your passport, address registration, and health insurance documents with you?",
                   "options": _opts(
                       "Yes, I have all three right here.", "Perfect, that's exactly what we need.", "n3",
                       "I have my passport, but I'm missing the health insurance document.", "That's alright, you can submit that one later, but it is required eventually.", "n3",
                       "No, nobody told me I needed those.", "I understand, it can be confusing — let's go over the full list together.", "n3")},
            "n3": {"bot": "How long are you planning to stay in the country?",
                   "options": _opts(
                       "About one year, for now.", "Got it, I'll process the application for a one-year permit.", "n4",
                       "I'm not totally sure yet, maybe six months to a year.", "No problem, we can start with one year and you can renew if needed.", "n4",
                       "As long as possible.", "The maximum for this type is generally one year at a time.", "n4")},
            "n4": {"bot": "There's an application fee of 500 lira. How would you like to pay?",
                   "options": _opts(
                       "Card, please.", "Great, I'll process that now.", "n5",
                       "Is there a way to pay later?", "I'm afraid it needs to be paid at submission, but we do accept card or bank transfer.", "n5",
                       "That seems like a lot for paperwork.", "I understand the frustration, it is a standard government fee though.", "n5")},
            "n5": {"bot": "Your application is submitted. Processing usually takes about 4 to 6 weeks.",
                   "options": _opts(
                       "Thank you, is there a way to check the status online?", "Yes, you can track it through the e-government portal.", "n6",
                       "Okay, how will I know when it's ready?", "You'll get a notification by email or text.", "n6",
                       "That's really slow.", "I understand, unfortunately that's the standard processing time.", "n6")},
            "n6": {"bot": "Once it's approved, you'll need to come back in person to collect your permit card.",
                   "options": _opts(
                       "Understood, thank you for explaining everything so clearly.", "You're very welcome, good luck with your stay!", "n7",
                       "Okay, got it.", "Great, we'll be in touch.", "n7",
                       "Fine.", "Alright then.", "n7")},
            "n7": {"bot": "Is there anything else I can help you with today?",
                   "options": _opts(
                       "No, that covers everything, thank you so much.", "You're welcome, have a great day!", None,
                       "No, that's all.", "Take care!", None,
                       "No.", "Alright, goodbye.", None)},
        },
    },
    "buying_sim_card": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome! Are you looking to get a new SIM card today?",
                   "options": _opts(
                       "Hi, yes, I just moved here and need a local SIM card.", "Welcome! Let's get you set up — do you have your passport with you?", "n2",
                       "Yeah, I need a phone number.", "Sure, I can help with that — do you have ID on you?", "n2",
                       "Give me a SIM, fast.", "Of course — I'll just need to see some ID first.", "n2")},
            "n2": {"bot": "Great, and would you like a prepaid plan, or a monthly contract?",
                   "options": _opts(
                       "Prepaid would be better for me right now, thank you.", "Good choice, nice and flexible.", "n3",
                       "What's the difference?", "Prepaid has no commitment, while a contract usually offers more data for less per month.", "n3",
                       "Whatever's cheaper.", "Prepaid tends to be the more affordable option upfront.", "n3")},
            "n3": {"bot": "How much data do you think you'll need monthly?",
                   "options": _opts(
                       "Probably around 20 GB should be enough.", "We have a perfect plan for that right here.", "n4",
                       "I'm not sure, I use my phone a lot though.", "In that case, I'd suggest our 30 GB plan to be safe.", "n4",
                       "I don't know anything about data plans.", "No worries, let's go with a balanced plan that covers most needs.", "n4")},
            "n4": {"bot": "That'll be 350 lira for the SIM and first month. How would you like to pay?",
                   "options": _opts(
                       "Card, please.", "Perfect, here's the reader.", "n5",
                       "Do you accept cash?", "We do, cash works fine too.", "n5",
                       "That's expensive for a SIM card.", "Most of that covers your first month's data, actually.", "n5")},
            "n5": {"bot": "Here's your new SIM — it should activate within the hour. Welcome to the network!",
                   "options": _opts(
                       "Thank you so much for your help today.", "You're very welcome, enjoy!", None,
                       "Thanks.", "Take care!", None,
                       "...", "Alright, enjoy your new number!", None)},
        },
    },
    "gas_station": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi there, full tank today?",
                   "options": _opts(
                       "Hi, yes, fill it up with regular unleaded, please.", "Sure thing, regular unleaded coming right up.", "n2",
                       "Just give me some gas.", "No problem — how much would you like, or should I fill it up?", "n2",
                       "Gas. Now.", "Sure, filling it up with regular unleaded unless you'd like something else.", "n2")},
            "n2": {"bot": "Would you like me to check your oil and tire pressure while you're here?",
                   "options": _opts(
                       "Yes, that would be great, thank you.", "No problem, I'll take a quick look.", "n3",
                       "Maybe just the tires.", "Sure, I'll check those for you.", "n3",
                       "No, just the gas.", "No problem, just the gas then.", "n3")},
            "n3": {"bot": "Everything looks good — tires are at the right pressure, and oil level is fine.",
                   "options": _opts(
                       "That's great to hear, thank you for checking.", "Of course, always good to double-check!", "n4",
                       "Oh, okay, good.", "Yep, all good here.", "n4",
                       "Fine, whatever.", "Alright, all set then.", "n4")},
            "n4": {"bot": "That'll be 1,450 lira for the fuel. How would you like to pay?",
                   "options": _opts(
                       "Card, please.", "Perfect, here's the reader.", "n5",
                       "Do you take mobile payment?", "Yes, you can tap your phone right here.", "n5",
                       "That's expensive these days.", "It really has gone up, I agree — still, you're all filled up.", "n5")},
            "n5": {"bot": "All set, have a safe trip!",
                   "options": _opts(
                       "Thank you, you have a good day too!", "Thanks, drive safe!", None,
                       "Thanks.", "Take care!", None,
                       "...", "...Alright, safe travels!", None)},
        },
    },
    "car_insurance": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, thanks for calling — are you looking to get a quote for car insurance?",
                   "options": _opts(
                       "Hi, yes, I just bought a new car and need insurance for it.", "Congratulations on the car! Let's get you a quote.", "n2",
                       "I need insurance for my car.", "Sure, could you tell me a bit about the vehicle?", "n2",
                       "Just give me the cheapest insurance you have.", "I can do that, but let's go over a few details first to get an accurate quote.", "n2")},
            "n2": {"bot": "What's the make, model, and year of the car?",
                   "options": _opts(
                       "It's a 2024 Toyota Corolla.", "Great, that's a pretty common model, should be easy to quote.", "n3",
                       "It's a Toyota, I think a Corolla.", "That helps, do you happen to know the year as well?", "n3",
                       "Does it really matter?", "It does affect the price a bit, yes — any details help.", "n3")},
            "n3": {"bot": "How many years have you been driving, and any accidents on your record?",
                   "options": _opts(
                       "About eight years, and no accidents, thankfully.", "That's great, that'll help keep your premium lower.", "n4",
                       "A few years, maybe one minor accident a while back.", "No problem, that was a while ago so it shouldn't affect things much.", "n4",
                       "Why does my driving history matter for a quote?", "It helps us assess risk and give you an accurate price.", "n4")},
            "n4": {"bot": "Based on that, I can offer you comprehensive coverage for about 450 lira a month. Does that work?",
                   "options": _opts(
                       "That sounds reasonable, let's go with that.", "Great, I'll get the paperwork started.", "n5",
                       "Is there a cheaper option?", "There is a basic liability-only plan for around 250 a month.", "n5",
                       "That's way too expensive.", "I understand — let's look at the basic plan instead, which is more affordable.", "n5")},
            "n5": {"bot": "Would you like to pay monthly, or get a discount by paying the full year upfront?",
                   "options": _opts(
                       "I'll pay the full year, if it saves money.", "Smart choice, that saves you about 10%.", "n6",
                       "Monthly is easier for me.", "That works too, no problem at all.", "n6",
                       "I'll figure that out later.", "No rush, we can finalize that when you're ready.", "n6")},
            "n6": {"bot": "Great, your policy will be active starting tomorrow. Anything else I can help with?",
                   "options": _opts(
                       "No, that's everything, thank you so much for your help.", "You're very welcome, drive safe!", None,
                       "No, that's it.", "Great, take care!", None,
                       "No.", "Alright, goodbye.", None)},
        },
    },
}

assert len(SCENARIO_TREES) == 28
assert all(slug in SCENARIO_META for slug in SCENARIO_TREES)

