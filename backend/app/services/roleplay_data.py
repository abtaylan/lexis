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
katalogun HEM SCENARIO_META'si (slug+basliklar+kategori) HEM DE
SCENARIO_TREES'i (gercek dallanan diyalog icerigi, her biri 3-4 ila 6 node)
TAMAMEN yazildi -- 102/102 senaryo tam calisir durumda. list_categories()
yine de SADECE SCENARIO_TREES icinde agaci olan senaryolari listeler (ek
guvenlik/gelecekteki genisletmeler icin), ama su an hepsi mevcut.
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


# slug -> {start, nodes}. Onaylanan 14 kategori / 102 senaryonun TAMAMI
# dallan-ve-birles modeliyle tam yazildi (25 Kasim 2026).
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
    "airport_checkin": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good morning! Where are you flying to today?",
                   "options": _opts(
                       "Good morning, I'm flying to Berlin, flight LH1042.", "Great, let me check you in for that flight.", "n2",
                       "Berlin.", "Thanks — could I also get your flight number or booking reference?", "n2",
                       "Just check me in.", "Of course, I'll just need your destination first.", "n2")},
            "n2": {"bot": "Can I see your passport and booking confirmation, please?",
                   "options": _opts(
                       "Here you go, passport and the confirmation email.", "Perfect, everything looks in order.", "n3",
                       "Sure, here's my passport. I don't have the printout, is that okay?", "That's fine, I can look it up with your passport.", "n3",
                       "Why do you need my passport?", "It's required for international check-in, I'm afraid.", "n3")},
            "n3": {"bot": "How many bags would you like to check in today?",
                   "options": _opts(
                       "Just one suitcase, please.", "Okay, please place it on the scale.", "n4",
                       "One, I think — is there a weight limit?", "Yes, twenty-three kilos for economy.", "n4",
                       "I don't know, however many I have.", "No worries, let's just put them on the scale one by one.", "n4")},
            "n4": {"bot": "Your bag is two kilos over the limit. Would you like to move something to your carry-on or pay the extra fee?",
                   "options": _opts(
                       "I'll move a few things to my carry-on, thanks for letting me know.", "Sounds good, take your time.", "n5",
                       "How much would the extra fee be?", "It's about 20 euros for the extra weight.", "n5",
                       "That's ridiculous, it was fine last time.", "I understand the frustration, but the limit is strict today — we can still sort it out.", "n5")},
            "n5": {"bot": "All set — here's your boarding pass, gate B12, boarding starts at 10:40. Have a great flight!",
                   "options": _opts(
                       "Thank you so much, have a great day!", "You too, safe travels!", None,
                       "Thanks.", "You're welcome.", None,
                       "Finally.", "Have a good flight.", None)},
        },
    },
    "passport_control": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Passport and boarding pass, please. What's the purpose of your visit?",
                   "options": _opts(
                       "Here you go. I'm here on vacation for two weeks.", "Great, enjoy your stay.", "n2",
                       "Here. Tourism, I guess.", "Okay, and where will you be staying?", "n2",
                       "Why do you need to know that?", "It's a standard question for entry.", "n2")},
            "n2": {"bot": "Where will you be staying during your trip?",
                   "options": _opts(
                       "At the Grand Palace Hotel downtown, I have the reservation here.", "Thank you, that's all I need.", "n3",
                       "With a friend, I don't have the address memorized.", "That's alright, do you have their phone number handy?", "n3",
                       "Somewhere, I'll figure it out.", "I'll need a more specific answer, please.", "n3")},
            "n3": {"bot": "Alright, everything checks out. Welcome, enjoy your trip!",
                   "options": _opts(
                       "Thank you very much!", "Have a great stay.", None,
                       "Thanks.", "Welcome.", None,
                       "Finally, took forever.", "Welcome to the country.", None)},
        },
    },
    "taxi_uber": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, where would you like to be picked up?",
                   "options": _opts(
                       "Hi, I'm at 24 Elm Street, could you send a car, please?", "Sure, a car will arrive in about 8 minutes.", "n2",
                       "Near the big supermarket on Elm Street.", "Got it, can I get a more exact address for the driver?", "n2",
                       "Just send someone, I'll tell you when they get here.", "I really do need a pickup address to dispatch a driver.", "n2")},
            "n2": {"bot": "And where are you headed?",
                   "options": _opts(
                       "To the central train station, please.", "Perfect, that's about a 15 minute ride.", "n3",
                       "Somewhere downtown, near the station I think.", "No problem, I'll set the destination to the central station, let me know if that's wrong.", "n3",
                       "I'll tell the driver when I get in.", "That works too, the driver will confirm with you.", "n3")},
            "n3": {"bot": "Hi, are you the one who booked a ride to the station?",
                   "options": _opts(
                       "Yes, that's me, thanks for coming.", "No problem, hop in!", "n4",
                       "I think so, yes.", "Great, let's get going then.", "n4",
                       "Yeah, whatever, let's just go.", "Alright, buckle up.", "n4")},
            "n4": {"bot": "Here we are, that'll be 85 lira. Cash or card?",
                   "options": _opts(
                       "Card is fine, thank you.", "Great, here's the reader.", "n5",
                       "Do you take cash?", "I do, cash works too.", "n5",
                       "That seems like a lot.", "That's the metered fare, I'm afraid.", "n5")},
            "n5": {"bot": "Thanks, have a safe trip!",
                   "options": _opts(
                       "Thank you, you too!", "Take care!", None,
                       "Thanks.", "Bye now.", None,
                       "Whatever, bye.", "Alright then.", None)},
        },
    },
    "bus_train_ticket": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, where are you traveling to?",
                   "options": _opts(
                       "Hi, one ticket to Izmir for tomorrow morning, please.", "Sure, let me check the morning departures.", "n2",
                       "Izmir, sometime tomorrow.", "Okay, do you have a preferred time in the morning or afternoon?", "n2",
                       "Izmir. Just give me a ticket.", "Of course — any particular time you'd like?", "n2")},
            "n2": {"bot": "There's a train at 8:15 and one at 10:30. Which would you prefer?",
                   "options": _opts(
                       "The 8:15 one, please.", "Great, one ticket on the 8:15 train.", "n3",
                       "Whichever is cheaper.", "They're the same price, I'll put you on the 8:15 then.", "n3",
                       "I don't care, just pick one.", "Alright, I'll book the 8:15 departure.", "n3")},
            "n3": {"bot": "Would you like a window or aisle seat?",
                   "options": _opts(
                       "Window, please, if it's available.", "You're in luck, window seat 14A.", "n4",
                       "Either is fine.", "I'll put you by the window then.", "n4",
                       "Does it matter? Just seat me somewhere.", "No problem, I'll assign you a seat.", "n4")},
            "n4": {"bot": "That'll be 180 lira. Will you pay by card?",
                   "options": _opts(
                       "Yes, card please.", "Great, here's the machine.", "n5",
                       "Can I pay in cash instead?", "Of course, cash works fine.", "n5",
                       "180? That's expensive.", "That's the standard fare for this route, I'm afraid.", "n5")},
            "n5": {"bot": "Here's your ticket, platform 3, departure at 8:15. Have a good trip!",
                   "options": _opts(
                       "Thank you so much!", "You're welcome, safe travels.", None,
                       "Thanks.", "Take care.", None,
                       "Fine.", "Have a good trip.", None)},
        },
    },
    "lost_luggage": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi there, how can I help you?",
                   "options": _opts(
                       "Hi, my suitcase didn't arrive on the baggage belt, I think it's lost.", "I'm sorry to hear that, let's file a report right away.", "n2",
                       "My bag isn't here. I don't know what happened.", "Let's look into that — do you have your baggage claim tag?", "n2",
                       "Where's my bag?! This is unacceptable.", "I completely understand your frustration, let's find it together.", "n2")},
            "n2": {"bot": "Can I see your baggage claim tag and flight ticket?",
                   "options": _opts(
                       "Here they are, flight LH1042 from Berlin.", "Thank you, let me look that up in the system.", "n3",
                       "I think I lost the tag, but here's my ticket.", "That's alright, the ticket should be enough to trace it.", "n3",
                       "I don't have it on me.", "No problem, can you tell me the flight number instead?", "n3")},
            "n3": {"bot": "Can you describe your suitcase for me?",
                   "options": _opts(
                       "It's a large black hard-shell suitcase with a red ribbon on the handle.", "Got it, that's very helpful, I've logged the description.", "n4",
                       "It's black, medium-sized, I think.", "That's helpful, any distinguishing marks or tags?", "n4",
                       "It's just a normal suitcase, how should I know how to describe it?", "Any detail helps, even the color or brand.", "n4")},
            "n4": {"bot": "Alright, I've filed the report. We'll deliver it to your address once it's found, usually within 48 hours.",
                   "options": _opts(
                       "Thank you, here's my address and phone number.", "Perfect, you'll get updates by text message.", "n5",
                       "Okay, I hope it turns up soon.", "We'll do our best, you'll be notified as soon as we find it.", "n5",
                       "48 hours? That's way too long.", "I understand, we do try to resolve these faster when possible.", "n5")},
            "n5": {"bot": "Here's your reference number, keep it for tracking. Anything else?",
                   "options": _opts(
                       "No, that's all, thank you for your help.", "You're welcome, we'll be in touch soon.", None,
                       "No, that's it.", "Alright, take care.", None,
                       "No. I just want my bag back.", "We understand, we're on it.", None)},
        },
    },
    "car_rental": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Welcome! Do you have a reservation with us?",
                   "options": _opts(
                       "Yes, under the name Ahmet Yılmaz, a compact car for five days.", "Found it, a Hyundai i20 for five days.", "n2",
                       "Yes, I booked online, but I forgot the confirmation number.", "No worries, what name is it under?", "n2",
                       "No, can I just rent something right now?", "Sure, let's see what's available.", "n2")},
            "n2": {"bot": "May I see your driver's license and a credit card for the deposit?",
                   "options": _opts(
                       "Of course, here's my license and card.", "Perfect, everything looks good.", "n3",
                       "Here's my license — do you need the physical card or can I pay with my phone?", "The physical card is needed for the deposit hold, I'm afraid.", "n3",
                       "Do I really need to leave a deposit?", "Yes, it's standard policy and it's refunded when you return the car.", "n3")},
            "n3": {"bot": "Would you like full insurance coverage, or just the basic plan?",
                   "options": _opts(
                       "Full coverage, please, better safe than sorry.", "Great choice, that covers any damage completely.", "n4",
                       "What's the difference in price?", "Full coverage is 15 euros more per day than basic.", "n4",
                       "I don't need any insurance.", "I'd recommend at least basic coverage, but it's your choice.", "n4")},
            "n4": {"bot": "Here are the keys. Please check the car for any existing damage before you leave.",
                   "options": _opts(
                       "Thank you, I'll walk around and check now.", "Good idea, let me know if you spot anything.", "n5",
                       "Okay, looks fine to me from here.", "Take a quick walk around just to be sure.", "n5",
                       "I'm sure it's fine, I'll just go.", "I'd really recommend checking first, just to protect you.", "n5")},
            "n5": {"bot": "All set. Please return the car with a full tank by Friday at 6 PM. Enjoy your trip!",
                   "options": _opts(
                       "Will do, thank you very much!", "You're welcome, drive safe!", None,
                       "Got it, thanks.", "Take care.", None,
                       "Fine, whatever.", "Have a good trip.", None)},
        },
    },
    "tour_guide_info": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi! Welcome to the old town tour. Do you have any questions before we start?",
                   "options": _opts(
                       "Yes, how long does the tour usually take?", "Great question, it's about two hours with a short break.", "n2",
                       "Is there a bathroom break at some point?", "Yes, we'll stop at the main square after an hour.", "n2",
                       "Just start already, I don't have questions.", "Alright, let's get going then!", "n2")},
            "n2": {"bot": "This building behind me is the old clock tower, built over 400 years ago. Any questions about it?",
                   "options": _opts(
                       "Can we go inside, or is it just viewed from outside?", "Good question, it's open to visitors on weekends.", "n3",
                       "That's really old. Is it still used today?", "It is, actually, for small civic ceremonies.", "n3",
                       "I've seen older buildings, not that impressive.", "Fair enough, let's move on to something more unique then.", "n3")},
            "n3": {"bot": "Next, we'll head to the market square, about a five-minute walk. Keep up with the group, please.",
                   "options": _opts(
                       "Sounds good, lead the way.", "Great, follow me this way.", "n4",
                       "Okay, is it far from here?", "Just a five-minute walk, not far at all.", "n4",
                       "Can we skip ahead, this is taking long.", "We're moving at a steady pace, we'll be there soon.", "n4")},
            "n4": {"bot": "This concludes today's tour. Thank you all for joining — any last questions?",
                   "options": _opts(
                       "No, this was a wonderful tour, thank you!", "I'm so glad you enjoyed it, take care!", None,
                       "No, thanks for the tour.", "You're welcome, have a great day.", None,
                       "No. Finally done.", "Thanks for coming, goodbye.", None)},
        },
    },
    "restaurant_reservation": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good evening, thanks for calling Bella Vista. How can I help you?",
                   "options": _opts(
                       "Hi, I'd like to book a table for four, tomorrow at 8 PM.", "Let me check availability for tomorrow at 8.", "n2",
                       "I want to make a reservation.", "Of course, for how many people and what time?", "n2",
                       "Do you even have tables free tomorrow?", "Let me check for you — how many people and what time?", "n2")},
            "n2": {"bot": "We have a table for four at 8 PM. Any seating preference — indoor or on the terrace?",
                   "options": _opts(
                       "The terrace would be lovely, if it's not too cold.", "It's heated, so it should be comfortable.", "n3",
                       "Indoor is probably safer, I think.", "Good call, I'll book you an indoor table.", "n3",
                       "I don't care, just book something.", "No problem, I'll put you indoors.", "n3")},
            "n3": {"bot": "Great, can I get a name and phone number for the reservation?",
                   "options": _opts(
                       "Sure, Ahmet Yılmaz, and my number is 0532 123 4567.", "Perfect, you're all set for tomorrow at 8.", "n4",
                       "Ahmet, and I'll give my number when I arrive.", "The number helps us reach you if anything changes, but that's alright.", "n4",
                       "Why do you need my phone number?", "Just in case we need to reach you about the booking.", "n4")},
            "n4": {"bot": "You're all booked — table for four, tomorrow at 8 PM. See you then!",
                   "options": _opts(
                       "Thank you so much, see you tomorrow!", "Looking forward to it, goodbye!", None,
                       "Okay, thanks.", "See you then.", None,
                       "Fine.", "Goodbye.", None)},
        },
    },
    "bill_dispute": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Here's your bill, whenever you're ready.",
                   "options": _opts(
                       "Thank you — could we get the bill split into two, please?", "Of course, I'll bring two separate checks.", "n2",
                       "Thanks, could we pay separately?", "Sure thing, one moment.", "n2",
                       "Just bring the bill, we'll sort it out.", "Alright, here it is.", "n2")},
            "n2": {"bot": "Here you go. Is everything alright?",
                   "options": _opts(
                       "Actually, I think we were charged for a dessert we didn't order.", "Let me check that right away, I'm sorry about that.", "n3",
                       "This total looks a bit higher than I expected.", "Let me double check the items for you.", "n3",
                       "This is wrong, you're overcharging us.", "I'm sorry to hear that, let me look into it immediately.", "n3")},
            "n3": {"bot": "You're right, I apologize — that dessert was added by mistake. I'll remove it now.",
                   "options": _opts(
                       "Thank you for fixing that, I appreciate it.", "Of course, sorry again for the trouble.", "n4",
                       "Okay, thanks for checking.", "No problem at all.", "n4",
                       "It's fine, just make sure it doesn't happen again.", "Understood, I'll be more careful.", "n4")},
            "n4": {"bot": "Here's the corrected bill. Will you be paying by card or cash?",
                   "options": _opts(
                       "Card, please.", "Great, I'll bring the machine over.", None,
                       "Cash, I think.", "No problem, I'll get your change.", None,
                       "Card. Finally.", "Right away.", None)},
        },
    },
    "fastfood_order": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome to Burger Spot! What can I get started for you?",
                   "options": _opts(
                       "Hi, I'll have a cheeseburger meal with a cola, please.", "Great choice, what size for the meal?", "n2",
                       "A burger and fries, I guess.", "Sure, would you like that as a meal with a drink?", "n2",
                       "Just give me whatever's fast.", "Our cheeseburger meal is quick — would that work?", "n2")},
            "n2": {"bot": "What size would you like — small, medium, or large?",
                   "options": _opts(
                       "Medium, please.", "Medium it is.", "n3",
                       "What's the price difference for large?", "Large is just one dollar more.", "n3",
                       "Doesn't matter, whatever's normal.", "I'll make that a medium for you.", "n3")},
            "n3": {"bot": "For here or to go?",
                   "options": _opts(
                       "For here, please.", "Great, that'll be table service then.", "n4",
                       "To go, thanks.", "No problem, I'll have it bagged up.", "n4",
                       "I haven't decided yet.", "Take your time, I'll just put it on a tray for now.", "n4")},
            "n4": {"bot": "That'll be 12 dollars. Anything else before I ring it up?",
                   "options": _opts(
                       "No, that's everything, thanks.", "Great, your total is 12 dollars.", None,
                       "No, that's it.", "Alright, here's your total.", None,
                       "No. Hurry up please.", "Coming right up.", None)},
        },
    },
    "phone_food_order": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Thanks for calling Napoli Pizza, how can I help you?",
                   "options": _opts(
                       "Hi, I'd like to order a large pepperoni pizza for delivery.", "Sure thing, can I get your delivery address?", "n2",
                       "I want a pizza delivered.", "Of course, what size and toppings would you like?", "n2",
                       "Pizza, delivery, as fast as possible.", "I can do that — what size and toppings?", "n2")},
            "n2": {"bot": "Great, and what's the delivery address?",
                   "options": _opts(
                       "45 Oak Avenue, apartment 3B.", "Got it, 45 Oak Avenue, apartment 3B.", "n3",
                       "Somewhere on Oak Avenue, I'll give more detail if needed.", "I'll need the exact address and apartment number, please.", "n3",
                       "I'll just tell the driver when he calls.", "I really do need an address to send out the order, I'm afraid.", "n3")},
            "n3": {"bot": "Alright, that'll be about 35 minutes. Will you pay cash or card on delivery?",
                   "options": _opts(
                       "Card on delivery, please.", "Perfect, the driver will bring a card reader.", "n4",
                       "Cash, I think I have exact change.", "Great, that works fine.", "n4",
                       "Whatever's easiest for you.", "Cash on delivery is usually simplest.", "n4")},
            "n4": {"bot": "You're all set — a large pepperoni pizza, about 35 minutes. Anything else?",
                   "options": _opts(
                       "No, that's perfect, thank you!", "You're welcome, enjoy your pizza!", None,
                       "No, that's all.", "Great, see you soon.", None,
                       "No, just hurry.", "We'll get it there quickly.", None)},
        },
    },
    "allergy_notice": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, are you ready to order, or do you have any questions about the menu?",
                   "options": _opts(
                       "Hi, before I order — I have a peanut allergy, could you tell me which dishes are safe?", "Thanks for letting me know, let me check with the kitchen.", "n2",
                       "I just wanted to mention I'm allergic to peanuts.", "Good to know, I'll make sure the kitchen is aware.", "n2",
                       "Does any of this have peanuts? I can't eat that.", "Let me find out for you right away.", "n2")},
            "n2": {"bot": "Good news — the grilled chicken and the pasta primavera are both peanut-free. The pad thai does contain peanuts.",
                   "options": _opts(
                       "Perfect, I'll have the pasta primavera, then.", "Great choice, I'll flag it as allergy-safe in the kitchen.", "n3",
                       "Okay, I'll go with the chicken.", "Good choice, I'll let the kitchen know about the allergy.", "n3",
                       "Fine, as long as it's not the pad thai.", "Understood, I'll make sure that's kept separate.", "n3")},
            "n3": {"bot": "Your order will be prepared carefully, separate from any peanut products. Anything else?",
                   "options": _opts(
                       "No, thank you so much for being careful about this.", "Of course, your safety is our priority.", None,
                       "No, that's all, thanks.", "You're welcome.", None,
                       "No, just don't mess it up.", "We'll be very careful with your order.", None)},
        },
    },
    "drink_menu_advice": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, can I get you something to drink? We have a full cocktail and mocktail menu.",
                   "options": _opts(
                       "Hi, could you recommend something fruity but not too sweet?", "Sure, our passionfruit mojito might be perfect for you.", "n2",
                       "I don't really know what to pick, any suggestions?", "Our house specialty is the elderflower spritz, very popular.", "n2",
                       "Just bring me whatever's popular.", "Our elderflower spritz is the best-seller, I'll bring that.", "n2")},
            "n2": {"bot": "Would you like that with or without alcohol?",
                   "options": _opts(
                       "Without alcohol, please, I'm driving later.", "Smart choice, I'll make it a mocktail version.", "n3",
                       "With a little alcohol, nothing too strong.", "Perfect, I'll make it a light version.", "n3",
                       "Doesn't matter, surprise me.", "I'll go with the classic version then.", "n3")},
            "n3": {"bot": "Great choice — I'll have that out to you shortly. Anything else for now?",
                   "options": _opts(
                       "No, that's all, thank you!", "You're welcome, coming right up.", None,
                       "No, that's it.", "Alright, one moment.", None,
                       "No, just bring it quickly.", "Right away.", None)},
        },
    },
    "electronics_inquiry": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome in! Are you looking for anything in particular today?",
                   "options": _opts(
                       "Hi, I'm looking for a laptop for everyday use and some light photo editing.", "Great, I can show you a few good options for that.", "n2",
                       "Just a laptop, something decent.", "Sure, what will you mainly use it for?", "n2",
                       "I don't know, just show me what you have.", "No problem, let me show you our most popular models.", "n2")},
            "n2": {"bot": "This model here has 16GB of RAM and a good processor — great for photo editing. It's 650 dollars.",
                   "options": _opts(
                       "That sounds good, does it come with a warranty?", "Yes, a one-year warranty is included.", "n3",
                       "That's a bit more than I wanted to spend, is there a cheaper option?", "There's a slightly older model for 500 that still handles light editing well.", "n3",
                       "650 is way too much for a laptop.", "I understand — we do have more budget-friendly options too.", "n3")},
            "n3": {"bot": "Would you like to add an extended two-year warranty for 40 dollars?",
                   "options": _opts(
                       "Sure, that sounds worth it for peace of mind.", "Good call, I'll add that to your order.", "n4",
                       "I'll pass on that, thanks.", "No problem at all.", "n4",
                       "No, that's just a scam to get more money.", "I understand the hesitation — it's completely optional.", "n4")},
            "n4": {"bot": "Great, I'll ring that up for you. How would you like to pay?",
                   "options": _opts(
                       "Card, please.", "Perfect, here's the reader.", None,
                       "Cash.", "Sure, that works.", None,
                       "Card, obviously.", "Right this way.", None)},
        },
    },
    "bargaining": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Welcome, welcome! This rug is handmade, very special — 200 dollars for you.",
                   "options": _opts(
                       "It's beautiful, but that's a bit more than I was hoping to pay. Could you do 140?", "You drive a hard bargain! How about 170?", "n2",
                       "That seems expensive, can you lower the price?", "For you, I can do 180.", "n2",
                       "200? No way, that's robbery.", "It's handmade, good quality — but let's talk, what's your offer?", "n2")},
            "n2": {"bot": "I can really only go down to 160, it's genuinely good quality.",
                   "options": _opts(
                       "Alright, 160 works for me, thank you.", "Wonderful, let me wrap that up for you.", "n3",
                       "Could we meet at 150?", "Okay, 150, just for you, final price.", "n3",
                       "Still too much, forget it.", "Wait, wait — let's find a price that works for both of us.", "n3")},
            "n3": {"bot": "Deal! Would you like it wrapped, or are you carrying it as is?",
                   "options": _opts(
                       "Wrapped would be great, thank you.", "Of course, one moment.", None,
                       "No need, I'll just carry it.", "No problem at all.", None,
                       "Just hurry, I have somewhere to be.", "Right away.", None)},
        },
    },
    "grocery_shopping": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, can I help you find anything today?",
                   "options": _opts(
                       "Hi, yes — do you know which aisle has olive oil?", "Sure, that's in aisle 5, with the other oils.", "n2",
                       "I'm looking for olive oil, not sure where it is.", "It's in aisle 5, near the cooking oils.", "n2",
                       "Where's the oil? I've been looking forever.", "Sorry about that, it's in aisle 5.", "n2")},
            "n2": {"bot": "Anything else I can help you track down?",
                   "options": _opts(
                       "Actually yes, do you have any fresh basil today?", "We do, it's in the produce section near the herbs.", "n3",
                       "Maybe, is there fresh basil somewhere?", "Yes, over in the produce section.", "n3",
                       "No, I'll find the rest myself.", "Sounds good, let me know if you need anything.", "n3")},
            "n3": {"bot": "Great, anything else, or are you all set?",
                   "options": _opts(
                       "That's everything, thank you so much for your help!", "You're very welcome, have a great day!", None,
                       "That's all, thanks.", "Take care.", None,
                       "That's it.", "Alright, have a good one.", None)},
        },
    },
    "order_tracking": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, thanks for contacting support. How can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to check the status of my order, number 48213.", "Let me pull that up for you right away.", "n2",
                       "My order hasn't arrived yet and I'm not sure why.", "I'm sorry about that, could I get your order number?", "n2",
                       "Where is my order? It's been forever.", "I understand the frustration, let me look into it — order number, please?", "n2")},
            "n2": {"bot": "I see it here — it shipped two days ago and is currently out for delivery, expected today.",
                   "options": _opts(
                       "Oh great, thank you for checking!", "You're welcome, it should arrive by this evening.", "n3",
                       "Okay, I hope it actually shows up today.", "It's scheduled for today, I'll keep an eye on it too.", "n3",
                       "It better arrive today, this is ridiculous.", "I completely understand, it is on track for today.", "n3")},
            "n3": {"bot": "Is there anything else I can help you with?",
                   "options": _opts(
                       "No, that's all, thank you for your help!", "You're welcome, have a great day!", None,
                       "No, that's everything.", "Take care.", None,
                       "No. Just make sure it arrives.", "We'll do our best.", None)},
        },
    },
    "gift_advice": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi there, looking for something special today?",
                   "options": _opts(
                       "Hi, I need a birthday gift for my sister, she loves reading and tea.", "That's sweet, I have a few ideas for that combination.", "n2",
                       "I need a gift but I have no idea what to get.", "No worries, who's it for and what do they enjoy?", "n2",
                       "Just give me something, anything that counts as a gift.", "Sure, do you have a budget or a recipient in mind?", "n2")},
            "n2": {"bot": "We have a lovely gift set with a novel, a scented candle, and a tea sampler — very popular for readers.",
                   "options": _opts(
                       "That sounds perfect, how much is it?", "It's 45 dollars, and it comes nicely boxed already.", "n3",
                       "That could work, is there anything a bit cheaper?", "There's a smaller version with just the tea and candle for 25.", "n3",
                       "I don't know, just pick one for me.", "I'd go with the full gift set, it's a safe and lovely choice.", "n3")},
            "n3": {"bot": "Would you like me to add a gift card or a handwritten note card as well?",
                   "options": _opts(
                       "A note card would be lovely, thank you.", "Of course, I'll include one at no extra charge.", None,
                       "No, that's okay, just the gift.", "No problem at all.", None,
                       "No, just wrap it already.", "Right away.", None)},
        },
    },
    "post_package": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to send this package to Istanbul, please.", "Sure, let's get it weighed and measured.", "n2",
                       "I need to mail this package.", "No problem, where is it headed?", "n2",
                       "I need to send this, how much will it cost?", "Let's weigh it first and I'll give you a price.", "n2")},
            "n2": {"bot": "That'll be 2 kilos. Would you like standard or express shipping?",
                   "options": _opts(
                       "Standard is fine, no rush.", "Great, that'll be 25 lira, arriving in 3-5 days.", "n3",
                       "What's the price difference for express?", "Express is 45 lira and arrives in 1-2 days.", "n3",
                       "Just whatever's cheapest.", "Standard shipping is the most affordable option.", "n3")},
            "n3": {"bot": "Would you like to add tracking and insurance for an extra 5 lira?",
                   "options": _opts(
                       "Yes, please, better to be safe.", "Good idea, I'll add that now.", "n4",
                       "No, that's alright, I'll skip it.", "No problem, your total is 25 lira.", "n4",
                       "No, don't try to upsell me more things.", "Understood, just the standard shipping then.", "n4")},
            "n4": {"bot": "All done — here's your receipt and tracking number. Anything else?",
                   "options": _opts(
                       "No, that's everything, thank you!", "You're welcome, have a great day!", None,
                       "No, that's all.", "Take care.", None,
                       "No. Finally.", "Have a good day.", None)},
        },
    },
    "meeting_roommate": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi! You must be the new roommate — I'm Sarah. Nice to finally meet you!",
                   "options": _opts(
                       "Hi Sarah, nice to meet you too! I'm really happy to be moving in.", "That's great to hear, I think we'll get along well.", "n2",
                       "Hi, yeah, that's me. Nice to meet you.", "Likewise! Let me know if you have any questions about the place.", "n2",
                       "Yeah, hi. Where's my room?", "Right this way, I'll show you around.", "n2")},
            "n2": {"bot": "So, I usually do the dishes right after dinner and keep the kitchen tidy. How do you like to handle chores?",
                   "options": _opts(
                       "That sounds great, I'm happy to split chores however works for both of us.", "Perfect, maybe we can alternate weeks for the bigger cleaning?", "n3",
                       "I'm pretty relaxed about it, I'll just try to keep things clean.", "Sounds good, we can figure out details as we go.", "n3",
                       "I'm not really into chores, to be honest.", "That's okay, we can talk about finding a system that works for both of us.", "n3")},
            "n3": {"bot": "Sounds good. Do you have any questions about the apartment or the building?",
                   "options": _opts(
                       "Just one — is there a laundry room in the building?", "Yes, it's in the basement, open 24 hours.", None,
                       "Not really, I think I'm good for now.", "Great, let me know if anything comes up.", None,
                       "No, I'll figure it out myself.", "Alright, I'm around if you need anything.", None)},
        },
    },
    "utility_signup": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, thanks for calling. How can I help you today?",
                   "options": _opts(
                       "Hi, I just moved into a new apartment and need to set up electricity service.", "Congrats on the move! Let's get that set up for you.", "n2",
                       "I need to start electricity at my new place.", "Sure, can I get the address for the new service?", "n2",
                       "I need power turned on, how do I do that?", "I can help with that — what's the address?", "n2")},
            "n2": {"bot": "What's the address, and when would you like the service to start?",
                   "options": _opts(
                       "It's 12 Maple Street, apartment 4. I'd like it to start this Friday.", "Got it, I'll schedule activation for Friday.", "n3",
                       "12 Maple Street. As soon as possible, please.", "I can get you set up by tomorrow, does that work?", "n3",
                       "Some address, I'll send it later, just turn it on quick.", "I'll need the exact address first to process this, I'm afraid.", "n3")},
            "n3": {"bot": "Great, there's a one-time connection fee of 20 dollars. Is that alright?",
                   "options": _opts(
                       "That's fine, I'll pay that.", "Perfect, I'll add it to your first bill.", "n4",
                       "Is there any way to avoid that fee?", "I'm afraid it's standard for new connections.", "n4",
                       "That's an unnecessary fee, this is annoying.", "I understand, it does cover the technician's setup visit.", "n4")},
            "n4": {"bot": "All set — your electricity will be activated on Friday. Anything else I can help with?",
                   "options": _opts(
                       "No, that's everything, thank you!", "You're welcome, have a great day!", None,
                       "No, that's all, thanks.", "Take care.", None,
                       "No. Just make sure it works.", "It will, don't worry.", None)},
        },
    },
    "internet_provider": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, thanks for calling TurkNet support. What can I help you with?",
                   "options": _opts(
                       "Hi, my internet has been really slow for the past two days.", "I'm sorry to hear that, let's troubleshoot it together.", "n2",
                       "My internet isn't working well.", "I can help with that, can you tell me more about the issue?", "n2",
                       "Your internet is terrible, fix it now.", "I understand the frustration, let's see what's going on.", "n2")},
            "n2": {"bot": "Could you try restarting your router and let me know if that helps?",
                   "options": _opts(
                       "Sure, one moment... okay, I've restarted it.", "Great, is the connection looking better now?", "n3",
                       "I already tried that earlier, it didn't help.", "Okay, let's look into the line itself then.", "n3",
                       "I'm not doing that again, I already tried it twice.", "Understood, let's check the connection from our side instead.", "n3")},
            "n3": {"bot": "I see some signal issues on our end. I'll schedule a technician to visit — would tomorrow afternoon work?",
                   "options": _opts(
                       "Yes, tomorrow afternoon works great, thank you.", "Perfect, I'll book that for you now.", "n4",
                       "I guess that works, though I was hoping for sooner.", "I understand, that's the earliest slot we have available.", "n4",
                       "Finally, yes, just send someone already.", "I'll get that scheduled right away.", "n4")},
            "n4": {"bot": "You're all set for tomorrow between 2 and 4 PM. Anything else?",
                   "options": _opts(
                       "No, that's all, thank you for your help.", "You're welcome, sorry for the trouble.", None,
                       "No, that's it.", "Take care.", None,
                       "No, just make sure it's actually fixed this time.", "We'll make sure it's resolved.", None)},
        },
    },
    "neighbor_chat": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Oh, hi there! You're in the apartment next door, right? I don't think we've properly met.",
                   "options": _opts(
                       "Hi! Yes, I just moved in last week. I'm Deniz, nice to meet you.", "Nice to meet you too, Deniz! Welcome to the building.", "n2",
                       "Yeah, that's me. Hi.", "Welcome to the building! Let me know if you need anything.", "n2",
                       "Yeah. Is there a problem?", "No, no problem at all, just wanted to say hello.", "n2")},
            "n2": {"bot": "If you ever need anything, feel free to knock. By the way, trash pickup is Tuesdays and Fridays.",
                   "options": _opts(
                       "That's really kind, thank you! Good to know about the trash schedule too.", "Of course, happy to help a new neighbor.", "n3",
                       "Thanks, good to know.", "No problem at all.", "n3",
                       "Okay, noted.", "Alright then.", "n3")},
            "n3": {"bot": "Well, I should get going, but it was nice meeting you!",
                   "options": _opts(
                       "You too! I'm sure I'll see you around.", "Definitely, take care!", None,
                       "Yeah, see you around.", "Bye now!", None,
                       "Sure, bye.", "Take care.", None)},
        },
    },
    "first_day": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Welcome aboard! I'm Mehmet, the team lead. How are you feeling about your first day?",
                   "options": _opts(
                       "Thanks, I'm excited to get started and meet everyone!", "That's great energy, let's get you settled in.", "n2",
                       "A little nervous, but good overall.", "That's totally normal, we'll take it easy today.", "n2",
                       "Fine, I guess. Where's my desk?", "Right this way, let me show you.", "n2")},
            "n2": {"bot": "This will be your desk. I'll also introduce you to the team in a few minutes. Any questions so far?",
                   "options": _opts(
                       "Just one — who should I go to if I have technical questions?", "You can always ask Ayşe, she's great with that.", "n3",
                       "Not yet, I'll probably have some as the day goes on.", "Of course, feel free to ask anytime.", "n3",
                       "No, let's just get on with it.", "Sure, let's head to the team area then.", "n3")},
            "n3": {"bot": "Great, let's go meet the team. Everyone's looking forward to working with you.",
                   "options": _opts(
                       "Sounds great, I'm looking forward to it too!", "Let's go then.", None,
                       "Okay, sounds good.", "This way.", None,
                       "Alright, let's just get it over with.", "Right, follow me.", None)},
        },
    },
    "meeting_scheduling": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, do you have a few minutes to schedule our project check-in for this week?",
                   "options": _opts(
                       "Sure, I'm free Wednesday afternoon or Thursday morning, whichever works for you.", "Thursday morning works well for me too.", "n2",
                       "I'm pretty busy, but let me check my calendar.", "No rush, whenever you find a slot works.", "n2",
                       "I don't really have time for more meetings this week.", "I understand, could we find even just 20 minutes somewhere?", "n2")},
            "n2": {"bot": "Great, let's say Thursday at 10 AM. Should we book a meeting room or do it online?",
                   "options": _opts(
                       "Let's do it online, it's easier for everyone.", "Sounds good, I'll send a video call link.", "n3",
                       "Either is fine with me.", "I'll book the small meeting room then.", "n3",
                       "I don't care, just send me an invite.", "Will do, I'll set that up now.", "n3")},
            "n3": {"bot": "Perfect, I'll send the calendar invite now. See you Thursday!",
                   "options": _opts(
                       "Great, see you then, looking forward to it!", "Likewise, see you Thursday!", None,
                       "Sounds good, see you then.", "See you then.", None,
                       "Fine, see you.", "Alright.", None)},
        },
    },
    "asking_raise": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, you wanted to talk? Come in, have a seat.",
                   "options": _opts(
                       "Thanks for making time. I wanted to discuss my compensation, given the extra responsibilities I've taken on.", "Of course, I'm happy to hear you out.", "n2",
                       "Yeah, I wanted to talk about maybe getting a raise.", "Sure, tell me more about what's prompting this.", "n2",
                       "I need more money, I feel like I deserve a raise.", "I hear you — can you walk me through why you feel that way?", "n2")},
            "n2": {"bot": "Can you tell me more about what you've accomplished recently that supports this?",
                   "options": _opts(
                       "Sure — I led the Atlas project to completion ahead of schedule and took on mentoring two new hires.", "Those are solid accomplishments, thank you for sharing.", "n3",
                       "I've just been working hard and taking on more tasks lately.", "Can you give me a specific example or two?", "n3",
                       "I don't know, I just work here every day like everyone else.", "I'd love some specifics so I can make a strong case for you.", "n3")},
            "n3": {"bot": "Thank you, this is helpful. I'll need to discuss it with HR, but I'll get back to you within two weeks.",
                   "options": _opts(
                       "That sounds fair, thank you for considering it.", "Of course, I'll follow up soon.", None,
                       "Okay, I'll wait to hear back then.", "I'll be in touch.", None,
                       "Two weeks? That feels like a long time.", "I understand, but I want to handle this properly.", None)},
        },
    },
    "giving_presentation": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Alright everyone, let's begin. Go ahead whenever you're ready.",
                   "options": _opts(
                       "Thank you all for being here. Today I'll walk you through our Q3 results and next steps.", "Great opening, please continue.", "n2",
                       "Okay, um, so I'll just go through the slides now.", "Sure, take your time.", "n2",
                       "Let's just get this over with, here are the numbers.", "Alright, go ahead.", "n2")},
            "n2": {"bot": "A colleague interrupts: \"Sorry, can you clarify that number on slide three?\"",
                   "options": _opts(
                       "Of course — that's our customer retention rate, which rose from 72% to 81% this quarter.", "That's clear, thank you.", "n3",
                       "Sure, let me check... it's the retention number, I believe.", "Okay, thanks for checking.", "n3",
                       "It's on the slide, you can read it.", "Alright, let's move on then.", "n3")},
            "n3": {"bot": "Thanks for clarifying. Please go on with the rest of the presentation.",
                   "options": _opts(
                       "Of course — moving on to our plans for next quarter.", "Great, we're following along well.", "n4",
                       "Okay, next slide then.", "Go ahead.", "n4",
                       "Fine, here's the rest of it quickly.", "Alright, take it at your own pace.", "n4")},
            "n4": {"bot": "Great presentation overall. Any final thoughts before we wrap up?",
                   "options": _opts(
                       "Just that I'm happy to answer any further questions afterward. Thank you all for your attention.", "Thank you, that was very well presented.", None,
                       "No, I think that covers everything.", "Great, thanks for the presentation.", None,
                       "No, that's it, I'm done.", "Alright, thank you.", None)},
        },
    },
    "performance_review": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Thanks for coming in. Overall, you've had a strong year — let's go through some specifics.",
                   "options": _opts(
                       "Thank you, I'd love to hear the details and also share my own perspective.", "Great, let's start with the highlights.", "n2",
                       "Okay, sounds good, go ahead.", "Alright, let's dive in.", "n2",
                       "Sure, just tell me if I'm getting a raise or not.", "We'll get to that, let's review the year first.", "n2")},
            "n2": {"bot": "Your project delivery has been excellent, though communication with other teams could improve. Thoughts?",
                   "options": _opts(
                       "That's fair feedback — I'll make an effort to loop other teams in earlier on projects.", "That's a great attitude, I appreciate that.", "n3",
                       "I see, I didn't realize that was an issue. I'll try to work on it.", "I appreciate you being open to it.", "n3",
                       "I don't think that's really my fault, other teams are hard to reach.", "I understand it's not always easy, but let's find ways to improve it together.", "n3")},
            "n3": {"bot": "Based on this review, I'd like to set a goal around cross-team communication for next quarter. Sound good?",
                   "options": _opts(
                       "Sounds good, I'll come up with a concrete plan for that.", "Perfect, let's check in on it next quarter.", None,
                       "Okay, I'll try my best with that.", "That's all I ask.", None,
                       "Fine, if that's what you want.", "I appreciate you hearing me out.", None)},
        },
    },
    "resignation_talk": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "You wanted to speak with me? What's on your mind?",
                   "options": _opts(
                       "Yes — I wanted to let you know I've accepted another offer and will be resigning.", "I see, thank you for telling me directly. Can we talk about your timeline?", "n2",
                       "I'm thinking of leaving the company, I got another offer.", "I appreciate you sharing that. When were you thinking of leaving?", "n2",
                       "I quit. I'm done with this job.", "I'm sorry to hear you feel that way — can we talk about what's going on?", "n2")},
            "n2": {"bot": "I understand. What would work for your notice period — the standard two weeks?",
                   "options": _opts(
                       "Two weeks works for me, and I'm happy to help hand off my projects.", "That's very considerate, thank you.", "n3",
                       "I was hoping for one week, if that's possible.", "Let's see what we can arrange, I appreciate the heads up either way.", "n3",
                       "I don't really care about the notice period, I just want to leave.", "I understand, but a smooth handoff would really help the team.", "n3")},
            "n3": {"bot": "Thank you for being professional about this. We'll miss you, and I wish you the best in the new role.",
                   "options": _opts(
                       "Thank you, I've really valued my time here and I'll make sure the transition goes smoothly.", "That means a lot, thank you.", None,
                       "Thanks, I appreciate that.", "Take care.", None,
                       "Yeah, thanks, I guess.", "Good luck out there.", None)},
        },
    },
    "teacher_parent_meeting": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Thanks for coming in. Overall, your son is doing well, though I wanted to discuss his math grades.",
                   "options": _opts(
                       "Thank you for letting me know — what do you think is causing the difficulty?", "He seems to struggle most with word problems specifically.", "n2",
                       "Okay, I didn't realize there was an issue. What's going on?", "He's been having trouble with word problems lately.", "n2",
                       "That's strange, he says everything is fine at home.", "I understand, it may not always come up at home — it's mainly word problems.", "n2")},
            "n2": {"bot": "I'd recommend maybe 15-20 minutes of extra practice at home a few times a week. Would that be possible?",
                   "options": _opts(
                       "Absolutely, I can sit with him in the evenings to go through some problems.", "That would really help, thank you for being supportive.", "n3",
                       "I can try, though our evenings are pretty busy.", "Even a little consistent practice can make a difference.", "n3",
                       "I don't really have time for that, isn't that your job?", "I understand it's a lot, but a little home support really does help.", "n3")},
            "n3": {"bot": "I'll also send home some extra worksheets. Let's check in again in a month to see how he's doing.",
                   "options": _opts(
                       "That sounds great, thank you for working with us on this.", "Of course, we're a team in this.", None,
                       "Okay, we'll check back in then.", "Sounds good.", None,
                       "Fine, I hope this actually helps.", "I believe it will, with some consistency.", None)},
        },
    },
    "group_project_planning": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Okay team, we need to divide up the research project. Any thoughts on how to split the work?",
                   "options": _opts(
                       "I think we should split it by topic — I'm happy to take the introduction and background section.", "That works for me, I'll take the data analysis part then.", "n2",
                       "I'm not sure, maybe we just split it evenly somehow?", "Sure, let's figure out sections and assign them.", "n2",
                       "I don't really care, just tell me what to do.", "Alright, how about you take the background section?", "n2")},
            "n2": {"bot": "Great, and when should we meet again to combine everything?",
                   "options": _opts(
                       "How about this Thursday evening, so everyone has time to finish their part?", "Thursday works for me too.", "n3",
                       "Whenever works for everyone, I'm flexible.", "Let's say Thursday evening then.", "n3",
                       "I don't know, whenever, just don't make it too soon.", "Alright, let's aim for Thursday to be safe.", "n3")},
            "n3": {"bot": "Sounds good. Let's also share a document so we can see each other's progress. Does that work?",
                   "options": _opts(
                       "Perfect, I'll set up a shared document right now.", "Great, thanks for setting that up.", None,
                       "Sure, that should be fine.", "Alright, sounds good.", None,
                       "I guess, if it's really necessary.", "It'll help us stay organized, I think.", None)},
        },
    },
    "enrollment_library": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome to the student services desk. How can I help you?",
                   "options": _opts(
                       "Hi, I just enrolled and need to get my student ID and library card set up.", "Great, let's get you registered — do you have your enrollment confirmation?", "n2",
                       "I need to get set up as a new student, not sure what I need.", "No problem, do you have your enrollment confirmation with you?", "n2",
                       "I need a student ID, just give me one.", "I can help with that — do you have your enrollment confirmation?", "n2")},
            "n2": {"bot": "Here you go. Let me take your photo for the ID card now, is that alright?",
                   "options": _opts(
                       "Sure, go ahead, I'm ready.", "Great, hold still for a moment.", "n3",
                       "Okay, I guess so, do I look okay?", "You look fine, this will just take a second.", "n3",
                       "Fine, just make it quick.", "One moment, almost done.", "n3")},
            "n3": {"bot": "Perfect, here's your student ID. It also works as your library card. Anything else you need?",
                   "options": _opts(
                       "Just one thing — how many books can I borrow at a time with this?", "You can borrow up to five books for three weeks.", None,
                       "No, I think that's everything, thanks.", "Great, welcome to the university!", None,
                       "No, that's it.", "Alright, welcome aboard.", None)},
        },
    },
    "course_selection_advice": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, I understand you wanted some advice on course selection for next semester?",
                   "options": _opts(
                       "Yes, I'm interested in data science but not sure which electives to pick.", "Great field — let's look at a few electives that complement that path.", "n2",
                       "Yeah, I'm not totally sure what I want to take.", "That's okay, what subjects have you enjoyed so far?", "n2",
                       "I just need you to tell me what to pick.", "I can guide you, but it helps to know your interests first — any subjects you enjoy?", "n2")},
            "n2": {"bot": "I'd suggest Statistics II and an Intro to Machine Learning course — both pair well with data science.",
                   "options": _opts(
                       "That sounds perfect, how many credits are those together?", "Together that's 8 credits, which fits well with a full course load.", "n3",
                       "Okay, are those difficult courses?", "They're challenging but manageable with consistent study.", "n3",
                       "I don't know, those sound hard, are there easier options?", "There are lighter options, but these would serve your goals best long-term.", "n3")},
            "n3": {"bot": "Would you like me to go ahead and register you for these, or do you want to think it over?",
                   "options": _opts(
                       "Let's go ahead and register me for both, thank you!", "Great, I'll process that now.", None,
                       "I'll think it over and come back tomorrow.", "Sounds good, take your time.", None,
                       "I don't know, just pick for me.", "I'll register you for these two then.", None)},
        },
    },
    "exchange_program_interview": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Thanks for coming in. Why are you interested in the exchange program in Spain?",
                   "options": _opts(
                       "I'd love to improve my Spanish and experience a new academic environment firsthand.", "That's a great motivation, very clear.", "n2",
                       "I just think it would be a nice experience to live abroad.", "That's understandable, can you tell me more about your academic goals there?", "n2",
                       "I don't know, it just sounded fun.", "I see — can you tell me more about what you hope to gain academically?", "n2")},
            "n2": {"bot": "How do you think you'll handle being far from family and adapting to a new culture?",
                   "options": _opts(
                       "I've traveled alone before and I'm confident I can adapt, though I'll stay in touch with family regularly.", "That's reassuring, good self-awareness.", "n3",
                       "I think it'll be an adjustment, but I'm willing to try my best.", "That's a healthy attitude to have.", "n3",
                       "I haven't really thought about that part.", "It's worth considering, since it's a big part of the experience.", "n3")},
            "n3": {"bot": "Thank you, that's helpful. We'll review your application and let you know within two weeks.",
                   "options": _opts(
                       "Thank you so much for your time, I really appreciate the opportunity.", "Of course, good luck!", None,
                       "Okay, thank you.", "You're welcome.", None,
                       "Alright, I'll wait then.", "We'll be in touch.", None)},
        },
    },
    "enrolling_self_university": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, how can I help you with enrollment today?",
                   "options": _opts(
                       "Hi, I'd like to enroll in the computer science program for the fall semester.", "Great, let's get your application started.", "n2",
                       "I want to sign up for classes, I'm new here.", "Sure, which program are you interested in?", "n2",
                       "I need to enroll, what do I do?", "I can help — which program would you like to join?", "n2")},
            "n2": {"bot": "I'll need your high school transcript and a copy of your ID. Do you have those with you?",
                   "options": _opts(
                       "Yes, here's my transcript and ID.", "Perfect, everything looks complete.", "n3",
                       "I have my ID, but my transcript is being sent by mail.", "That's fine, we can start the process and add it once it arrives.", "n3",
                       "I don't have any of that with me today.", "No problem, you can bring those by next week to complete it.", "n3")},
            "n3": {"bot": "Great, there's also an application fee of 50 dollars. Would you like to pay now or later?",
                   "options": _opts(
                       "I'll pay now, that's easier.", "Great, here's the payment terminal.", "n4",
                       "Can I pay later this week instead?", "Sure, just make sure it's settled before classes start.", "n4",
                       "Another fee? This is getting expensive.", "I understand, it's a one-time application fee only.", "n4")},
            "n4": {"bot": "All done! You'll receive your official acceptance letter by email within a week.",
                   "options": _opts(
                       "Thank you so much, I'm really excited to start!", "We're excited to have you, congratulations!", None,
                       "Okay, thanks.", "You're welcome.", None,
                       "Finally, thanks.", "Welcome aboard.", None)},
        },
    },
    "diploma_recognition": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I assist you today?",
                   "options": _opts(
                       "Hi, I'd like to get my foreign engineering diploma recognized here.", "Of course, let's go through the required documents.", "n2",
                       "I need my diploma from abroad approved somehow.", "I can help with that, what degree and country is it from?", "n2",
                       "I need my diploma to count here, what's the process?", "Let's start with what degree and from which country.", "n2")},
            "n2": {"bot": "You'll need the original diploma, an official transcript, and a certified translation. Do you have all of these?",
                   "options": _opts(
                       "Yes, I have all three documents with me, certified and translated.", "Excellent, that will make this much faster.", "n3",
                       "I have the diploma and transcript, but not the certified translation yet.", "That's alright, you can submit that once it's ready.", "n3",
                       "I just have the diploma, is that not enough?", "Unfortunately we do need the transcript and translation too, I'm afraid.", "n3")},
            "n3": {"bot": "The evaluation process usually takes about six to eight weeks. I'll register your application now.",
                   "options": _opts(
                       "That's good to know, thank you for explaining the process.", "Of course, you'll get updates by email.", None,
                       "Okay, six to eight weeks, got it.", "Yes, we'll notify you once it's done.", None,
                       "That's way too long for something like this.", "I understand, it does involve a thorough review process.", None)},
        },
    },
    "scholarship_application": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, I understand you're interested in applying for the merit scholarship?",
                   "options": _opts(
                       "Yes, I have a strong academic record and I'm involved in several extracurricular activities.", "That's great, let's go over the requirements together.", "n2",
                       "Yes, I'd like to apply, but I'm not sure if I qualify.", "No problem, let's check the requirements together.", "n2",
                       "Yeah, I need money for school, does it matter what I've done?", "The scholarship does consider academic and extracurricular achievements, yes.", "n2")},
            "n2": {"bot": "You'll need your transcript, two recommendation letters, and a personal essay. Do you have these ready?",
                   "options": _opts(
                       "I have my transcript ready, and I'm working on the letters and essay now.", "That's a great start, when do you expect to finish them?", "n3",
                       "I have the transcript, but I need help with the essay.", "I can point you toward some writing resources for that.", "n3",
                       "I don't have any of that prepared yet.", "No problem, the deadline is in a month, so there's still time.", "n3")},
            "n3": {"bot": "The deadline for all materials is in four weeks. Is there anything else I can help clarify?",
                   "options": _opts(
                       "No, that's really helpful, thank you so much for your time.", "You're very welcome, good luck with your application!", None,
                       "No, I think I understand the process now.", "Great, best of luck.", None,
                       "No, I guess I'll figure out the rest.", "Feel free to reach out if you need anything.", None)},
        },
    },
    "party_smalltalk": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, I don't think we've met — I'm Lucas, a friend of the host.",
                   "options": _opts(
                       "Hi Lucas, I'm Elif! I work with Maya, that's how I know her.", "Nice to meet you, Elif! How do you two know each other?", "n2",
                       "Hi, I'm Elif, nice to meet you.", "Nice to meet you too! How do you know the host?", "n2",
                       "Hey. Nice party, I guess.", "Yeah, it's pretty good so far. How do you know the host?", "n2")},
            "n2": {"bot": "That's cool, small world! So, what do you do for work?",
                   "options": _opts(
                       "I'm a graphic designer, I actually just started a new job last month.", "That's exciting, congrats on the new job!", "n3",
                       "I work in marketing, nothing too exciting.", "That sounds interesting regardless, what kind of marketing?", "n3",
                       "I'd rather not talk about work, honestly.", "Fair enough, so what do you like to do outside of work then?", "n3")},
            "n3": {"bot": "Nice! Well, I'm going to grab another drink — great talking to you!",
                   "options": _opts(
                       "You too, enjoy the rest of the party!", "Thanks, you too!", None,
                       "Okay, see you around.", "See you!", None,
                       "Sure, whatever.", "Alright, bye.", None)},
        },
    },
    "catching_up_old_friend": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Wait, is that you?! Oh my gosh, it's been years! How have you been?",
                   "options": _opts(
                       "I can't believe it's you! I've been great, just got a new job actually. How about you?", "That's amazing, congrats! I've been good too, just busy with life.", "n2",
                       "Oh wow, hi! I've been okay, just keeping busy. You?", "Same here, just the usual busy life. Good to see you though!", "n2",
                       "Oh. Hey. It has been a while.", "Yeah, it really has. How's everything going?", "n2")},
            "n2": {"bot": "We should really catch up properly — are you free for coffee sometime this week?",
                   "options": _opts(
                       "Absolutely, I'd love that! How about Thursday afternoon?", "Thursday works perfectly for me.", "n3",
                       "I think so, let me check my schedule and text you.", "Sounds good, I'll wait to hear from you.", "n3",
                       "Maybe, I'm pretty busy these days.", "No worries, whenever you have time works.", "n3")},
            "n3": {"bot": "Great, I'll text you to confirm the details. It was so good running into you!",
                   "options": _opts(
                       "You too! I'm really happy we ran into each other.", "Me too, talk soon!", None,
                       "Yeah, good seeing you.", "Likewise, take care!", None,
                       "Yeah, sure, bye.", "Bye then.", None)},
        },
    },
    "weekend_plans": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, any plans for the weekend? A few of us are thinking of going hiking Saturday.",
                   "options": _opts(
                       "That sounds fun, count me in! What time are you thinking?", "Great, probably around 9 AM, we'll meet at the trailhead.", "n2",
                       "Maybe, I'm not sure yet, what trail are you doing?", "We're thinking the lake trail, it's a nice moderate hike.", "n2",
                       "I don't really like hiking, to be honest.", "No worries, we could also just grab lunch another time.", "n2")},
            "n2": {"bot": "Sounds good. Do you want to carpool, or meet us there?",
                   "options": _opts(
                       "I can carpool, that'd be easier for me.", "Perfect, I'll pick you up around 8:30 then.", "n3",
                       "I'll probably just meet you there, if that's okay.", "That works fine too.", "n3",
                       "I don't know yet, I'll figure it out later.", "No problem, just let us know closer to the day.", "n3")},
            "n3": {"bot": "Great, see you Saturday then! Should be a fun day.",
                   "options": _opts(
                       "Can't wait, see you then!", "See you Saturday!", None,
                       "Okay, see you then.", "Sounds good.", None,
                       "Sure, whatever.", "Alright, see you.", None)},
        },
    },
    "invitation_response": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, I'm having a small dinner party next Friday — would you like to come?",
                   "options": _opts(
                       "I'd love to! Is there anything I can bring?", "That's so sweet, maybe just a dessert if you want.", "n2",
                       "That sounds nice, what time should I come?", "Around 7 PM would be great.", "n2",
                       "I'm not sure, I might be busy that day.", "No worries, let me know once you check your schedule.", "n2")},
            "n2": {"bot": "Great, I'll see you at 7 then. Is there anything you can't eat, by the way?",
                   "options": _opts(
                       "Just a heads up, I don't eat red meat, but everything else is fine.", "Good to know, I'll plan the menu around that.", "n3",
                       "No, I eat pretty much everything.", "Perfect, that makes planning easier.", "n3",
                       "Why does that matter, just cook whatever.", "I just want to make sure everyone enjoys the food.", "n3")},
            "n3": {"bot": "Perfect, looking forward to seeing you Friday!",
                   "options": _opts(
                       "Me too, thank you so much for inviting me!", "Of course, see you then!", None,
                       "Yeah, see you then.", "See you!", None,
                       "Sure, bye.", "Bye.", None)},
        },
    },
    "first_date": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi! It's so nice to finally meet you in person — you look great!",
                   "options": _opts(
                       "Thank you, you too! I'm a little nervous but excited to be here.", "That's totally understandable, I'm a bit nervous too, honestly.", "n2",
                       "Thanks, nice to meet you too.", "Likewise, shall we grab a table?", "n2",
                       "Yeah, hi. Can we just sit down?", "Sure, right this way.", "n2")},
            "n2": {"bot": "So, tell me a bit about yourself — what do you like to do for fun?",
                   "options": _opts(
                       "I love painting and hiking on weekends, it really helps me unwind. What about you?", "That sounds lovely, I actually enjoy hiking too!", "n3",
                       "Not much really, just normal stuff like watching shows.", "That's relatable, any shows you're into lately?", "n3",
                       "I don't know, I don't really do much.", "That's alright, we can just enjoy dinner then.", "n3")},
            "n3": {"bot": "This has been really nice. Would you like to do this again sometime?",
                   "options": _opts(
                       "I'd really like that, yes. This was a lovely evening.", "I'm so glad, I had a great time too!", None,
                       "Sure, maybe, let's see.", "Sounds good either way.", None,
                       "I don't know, maybe.", "No worries, it was nice meeting you regardless.", None)},
        },
    },
    "local_event_invite": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, there's a street food festival downtown this Saturday — want to check it out with us?",
                   "options": _opts(
                       "That sounds amazing, I love food festivals! What time are you all going?", "We're planning to head over around noon.", "n2",
                       "Maybe, I haven't heard of it, is it worth going?", "It's supposed to be really good this year, lots of vendors.", "n2",
                       "I don't know, those things are usually too crowded.", "It can get busy, but it's usually worth it for the food.", "n2")},
            "n2": {"bot": "Great, should we meet at the entrance around noon, or do you want to meet somewhere first?",
                   "options": _opts(
                       "Let's meet at the entrance at noon, that works for me.", "Perfect, see you there!", "n3",
                       "Maybe we meet at the train station first and walk over together?", "Good idea, let's do that instead.", "n3",
                       "I'll just show up whenever, don't wait for me.", "Alright, we'll be near the entrance if you want to find us.", "n3")},
            "n3": {"bot": "Sounds good, looking forward to it! See you Saturday.",
                   "options": _opts(
                       "Can't wait, see you then!", "See you Saturday!", None,
                       "Okay, see you then.", "Sounds good.", None,
                       "Sure, bye.", "Bye.", None)},
        },
    },
    "etiquette_question": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, quick question — is it normal here to bring a gift when visiting someone's house for dinner?",
                   "options": _opts(
                       "That's a great question — yes, it's common to bring something small like wine or dessert.", "Oh good, that's helpful to know, thank you!", "n2",
                       "I think so, usually something small like flowers or wine.", "Okay, I'll keep that in mind, thanks!", "n2",
                       "I don't really know, I'm new here too.", "No worries, maybe we can look it up together.", "n2")},
            "n2": {"bot": "Good to know. Is it rude to be a few minutes late, or should I try to be exactly on time?",
                   "options": _opts(
                       "Being five or ten minutes late is usually totally fine and even expected.", "That's reassuring, thanks for explaining!", "n3",
                       "I think being on time is generally safer, to be honest.", "Makes sense, I'll aim for that then.", "n3",
                       "I have no idea, just show up whenever feels right.", "Alright, I'll just aim for around the invited time then.", "n3")},
            "n3": {"bot": "Thanks so much, this really helps me feel more prepared!",
                   "options": _opts(
                       "Of course, happy to help! You'll do great.", "Thank you, that means a lot!", None,
                       "No problem.", "Thanks.", None,
                       "Sure, whatever helps.", "Okay, thanks anyway.", None)},
        },
    },
    "calling_relative": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello? Oh, it's so nice to hear from you! How have you been?",
                   "options": _opts(
                       "Hi Grandma! I've been good, just busy with work. How are you doing?", "Oh, I'm doing fine, just the usual aches, but I'm managing.", "n2",
                       "Hi, I've been okay. How about you?", "I'm alright, just taking it day by day.", "n2",
                       "Hey, fine I guess. Listen, I can't talk long.", "Oh, okay, well, I'm doing alright.", "n2")},
            "n2": {"bot": "I've missed you — when are you coming to visit again?",
                   "options": _opts(
                       "I'm actually planning to visit next month, I can't wait to see you!", "Oh, that makes me so happy to hear!", "n3",
                       "I'm not sure yet, but I'll try to come soon.", "I understand, just don't wait too long, dear.", "n3",
                       "I don't know, I've been really busy lately.", "I understand, work keeps everyone busy these days.", "n3")},
            "n3": {"bot": "Well, take care of yourself, and call me again soon, okay?",
                   "options": _opts(
                       "I will, I promise. I love you, take care!", "I love you too, dear. Bye for now.", None,
                       "Okay, I will. Bye for now.", "Bye now, take care.", None,
                       "Yeah, sure, bye.", "Alright, bye.", None)},
        },
    },
    "talking_about_childs_school": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "How was school today? Anything interesting happen?",
                   "options": _opts(
                       "It was good! We had a science experiment and I got picked to help the teacher.", "Wow, that sounds exciting! What was the experiment about?", "n2",
                       "It was okay, nothing too special happened.", "That's fine, any homework for tonight?", "n2",
                       "I don't want to talk about it.", "That's alright, is everything okay though?", "n2")},
            "n2": {"bot": "That's wonderful! Do you have any homework to do tonight?",
                   "options": _opts(
                       "Yes, just a bit of math, I'll start it after dinner.", "Sounds like a good plan, let me know if you need help.", "n3",
                       "A little, I think, I'll check my bag.", "Okay, let me know if you need any help with it.", "n3",
                       "I don't want to do homework today.", "I understand it's tiring, but let's at least look at it together after dinner.", "n3")},
            "n3": {"bot": "Alright, go wash up and we'll have dinner soon.",
                   "options": _opts(
                       "Okay, thanks Mom/Dad!", "Of course, sweetheart.", None,
                       "Okay.", "Alright.", None,
                       "Fine.", "Okay then.", None)},
        },
    },
    "family_meeting_planning": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "So, we need to figure out Grandpa's birthday celebration — any ideas?",
                   "options": _opts(
                       "I was thinking we could do a family dinner at his favorite restaurant, with a small cake after.", "That sounds lovely, I think he'd really enjoy that.", "n2",
                       "Maybe just a small get-together at someone's house?", "That could work too, whose place did you have in mind?", "n2",
                       "I don't know, you all figure it out, I'm busy.", "I understand, we'll try to plan around your schedule too.", "n2")},
            "n2": {"bot": "Good idea. Who's going to handle inviting everyone and booking the restaurant?",
                   "options": _opts(
                       "I can call the restaurant and send out a group message to everyone.", "That would be a huge help, thank you.", "n3",
                       "I can help with part of it, maybe the group message.", "That's great, I'll handle the restaurant booking then.", "n3",
                       "I really don't have time to organize any of that.", "That's okay, we'll figure out who can take it on.", "n3")},
            "n3": {"bot": "Great, let's aim for Saturday evening then. I'll confirm with everyone else.",
                   "options": _opts(
                       "Sounds perfect, thank you for helping plan this!", "Of course, it'll be a lovely celebration.", None,
                       "Okay, sounds good.", "Alright, I'll keep you posted.", None,
                       "Fine, let me know when it's finalized.", "Will do.", None)},
        },
    },
    "dentist": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, come on in and have a seat. What brings you in today?",
                   "options": _opts(
                       "Hi, I've had a sharp pain in my lower right molar for about a week now.", "Let's take a look at that right away.", "n2",
                       "My tooth has been hurting a bit, not sure why.", "Okay, can you point to where it hurts?", "n2",
                       "My tooth hurts, just fix it.", "Of course, let's first see what's going on.", "n2")},
            "n2": {"bot": "I see some decay there. We'll need to do a filling. Would you like local anesthesia for comfort?",
                   "options": _opts(
                       "Yes, please, I'd prefer to be numb for this.", "Of course, I'll apply that now.", "n3",
                       "Is it really necessary? I don't love needles.", "It does make the procedure much more comfortable, but it's your choice.", "n3",
                       "Just do whatever is fastest.", "I'd recommend the anesthesia for your comfort, if that's alright.", "n3")},
            "n3": {"bot": "Alright, the filling is done. You might feel some sensitivity for a day or two. Any questions?",
                   "options": _opts(
                       "Just one — should I avoid any foods for a while?", "I'd avoid very hot or cold foods for the next day.", None,
                       "No, I think that's all, thank you.", "Great, take care of that tooth!", None,
                       "No, finally, that took a while.", "All done now, you're free to go.", None)},
        },
    },
    "describing_symptoms": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good morning, what seems to be the problem today?",
                   "options": _opts(
                       "Good morning, I've had a fever and a sore throat for the past three days.", "I see, any other symptoms like coughing or body aches?", "n2",
                       "I haven't been feeling well, just tired and achy.", "Okay, do you have a fever or any other specific symptoms?", "n2",
                       "I feel sick, just give me some medicine.", "Let's figure out what's going on first, can you describe your symptoms?", "n2")},
            "n2": {"bot": "Any coughing, body aches, or trouble breathing?",
                   "options": _opts(
                       "A mild cough and some body aches, but no trouble breathing.", "That sounds like it could be a viral infection, let's check your temperature.", "n3",
                       "A little bit of a cough, I think.", "Okay, let's take your temperature and listen to your chest.", "n3",
                       "I don't know, I just feel bad overall.", "That's alright, let's run a quick check to see what's going on.", "n3")},
            "n3": {"bot": "Your temperature is slightly elevated. I'll prescribe some rest, fluids, and medication for the fever.",
                   "options": _opts(
                       "Thank you, how long should I expect to feel this way?", "Most likely three to five days with rest.", None,
                       "Okay, thank you for checking.", "Of course, feel better soon.", None,
                       "Fine, I hope this works.", "It should help, just rest and drink plenty of fluids.", None)},
        },
    },
    "emergency_call": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Emergency services, what's your emergency?",
                   "options": _opts(
                       "My neighbor just collapsed and isn't responding, we need an ambulance right away.", "I'm sending an ambulance now, can you give me the address?", "n2",
                       "Someone is hurt, I need help.", "Okay, I'm here to help, what's the address?", "n2",
                       "I don't know, just send someone fast!", "I will, but I need your address first to send help.", "n2")},
            "n2": {"bot": "What's the address, and is the person breathing?",
                   "options": _opts(
                       "We're at 18 Pine Street, and yes, he's breathing but not responding.", "Good, help is on the way, stay with him and keep him comfortable.", "n3",
                       "18 Pine Street. I think he's breathing, I'm not totally sure.", "Try to check gently, and stay on the line with me.", "n3",
                       "I don't know the exact address, somewhere on Pine Street.", "Okay, can you check a nearby building number for me?", "n3")},
            "n3": {"bot": "Help is on the way, arriving in about five minutes. Stay on the line with me until they arrive.",
                   "options": _opts(
                       "Okay, thank you, I'll stay on the line.", "You're doing great, help is almost there.", None,
                       "Okay, I'll wait.", "Stay calm, they're close.", None,
                       "Just hurry, please!", "They're almost there, stay with me.", None)},
        },
    },
    "hospital_reception": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, welcome to City Hospital. How can I help you?",
                   "options": _opts(
                       "Hi, I have an appointment with Dr. Aydın at 2 PM.", "Great, let me check you in, can I see some ID?", "n2",
                       "I'm here for an appointment, not sure of the exact time.", "No problem, what's your name and I'll look it up?", "n2",
                       "I need to see a doctor, where do I go?", "Do you have an appointment, or is this a walk-in?", "n2")},
            "n2": {"bot": "Here's your ID back. Please take a seat in the waiting area, you'll be called shortly.",
                   "options": _opts(
                       "Thank you, do you know roughly how long the wait will be?", "It should be about 15 to 20 minutes.", "n3",
                       "Okay, thank you.", "You're welcome, take a seat over there.", "n3",
                       "Fine, I hope it's not too long.", "It shouldn't be too long, thank you for your patience.", "n3")},
            "n3": {"bot": "The nurse will call your name when it's time. Is there anything else you need?",
                   "options": _opts(
                       "No, that's all, thank you for your help.", "Of course, take care.", None,
                       "No, that's it.", "Alright, have a seat.", None,
                       "No. I'll just wait, I guess.", "We'll call you shortly.", None)},
        },
    },
    "insurance_company": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, thank you for calling HealthFirst Insurance. How can I help?",
                   "options": _opts(
                       "Hi, I had a doctor's visit last week and I'd like to check if it's covered under my plan.", "Sure, can I get your policy number to look into that?", "n2",
                       "I need to know if something is covered by my insurance.", "Of course, what's your policy number?", "n2",
                       "Why wasn't my visit covered? This is frustrating.", "I understand the frustration, let's look into it — could I get your policy number?", "n2")},
            "n2": {"bot": "Thank you. I see the visit here — it looks like it's covered at 80%, with a 20 dollar copay.",
                   "options": _opts(
                       "That's great to hear, thank you for checking.", "You're welcome, is there anything else I can help with?", "n3",
                       "Okay, so I just owe the 20 dollar copay then?", "Exactly, that's all that's outstanding.", "n3",
                       "That doesn't match what I was charged, something's wrong.", "Let me double check the billing details for you then.", "n3")},
            "n3": {"bot": "Is there anything else I can help you with today?",
                   "options": _opts(
                       "No, that's everything, thank you so much!", "You're welcome, have a great day!", None,
                       "No, that's all.", "Take care.", None,
                       "No, just fix the billing issue please.", "We'll sort that out for you.", None)},
        },
    },
    "vet_appointment": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, what seems to be going on with your dog today?",
                   "options": _opts(
                       "Hi, he's been limping on his back leg since yesterday and seems uncomfortable.", "Let's take a look at that leg right away.", "n2",
                       "He's been acting a bit off, maybe limping a little.", "Okay, can you show me which leg?", "n2",
                       "I don't know, he's just acting weird.", "No problem, let's check him over to see what's going on.", "n2")},
            "n2": {"bot": "I don't feel anything broken, likely just a sprain. I'd recommend rest and a mild anti-inflammatory.",
                   "options": _opts(
                       "That's a relief, how long should he rest for?", "About a week of limited activity should help him heal.", "n3",
                       "Okay, how do I give him the medication?", "I'll show you the right dosage before you leave.", "n3",
                       "Are you sure it's not something worse?", "Based on the exam, I'm confident, but we can do an X-ray if you'd like peace of mind.", "n3")},
            "n3": {"bot": "I'll write up the instructions for you. Any other concerns about him today?",
                   "options": _opts(
                       "No, that covers it, thank you so much for taking care of him.", "Of course, he should be back to normal soon.", None,
                       "No, I think that's everything.", "Great, take care of him.", None,
                       "No, just make sure he gets better.", "He should heal up well with some rest.", None)},
        },
    },
    "pet_registration": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I just got a new puppy and need to register him with the city.", "Congratulations! Let's get that set up for you.", "n2",
                       "I need to register my pet, not sure what's needed.", "No problem, is this a dog or a cat?", "n2",
                       "I need to register an animal, what do I do?", "Sure, what kind of pet do you have?", "n2")},
            "n2": {"bot": "Great, I'll need proof of vaccination and a microchip number if he has one. Do you have those?",
                   "options": _opts(
                       "Yes, here's his vaccination record and microchip info.", "Perfect, everything checks out.", "n3",
                       "I have the vaccination record, but he's not microchipped yet.", "That's alright, we recommend getting that done soon though.", "n3",
                       "I don't have any paperwork with me.", "No problem, you can bring it by within the next two weeks.", "n3")},
            "n3": {"bot": "All set, here's his registration tag. There's a small annual renewal fee each year.",
                   "options": _opts(
                       "Great, thank you so much for your help!", "You're welcome, enjoy your new puppy!", None,
                       "Okay, thanks.", "Take care.", None,
                       "Fine, another fee, great.", "It's a small yearly cost, thanks for understanding.", None)},
        },
    },
    "credit_card_issue": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, thank you for calling customer support. How can I help you today?",
                   "options": _opts(
                       "Hi, I noticed a charge on my credit card that I don't recognize.", "I'm sorry to hear that, let's look into it right away.", "n2",
                       "There's a weird charge on my card, can you check it?", "Of course, can you tell me the date and amount?", "n2",
                       "Someone's stealing my money, fix this now!", "I understand your concern, let's investigate this charge immediately.", "n2")},
            "n2": {"bot": "Can you tell me the date and amount of the charge in question?",
                   "options": _opts(
                       "It was on the 14th, for 85 dollars, from a store I've never heard of.", "Thank you, I'll flag that as suspicious and start a dispute.", "n3",
                       "I think it was last week, around 80 dollars maybe.", "That's alright, I'll look at recent transactions around that time.", "n3",
                       "I don't remember exactly, just find it.", "No problem, I'll check your recent transaction history.", "n3")},
            "n3": {"bot": "I found it and I've opened a dispute. We'll also cancel this card and send you a new one for safety.",
                   "options": _opts(
                       "Thank you so much, how long until the new card arrives?", "It usually takes five to seven business days.", "n4",
                       "Okay, that sounds reasonable, thank you.", "You're welcome, we'll keep you updated.", "n4",
                       "Finally, this should have been caught sooner.", "I understand the frustration, we'll make sure this is resolved quickly.", "n4")},
            "n4": {"bot": "Is there anything else I can help you with today?",
                   "options": _opts(
                       "No, that's everything, thank you for your help.", "You're welcome, have a great day!", None,
                       "No, that's all.", "Take care.", None,
                       "No, just get this sorted out.", "We're on it.", None)},
        },
    },
    "passport_visa_application": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to apply for a tourist visa to visit Italy next month.", "Great, let's go over the required documents.", "n2",
                       "I need a visa, not sure what I need for it.", "No problem, which country are you applying for, and for what purpose?", "n2",
                       "I need a visa fast, what do I need to do?", "Let's start with the destination country and purpose of travel.", "n2")},
            "n2": {"bot": "You'll need your passport, a passport photo, proof of accommodation, and travel insurance. Do you have these?",
                   "options": _opts(
                       "Yes, I have all of those ready with me today.", "Perfect, that makes the process much quicker.", "n3",
                       "I have most of it, but I still need travel insurance.", "That's fine, you can submit that once you have it.", "n3",
                       "I just have my passport, nothing else.", "You'll need the other documents too before we can proceed, I'm afraid.", "n3")},
            "n3": {"bot": "Great, there's also a visa processing fee of 60 dollars. Processing usually takes about two weeks.",
                   "options": _opts(
                       "That's fine, I'll pay the fee now, thank you for explaining.", "Of course, here's the payment terminal.", "n4",
                       "Okay, two weeks, I'll keep that in mind.", "Yes, we'll notify you once it's ready.", "n4",
                       "Two weeks? I'm leaving sooner than that.", "I understand, there is an expedited option for an extra fee.", "n4")},
            "n4": {"bot": "All set, your application has been submitted. You'll be notified by email once it's processed.",
                   "options": _opts(
                       "Thank you so much for your help with this!", "You're very welcome, good luck with your trip!", None,
                       "Okay, thank you.", "You're welcome.", None,
                       "Fine, I hope it goes through in time.", "We'll do our best to process it quickly.", None)},
        },
    },
    "police_statement": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, I understand you'd like to report something. What happened?",
                   "options": _opts(
                       "Hi, my bike was stolen from outside my apartment building last night.", "I'm sorry to hear that, let's get the details for a report.", "n2",
                       "My bike got stolen, I'm not sure how it happened.", "Okay, let's go through what you remember.", "n2",
                       "Someone stole my bike, you need to find it now.", "I understand you're upset, let's start with the details so we can look into it.", "n2")},
            "n2": {"bot": "Can you describe the bike and roughly what time you noticed it was missing?",
                   "options": _opts(
                       "It's a blue mountain bike, and I noticed it missing around 8 this morning.", "Thank you, that's helpful. I'll note that down.", "n3",
                       "It's blue, I think, and I noticed it was gone this morning sometime.", "That's alright, any other details you remember would help too.", "n3",
                       "I don't remember the details, I just want it back.", "I understand, any detail at all, even the color, would help us.", "n3")},
            "n3": {"bot": "I've filed the report. Here's your case number for reference. We'll contact you with any updates.",
                   "options": _opts(
                       "Thank you for your help, I appreciate you looking into it.", "Of course, we'll do what we can.", None,
                       "Okay, thank you.", "You're welcome.", None,
                       "I hope you actually find it this time.", "We'll do our best to follow up on this.", None)},
        },
    },
    "tax_office": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, welcome to the tax office. How can I help you today?",
                   "options": _opts(
                       "Hi, I need to get a tax identification number set up since I just moved here.", "Sure, let's get that processed for you.", "n2",
                       "I need some kind of tax number, not totally sure what it's called.", "That would be a tax identification number, let's set that up.", "n2",
                       "I need to deal with some tax stuff, where do I start?", "Let's figure out exactly what you need — are you newly residing here?", "n2")},
            "n2": {"bot": "I'll need your passport or residence permit to process this. Do you have it with you?",
                   "options": _opts(
                       "Yes, here's my passport and residence permit.", "Perfect, I'll process your application now.", "n3",
                       "I have my passport, but my residence permit is still being processed.", "That's alright, the passport should be enough for now.", "n3",
                       "I don't have anything with me right now.", "I'm afraid we do need some form of ID to proceed.", "n3")},
            "n3": {"bot": "All done — here's your tax identification number. You'll need this for banking and employment too.",
                   "options": _opts(
                       "Thank you so much, this is really helpful.", "You're welcome, good luck settling in!", None,
                       "Okay, thank you.", "You're welcome.", None,
                       "Finally, that took a while.", "Glad it's sorted now.", None)},
        },
    },
    "phone_carrier_call": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, thank you for calling MobileConnect. How can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to upgrade my data plan, I keep running out of data each month.", "Sure, let's look at some plans with more data for you.", "n2",
                       "My data runs out too fast, can you help with that?", "Of course, let's find a plan that suits your usage better.", "n2",
                       "Your plans are terrible, I always run out of data.", "I'm sorry to hear that, let's find a better plan for your needs.", "n2")},
            "n2": {"bot": "We have a plan with double the data for just 5 dollars more a month. Would that work?",
                   "options": _opts(
                       "That sounds perfect, let's switch to that plan.", "Great, I'll apply that change right away.", "n3",
                       "Is there anything even bigger, just in case?", "There's an unlimited plan too, for 15 dollars more.", "n3",
                       "5 dollars more? Everything always costs more.", "I understand, this plan should really help avoid the extra charges though.", "n3")},
            "n3": {"bot": "Great, your new plan will take effect starting next billing cycle. Anything else I can help with?",
                   "options": _opts(
                       "No, that's everything, thank you so much!", "You're welcome, have a great day!", None,
                       "No, that's all, thanks.", "Take care.", None,
                       "No, just make sure it works this time.", "It will, don't worry.", None)},
        },
    },
    "faulty_product_complaint": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, thanks for reaching out. What seems to be the issue?",
                   "options": _opts(
                       "Hi, the blender I bought last week stopped working after only a few uses.", "I'm sorry to hear that, let's get this sorted out for you.", "n2",
                       "The blender I bought isn't working right.", "I understand, can you tell me more about what's happening?", "n2",
                       "This blender is garbage, it broke already.", "I'm sorry about that, let's see what we can do to fix this.", "n2")},
            "n2": {"bot": "I understand. Would you prefer a replacement, or a full refund?",
                   "options": _opts(
                       "I'd prefer a replacement, since I still need a working blender.", "No problem, I'll arrange that right away.", "n3",
                       "I think a refund would be simpler for me.", "Understood, I'll process a refund for you.", "n3",
                       "I don't know, just do whatever fixes this.", "I'll go ahead and arrange a replacement, that should be the fastest option.", "n3")},
            "n3": {"bot": "Great, I'll need your order number to process this. Do you have it handy?",
                   "options": _opts(
                       "Yes, it's order number 77215.", "Thank you, I've processed that now.", None,
                       "I'll have to look for it, one moment.", "Take your time, I'll wait.", None,
                       "I don't have it, can't you just look it up?", "I can try with your name and email instead.", None)},
        },
    },
    "app_install_help": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, thanks for calling tech support. What can I help you with today?",
                   "options": _opts(
                       "Hi, I'm trying to install the banking app but it keeps failing halfway through.", "Let's troubleshoot that together, what device are you using?", "n2",
                       "I can't get an app to install properly.", "No problem, which app is it and what device are you using?", "n2",
                       "This app won't install, your software is broken.", "I'm sorry about the trouble, let's see what's going on — which device are you using?", "n2")},
            "n2": {"bot": "Could you try restarting your phone and then attempting the install again?",
                   "options": _opts(
                       "Sure, let me try that now... okay, I restarted it.", "Great, go ahead and try installing again.", "n3",
                       "I already tried that, it still doesn't work.", "Okay, let's check your storage space then.", "n3",
                       "I'm not doing that again, I already tried it.", "Understood, let's try checking your available storage instead.", "n3")},
            "n3": {"bot": "Let's also check if you have enough free storage space — can you check your settings?",
                   "options": _opts(
                       "Sure, I have about 2 GB free, should be enough I think.", "That should be plenty, let's try the install once more.", "n4",
                       "I'm not sure how to check that, can you walk me through it?", "Of course, go to settings, then storage, and it'll show you.", "n4",
                       "I don't know and I don't want to check.", "No problem, let's just try reinstalling it directly then.", "n4")},
            "n4": {"bot": "Great, try the install one more time now and let me know if it goes through.",
                   "options": _opts(
                       "It worked this time, thank you so much for your help!", "Wonderful, glad we got that sorted!", None,
                       "Okay, it seems to be working now.", "Great, let me know if anything else comes up.", None,
                       "It's still not working, this is frustrating.", "Let's try one more thing — I can transfer you to a specialist.", None)},
        },
    },
    "trainer_program": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome in! What are your main fitness goals right now?",
                   "options": _opts(
                       "Hi, I'd like to build some strength and improve my overall endurance.", "Great goals, let's build a program around both.", "n2",
                       "I just want to get in better shape generally.", "That's a good starting point, any specific areas you want to focus on?", "n2",
                       "I don't know, just make me fit somehow.", "No problem, let's start with a balanced general program then.", "n2")},
            "n2": {"bot": "How many days a week can you realistically commit to training?",
                   "options": _opts(
                       "I think three days a week would be realistic for my schedule.", "Perfect, that's a great amount to see solid progress.", "n3",
                       "Maybe two days, I'm pretty busy.", "That's still workable, we'll focus on efficient full-body sessions.", "n3",
                       "I don't know, whenever I feel like it I guess.", "I'd really recommend at least two set days to see real progress.", "n3")},
            "n3": {"bot": "Great, I'll put together a plan for you. Should we start today, or would next week work better?",
                   "options": _opts(
                       "Let's start today if possible, I'm motivated right now!", "Love the energy, let's get started.", None,
                       "Next week would work better for me.", "Sounds good, I'll have your plan ready by then.", None,
                       "I'm not sure, maybe later.", "No rush, just let me know whenever you're ready.", None)},
        },
    },
    "concert_smalltalk": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hey, great spot for the show, right? Have you seen this band before?",
                   "options": _opts(
                       "This is actually my first time seeing them live, I'm really excited! Have you?", "That's awesome, this is actually my third time, they're amazing live!", "n2",
                       "No, not before, but I like their music.", "They're even better live, you're in for a treat!", "n2",
                       "Not really my thing, my friend dragged me here.", "Fair enough, hopefully the show wins you over!", "n2")},
            "n2": {"bot": "Yeah, their live energy is unreal. Which album is your favorite?",
                   "options": _opts(
                       "I really love their last album, the lyrics are so honest and raw.", "Same here, that album is incredible front to back.", "n3",
                       "I mostly just know their popular songs, to be honest.", "That's a good start, their deeper cuts are worth checking out too.", "n3",
                       "I don't really know their albums.", "No worries, tonight's a great way to get into them.", "n3")},
            "n3": {"bot": "Looks like the show's about to start — enjoy the concert!",
                   "options": _opts(
                       "You too, enjoy the show!", "Thanks, you too!", None,
                       "Yeah, you too.", "Enjoy!", None,
                       "Sure, whatever.", "Have fun.", None)},
        },
    },
    "hobby_class": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, welcome to the pottery class! Have you worked with clay before?",
                   "options": _opts(
                       "Hi, this is actually my first time, I'm excited to learn!", "Wonderful, we'll start with the basics then.", "n2",
                       "A little bit, a long time ago, but I don't remember much.", "No problem, we'll do a quick refresher to get you comfortable again.", "n2",
                       "No, and I'm not sure I'll be any good at it.", "That's totally okay, everyone starts somewhere, you'll do fine.", "n2")},
            "n2": {"bot": "Great, let's start with centering the clay on the wheel. Go ahead and give it a try.",
                   "options": _opts(
                       "Okay, I'll give it a try — like this?", "That's a great start, just apply a bit more even pressure.", "n3",
                       "I'm not sure I'm doing this right.", "No worries, let me show you the hand position again.", "n3",
                       "This is harder than it looks, I don't think I can do this.", "It takes practice, let's try it together step by step.", "n3")},
            "n3": {"bot": "There you go, much better! How are you feeling about it so far?",
                   "options": _opts(
                       "I'm actually really enjoying this, thank you for your patience!", "I'm so glad, you're picking it up quickly!", None,
                       "It's okay, I think I'm getting the hang of it.", "You are, keep practicing and it'll feel natural.", None,
                       "I still don't think I'm good at this.", "You're doing better than you think, don't be so hard on yourself.", None)},
        },
    },
    "book_club": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Welcome, glad you could make it! So, what did everyone think of this month's book?",
                   "options": _opts(
                       "I really loved it, especially how the author handled the ending — it surprised me.", "I agree, that twist really caught me off guard too!", "n2",
                       "It was okay, I didn't love it but it was an easy read.", "That's fair, what part didn't work for you?", "n2",
                       "Honestly, I didn't finish it, it didn't grab me.", "That happens sometimes, what part lost your interest?", "n2")},
            "n2": {"bot": "That's interesting. What did you think about the main character's choices throughout the story?",
                   "options": _opts(
                       "I thought she was really well written, flawed but relatable in a lot of ways.", "Totally agree, her growth felt very genuine.", "n3",
                       "I didn't connect with her that much, honestly.", "That's valid, some characters just don't click for everyone.", "n3",
                       "I didn't really pay attention to that part.", "That's okay, maybe the next book will grab you more.", "n3")},
            "n3": {"bot": "Great discussion, everyone! What should we read for next month?",
                   "options": _opts(
                       "I'd love to suggest that mystery novel everyone's been talking about.", "Great suggestion, let's go with that one!", None,
                       "I don't have a strong preference, whatever works for the group.", "Alright, we'll pick something together then.", None,
                       "I don't know, you all decide without me.", "No worries, we'll figure it out as a group.", None)},
        },
    },
    "address_registration": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I just moved into a new apartment and need to register my new address.", "Sure, let's get that updated in the system.", "n2",
                       "I need to update my address, I'm not sure what's required.", "No problem, do you have your lease agreement with you?", "n2",
                       "I need to change my address, what do I do?", "Let's start with your lease agreement, do you have it?", "n2")},
            "n2": {"bot": "I'll need your lease agreement and your ID card. Do you have both with you?",
                   "options": _opts(
                       "Yes, here's my lease and my ID card.", "Perfect, everything looks in order.", "n3",
                       "I have my ID, but my lease is still being finalized.", "That's alright, you can bring the lease once it's signed.", "n3",
                       "I just have my ID, nothing else.", "I'm afraid we do need the lease agreement to complete this.", "n3")},
            "n3": {"bot": "Great, your address has been updated. You'll receive a confirmation letter by mail within two weeks.",
                   "options": _opts(
                       "Thank you so much for your help with this.", "You're very welcome, welcome to the neighborhood!", None,
                       "Okay, thank you.", "You're welcome.", None,
                       "Two weeks? That's a while, but fine.", "It's just the standard mailing time, thank you for your patience.", None)},
        },
    },
    "work_permit": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, I understand you'd like to apply for a work permit. Is that right?",
                   "options": _opts(
                       "Yes, that's right. I have a job offer from a local company and need the permit to start.", "Great, let's go through what's needed for that.", "n2",
                       "Yes, I need a permit to work here, not sure what's required.", "No problem, do you already have a job offer?", "n2",
                       "I need to work here, just tell me what to do.", "Let's start with whether you already have a job offer lined up.", "n2")},
            "n2": {"bot": "I'll need the job offer letter, your passport, and proof of qualifications. Do you have all of these?",
                   "options": _opts(
                       "Yes, I have all three documents ready with me today.", "Excellent, that will speed things up considerably.", "n3",
                       "I have the offer letter and passport, but not my qualification documents yet.", "That's alright, you can add those once you receive them.", "n3",
                       "I just have my passport right now.", "You'll need the other documents too before we can process this, I'm afraid.", "n3")},
            "n3": {"bot": "Great, processing usually takes about four weeks. I'll register your application now.",
                   "options": _opts(
                       "Thank you, that's good to know, I appreciate your help.", "Of course, you'll get updates by email.", None,
                       "Okay, four weeks, got it.", "Yes, we'll notify you once it's ready.", None,
                       "Four weeks is a long time when I need to start working.", "I understand, we do try to process these as quickly as possible.", None)},
        },
    },
    "drivers_license_conversion": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I'd like to convert my foreign driver's license to a local one.", "Sure, let's see what's needed for that conversion.", "n2",
                       "I need to get my foreign license turned into a local one.", "No problem, which country issued your original license?", "n2",
                       "I need a local license, can you just give me one?", "We can convert your existing one — which country is it from?", "n2")},
            "n2": {"bot": "Good, your country has a license exchange agreement, so you won't need to retake the test. I'll need your current license and a translation.",
                   "options": _opts(
                       "Great, here's my license and the certified translation.", "Perfect, everything is in order.", "n3",
                       "I have my license, but I don't have a translation yet.", "That's alright, you can get that done and come back with it.", "n3",
                       "Why do I need a translation, can't you just read it?", "Unfortunately it's required for official processing purposes.", "n3")},
            "n3": {"bot": "Great, there's also a small conversion fee of 30 dollars. Your new license will be ready in about a week.",
                   "options": _opts(
                       "That's fine, I'll pay that now, thank you for explaining the process.", "Of course, here's the payment terminal.", None,
                       "Okay, a week sounds reasonable.", "Great, we'll notify you once it's ready.", None,
                       "Another fee and another wait, this is frustrating.", "I understand, it is a fairly quick process though compared to the full test.", None)},
        },
    },
    "moving_company": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi, thanks for calling Swift Movers. How can we help you today?",
                   "options": _opts(
                       "Hi, I need to move a two-bedroom apartment across town next Saturday.", "Great, let's get some details to give you an accurate quote.", "n2",
                       "I need to move some furniture, not sure how it all works.", "No problem, can you tell me roughly how much you're moving and when?", "n2",
                       "I need movers, just tell me the price.", "I can do that, but I'll need a few details first — how much are you moving?", "n2")},
            "n2": {"bot": "Got it, a two-bedroom move. Do you need packing services as well, or just transport?",
                   "options": _opts(
                       "Just transport is fine, I'll handle the packing myself.", "Great, that keeps the cost lower for you.", "n3",
                       "I might need some help with packing a few fragile items.", "We can send extra packing materials and help with those specifically.", "n3",
                       "I don't know, whatever is easiest for you.", "I'd suggest just transport to keep things simple and affordable.", "n3")},
            "n3": {"bot": "Alright, for a two-bedroom move with transport only, it'll be around 300 dollars. Does Saturday at 9 AM work?",
                   "options": _opts(
                       "That works perfectly, thank you, see you Saturday at 9.", "Great, we'll see you then!", None,
                       "That could work, I'll confirm the time with you closer to the date.", "Sounds good, just let us know.", None,
                       "That seems like a lot for just transport.", "It covers the truck, fuel, and two movers, but I can check if there's a lighter package.", None)},
        },
    },
    "social_security_number": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I just started working here and need to apply for a social security number.", "Great, let's get that application started for you.", "n2",
                       "I need one of those social security numbers, not totally sure how.", "No problem, let's go through what's required.", "n2",
                       "I need that number thing for work, what do I do?", "That would be a social security number — let's get you set up.", "n2")},
            "n2": {"bot": "I'll need your passport or residence permit and your employment contract. Do you have those?",
                   "options": _opts(
                       "Yes, here's my passport and my employment contract.", "Perfect, I'll process your application now.", "n3",
                       "I have my passport, but my contract is still being finalized.", "That's alright, the passport should be enough to start the process.", "n3",
                       "I don't have any of that with me right now.", "I'm afraid we will need at least one of these to proceed.", "n3")},
            "n3": {"bot": "All done — your number will be mailed to your registered address within ten days.",
                   "options": _opts(
                       "Thank you so much, I really appreciate your help.", "You're very welcome, good luck with the new job!", None,
                       "Okay, thank you.", "You're welcome.", None,
                       "Ten days? I need it sooner for payroll.", "I understand, but this is the standard processing time, I'm afraid.", None)},
        },
    },
    "buying_a_car": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hi there, welcome to the dealership! Are you looking for something specific today?",
                   "options": _opts(
                       "Hi, I'm looking for a reliable, fuel-efficient car for daily commuting.", "Great, I have a few sedans that would be perfect for that.", "n2",
                       "Just something reliable, I don't know much about cars.", "No problem, let me show you a few solid, easy options.", "n2",
                       "I don't know, just show me something cheap.", "Sure, let's start with our more budget-friendly models.", "n2")},
            "n2": {"bot": "This sedan here gets great mileage and has a strong safety rating. It's 18,000 dollars. Want to take it for a test drive?",
                   "options": _opts(
                       "Yes, I'd love to test drive it, thank you.", "Great, let me grab the keys for you.", "n3",
                       "Maybe, is there anything a bit cheaper first?", "There's a slightly older model for 15,000 that's also quite reliable.", "n3",
                       "18,000 seems like too much.", "I understand, we do have some more affordable options too.", "n3")},
            "n3": {"bot": "How did the test drive feel? Any thoughts?",
                   "options": _opts(
                       "It drove really smoothly, I think I'd like to move forward with this one.", "Wonderful, let's go over the financing options.", "n4",
                       "It was okay, I want to think about it a bit more.", "Of course, take your time, no pressure at all.", "n4",
                       "I didn't love it, honestly.", "That's alright, let's look at a different model that might suit you better.", "n4")},
            "n4": {"bot": "Would you like to discuss financing options, or are you planning to pay in full?",
                   "options": _opts(
                       "I'd like to hear about financing options, please.", "Sure, we have plans starting at 5% interest over three years.", None,
                       "I'll pay in full, actually.", "Great, that simplifies things, let's get the paperwork ready.", None,
                       "I haven't decided yet, I need more time.", "No rush at all, think it over and come back whenever you're ready.", None)},
        },
    },
    "vehicle_inspection": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, welcome to the inspection center. Here for your annual vehicle inspection?",
                   "options": _opts(
                       "Hi, yes, I'm here for the annual inspection on my car.", "Great, please pull into bay 3 and I'll start the checklist.", "n2",
                       "Yes, I think that's what I need, my registration said it's due.", "That's right, please pull into bay 3 for me.", "n2",
                       "I don't know, I was just told to come here.", "No problem, this is the annual inspection, please pull into bay 3.", "n2")},
            "n2": {"bot": "I'll check your brakes, lights, and emissions now. This should take about 20 minutes.",
                   "options": _opts(
                       "Sounds good, I'll just wait here, thank you.", "Great, I'll let you know as soon as it's done.", "n3",
                       "Okay, is there somewhere I can wait?", "Yes, there's a waiting area right over there.", "n3",
                       "20 minutes? That seems long for a quick check.", "It's a thorough safety check, but we'll be as quick as possible.", "n3")},
            "n3": {"bot": "Good news — everything passed except one brake light that's out. You'll need to fix that within a week.",
                   "options": _opts(
                       "Thank you for letting me know, I'll get that replaced today.", "Great, just bring proof of the fix and you'll be all set.", None,
                       "Okay, I'll try to get it fixed soon.", "Just make sure it's done within the week.", None,
                       "That's such a minor thing, does it really matter?", "It does for road safety, but it's a quick and cheap fix.", None)},
        },
    },
    "contesting_traffic_fine": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Hello, how can I help you today?",
                   "options": _opts(
                       "Hi, I received a parking fine that I believe was issued in error, and I'd like to contest it.", "Sure, let's look at the details of your case.", "n2",
                       "I got a fine I don't think is right, can I dispute it?", "Yes, you can, let's go over the details.", "n2",
                       "This fine is completely wrong, you need to cancel it now.", "I understand your frustration, let's review the details together.", "n2")},
            "n2": {"bot": "Can you explain why you believe the fine was issued incorrectly?",
                   "options": _opts(
                       "I was parked in a valid spot, but the sign indicating restrictions was covered by a tree branch.", "That's a valid point, do you have a photo of that?", "n3",
                       "I think the meter was broken, so it looked like I hadn't paid.", "Okay, do you have any proof of that, like a receipt or photo?", "n3",
                       "I don't know, it's just wrong, cancel it.", "I'll need some evidence or explanation to process a dispute, I'm afraid.", "n3")},
            "n3": {"bot": "Thank you, I'll submit this for review with the evidence you've provided. You'll hear back within two weeks.",
                   "options": _opts(
                       "Thank you so much for looking into this.", "Of course, we'll be in touch with a decision soon.", None,
                       "Okay, I'll wait to hear back then.", "We'll follow up as soon as we can.", None,
                       "Two weeks is a long time to wait for this.", "I understand, but we do want to review each case carefully.", None)},
        },
    },
    "talking_to_traffic_police": {
        "start": "n1",
        "nodes": {
            "n1": {"bot": "Good afternoon, license and registration, please. Do you know why I pulled you over?",
                   "options": _opts(
                       "Good afternoon, here you go. I'm not entirely sure, was I speeding?", "You were going a bit over the limit back there, yes.", "n2",
                       "Here you go. I'm not sure, honestly.", "You were driving a bit over the speed limit.", "n2",
                       "I don't know, I wasn't doing anything wrong.", "You were actually going over the speed limit back there.", "n2")},
            "n2": {"bot": "You were doing 70 in a 50 zone. I'm going to have to issue a citation.",
                   "options": _opts(
                       "I understand, I apologize, I didn't realize I was going that fast.", "I appreciate you understanding, here's your citation with payment details.", "n3",
                       "Okay, I understand, is there anything I need to do next?", "Just follow the instructions on the citation for payment or appeal.", "n3",
                       "That seems really unfair, I wasn't going that fast.", "The radar confirmed the speed, but you can contest it through the proper channels if you'd like.", "n3")},
            "n3": {"bot": "Please drive safely for the rest of your trip. Have a good day.",
                   "options": _opts(
                       "I will, thank you, officer, have a good day too.", "Take care, drive safe.", None,
                       "Okay, thank you.", "You're welcome.", None,
                       "Fine, whatever, bye.", "Drive safely.", None)},
        },
    },
}

assert len(SCENARIO_TREES) == 102
assert all(slug in SCENARIO_META for slug in SCENARIO_TREES)

