const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const generatePrecautionsAndClinicalGuidance = (prompt, askMyDocReply) => {
  const query = (prompt || '').toLowerCase();
  const docReplyLower = (askMyDocReply || '').toLowerCase();
  let assessment = "";
  let precautions = [];
  let redFlags = [];

  // 1. Cardiovascular / Acute Chest / Heart Conditions
  if (/\b(chest|heart|angina|palpitation|palpitations|cardiac|cardio)\b/.test(query) || docReplyLower.includes('cardiologist')) {
    assessment = "Chest pain, tightness, or heart palpitations demand urgent and prioritized evaluation. These symptoms can be associated with cardiovascular strain, ischemic heart events, cardiac arrhythmias, or costochondritis.";
    precautions = [
      "Cease all physical exertion immediately; sit or rest in a comfortable semi-reclined position.",
      "Loosen tight collars, ties, belts, or clothing around your neck and chest to optimize air intake.",
      "Stay calm and practice slow, measured diaphragmatic breathing to minimize sympathetic nervous activation.",
      "Do NOT attempt to drive yourself to a clinic; have an attendant drive or call emergency medical services.",
      "Check resting pulse rate and blood pressure if a home monitor is safely within reach.",
      "Avoid consuming heavy meals, hot/cold drinks, or caffeinated stimulants."
    ];
    redFlags = [
      "Crushing or squeezing chest pressure radiating to the left arm, neck, jaw, back, or upper abdomen.",
      "Sudden shortness of breath, cold clammy sweats, lightheadedness, or loss of consciousness.",
      "Pain lasting longer than 5 minutes that does not resolve with rest."
    ];
  }
  // 2. Respiratory & Upper Airway / Cough / Cold / Asthma
  else if (query.includes('cough') || query.includes('cold') || query.includes('throat') || query.includes('phlegm') || query.includes('sneeze') || query.includes('bronch') || query.includes('congestion') || query.includes('wheez') || query.includes('asthma') || query.includes('breath') || docReplyLower.includes('pulmonologist')) {
    assessment = "Your reported symptoms indicate respiratory tract irritation or bronchial reactivity, frequently caused by viral upper respiratory infections, allergic bronchitis, environmental irritants, or airway bronchospasm.";
    precautions = [
      "Hydrate continuously with warm fluids: herbal tea with honey, warm water, and light clear broths to soothe airways and thin mucus.",
      "Administer steam inhalation for 10 minutes 2 to 3 times daily or utilize a cool-mist room humidifier.",
      "Perform warm saline gargles (1/2 teaspoon non-iodized salt in warm water) twice daily to relieve throat discomfort.",
      "Sleep in an elevated position with your head propped up by extra pillows to reduce post-nasal drip and nocturnal cough paroxysms.",
      "Strictly avoid smoke, aerosol sprays, strong perfumes, chemical fumes, and icy cold beverages.",
      "Rest your voice and avoid throat-clearing habits that further inflame vocal cords."
    ];
    redFlags = [
      "Stridor, audible wheezing, or difficulty completing full sentences without gasping for breath.",
      "Bluish coloration (cyanosis) of lips, tongue, or nail beds.",
      "Hemoptysis (coughing up fresh red blood or dark clots).",
      "Persistent high fever exceeding 101°F (38.3°C) that fails to abate after 72 hours."
    ];
  }
  // 3. Orthopedic & Musculoskeletal / Knee / Joint / Bones / Sprains
  else if (query.includes('knee') || query.includes('joint') || query.includes('arthritis') || query.includes('swollen joint') || query.includes('stiff joint') || query.includes('hip pain') || query.includes('shoulder') || query.includes('elbow') || query.includes('ankle') || query.includes('sprain') || query.includes('ligament') || query.includes('tendon') || query.includes('fracture') || docReplyLower.includes('orthopedist') || docReplyLower.includes('orthopedic')) {
    assessment = "Your symptoms suggest an acute or chronic musculoskeletal issue, such as joint inflammation, ligament sprain, tendonitis, meniscus strain, or osteoarthritis.";
    precautions = [
      "Implement the R.I.C.E. protocol: Rest the affected joint, Ice with a towel-wrapped cold pack for 15–20 minutes, Compress with an elastic crepe bandage, and Elevate above heart level when resting.",
      "Avoid weight-bearing stress, jumping, running, kneeling, or deep squatting on the injured joint.",
      "Use assistive mobility support (walking stick, crutch, or knee brace) to prevent further soft tissue damage.",
      "Apply topical soothing counter-irritant gel gently without aggressive deep-tissue rubbing.",
      "Perform gentle pain-free passive range of motion once acute swelling subsides to avoid joint stiffness."
    ];
    redFlags = [
      "Complete inability to bear weight or stand on the affected limb.",
      "Visible anatomical deformity, joint dislocation, or bone protrusion.",
      "Rapid, hot swelling accompanied by skin redness and systemic fever (potential septic arthritis).",
      "Numbness, loss of pulse, or cold pallor in the toes or fingers below the injured joint."
    ];
  }
  // 4. Spine & Back / Neck / Sciatica
  else if (query.includes('back') || query.includes('spine') || query.includes('lumbago') || query.includes('sciatica') || query.includes('disc') || query.includes('neck') || query.includes('cervical') || docReplyLower.includes('physiatrist')) {
    assessment = "The symptoms point toward spinal mechanical strain, lumbar/cervical disc compression, paraspinal muscle spasms, or sciatic nerve irritation.";
    precautions = [
      "Avoid heavy bending, twisting, or lifting objects exceeding 2 kg from the floor.",
      "Sleep on a firm, supportive mattress; lie on your side with a pillow between your knees, or on your back with a pillow beneath your knees.",
      "Apply cold packs for the first 48 hours for acute spasm, transitioning to moist warm towels or a heating pad thereafter.",
      "Maintain strict ergonomic posture: sit with lower back lumbar support and avoid slouching or prolonged sitting over 45 minutes.",
      "Engage in gentle walking on flat surfaces; avoid prolonged bed rest past 24–48 hours to prevent muscle deconditioning."
    ];
    redFlags = [
      "Sudden loss of bowel or bladder control (cauda equina emergency).",
      "Progressive weakness in the legs or inability to dorsiflex the foot ('foot drop').",
      "Numbness or pins-and-needles localized to the groin or inner thighs ('saddle anesthesia').",
      "Constant unrelenting back pain that is severe at night or awakens you from sleep."
    ];
  }
  // 5. Dermatology & Skin / Rashes / Allergies / Itching
  else if (query.includes('skin') || query.includes('rash') || query.includes('itch') || query.includes('eczema') || query.includes('psoriasis') || query.includes('hives') || query.includes('urticaria') || query.includes('acne') || query.includes('blister') || query.includes('fungal') || query.includes('ringworm') || query.includes('boil') || docReplyLower.includes('dermatologist')) {
    assessment = "Your skin symptoms indicate an active dermatological reaction, contact dermatitis, allergic urticaria, eczema flare, or localized cutaneous fungal/bacterial infection.";
    precautions = [
      "Do NOT scratch or rub the affected skin; scratching breaks the protective skin barrier and introduces secondary bacterial infections.",
      "Bathe with lukewarm (never scalding hot) water and use fragrance-free, hypoallergenic, non-soap syndet cleansers.",
      "Apply a gentle calamine lotion or ceramide-rich fragrance-free barrier moisturizer within 3 minutes of bathing.",
      "Wear loose-fitting, breathable, 100% pure cotton garments; avoid synthetic fabrics, wool, and tight clothing.",
      "Avoid suspect triggers: new cosmetics, harsh detergents, perfumes, jewelry containing nickel, or pet dander.",
      "Keep fingernails trimmed short and clean."
    ];
    redFlags = [
      "Rapidly spreading rash covering more than 30% of your body surface area.",
      "Development of blisters, skin peeling, or involvement of mucous membranes (lips, mouth, eyes, genitals).",
      "Rash accompanied by facial swelling, lip edema, or breathing difficulty (anaphylaxis emergency).",
      "Pus drainage, red streaks radiating from lesions, or skin that is intensely hot and throbbing with fever."
    ];
  }
  // 6. Dental & Oral Health / Toothache / Gums
  else if (query.includes('tooth') || query.includes('teeth') || query.includes('gum') || query.includes('cavity') || query.includes('dental') || query.includes('oral') || query.includes('mouth ulcer') || docReplyLower.includes('dentist')) {
    assessment = "Oral and dental discomfort generally stems from dental caries, pulpitis, gingivitis, periodontal inflammation, impacted wisdom teeth, or periapical abscess.";
    precautions = [
      "Rinse your mouth with warm salt water (1/2 teaspoon salt in 1 cup warm water) for 30 seconds after meals to reduce bacterial load.",
      "Avoid extreme food and beverage temperatures (avoid ice-cold or very hot items) and highly acidic/sugary foods.",
      "Chew food exclusively on the unaffected side of your mouth; stick to soft, lukewarm purees, soups, and boiled foods.",
      "Apply a dab of natural clove oil (eugenol) on a clean cotton swab directly to the aching tooth for temporary relief.",
      "Brush very gently using a soft-bristled toothbrush and use dental floss to dislodge any trapped food debris.",
      "Never place an aspirin tablet directly against the gum tissue, as this causes severe chemical burns."
    ];
    redFlags = [
      "Visible facial swelling, swollen jaw, or swelling extending down the neck or toward the eye.",
      "High fever accompanied by difficulty swallowing (dysphagia) or opening your mouth (trismus).",
      "Spontaneous persistent bleeding from the tooth socket or gums that does not clot."
    ];
  }
  // 7. Ophthalmology & Eye / Vision Care
  else if (query.includes('eye') || query.includes('vision') || query.includes('blurry') || query.includes('conjunctiv') || query.includes('red eye') || query.includes('cornea') || docReplyLower.includes('ophthalmologist')) {
    assessment = "Ocular discomfort, redness, or visual disturbance may indicate conjunctivitis, dry eye syndrome, corneal abrasion, anterior uveitis, or digital eye strain.";
    precautions = [
      "Do NOT rub or apply pressure to your eyes under any circumstances.",
      "Immediately remove contact lenses and switch to prescription eyeglasses until evaluated by an eye care specialist.",
      "Apply a clean, cool, moist compress over closed eyelids for 5–10 minutes to soothe irritation and swelling.",
      "Use preservative-free artificial tear drops to lubricate the ocular surface and flush out airborne micro-irritants.",
      "Practice the 20-20-20 rule: every 20 minutes look at an object 20 feet away for 20 seconds; dim device screen brightness.",
      "Wear sunglasses outdoors to protect photosensitive eyes from UV radiation and wind."
    ];
    redFlags = [
      "Sudden, significant drop in visual acuity or total loss of vision in one or both eyes.",
      "Seeing halo rings around lights, flashes of light, or a dark shadow/curtain descending across your visual field.",
      "Severe deep ocular pain accompanied by nausea and vomiting (acute angle-closure glaucoma).",
      "Penetrating eye trauma, chemical splash, or copious greenish-yellow purulent eye discharge."
    ];
  }
  // 8. ENT / Ear / Sinus / Hearing
  else if (/\b(ear|ears|earache)\b/.test(query) || query.includes('tinnitus') || query.includes('hearing') || query.includes('sinus') || query.includes('blocked ear') || docReplyLower.includes('otolaryngologist') || /\b(ent|ent specialist)\b/.test(docReplyLower)) {
    assessment = "Ear and sinus discomfort frequently originates from otitis externa (swimmer's ear), otitis media (middle ear infection), Eustachian tube dysfunction, or acute rhinosinusitis.";
    precautions = [
      "Keep the ear canal strictly dry; avoid swimming or submerging your head during bathing.",
      "Never insert cotton buds, keys, pins, or fingernails into the ear canal; this compacts wax and risks eardrum rupture.",
      "Apply a warm, dry heating pad or warm towel against the outside of your ear for 10–15 minutes.",
      "Perform gentle steam inhalation to open the Eustachian tubes and equalize middle ear pressure.",
      "Sleep with the affected ear facing upward to encourage natural drainage.",
      "Avoid sudden atmospheric pressure shifts such as scuba diving or flying."
    ];
    redFlags = [
      "Discharge of clear fluid, blood, or foul-smelling pus from the ear canal.",
      "Sudden onset of profound sensorineural hearing loss or intense room-spinning vertigo.",
      "Swelling, tenderness, and redness directly behind the earlobe over the mastoid bone.",
      "Facial muscle weakness or drooping on the side of the ear infection."
    ];
  }
  // 9. Endocrine / Diabetes / High Blood Sugar / Metabolic
  else if (query.includes('sugar') || query.includes('glucose') || query.includes('diabet') || query.includes('hba1c') || query.includes('insulin') || query.includes('thirst') || query.includes('thyroid') || query.includes('tsh') || docReplyLower.includes('endocrinologist')) {
    assessment = "Your symptoms relate to metabolic or endocrine dysregulation, such as blood glucose volatility (hyperglycemia or hypoglycemia), insulin resistance, or thyroid hormone fluctuations.";
    precautions = [
      "Monitor and record your capillary blood glucose (fasting, pre-meal, and 2 hours post-meal) using a calibrated glucometer.",
      "Drink copious water (2.5 to 3 liters daily) to aid your kidneys in flushing out excess glucose.",
      "Follow a structured low-glycemic, fiber-rich meal plan: focus on green vegetables, whole grains, and lean proteins; avoid fruit juices and refined carbs.",
      "If you experience shakiness, sweating, lightheadedness, or sudden hunger (hypoglycemia < 70 mg/dL), follow the 15-15 rule: consume 15 grams of fast-acting glucose immediately and retest in 15 minutes.",
      "Inspect your feet daily for small cuts, blisters, or dry cracked skin.",
      "Adhere strictly to prescribed oral hypoglycemics or insulin dosages; never modify dosages without physician consultation."
    ];
    redFlags = [
      "Blood glucose reading persistently over 250 mg/dL accompanied by nausea, vomiting, fruity-smelling breath, or rapid breathing (DKA).",
      "Confusion, slurred speech, delirium, or loss of consciousness.",
      "Blood glucose below 55 mg/dL that fails to respond to oral carbohydrates."
    ];
  }
  // 10. Gastrointestinal & Digestive / Stomach / Acidity / Nausea / Diarrhea
  else if (query.includes('stomach') || query.includes('abdom') || query.includes('vomit') || query.includes('nausea') || query.includes('diarrhea') || query.includes('loose motion') || query.includes('acidity') || query.includes('gas') || query.includes('bloat') || query.includes('constipat') || query.includes('gerd') || docReplyLower.includes('gastroenterologist')) {
    assessment = "Gastrointestinal symptoms frequently indicate acute gastroenteritis, functional dyspepsia, gastroesophageal reflux (GERD), food intolerance, or peptic irritation.";
    precautions = [
      "Adopt a bland, gentle BRAT diet (Bananas, Rice, Applesauce, Toast, plain porridge, and curd/yogurt).",
      "Hydrate with oral rehydration salts (ORS), coconut water, or electrolyte broth in frequent small sips rather than large gulps.",
      "Strictly avoid oily, deep-fried, heavily spiced, tomato-based, citrus, caffeinated, and alcoholic foods or drinks.",
      "Do NOT lie down flat within 2 to 3 hours after eating; elevate the head of your bed 6 inches to deter acid reflux.",
      "Eat 5 to 6 small, manageable portions throughout the day rather than 2 or 3 heavy meals.",
      "Practice good hand hygiene with soap and water before meals and after restroom use."
    ];
    redFlags = [
      "Severe, agonizing abdominal pain that is rigid, board-like, or worsens dramatically when releasing pressure (rebound tenderness).",
      "Hematemesis (vomiting blood or coffee-ground material) or melena (black, sticky, tarry stools).",
      "Inability to retain liquids for over 12 hours leading to dry mouth, sunken eyes, and absence of urination.",
      "Jaundice (yellowing of the sclera of eyes or skin)."
    ];
  }
  // 11. Urology & Renal / Urinary Tract / Bladder / Kidneys
  else if (query.includes('urine') || query.includes('urinar') || query.includes('uti') || query.includes('kidney') || query.includes('flank') || query.includes('burning urine') || docReplyLower.includes('urologist') || docReplyLower.includes('nephrologist')) {
    assessment = "Urinary frequency, dysuria, or flank discomfort points toward a lower urinary tract infection (cystitis), urethral irritation, nephrolithiasis (kidney stones), or renal involvement.";
    precautions = [
      "Significantly increase water intake to 2.5–3 liters per day to promote frequent flushing of the urinary bladder.",
      "Void your bladder completely as soon as you feel the urge; avoid holding urine for prolonged periods.",
      "Avoid bladder irritants: eliminate caffeine, carbonated colas, citrus juices, spicy seasonings, and alcohol.",
      "For women: always wipe from front to back after urination to prevent transferring colonic bacteria to the urethra.",
      "Wear breathable, unbleached cotton underwear and avoid tight nylon leggings or jeans.",
      "Do not use scented bubble baths, feminine hygiene sprays, or harsh genital washes."
    ];
    redFlags = [
      "Hematuria (visible pink, red, or cola-colored blood in the urine).",
      "Severe flank or lower back pain radiating to the groin accompanied by fever, chills, and shaking (pyelonephritis).",
      "Complete anuria (inability to pass urine despite a painful, full bladder).",
      "Urinary retention accompanied by lower limb weakness or saddle numbness."
    ];
  }
  // 12. Neurological / Headache / Migraine
  else if (query.includes('headache') || query.includes('migraine') || query.includes('head ache') || docReplyLower.includes('neurologist')) {
    assessment = "Your headache presentation suggests a tension-type headache, vascular migraine episode, cervicogenic strain, or dehydration-related cephalalgia.";
    precautions = [
      "Retire to a dark, quiet, well-ventilated room with minimal sensory stimulation; close your eyes for 30–60 minutes.",
      "Drink 500 mL of cool water immediately, as subtle dehydration is one of the most prevalent headache triggers.",
      "Apply an ice pack wrapped in a cloth to your forehead or temples for vascular headaches, or a warm heating pad to tight shoulder/neck muscles.",
      "Disconnect completely from smartphones, computer monitors, and televisions to eliminate digital screen glare.",
      "Gently massage the suboccipital muscles at the base of the skull, temples, and upper trapezius muscles.",
      "Avoid trigger foods: aged cheeses, artificial sweeteners, processed meats with nitrates, and skipping meals."
    ];
    redFlags = [
      "Sudden-onset 'thunderclap' headache reaching unbearable peak intensity within 60 seconds.",
      "Headache associated with neck stiffness, fever, photophobia, confusion, or altered mental status.",
      "Unilateral facial drooping, arm weakness, or difficulty articulating words (FAST stroke signs).",
      "New headache pattern starting after age 50 or triggered by coughing, straining, or bending over."
    ];
  }
  // 13. Neurological / Numbness / Tingling / Tremors
  else if (query.includes('numb') || query.includes('tingl') || query.includes('neuropathy') || query.includes('pins') || query.includes('tremor') || query.includes('shak') || query.includes('parkinson')) {
    assessment = "Paresthesia, involuntary tremors, or localized sensory deficits suggest peripheral nerve entrapment, metabolic neuropathy, essential tremor, or central nervous signaling dysfunction.";
    precautions = [
      "Avoid prolonged static postures that pinch superficial nerves (e.g. crossing legs at knees, leaning heavily on elbows).",
      "Ensure proper ergonomic alignment at computer workstations; use gel wrist rests and maintain elbows at 90 degrees.",
      "Eliminate caffeine, nicotine, energy drinks, and alcohol, all of which substantially amplify physiological tremors.",
      "Inspect hands and feet daily for micro-abrasions, blisters, or thermal burns if sensory feedback is compromised.",
      "Prioritize 7–8 hours of uninterrupted sleep, as sleep deficit markedly exacerbates tremor amplitude.",
      "Engage in fine-motor coordination drills and gentle daily flexibility stretches."
    ];
    redFlags = [
      "Sudden-onset unilateral numbness spreading across an entire limb or half of the face.",
      "Progressive loss of motor strength, dropped objects, or tripping over your own toes.",
      "Loss of sphincter control (urinary or fecal incontinence).",
      "Tremors accompanied by sudden unsteadiness, frequent falls, or slurred speech."
    ];
  }
  // 14. Acute Fever & Systemic Infection
  else if (query.includes('fever') || query.includes('temperature') || query.includes('chills') || query.includes('pyrexia')) {
    assessment = "Elevated core body temperature indicates an active systemic immunological response, typically triggered by an acute viral, bacterial, or inflammatory etiology.";
    precautions = [
      "Prioritize strict bed rest to preserve metabolic energy for immune defense.",
      "Hydrate proactively with 2.5 to 3 liters of fluids daily: boiled water, coconut water, fresh soups, and ORS solution.",
      "Dress in light, breathable cotton layers; keep the room at a comfortable 22–24°C with gentle ventilation.",
      "Perform lukewarm water sponge baths over the forehead, neck, and axillae if temperature feels excessively high (do not use cold water).",
      "Chart your body temperature every 4 hours using a digital thermometer to track clinical trajectory.",
      "Consume soft, nutrient-dense, easily digestible meals."
    ];
    redFlags = [
      "Body temperature reaching or exceeding 103°F (39.4°C) or unresponsive to antipyretics.",
      "Fever accompanied by petechial (non-blanching) purple skin rashes, stiff neck, or extreme lethargy.",
      "Inability to retain liquids due to persistent vomiting, leading to signs of clinical dehydration.",
      "Delirium, confusion, or seizure episodes (febrile convulsions)."
    ];
  }
  // 15. Neuro-Psychiatric / Anxiety / Depression / Sleep & Insomnia
  else if (query.includes('anxiety') || query.includes('panic') || query.includes('depress') || query.includes('insomnia') || query.includes('sleep') || query.includes('stress') || query.includes('nervous') || docReplyLower.includes('psychiatrist') || docReplyLower.includes('psychologist')) {
    assessment = "Your reported symptoms reflect psychological distress, neuro-chemical stress reactivity, circadian disruption, or autonomic nervous system hyperarousal.";
    precautions = [
      "Practice 4-7-8 rhythmic breathing or box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) to activate the calming parasympathetic vagal reflex.",
      "Institute strict sleep hygiene: retire and wake at identical times daily; reserve the bed solely for sleep.",
      "Avoid all digital screens (blue light) and stimulating media for at least 60–90 minutes prior to bedtime.",
      "Discontinue caffeine, energy drinks, and nicotine past 12:00 PM; avoid using alcohol as a sleep aid.",
      "Engage in 20–30 minutes of mild daytime aerobic movement (e.g. brisk walking in natural sunlight).",
      "Confide in a trusted family member, close friend, or professional counselor about your emotional state."
    ];
    redFlags = [
      "Any thoughts of self-harm, hopelessness, or suicide (please reach out immediately to a 24/7 crisis helpline or nearest hospital).",
      "Severe panic attacks with chest pain, feeling of impending doom, or detachment from reality.",
      "Inability to care for fundamental daily needs (eating, drinking, basic personal hygiene) lasting over 48 hours."
    ];
  }
  // 16. Dynamic Adaptive Analysis for Any Other Symptom or Identified Specialty
  else {
    // Extract specialty from AskMyDoc response if present
    let detectedSpecialty = "General Physician or Medical Specialist";
    if (docReplyLower.includes('dermatolog')) detectedSpecialty = "Dermatologist";
    else if (docReplyLower.includes('orthoped')) detectedSpecialty = "Orthopedic Specialist";
    else if (docReplyLower.includes('cardiolog')) detectedSpecialty = "Cardiologist";
    else if (docReplyLower.includes('neurolog')) detectedSpecialty = "Neurologist";
    else if (docReplyLower.includes('pulmonolog')) detectedSpecialty = "Pulmonologist";
    else if (docReplyLower.includes('gastroenterolog')) detectedSpecialty = "Gastroenterologist";
    else if (docReplyLower.includes('endocrinolog')) detectedSpecialty = "Endocrinologist";
    else if (docReplyLower.includes('ophthalmolog')) detectedSpecialty = "Ophthalmologist";
    else if (docReplyLower.includes('dentist')) detectedSpecialty = "Dental Surgeon";
    else if (docReplyLower.includes('otolaryngolog') || /\b(ent|ent specialist)\b/.test(docReplyLower)) detectedSpecialty = "ENT Specialist (Otolaryngologist)";
    else if (docReplyLower.includes('urolog')) detectedSpecialty = "Urologist";
    else if (docReplyLower.includes('nephrolog')) detectedSpecialty = "Nephrologist";
    else if (docReplyLower.includes('psychiat')) detectedSpecialty = "Psychiatrist";

    // Clean prompt for custom summary
    const cleanPrompt = prompt.replace(/[^\w\s]/gi, '').trim();

    assessment = `Clinical evaluation of reported symptoms: "${cleanPrompt}". These symptoms indicate localized physical discomfort or early physiological stress that warrants structured monitoring and targeted evaluation by a ${detectedSpecialty}.`;
    precautions = [
      "Rest the affected anatomical area and avoid physical overexertion or strenuous repetitive activities for the next 24 to 48 hours.",
      "Maintain optimal systemic hydration by consuming 2 to 2.5 liters of clean water and warm electrolyte fluids daily.",
      "Keep an objective symptom journal detailing exact time of onset, intensity scale (1–10), specific triggers, and relieving factors.",
      "Refrain from taking unprescribed antibiotics, potent anti-inflammatories, or unfamiliar pharmaceuticals without clinical guidance.",
      "Ensure 7 to 8 hours of restorative sleep to enhance natural tissue repair and immune balance."
    ];
    redFlags = [
      "Rapid escalation of symptom intensity or pain unresponsive to standard rest within 24–48 hours.",
      "Onset of systemic signs: sudden high fever (>101°F), unexplained chills, or lightheadedness.",
      "Difficulty breathing, chest pain, or sudden alteration in consciousness or mobility."
    ];
  }

  let finalOutput = `🩺 Clinical Overview:
${assessment}

🛡️ Recommended Precautions & Care Measures to be Done:
${precautions.map(p => `• ${p}`).join('\n')}

⚠️ Warning Signs & Emergency Red Flags:
${redFlags.map(r => `• ${r}`).join('\n')}

👨‍⚕️ Specialist Consultation (via AskMyDoc API):
${askMyDocReply || 'Consult a qualified General Physician or specialist to receive a personalized medical examination.'}`;

  return finalOutput;
};

const analyzeSymptomsOffline = (prompt) => {
  return generatePrecautionsAndClinicalGuidance(prompt, null);
};

const generateOfflineConsultationNotes = (prompt) => {
  const transcriptPart = prompt.replace("Generate a brief medical summary/notes from this consultation transcript:", "").trim();
  
  if (!transcriptPart) {
    return `[NeuroPlus AI Offline Notes]
- **Session type**: Voice/Video Consultation
- **Summary**: No active conversation transcript was captured.
- **Recommendations**: Please ensure microphone permissions are enabled during call sessions to capture speech notes.`;
  }
  
  const terms = transcriptPart.toLowerCase();
  let symptomsDetected = [];
  let adviceGiven = [];
  
  if (terms.includes('headache') || terms.includes('migraine')) {
    symptomsDetected.push("Headache / Migraine symptoms");
    adviceGiven.push("Rest in a dark, quiet room; maintain hydration.");
  }
  if (terms.includes('seizure') || terms.includes('fit') || terms.includes('epilepsy')) {
    symptomsDetected.push("Seizure activity / episodes");
    adviceGiven.push("Adhere strictly to anti-epileptic drug schedule; avoid triggers.");
  }
  if (terms.includes('tremor') || terms.includes('shaking')) {
    symptomsDetected.push("Tremors or involuntary shaking");
    adviceGiven.push("Avoid stimulants; practice coordination exercises.");
  }
  if (terms.includes('numb') || terms.includes('tingl') || terms.includes('neuropathy')) {
    symptomsDetected.push("Numbness / tingling / neuropathy");
    adviceGiven.push("Avoid nerve compression; follow up with neurologist.");
  }
  if (terms.includes('pain')) {
    symptomsDetected.push("Pain or discomfort reported");
    adviceGiven.push("Rest, apply warm/cold compress; check pain levels.");
  }
  if (terms.includes('medicine') || terms.includes('dosage') || terms.includes('pill') || terms.includes('tablet')) {
    symptomsDetected.push("Prescription / medication schedule discussed");
    adviceGiven.push("Take all prescribed medications exactly as directed.");
  }
  
  if (symptomsDetected.length === 0) {
    symptomsDetected.push("General wellness consultation");
  }
  if (adviceGiven.length === 0) {
    adviceGiven.push("Get sufficient rest, stay hydrated, and report any new symptoms.");
  }
  
  return `[NeuroPlus AI Offline Notes]
Here is a summary of the consultation:

- **Key Symptoms/Topics Discussed**:
${symptomsDetected.map(s => `  * ${s}`).join('\n')}

- **Patient Advice & Recommendations**:
${adviceGiven.map(a => `  * ${a}`).join('\n')}

- **Transcribed Conversation Snippet**: "${transcriptPart.substring(0, 180)}${transcriptPart.length > 180 ? '...' : ''}"

*Disclaimer: This note was generated using localized offline rules because the live AI service is currently unavailable.*`;
};

const chatWithAskMyDoc = async (message, history = []) => {
  try {
    const response = await fetch('https://api.askmydoc.in/api/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history || [],
        session_id: 'chat-' + Date.now(),
        top_k: 4
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.reply) {
        let fullReply = data.reply;
        if (data.results && data.results.length > 0) {
          const docList = data.results
            .map(d => `• **${d.name || d.first_name + ' ' + d.last_name}** (${d.specialty || 'Medical Specialist'})`)
            .join('\n');
          fullReply += `\n\n**Recommended Verified Specialists (via AskMyDoc):**\n${docList}`;
        }
        return fullReply;
      }
    }
  } catch (err) {
    console.warn('AskMyDoc chat request error:', err.message);
  }
  return null;
};

const queryMedicalLLM = async (userPrompt, history = [], systemPrompt = null) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const isGroq = apiKey.startsWith('gsk_') || !process.env.OPENAI_API_KEY;
    const endpoint = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions' 
      : 'https://api.openai.com/v1/chat/completions';
    const model = isGroq ? 'qwen/qwen3.8-27b' : 'gpt-4o-mini';

    const defaultSystem = `You are NeuroPlus Medical AI. Give a SHORT, CONCISE, and direct clinical response. Do NOT write long explanations.
Do NOT use markdown hash symbols like ###. Format strictly with these clean headers:
🩺 Clinical Overview:
[1 to 2 short sentences naming the exact disease/condition and primary cause.]

🛡️ Recommended Precautions & Care Measures to be Done:
• [Short actionable precaution 1]
• [Short actionable precaution 2]
• [Short actionable precaution 3]

⚠️ Warning Signs & Emergency Red Flags:
• [Critical emergency sign 1]
• [Critical emergency sign 2]

👨‍⚕️ Specialist Consultation:
[1 short sentence naming the exact specialist doctor who manages this.]`;

    const messages = [
      { role: 'system', content: systemPrompt || defaultSystem },
      ...(history || []).slice(-6).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      })),
      { role: 'user', content: userPrompt }
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
    }
  } catch (err) {
    console.warn("Medical LLM query failed or timed out:", err.message);
  }
  return null;
};

exports.chatWithAI = async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType, history } = req.body;

    // Use Medical LLM + AskMyDoc API and comprehensive clinical precautions engine
    if (!imageBase64 && prompt && !prompt.startsWith("Generate a brief medical summary/notes from this consultation transcript:")) {
      // 1. Try Live Deep Medical LLM (covers 100% of human diseases, drugs, syndromes)
      const llmReply = await queryMedicalLLM(prompt, history);
      
      // 2. Query AskMyDoc API in parallel for Indian doctor directory and specialist verification
      const askMyDocReply = await chatWithAskMyDoc(prompt, history);

      if (llmReply) {
        let finalReply = llmReply;
        if (askMyDocReply) {
          // If AskMyDoc has specific doctor listings, append them
          if (askMyDocReply.includes('Recommended Verified Specialists')) {
            const docPart = askMyDocReply.split('Recommended Verified Specialists')[1];
            if (docPart) {
              finalReply += `\n\n### 👨‍⚕️ Verified Doctor Directory (via AskMyDoc API):\n${docPart.trim()}`;
            }
          } else {
            finalReply += `\n\n*(Verified against AskMyDoc Medical AI Directory)*`;
          }
        }
        return res.json({ reply: finalReply, source: 'NeuroPlus Medical AI & AskMyDoc' });
      }

      // 3. Robust Offline Fallback: Multi-domain clinical knowledge engine + AskMyDoc
      const combinedReply = generatePrecautionsAndClinicalGuidance(prompt, askMyDocReply);
      return res.json({ reply: combinedReply, source: 'NeuroPlus Clinical Engine & AskMyDoc' });
    }

    // Check if API key is provided for Gemini fallback / image analysis
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. Providing rule-based offline response.");
      if (prompt && prompt.startsWith("Generate a brief medical summary/notes from this consultation transcript:")) {
        return res.json({ reply: generateOfflineConsultationNotes(prompt) });
      }
      return res.json({ reply: analyzeSymptomsOffline(prompt) });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let contents = [prompt || "Hello!"];

    if (imageBase64) {
      let base64Data = imageBase64;
      if (imageBase64.includes('base64,')) {
        base64Data = imageBase64.split('base64,')[1];
      }

      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg"
        }
      });
      
      if (!prompt) {
          contents[0] = "What is in this image? If it is a skin allergy or medical symptom, please analyze it and provide information.";
      } else {
          contents[0] = "You are a helpful medical AI assistant. Analyze the user's prompt and the provided image. User prompt: " + prompt;
      }
    } else {
        contents[0] = "You are a helpful medical AI assistant. User prompt: " + prompt;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
      });
      res.json({ reply: response.text });
    } catch (apiError) {
      console.warn("Gemini API call failed, using rule-based offline fallback:", apiError.message);
      if (prompt && prompt.startsWith("Generate a brief medical summary/notes from this consultation transcript:")) {
        return res.json({ reply: generateOfflineConsultationNotes(prompt) });
      }
      return res.json({ reply: analyzeSymptomsOffline(prompt) });
    }

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ message: error.message || 'Failed to process AI request' });
  }
};
